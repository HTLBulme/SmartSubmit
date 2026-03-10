const { prisma } = require('../app.config');

async function ensureStudentRole(studentId) {
  const isStudent = await prisma.userRole.findFirst({  // ✅ fix
    where: { userId: studentId, roleId: 1 },
    select: { id: true }
  });
  return Boolean(isStudent);
}

// == Get all assignments for a student
const getAssignments = async (req, res) => {
  try {
    const studentId = Number.parseInt(req.userId, 10);

    if (!Number.isInteger(studentId)) {
      return res.status(401).json({ success: false, message: 'Invalid user' });
    }

    const isStudent = await ensureStudentRole(studentId);
    if (!isStudent) {
      return res.status(403).json({ success: false, message: 'Students only' });
    }

    const studentClasses = await prisma.userClass.findMany({  // ✅ fix
      where: { userId: studentId },
      select: { classId: true }
    });

    const classIds = studentClasses.map(bk => bk.classId);

    if (classIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const assignments = await prisma.assignment.findMany({  // ✅ fix
      where: {
        classId: { in: classIds },
        archived: false,
      },
      include: {
        class: true,
        subject: true,
        teacher: { select: { firstName: true, lastName: true } }
      },
      orderBy: { dueDate: 'asc' }
    });

    res.json({ success: true, data: assignments });

  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// == Submit assignment
const submitAssignment = async (req, res) => {
  try {
    const studentId = Number.parseInt(req.userId, 10);
    const { assignmentId, aufgabeId, text } = req.body;

    if (!Number.isInteger(studentId)) {
      return res.status(401).json({ success: false, message: 'Invalid user' });
    }

    const isStudent = await ensureStudentRole(studentId);
    if (!isStudent) {
      return res.status(403).json({ success: false, message: 'Students only' });
    }

    const rawAssignmentId = assignmentId ?? aufgabeId;
    const assigmentIdNum = Number.parseInt(rawAssignmentId, 10);
    if (!rawAssignmentId || Number.isNaN(assigmentIdNum)) {
      return res.status(400).json({ success: false, message: 'Assignment ID required' });
    }

    const assignment = await prisma.assignment.findUnique({  // ✅ fix
      where: { id: assigmentIdNum },
      select: { id: true, classId: true, dueDate: true }
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const membership = await prisma.userClass.findFirst({  // ✅ fix
      where: { userId: studentId, classId: assignment.classId },
      select: { id: true }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Student does not belong to the class of this assignment'
      });
    }

    const now = new Date();
    if (assignment.dueDate && assignment.dueDate < now) {
      return res.status(400).json({
        success: false,
        message: 'Submission is no longer possible (deadline passed)'
      });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const cleanText = typeof text === 'string' ? text.trim() : '';
    const hasText = cleanText.length > 0;

    if (!hasText && files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please submit at least one file or text'
      });
    }

    const fileMeta = files.map(file => ({
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: typeof file.path === 'string' ? file.path.replace(/\\/g, '/') : null,
      uploadeAt: new Date().toISOString()
    }));

    const existing = await prisma.submission.findFirst({  // ✅ fix
      where: { assignmentId: assigmentIdNum, studentId: studentId },
      select: { id: true }
    });

    const saved = existing
      ? await prisma.submission.update({  // ✅ fix
          where: { id: existing.id },
          data: {
            submittedAt: new Date(),
            files: JSON.stringify(fileMeta),
            text: hasText ? cleanText : null,
            grade: null,
            feedback: null
          }
        })
      : await prisma.submission.create({  // ✅ fix
          data: {
            assignmentId: assigmentIdNum,
            studentId: studentId,
            submittedAt: new Date(),
            files: JSON.stringify(fileMeta),
            text: hasText ? cleanText : null,
            grade: null,
            feedback: null
          }
        });

    return res.json({
      success: true,
      message: existing ? 'Submission updated' : 'Submission created',
      data: { ...saved, files: fileMeta }
    });

  } catch (error) {
    console.error('Error saving submission:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// --- Get student's own submissions ---
const getMySubmissions = async (req, res) => {
  try {
    const studentId = Number.parseInt(req.userId, 10);

    if (!Number.isInteger(studentId)) {
      return res.status(401).json({ success: false, message: 'Invalid user' });
    }

    const isStudent = await ensureStudentRole(studentId);
    if (!isStudent) {
      return res.status(403).json({ success: false, message: 'Students only' });
    }

    const rows = await prisma.submission.findMany({  // ✅ fix
      where: { studentId: studentId },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true, assignmentId: true, submittedAt: true,
        grade: true, feedback: true, files: true, text: true,
        assignment: {
          select: { id: true, title: true, dueDate: true, classId: true, subjectId: true }
        }
      }
    });

    const data = rows.map(row => {
      let parsed = [];
      if (typeof row.files === 'string' && row.files.trim() !== '') {
        try { parsed = JSON.parse(row.files); } catch (error) { console.error('Error parsing files:', error); }
      }
      return { ...row, files: parsed };
    });

    return res.json({ success: true, data, message: 'Submissions loaded' });

  } catch (error) {
    console.error('Error fetching submissions:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAssignments,
  submitAssignment,
  getMySubmissions
};