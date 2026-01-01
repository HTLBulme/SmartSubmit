const fs = require('fs');
const { prisma } = require('../app.config');

/**
 * Teacher creates assignment
 */
const createAssignment = async (req, res) => {
  try {
    const { class: className, subject, title, text, dueDate } = req.body;
    const teacherId = req.userId;

    // 1. Validate required fields
    if (!className || !subject || !title || !text || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Alle Felder sind erforderlich'
      });
    }

    // 2. Validate teacher role
    const isTeacher = await prisma.benutzerRolle.findFirst({
      where: { 
        benutzer_id: teacherId, 
        rolle_id: 2
      }
    });

    if (!isTeacher) {
      return res.status(403).json({
        success: false,
        message: 'Nur für Lehrer'
      });
    }

    // 3. Find class by name
    let klasse = await prisma.klasse.findFirst({ where: { name: className } });
    if (!klasse) {
      // Если не найдено — создать с текущим годом
      klasse = await prisma.klasse.create({ data: { name: className, jahrgang: new Date().getFullYear() } });
    }

    // 4. Find subject by name
    let fach = await prisma.fach.findFirst({ where: { name: subject } });
    if (!fach) {
      fach = await prisma.fach.create({ data: { name: subject, kuerzel: subject } });
    }

    // 6. Auto-link teacher to subject
    const teacherFach = await prisma.benutzerFach.findFirst({
      where: { benutzer_id: teacherId, fach_id: fach.id }
    });

    if (!teacherFach) {
      await prisma.benutzerFach.create({
        data: { benutzer_id: teacherId, fach_id: fach.id }
      });
    }

    // 7. Process file attachments
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

    // 8. Validate deadline
    const terminDate = new Date(dueDate);
    if (isNaN(terminDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiges Datum-Format'
      });
    }

    // 9. Create assignment
    const aufgabe = await prisma.aufgabe.create({
      data: {
        titel: title,
        beschreibung: text,
        termin: terminDate,
        klasse_id: klasse.id,
        fach_id: fach.id,
        lehrer_id: teacherId,
        anhaenge: anhaenge
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

    res.status(201).json({
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
    
    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server Fehler',
      error: error.message
    });
  }
};

const getClasses = async (req, res) => {
  try {
    const classes = await prisma.klasse.findMany();
    res.json({ data: classes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fehler beim Laden der Klassen' });
  }
};

const getSubjects = async (req, res) => {
  try {
    const subjects = await prisma.fach.findMany();
    res.json({ data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fehler beim Laden der Fächer' });
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

    // Формируем статус дедлайна и количество сдач
    const now = new Date();
    const data = assignments.map(a => ({
      id: a.id,
      titel: a.titel,
      beschreibung: a.beschreibung,
      termin: a.termin,
      klasse: a.klasse ? a.klasse.name : '',
      fach: a.fach ? a.fach.name : '',
      status: a.termin > now ? 'active' : 'expired',
      abgabenCount: Array.isArray(a.abgaben) ? a.abgaben.length : 0
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Fehler beim Laden der Aufgaben des Lehrers:', error);
    res.status(500).json({ success: false, message: 'Server Fehler' });
  }
};

module.exports = {
  createAssignment,
  getClasses,
  getSubjects,
  getTeacherAssignments
};