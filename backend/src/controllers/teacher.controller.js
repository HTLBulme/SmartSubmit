const fs = require('fs');
const path = require('path');
const { prisma } = require('../app.config');

// Multer stores uploads in backend/uploads (see backend/src/app.config.js).
// __dirname here is backend/src/controllers, so we need to go up two levels.
const UPLOADS_ROOT = path.resolve(__dirname, '..', '..', 'uploads');

function tryDeleteUploadedFile(filePath) {
  if (typeof filePath !== 'string' || filePath.trim() === '') return;

  try {
    const resolved = path.resolve(filePath);
    // Only allow deleting files inside backend/uploads
    const allowedPrefix = UPLOADS_ROOT + path.sep; //path.sep = /
    if (!resolved.startsWith(allowedPrefix)) return;
    if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
  } catch (error) {
    // Best-effort: don't fail request if disk cleanup fails
    console.error('Fehler beim Löschen der Datei:', error);
  }
}

/**
 * Teacher creates assignment
 */
const createAssignment = async (req, res) => {
  try {
    const { class: className, subject, title, text, dueDate } = req.body;
    const teacherId = req.userId;

    if (!className || !subject || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Klasse, Fach und Abgabetermin sind erforderlich'
      });
    }
    // Ensure title and text are strings; default to empty string if missing or wrong type
    const safeTitle = typeof title === 'string' ? title : '';
    const safeText = typeof text === 'string' ? text : '';

    const isTeacher = await prisma.benutzerRolle.findFirst({
      where: { benutzer_id: teacherId, rolle_id: 2 },
      select: { id: true } // Only fetch id, existence check only
    });

    if (!isTeacher) {
      return res.status(403).json({
        success: false,
        message: 'Nur für Lehrer'
      });
    }

    let klasse = await prisma.klasse.findFirst({ where: { name: className } });
    if (!klasse) {
      klasse = await prisma.klasse.create({
        data: { name: className, jahrgang: new Date().getFullYear() }
      });
    }

    let fach = await prisma.fach.findFirst({ where: { name: subject } });
    if (!fach) {
      fach = await prisma.fach.create({ data: { name: subject, kuerzel: subject } });
    }

    const teacherFach = await prisma.benutzerFach.findFirst({
      where: { benutzer_id: teacherId, fach_id: fach.id },
      select: { id: true }
    });

    if (!teacherFach) {
      await prisma.benutzerFach.create({
        data: { benutzer_id: teacherId, fach_id: fach.id }
      });
    }

    let anhaenge = null;
    if (req.files && req.files.length > 0) {
      const filePaths = req.files.map(f => ({
        originalName: f.originalname,
        filename: f.filename,
        path: f.path,
        size: f.size,
        mimetype: f.mimetype,
        uploadDate: new Date().toISOString()
      }));
      anhaenge = JSON.stringify(filePaths);
    }

    const terminDate = new Date(dueDate); //String:"2025-06-15T23:59:00.000Z"-->Js-object
    if (Number.isNaN(terminDate.getTime())) {//-> 1749945600000
      return res.status(400).json({
        success: false,
        message: 'Ungültiges Datum-Format'
      });
    }

    const aufgabe = await prisma.aufgabe.create({
      data: {
        titel: safeTitle,
        beschreibung: safeText,
        termin: terminDate,
        klasse_id: klasse.id,
        fach_id: fach.id,
        lehrer_id: teacherId,
        anhaenge
      },
      include: {
        klasse: true,
        fach: true,
        lehrer: {
          select: {
            id: true,
            vorname: true,
            nachname: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Aufgabe erfolgreich erstellt',
      data: {
        id: aufgabe.id,
        titel: aufgabe.titel,
        beschreibung: aufgabe.beschreibung,
        termin: aufgabe.termin,
        klasse: aufgabe.klasse.name,
        fach: aufgabe.fach.name,
        lehrer: `${aufgabe.lehrer.vorname} ${aufgabe.lehrer.nachname}`,
        anhaenge: aufgabe.anhaenge ? JSON.parse(aufgabe.anhaenge) : []
      }
    });
  } catch (error) {
    console.error('Aufgabe erstellen Fehler:', error);

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (file?.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server Fehler',
      error: error.message
    });
  }
};

const getClasses = async (req, res) => {
  try {
    const classes = await prisma.klasse.findMany();
    return res.json({ data: classes });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Fehler beim Laden der Klassen' });
  }
};

const getSubjects = async (req, res) => {
  try {
    const subjects = await prisma.fach.findMany();
    return res.json({ data: subjects });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Fehler beim Laden der Fächer' });
  }
};

/**
 * Get all assignments created by the current teacher
 */
