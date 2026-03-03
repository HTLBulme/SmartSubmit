const { prisma } = require('../app.config');

async function ensureStudentRole(studentId) {
  const isStudent = await prisma.benutzerRolle.findFirst({
    where: { benutzer_id: studentId, rolle_id: 1 },
    select: { id: true }
  });
  return Boolean(isStudent);
}

/**
 * Get all assignments for a student
 * TODO: Filter by student's classes
 */
const getAssignments = async (req, res) => {
  try {
    const studentId = Number.parseInt(req.userId, 10);
    console.log('[getAssignments] req.userId=', req.userId, 'parsed studentId=', studentId);

    if (!Number.isInteger(studentId)) {
      return res.status(401).json({ success: false, message: 'Ungültiger Benutzer' });
    }

    const isStudent = await ensureStudentRole(studentId);
    if (!isStudent) {
      return res.status(403).json({ success: false, message: 'Nur für Schüler' });
    }
    
    // Get student's classes
    const studentClasses = await prisma.benutzerKlasse.findMany({
      where: { benutzer_id: studentId },
      select: { klasse_id: true }
    });

    const klasseIds = studentClasses.map(bk => bk.klasse_id);
    console.log('[getAssignments] klasseIds=', klasseIds);

    if (klasseIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Get assignments for student's classes
    const assignments = await prisma.aufgabe.findMany({
      where: {
        klasse_id: {
          in: klasseIds
        },
        archiviert: false,
      },
      include: {
        klasse: true,
        fach: true,
        lehrer: {
          select: {
            vorname: true,
            nachname: true
          }
        }
      },
      orderBy: { termin: 'asc' }
    });

    res.json({
      success: true,
      data: assignments
    });

  } catch (error) {
    console.error('Aufgaben abrufen Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
};

/**
 * Submit assignment
 * TODO: Implement submission logic with file upload
 */
const submitAssignment = async (req, res) => {
  try {
    const studentId = Number.parseInt(req.userId, 10);
    const { assignmentId, aufgabeId, text } = req.body;

    if (!Number.isInteger(studentId)) {
      return res.status(401).json({ success: false, message: 'Ungültiger Benutzer' });
    }

    const isStudent = await ensureStudentRole(studentId);
    if (!isStudent) {
      return res.status(403).json({ success: false, message: 'Nur für Schüler' });
    }

    const rawAssignmentId = assignmentId ?? aufgabeId;

    const assigmentIdNum = Number.parseInt(rawAssignmentId, 10);
    if (!rawAssignmentId || Number.isNaN(assigmentIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Aufgaben-ID erforderlich'
      });
    }

    // 1) Check assignment exists (and get its class)
    const assignment = await prisma.aufgabe.findUnique({
      where: { id: assigmentIdNum },
      select: { id: true, klasse_id: true, termin: true }
    }); 

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Aufgabe nicht gefunden'
      });
    }

    // 2) Check student belongs to the class of this assignment
    const membership = await prisma.benutzerKlasse.findFirst({
      where: {
        benutzer_id: studentId,
        klasse_id: assignment.klasse_id
      },
      select: { id: true }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Schüler gehört nicht zur Klasse dieser Aufgabe'
      });
    }

    // 2.5) Only allow submissions while assignment is active (deadline not passed)
    const now = new Date();
    if (assignment.termin && assignment.termin < now) {
      return res.status(400).json({
        success: false,
        message: 'Abgabe ist nicht mehr möglich (Frist abgelaufen)'
      });
    }

    // 3) Files from multer are in req.files
    const files = Array.isArray(req.files) ? req.files : [];
    const cleanText = typeof text === 'string' ? text.trim() : '';
    const hasText = cleanText.length > 0;

    // 4) Allow text-only submissions. If you want to require at least one file, remove the text part.
    if (!hasText && files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bitte mindestens eine Datei oder Text abgeben'
      });
    }

    const fileMeta = files.map(file => ({
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,  
      // keep path mostly for debugging; normalize slashes for consistency
      path: typeof file.path === 'string' ? file.path.replace(/\\/g, '/') : null,
      uploadeAt: new Date().toISOString()
    }));

    // 5) Overwrite behavior: update if exists, otherwise create new
    const existing = await prisma.abgabe.findFirst({
      where: {
        aufgabe_id: assigmentIdNum,
        schueler_id: studentId
      },
      select: { id: true }
    });

    const saved = existing
      ? await prisma.abgabe.update({
          where: { id: existing.id },
          data: {
            abgabe_zeitpunkt: new Date(),
            dateien: JSON.stringify(fileMeta),
            text: hasText ? cleanText : null,
            // overwrite submission => reset grading
            bewertung: null,
            feedback: null
          } 
        })
      : await prisma.abgabe.create({
          data: {
            aufgabe_id: assigmentIdNum,
            schueler_id: studentId,
            abgabe_zeitpunkt: new Date(),
            dateien: JSON.stringify(fileMeta),
            text: hasText ? cleanText : null,
            bewertung: null,
            feedback: null
          }
        });

    return res.json({
      success: true,
      message: existing ? 'Abgabe aktualisiert' : 'Abgabe erstellt',
      data: {
        ...saved,
        dateien: fileMeta
      }
    });

  } catch (error) {
    console.error('Abgabe speichern Fehler:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
};

/**
 * Get student's own submissions
 * TODO: Implement after submission table is created
 */
const getMySubmissions = async (req, res) => {
  try {
    const studentId = Number.parseInt(req.userId, 10);

    if (!Number.isInteger(studentId)) {
      return res.status(401).json({ success: false, message: 'Ungültiger Benutzer' });
    }

    const isStudent = await ensureStudentRole(studentId);
    if (!isStudent) {
      return res.status(403).json({ success: false, message: 'Nur für Schüler' });
    }

    const rows = await prisma.abgabe.findMany({
      where: { schueler_id: studentId },
      orderBy: { abgabe_zeitpunkt: 'desc' },
      select: {
        id: true,
        aufgabe_id: true,
        abgabe_zeitpunkt: true,
        bewertung: true,
        feedback: true, 
        dateien: true,
        text: true,
        aufgabe: {
          select: {
            id: true,
            titel: true,
            termin: true,
            klasse_id: true,
            fach_id: true
          }
        }
      }
    });

    const data = rows.map(row => {
      let parsed = [];
      if (typeof row.dateien === 'string' && row.dateien.trim() !== '') {
        try {
          parsed = JSON.parse(row.dateien);
        } catch (error) {
          console.error('Fehler beim Parsen der Dateien:', error);
        }
      }
      return {
        ...row,
        dateien: parsed
      };
    });

    return res.json({
      success: true,
      data: data,
      message: 'Abgaben geladen'
    });

  } catch (error) {
    console.error('Abgaben abrufen Fehler:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
};

module.exports = {
  getAssignments,
  submitAssignment,
  getMySubmissions
};