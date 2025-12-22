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

    // 3. Parse class name and year
    let klasseName, jahrgang;
    
    const match1 = className.match(/^([A-Za-z]+)(\d{4})$/);
    const match2 = className.match(/^(\d{4})([A-Za-z]+)$/);
    const match3 = className.match(/^(\d+)([A-Z])$/);
    
    if (match1) {
      klasseName = match1[1];
      jahrgang = parseInt(match1[2]);
    } else if (match2) {
      jahrgang = parseInt(match2[1]);
      klasseName = match2[2];
    } else if (match3) {
      klasseName = className;
      jahrgang = new Date().getFullYear();
    } else {
      klasseName = className;
      jahrgang = new Date().getFullYear();
    }

    // 4. Find or create class
    let klasse = await prisma.klasse.findFirst({
      where: { name: klasseName, jahrgang: jahrgang }
    });

    if (!klasse) {
      klasse = await prisma.klasse.create({
        data: { name: klasseName, jahrgang: jahrgang }
      });
    }

    // 5. Find or create subject
    let fach = await prisma.fach.findUnique({
      where: { kuerzel: subject }
    });

    if (!fach) {
      fach = await prisma.fach.create({
        data: { name: subject, kuerzel: subject }
      });
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

module.exports = {
  createAssignment
};