const getTeacherAssignments = async (req, res) => {
  try {
    const teacherId = req.userId;

    const assignments = await prisma.aufgabe.findMany({
      where: { lehrer_id: teacherId },
      include: {
        klasse: true,
        fach: true,
        abgaben: true
      },
      orderBy: { termin: 'desc' }
    });

    const now = new Date();
    const data = assignments.map(a => ({
      id: a.id,
      titel: a.titel,
      beschreibung: a.beschreibung,
      termin: a.termin,
      klasse: a.klasse ? a.klasse.name : '',
      fach: a.fach ? a.fach.name : '',
      archiviert: Boolean(a.archiviert),
      status: a.archiviert ? 'archived' : (a.termin > now ? 'active' : 'expired'),
      abgabenCount: Array.isArray(a.abgaben) ? a.abgaben.length : 0
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Fehler beim Laden der Aufgaben des Lehrers:', error);
    return res.status(500).json({ success: false, message: 'Server Fehler' });
  }
};

/**
 * Get all submissions for a specific assignment created by the current teacher
 */
const getAssignmentSubmissions = async (req, res) => {
  try {
    const teacherId = Number.parseInt(req.userId, 10);//No conversion needed here. Because req.userId come from token its aways a number
    const assignmentId = Number.parseInt(req.params.assignmentId, 10);//params from router.get('/assignments/:assignmentId/submissions', getAssignmentSubmissions);

    //if (!Number.isInteger(teacherId)) {
     // return res.status(401).json({ success: false, message: 'Ungültiger Benutzer' });
   // }

    if (!Number.isInteger(assignmentId)) {
      return res.status(400).json({ success: false, message: 'Aufgaben-ID erforderlich' });
    }

    const isTeacher = await prisma.benutzerRolle.findFirst({
      where: { benutzer_id: teacherId, rolle_id: 2 },
      select: { id: true }
    });
    if (!isTeacher) {
      return res.status(403).json({ success: false, message: 'Nur für Lehrer' });
    }

    const assignment = await prisma.aufgabe.findFirst({
      where: { id: assignmentId, lehrer_id: teacherId },
      select: { id: true, titel: true, termin: true }
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Aufgabe nicht gefunden' });
    }

    const rows = await prisma.abgabe.findMany({
      where: { aufgabe_id: assignmentId },
      orderBy: { abgabe_zeitpunkt: 'desc' },
      select: {
        id: true,
        aufgabe_id: true,
        abgabe_zeitpunkt: true,
        bewertung: true,
        feedback: true,
        text: true,
        dateien: true,
        schueler: {
          select: {
            id: true,
            vorname: true,
            nachname: true,
            email: true
          }
        }
      }
    });

    const data = rows.map(row => {
      let parsedFiles = [];
      if (typeof row.dateien === 'string' && row.dateien.trim() !== '') {
        try {
          parsedFiles = JSON.parse(row.dateien);
        } catch (error) {
          console.error('Fehler beim Parsen der Dateien:', error);
        }
      } else if (Array.isArray(row.dateien)) {
        parsedFiles = row.dateien;
      }

      return {
        ...row,   // Spread row and replace dateien string with parsed array
        dateien: parsedFiles
      };
    });

    return res.json({ success: true, data, assignment });
  } catch (error) {
    console.error('Fehler beim Laden der Abgaben:', error);
    return res.status(500).json({ success: false, message: 'Server Fehler' });
  }
};

/**
 * Grade/update feedback for a submission (Abgabe)
 */
const gradeSubmission = async (req, res) => {
  try {
    const teacherId = Number.parseInt(req.userId, 10);
    const submissionId = Number.parseInt(req.params.submissionId, 10);

    if (!Number.isInteger(teacherId)) {
      return res.status(401).json({ success: false, message: 'Ungültiger Benutzer' });
    }

    if (!Number.isInteger(submissionId)) {
      return res.status(400).json({ success: false, message: 'Abgabe-ID erforderlich' });
    }

    const isTeacher = await prisma.benutzerRolle.findFirst({
      where: { benutzer_id: teacherId, rolle_id: 2 },
      select: { id: true }
    });
    if (!isTeacher) {
      return res.status(403).json({ success: false, message: 'Nur für Lehrer' });
    }

    const submission = await prisma.abgabe.findFirst({
      where: { id: submissionId },
      select: {
        id: true,
        aufgabe_id: true,
        aufgabe: { select: { id: true, lehrer_id: true } }
      }
    });

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Abgabe nicht gefunden' });
    }

    if (!submission.aufgabe || submission.aufgabe.lehrer_id !== teacherId) {
      return res.status(403).json({ success: false, message: 'Kein Zugriff' });
    }

    const { bewertung, feedback } = req.body || {};

    let gradeValue = null;
    if (bewertung !== undefined && bewertung !== null && bewertung !== '') {
      const parsed = Number.parseInt(bewertung, 10);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
        return res.status(400).json({ success: false, message: 'Ungültige Bewertung (0-100)' });
      }
      gradeValue = parsed;
    }

    let feedbackValue = null;
    if (feedback !== undefined && feedback !== null) {
      const asString = String(feedback);
      feedbackValue = asString.trim() === '' ? null : asString;
    }

    const updated = await prisma.abgabe.update({
      where: { id: submissionId },
      data: {
        bewertung: gradeValue,
        feedback: feedbackValue
      },
      select: {
        id: true,
        aufgabe_id: true,
        schueler_id: true,
        abgabe_zeitpunkt: true,
        bewertung: true,
        feedback: true,
        text: true,
        dateien: true
      }
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Fehler beim Bewerten der Abgabe:', error);
    return res.status(500).json({ success: false, message: 'Server Fehler' });
  }
};

/**
 * Archive/unarchive assignment (manual)
 */
const setAssignmentArchived = async (req, res) => {
  try {
    const teacherId = Number.parseInt(req.userId, 10);
    const assignmentId = Number.parseInt(req.params.assignmentId, 10);

    if (!Number.isInteger(teacherId)) {
      return res.status(401).json({ success: false, message: 'Ungültiger Benutzer' });
    }

    if (!Number.isInteger(assignmentId)) {
      return res.status(400).json({ success: false, message: 'Aufgaben-ID erforderlich' });
    }

    const isTeacher = await prisma.benutzerRolle.findFirst({
      where: { benutzer_id: teacherId, rolle_id: 2 },
      select: { id: true }
    });
    if (!isTeacher) {
      return res.status(403).json({ success: false, message: 'Nur für Lehrer' });
    }

    const assignment = await prisma.aufgabe.findFirst({
      where: { id: assignmentId, lehrer_id: teacherId },
      select: { id: true, archiviert: true }
    });
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Aufgabe nicht gefunden' });
    }

    const bodyValue = req.body?.archiviert;// ?. prevents crash if req.body is null/undefined
    if (typeof bodyValue !== 'boolean') {
      return res.status(400).json({ success: false, message: 'archiviert (boolean) erforderlich' });
    }

    const updated = await prisma.aufgabe.update({
      where: { id: assignmentId },
      data: { archiviert: bodyValue },
      select: { id: true, archiviert: true }
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Fehler beim Archivieren der Aufgabe:', error);
    return res.status(500).json({ success: false, message: 'Server Fehler' });
  }
};

/**
 * Delete an assignment created by the current teacher
 * - Deletes DB row (cascades to submissions)
 * - Best-effort deletes uploaded assignment/submission files on disk
 */
const deleteAssignment = async (req, res) => {
  try {
    const teacherId = Number.parseInt(req.userId, 10);
    const assignmentId = Number.parseInt(req.params.assignmentId, 10);

    if (!Number.isInteger(teacherId)) {
      return res.status(401).json({ success: false, message: 'Ungültiger Benutzer' });
    }

    if (!Number.isInteger(assignmentId)) {
      return res.status(400).json({ success: false, message: 'Aufgaben-ID erforderlich' });
    }

    const isTeacher = await prisma.benutzerRolle.findFirst({
      where: { benutzer_id: teacherId, rolle_id: 2 },
      select: { id: true }
    });
    if (!isTeacher) {
      return res.status(403).json({ success: false, message: 'Nur für Lehrer' });
    }

    const assignment = await prisma.aufgabe.findFirst({
      where: { id: assignmentId, lehrer_id: teacherId },
      select: {
        id: true,
        anhaenge: true,
        abgaben: { select: { dateien: true } }
      }
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Aufgabe nicht gefunden' });
    }

    // Delete assignment attachments from disk
    if (typeof assignment.anhaenge === 'string' && assignment.anhaenge.trim() !== '') {
      try {
        const parsed = JSON.parse(assignment.anhaenge);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (typeof item === 'string') tryDeleteUploadedFile(item);
            if (item && typeof item === 'object' && typeof item.path === 'string') {
              tryDeleteUploadedFile(item.path);
            }
          }
        }
      } catch (error) {
        console.error('Fehler beim Parsen der Anhänge:', error);
      }
    }

    // Delete submission files from disk
    if (Array.isArray(assignment.abgaben)) {
      for (const sub of assignment.abgaben) {
        const raw = sub?.dateien;
        if (typeof raw === 'string' && raw.trim() !== '') {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                if (typeof item === 'string') tryDeleteUploadedFile(item);
                if (item && typeof item === 'object' && typeof item.path === 'string') {
                  tryDeleteUploadedFile(item.path);
                }
              }
            }
          } catch (error) {
            console.error('Fehler beim Parsen der Abgabe-Dateien:', error);
          }
        }
      }
    }

    await prisma.aufgabe.delete({ where: { id: assignmentId } });
    return res.json({ success: true, data: { id: assignmentId } });
  } catch (error) {
    console.error('Fehler beim Löschen der Aufgabe:', error);
    return res.status(500).json({ success: false, message: 'Server Fehler' });
  }
};

module.exports = {
  createAssignment,
  getClasses,
  getSubjects,
  getTeacherAssignments,
  getAssignmentSubmissions,
  gradeSubmission,
  setAssignmentArchived,
  deleteAssignment
};
