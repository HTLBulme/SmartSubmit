// == Delete a file from student's submission (before graded)
const deleteSubmissionFile = async (req, res) => {
  try {
    const studentId = Number.parseInt(req.userId, 10);
    const { assignmentId, fileName } = req.body;
    if (!Number.isInteger(studentId)) {
      return res.status(401).json({ success: false, message: 'Invalid user' });
    }
    if (!assignmentId || !fileName) {
      return res.status(400).json({ success: false, message: 'Assignment ID and fileName required' });
    }
    const submission = await prisma.submission.findFirst({
      where: { assignmentId: Number(assignmentId), studentId },
    });
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    if (submission.grade !== null) {
      return res.status(403).json({ success: false, message: 'Cannot delete file after grading' });
    }
    let filesArr = [];
    if (typeof submission.files === 'string' && submission.files.trim() !== '') {
      try { filesArr = JSON.parse(submission.files); } catch {}
    }
    const filtered = filesArr.filter(f => f.storedName !== fileName && f.filename !== fileName);
    if (filtered.length === filesArr.length) {
      return res.status(404).json({ success: false, message: 'File not found in submission' });
    }
    await prisma.submission.update({
      where: { id: submission.id },
      data: { files: JSON.stringify(filtered) }
    });
    return res.json({ success: true, message: 'File deleted', files: filtered });
  } catch (error) {
    console.error('Error deleting submission file:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
const { prisma } = require('../app.config');
const { sendSubmissionConfirmation } = require('../app.email');

async function ensureStudentRole(studentId) {
  const isStudent = await prisma.userRole.findFirst({  // ✅ fix
    where: { userId: studentId, roleId: 1 },
    select: { id: true }
  });
  return Boolean(isStudent);
}

const NOTIFY_FLAG_REGEX = /\s*\[notifyOnGrade:(true|false)\]\s*$/i;

function stripNotifyMarker(text) {
  if (typeof text !== 'string' || text.trim() === '') return '';
  return text.replace(NOTIFY_FLAG_REGEX, '').trim();
}

function parseNotifyFlag(text) {
  if (typeof text !== 'string') return true;
  const match = text.match(NOTIFY_FLAG_REGEX);
  if (!match) return true;
  return match[1].toLowerCase() === 'true';
}

function buildSubmissionText(text, notifyWhenGraded) {
  const cleaned = stripNotifyMarker(text || '');
  const marker = `[notifyOnGrade:${notifyWhenGraded ? 'true' : 'false'}]`;
  return cleaned ? `${cleaned}\n${marker}` : marker;
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

    const assignments = await prisma.assignment.findMany({
      where: {
        classId: { in: classIds },
        archived: false,
      },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        link: true,
        attachments: true,
        class: true,
        subject: true,
        teacher: { select: { firstName: true, lastName: true } },
      },
      orderBy: { dueDate: 'asc' },
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
      select: { id: true, title: true, classId: true, dueDate: true }
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
    const rawText = typeof text === 'string' ? text.trim() : '';
    const cleanText = stripNotifyMarker(rawText);
    const hasText = cleanText.length > 0;
    const notifyWhenGraded = req.body.notifyWhenGraded === 'false' || req.body.notifyWhenGraded === '0' ? false : true;

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

    const submissionText = buildSubmissionText(cleanText, notifyWhenGraded);

    const saved = existing
      ? await prisma.submission.update({  // ✅ fix
          where: { id: existing.id },
          data: {
            submittedAt: new Date(),
            files: JSON.stringify(fileMeta),
            text: submissionText,
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
            text: submissionText,
            grade: null,
            feedback: null
          }
        });

    // --- Send confirmation email ---
    try {
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { email: true, firstName: true, lastName: true }
      });

      if (student && student.email) {
        const studentName = `${student.firstName} ${student.lastName}`.trim();
        await sendSubmissionConfirmation(student.email, studentName, assignment.title, new Date());
      }
    } catch (emailError) {
      console.error('Failed to send submission confirmation email:', emailError);
      // Don't fail the submission if email fails
    }

    return res.json({
      success: true,
      message: existing ? 'Submission updated' : 'Submission created',
      data: { ...saved, files: fileMeta }
    });

  } catch (error) {
    console.error('Error saving submission:', error);
    return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
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
      const cleanedText = stripNotifyMarker(row.text || '');
      return { ...row, files: parsed, text: cleanedText };
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
  getMySubmissions,
  deleteSubmissionFile
};