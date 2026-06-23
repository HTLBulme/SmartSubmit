const fs = require('fs');
const path = require('path');
const { prisma } = require('../app.config');
const { sendGradeNotification } = require('../app.email');
const { exportLogAsCSV } = require('../app.submissionLog');

const UPLOADS_ROOT = path.resolve(__dirname, '..', '..', 'uploads');
const NOTIFY_FLAG_REGEX = /\s*\[notifyOnGrade:(true|false)\]\s*$/i;

async function ensureTeacherRole(teacherId) {
  try {
    // Query Teacher role by name (more robust than hard-coded roleId)
    const teacherRole = await prisma.role.findFirst({
      where: { name: 'Teacher' },
      select: { id: true }
    });
    
    if (!teacherRole) {
      console.error('Teacher role not found in database');
      return false;
    }

    const isTeacher = await prisma.userRole.findFirst({
      where: { userId: teacherId, roleId: teacherRole.id },
      select: { id: true }
    });
    return Boolean(isTeacher);
  } catch (error) {
    console.error('Error checking teacher role:', error);
    return false;
  }
}

function parseNotifyFlag(text) {
  if (typeof text !== 'string') return true;
  const match = text.match(NOTIFY_FLAG_REGEX);
  if (!match) return true;
  return match[1].toLowerCase() === 'true';
}


function tryDeleteUploadedFile(filePath) {
  if (typeof filePath !== 'string' || filePath.trim() === '') return;
  try {
    const resolved = path.resolve(filePath);
    // Only allow deleting files inside backend/uploads
    const allowedPrefix = UPLOADS_ROOT + path.sep; //path.sep = /
    if (!resolved.startsWith(allowedPrefix)) return;
    if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
  } catch (error) {
    console.error('Fehler beim Löschen der Datei:', error);
  }
}

