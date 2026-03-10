const fs = require('fs');
const path = require('path');
const { prisma } = require('../app.config');

const UPLOADS_ROOT = path.resolve(__dirname, '..', '..', 'uploads');

function tryDeleteUploadedFile(filePath) {
  if (typeof filePath !== 'string' || filePath.trim() === '') return;
  try {
    const resolved = path.resolve(filePath);
    const allowedPrefix = UPLOADS_ROOT + path.sep;
    if (!resolved.startsWith(allowedPrefix)) return;
    if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
  } catch (error) {
    console.error('Fehler beim Löschen der Datei:', error);
  }
}

// --- Teacher creates assignment ---
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

    const safeTitle = typeof title === 'string' ? title : '';
    const safeText = typeof text === 'string' ? text : '';

    const isTeacher = await prisma.userRole.findFirst({  // ✅ fix
      where: { userId: teacherId, roleId: 2 },
      select: { id: true }
    });

    if (!isTeacher) {
      return res.status(403).json({ success: false, message: 'Only for teachers' });
    }

    let classObj = await prisma.class.findFirst({ where: { name: className } });
    if (!classObj) {
      classObj = await prisma.class.create({
        data: { name: className, year: new Date().getFullYear() }
      });
    }

    let subjectObj = await prisma.subject.findFirst({ where: { name: subject } });
    if (!subjectObj) {
      subjectObj = await prisma.subject.create({ data: { name: subject, code: subject } });
    }

    const teacherSubject = await prisma.userSubject.findFirst({
      where: { userId: teacherId, subjectId: subjectObj.id },
      select: { id: true }
    });

    if (!teacherSubject) {
      await prisma.userSubject.create({
        data: { userId: teacherId, subjectId: subjectObj.id }
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

    const terminDate = new Date(dueDate);
    if (Number.isNaN(terminDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Ungültiges Datum-Format' });
    }

    const assignment = await prisma.assignment.create({  // ✅ fix
      data: {
        title: safeTitle,
        description: safeText,
        dueDate: terminDate,
        classId: classObj.id,
        subjectId: subjectObj.id,
        teacherId: teacherId,
        attachments: anhaenge
      },
      include: {
        class: true,
        subject: true,
        teacher: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        class: assignment.class.name,
        subject: assignment.subject.name,
        teacher: `${assignment.teacher.firstName} ${assignment.teacher.lastName}`,
        attachments: assignment.attachments ? JSON.parse(assignment.attachments) : []
      }
    });
  } catch (error) {
    console.error('Aufgabe erstellen Fehler:', error);
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }
    return res.status(500).json({ success: false, message: 'Server Fehler', error: error.message });
  }
};

const getClasses = async (req, res) => {
  try {
    const teacherId = req.userId;
    const userClasses = await prisma.userClass.findMany({
      where: { userId: teacherId },
      include: { class: true }
    });
    const classes = userClasses.map(uc => uc.class);
    return res.json({ data: classes });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error loading classes' });
  }
};

const getSubjects = async (req, res) => {
  try {
    const teacherId = req.userId;
    const userSubjects = await prisma.userSubject.findMany({
      where: { userId: teacherId },
      include: { subject: true }
    });
    const subjects = userSubjects.map(us => us.subject);
    return res.json({ data: subjects });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error loading subjects' });
  }
};

// --- Get all assignments created by the current teacher ---
const getTeacherAssignments = async (req, res) => {
  try {
    const teacherId = req.userId;

    const assignments = await prisma.assignment.findMany({  // ✅ fix
      where: { teacherId: teacherId },
      include: { class: true, subject: true, submissions: true },
      orderBy: { dueDate: 'desc' }
    });

    const now = new Date();
    const data = assignments.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate,
      class: a.class ? a.class.name : '',
      subject: a.subject ? a.subject.name : '',
      archived: Boolean(a.archived),
      status: a.archived ? 'archived' : (a.dueDate > now ? 'active' : 'expired'),
      submissionsCount: Array.isArray(a.submissions) ? a.submissions.length : 0
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Fehler beim Laden der Aufgaben des Lehrers:', error);
    return res.status(500).json({ success: false, message: 'Server Fehler' });
  }
};

// --- Get all submissions for a specific assignment ---
const getAssignmentSubmissions = async (req, res) => {
  try {
    const teacherId = Number.parseInt(req.userId, 10);
    const assignmentId = Number.parseInt(req.params.assignmentId, 10);

    if (!Number.isInteger(teacherId)) {
      return res.status(401).json({ success: false, message: 'Ungültiger Benutzer' });
    }
    if (!Number.isInteger(assignmentId)) {
      return res.status(400).json({ success: false, message: 'Aufgaben-ID erforderlich' });
    }

    const isTeacher = await prisma.userRole.findFirst({  // ✅ fix
      where: { userId: teacherId, roleId: 2 },
      select: { id: true }
    });
    if (!isTeacher) {
      return res.status(403).json({ success: false, message: 'Only for teachers' });
    }

    const assignment = await prisma.assignment.findFirst({  // ✅ fix
      where: { id: assignmentId, teacherId: teacherId },
      select: { id: true, title: true, dueDate: true }
    });
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const rows = await prisma.submission.findMany({
      where: {
        assignmentId: assignmentId,
        student: { userRoles: { some: { roleId: 1 } } }
      },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true, assignmentId: true, submittedAt: true,
        grade: true, feedback: true, text: true, files: true,
        student: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    const data = rows.map(row => {
      let parsedFiles = [];
      if (typeof row.files === 'string' && row.files.trim() !== '') {
        try { parsedFiles = JSON.parse(row.files); } catch (error) { console.error('Error parsing files:', error); }
      } else if (Array.isArray(row.files)) {
        parsedFiles = row.files;
      }
      return { ...row, files: parsedFiles };
    });

    return res.json({ success: true, data, assignment });
  } catch (error) {
    console.error('Fehler beim Laden der Abgaben:', error);
    return res.status(500).json({ success: false, message: 'Server Fehler' });
  }
};

// --- Grade/update feedback for a submission ---
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

    const isTeacher = await prisma.userRole.findFirst({  // ✅ fix
      where: { userId: teacherId, roleId: 2 },
      select: { id: true }
    });
    if (!isTeacher) {
      return res.status(403).json({ success: false, message: 'Only for teachers' });
    }

    const submission = await prisma.submission.findFirst({  // ✅ fix
      where: { id: submissionId },
      select: {
        id: true, assignmentId: true,
        assignment: { select: { id: true, teacherId: true } }
      }
    });
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    if (!submission.assignment || submission.assignment.teacherId !== teacherId) {
      return res.status(403).json({ success: false, message: 'No access' });
    }

    const { grade, feedback } = req.body || {};

    let gradeValue = null;
    if (grade !== undefined && grade !== null && grade !== '') {
      const parsed = Number.parseInt(grade, 10);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
        return res.status(400).json({ success: false, message: 'Invalid grade (0-100)' });
      }
      gradeValue = parsed;
    }

    let feedbackValue = null;
    if (feedback !== undefined && feedback !== null) {
      const asString = String(feedback);
      feedbackValue = asString.trim() === '' ? null : asString;
    }

    const updated = await prisma.submission.update({  // ✅ fix
      where: { id: submissionId },
      data: { grade: gradeValue, feedback: feedbackValue },
      select: {
        id: true, assignmentId: true, studentId: true,
        submittedAt: true, grade: true, feedback: true, text: true, files: true
      }
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Fehler beim Bewerten der Abgabe:', error);
    return res.status(500).json({ success: false, message: 'Server Fehler' });
  }
};

// --- Archive/unarchive assignment ---
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

    const isTeacher = await prisma.userRole.findFirst({  // ✅ fix
      where: { userId: teacherId, roleId: 2 },
      select: { id: true }
    });
    if (!isTeacher) {
      return res.status(403).json({ success: false, message: 'Only for teachers' });
    }

    const assignment = await prisma.assignment.findFirst({  // ✅ fix
      where: { id: assignmentId, teacherId: teacherId },
      select: { id: true, archived: true }
    });
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const bodyValue = req.body?.archived;
    if (typeof bodyValue !== 'boolean') {
      return res.status(400).json({ success: false, message: 'archived (boolean) required' });
    }

    const updated = await prisma.assignment.update({  // ✅ fix
      where: { id: assignmentId },
      data: { archived: bodyValue },
      select: { id: true, archived: true }
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Fehler beim Archivieren der Aufgabe:', error);
    return res.status(500).json({ success: false, message: 'Server Fehler' });
  }
};

// --- Delete an assignment ---
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

    const isTeacher = await prisma.userRole.findFirst({  // ✅ fix
      where: { userId: teacherId, roleId: 2 },
      select: { id: true }
    });
    if (!isTeacher) {
      return res.status(403).json({ success: false, message: 'Only for teachers' });
    }

    const assignment = await prisma.assignment.findFirst({  // ✅ fix
      where: { id: assignmentId, teacherId: teacherId },
      select: { id: true, attachments: true, submissions: { select: { files: true } } }
    });
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    if (typeof assignment.attachments === 'string' && assignment.attachments.trim() !== '') {
      try {
        const parsed = JSON.parse(assignment.attachments);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (typeof item === 'string') tryDeleteUploadedFile(item);
            if (item && typeof item === 'object' && typeof item.path === 'string') {
              tryDeleteUploadedFile(item.path);
            }
          }
        }
      } catch (error) { console.error('Error parsing attachments:', error); }
    }

    if (Array.isArray(assignment.submissions)) {
      for (const sub of assignment.submissions) {
        const raw = sub?.files;
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
          } catch (error) { console.error('Error parsing submission files:', error); }
        }
      }
    }

    await prisma.assignment.delete({ where: { id: assignmentId } });  // ✅ fix
    return res.json({ success: true, data: { id: assignmentId } });
  } catch (error) {
    console.error('Fehler beim Löschen der Aufgabe:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
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