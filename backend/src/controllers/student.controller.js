const { prisma } = require('../app.config');

/**
 * Get all assignments for a student
 * TODO: Filter by student's classes
 */
const getAssignments = async (req, res) => {
  try {
    const studentId = req.userId;

    // Get student's classes
    const studentClasses = await prisma.benutzerKlasse.findMany({
      where: { benutzer_id: studentId },
      include: { klasse: true }
    });

    const klasseIds = studentClasses.map(bk => bk.klasse_id);

    // Get assignments for student's classes
    const assignments = await prisma.aufgabe.findMany({
      where: {
        klasse_id: {
          in: klasseIds
        }
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
    const studentId = req.userId;
    const { assignmentId, text } = req.body;

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: 'Aufgaben-ID erforderlich'
      });
    }

    // TODO: Implement submission logic
    // This would create an entry in an Abgabe (submission) table

    res.json({
      success: true,
      message: 'Aufgabe eingereicht (Funktion wird noch implementiert)'
    });

  } catch (error) {
    console.error('Aufgabe einreichen Fehler:', error);
    res.status(500).json({
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
    const studentId = req.userId;

    // TODO: Query submissions table
    // const submissions = await prisma.abgabe.findMany({...})

    res.json({
      success: true,
      data: [],
      message: 'Funktion wird noch implementiert'
    });

  } catch (error) {
    console.error('Abgaben abrufen Fehler:', error);
    res.status(500).json({
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