// --- Teacher creates assignment ---
const createAssignment = async (req, res) => {
  try {
    const { class: className, subject, title, text, dueDate, link } = req.body;
    const teacherId = req.userId;

    if (!className || !subject || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Class, Subject and Due Date are required'
      });
    }
    // Ensure title and text are strings; default to empty string if missing or wrong type
    const safeTitle = typeof title === 'string' ? title : '';
    const safeText = typeof text === 'string' ? text : '';

    const isTeacher = await ensureTeacherRole(teacherId);

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
        size: f.size,
        mimetype: f.mimetype,
        uploadDate: new Date().toISOString()
      }));
      anhaenge = JSON.stringify(filePaths);
    }

    const terminDate = new Date(dueDate); //String:"2025-06-15T23:59:00.000Z"-->Js-object
    if (Number.isNaN(terminDate.getTime())) {//-> 1749945600000
      return res.status(400).json({ success: false, message: 'Invalid Date Format' });
    }

    const assignment = await prisma.assignment.create({  // ✅ fix
      data: {
        title: safeTitle,
        description: safeText,
        link: typeof link === 'string' ? link : null,
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
        link: assignment.link,
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
    const classes = await prisma.class.findMany({  // Allow teachers to see all classes, not just their own
      orderBy: [{ year: 'asc' }, { name: 'asc' }]
    });
    return res.json({ success: true, data: classes });
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
      submissionsCount: Array.isArray(a.submissions) ? a.submissions.length : 0,
      link: a.link || '', 
      attachments: a.attachments ? JSON.parse(a.attachments) : [] 
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error while loading teacher assignments:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// --- Get all submissions for a specific assignment ---
const getAssignmentSubmissions = async (req, res) => {
  try {
    const teacherId = Number.parseInt(req.userId, 10);//No conversion needed here. Because req.userId come from token its aways a number
    const assignmentId = Number.parseInt(req.params.assignmentId, 10);//params from router.get('/assignments/:assignmentId/submissions', getAssignmentSubmissions);

    if (!Number.isInteger(teacherId)) {
      return res.status(401).json({ success: false, message: 'Ungültiger Benutzer' });
    }
    if (!Number.isInteger(assignmentId)) {
      return res.status(400).json({ success: false, message: 'Aufgaben-ID erforderlich' });
    }

    const isTeacher = await ensureTeacherRole(teacherId);
    if (!isTeacher) {
      return res.status(403).json({ success: false, message: 'Only for teachers' });
    }

    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, teacherId: teacherId },
      select: {
        id: true,
        title: true,
        dueDate: true,
        class: { select: { name: true } },
        subject: { select: { name: true } }
      }
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
      const cleanText = row.text ? row.text.replace(NOTIFY_FLAG_REGEX, '').trim() : row.text;
      return { ...row, files: parsedFiles, text: cleanText }; // Spread row and replace dateien string with parsed array
    });

    return res.json({ success: true, data, assignment });
  } catch (error) {
    console.error('Error while loading submissions:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
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

    const isTeacher = await ensureTeacherRole(teacherId);
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

    // --- Send grade notification email ---
    try {
      const student = await prisma.user.findUnique({
        where: { id: updated.studentId },
        select: { email: true, firstName: true, lastName: true }
      });

      const assignment = await prisma.assignment.findUnique({
        where: { id: updated.assignmentId },
        select: { title: true }
      });

      const shouldNotify = parseNotifyFlag(updated.text);
      if (shouldNotify && student && student.email && assignment) {
        const studentName = `${student.firstName} ${student.lastName}`.trim();
        await sendGradeNotification(student.email, studentName, assignment.title, updated.grade, updated.feedback);
      }
    } catch (emailError) {
      console.error('Failed to send grade notification email:', emailError);
      // Don't fail the grading if email fails
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error while grading submission:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
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

    const isTeacher = await ensureTeacherRole(teacherId);
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

    const bodyValue = req.body?.archived;// ?. prevents crash if req.body is null/undefined
    if (typeof bodyValue !== 'boolean') {
      return res.status(400).json({ success: false, message: 'archived (boolean) required' });
    }

    const updated = await prisma.assignment.update({  // ✅ fix
      where: { id: assignmentId },
      data: { archived: bodyValue },
      select: { id: true, archived: true }
    });


  // --- NEW: export submission log as CSV when archiving ---
    if (bodyValue === true) {
      try {
        const csv = await exportLogAsCSV(assignmentId);
        const archiveDir = path.join(__dirname, '../../uploads', `assignment_${assignmentId}`);
        if (!fs.existsSync(archiveDir)) {
          fs.mkdirSync(archiveDir, { recursive: true });
        }
        const logPath = path.join(archiveDir, 'submission_log.csv');
        fs.writeFileSync(logPath, csv);
      } catch (csvError) {
        console.error('Failed to export submission log CSV:', csvError);
        // don't fail the archive action just because CSV export failed
      }
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error beim Archivieren der Aufgabe:', error);
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

    const isTeacher = await ensureTeacherRole(teacherId);
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

// --- DOWNLOAD SUBMISSIONS AS ZIP ---
const archiver = require('archiver');

const downloadSubmissionsAsZip = async (req, res) => {
  try {
    const teacherId = Number.parseInt(req.userId, 10);
    const assignmentId = Number.parseInt(req.params.assignmentId, 10);

    const isTeacher = await ensureTeacherRole(teacherId);
    if (!isTeacher) return res.status(403).json({ success: false, message: 'Nur für Lehrer' });

    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, teacherId: teacherId },
      include: {
        class: true,
        subject: true,
        submissions: {
          include: { student: true }
        }
      }
    });

    if (!assignment) return res.status(404).json({ success: false, message: 'Aufgabe nicht gefunden' });

    const className = assignment.class ? assignment.class.name.replace(/[^a-z0-9а-яё-]/gi, '_') : 'Class';
    const subjectName = assignment.subject ? assignment.subject.name.replace(/[^a-z0-9а-яё-]/gi, '_') : 'Subject';
    const dueDateStr = assignment.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : 'NoDate';
    const zipName = `${className}_${subjectName}_${dueDateStr}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', err => { throw err; });
    archive.pipe(res);

    for (const sub of assignment.submissions) {
      if (!sub.files || sub.files.trim() === '') continue;
      try {
        const files = JSON.parse(sub.files);
        const studentName = `${sub.student.firstName}_${sub.student.lastName}`.replace(/[^a-z0-9]/gi, '_');
        
        for (const file of files) {
          const filePath = file.path ? path.resolve(__dirname, '../../', file.path) : null;
          if (filePath && fs.existsSync(filePath)) {
            const fileName = file.originalname || path.basename(filePath);
            archive.file(filePath, { name: `${studentName}/${fileName}` });
          }
        }
      } catch (e) {
        console.error('Fehler beim Parsen der Abgabedateien:', e);
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Fehler beim Erstellen der ZIP-Datei:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server Fehler bei ZIP-Erstellung: ' + error.message + ' | stack: ' + error.stack });
    }
  }
};

module.exports = {
  createAssignment,
  getClasses,
  getSubjects,
  getTeacherAssignments,
  getAssignmentSubmissions,
  downloadSubmissionsAsZip,
  gradeSubmission,
  setAssignmentArchived,
  deleteAssignment
};