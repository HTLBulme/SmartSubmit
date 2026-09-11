const express = require('express');
const router = express.Router();

// --- Import controllers ---
const loginController = require('./controllers/login.controller');
const registerController = require('./controllers/register.controller');
const adminController = require('./controllers/admin.controller');
const teacherController = require('./controllers/teacher.controller');
const studentController = require('./controllers/student.controller');
const changePasswordController = require('./controllers/changePassword.controller');//new
const roleController = require('./controllers/role.controller');
const oauthController = require('./controllers/oauth.controller');

// --- Import middleware ---
const { authenticateToken, authenticateAdmin } = require('./app.middleware');
const { uploadMemory, uploadDisk, uploadSubmissionsDisk } = require('./app.config');
const passport = require('../src/app.passport');

// --- OAUTH 2.0 GOOGLE ROUTES ---
// 1. Initiate Google Login
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// 2. Google Callback (where Google redirects after successful/failed login)
router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: 'http://localhost:5173/?error=oauth_failed', session: false }),
  oauthController.googleCallback
);


// --- ADMIN CHECK (public) ---
router.get('/admin/check', adminController.checkAdminExists);

// --- REGISTER PAGE (first admin only) ---
router.post('/register', registerController.register);

// --- LOGIN PAGE ---
router.post('/login', loginController.login);
router.post('/logout', loginController.logout);
router.post('/auth/select-role', authenticateToken, roleController.selectRole);

// --- ADMIN PAGE (authenticated) ---
router.post('/admin/import/students', authenticateAdmin, uploadMemory.single('file'), adminController.importStudents);
router.post('/admin/import/teachers', authenticateAdmin, uploadMemory.single('file'), adminController.importTeachers);
// NEW: routes for student/teacher management
router.get('/admin/classes', authenticateAdmin, adminController.getClasses);
router.get('/admin/students', authenticateAdmin, adminController.getStudentsByClass);
router.post('/admin/students', authenticateAdmin, adminController.createStudent);
router.patch('/admin/students/:id', authenticateAdmin, adminController.updateStudent);
router.get('/admin/subjects', authenticateAdmin, adminController.getSubjects);
router.get('/admin/teachers', authenticateAdmin, adminController.getTeachersBySubject);
router.post('/admin/teachers', authenticateAdmin, adminController.createTeacher);
router.patch('/admin/teachers/:id', authenticateAdmin, adminController.updateTeacher);
router.delete('/admin/users/:id', authenticateAdmin, adminController.deleteUser);

// --- TEACHER PAGE (authenticated) ---
router.post('/teacher/assignments', authenticateToken, uploadDisk.array('files', 10), teacherController.createAssignment);
router.get('/teacher/assignments', authenticateToken, teacherController.getTeacherAssignments);
router.delete('/teacher/assignments/:assignmentId', authenticateToken, teacherController.deleteAssignment);
router.get('/teacher/assignments/:assignmentId/submissions', authenticateToken, teacherController.getAssignmentSubmissions);
router.get('/teacher/assignments/:assignmentId/submissions/download', authenticateToken, teacherController.downloadSubmissionsAsZip);
router.get('/teacher/assignments/:assignmentId/submissions/log', authenticateToken, teacherController.downloadSubmissionLog);
router.post('/teacher/assignments/:assignmentId/reminders', authenticateToken, teacherController.sendSubmissionReminders);
router.patch('/teacher/assignments/:assignmentId/archive', authenticateToken, teacherController.setAssignmentArchived);//Partial update, only modifies the specified fields.
router.patch('/teacher/submissions/:submissionId', authenticateToken, teacherController.gradeSubmission);

// --- STUDENT PAGE (authenticated) ---
router.get('/student/assignments', authenticateToken, studentController.getAssignments);
router.post('/student/submit', authenticateToken, uploadSubmissionsDisk.array('files', 10), studentController.submitAssignment);
router.post('/student/delete-file', authenticateToken, studentController.deleteSubmissionFile);
router.get('/student/submissions', authenticateToken, studentController.getMySubmissions);

// --- CHANGE PASSWORD ---
router.post('/change-password', authenticateToken, changePasswordController.changePassword);
// --- CLASSES & SUBJECTS (authenticated) ---
router.get('/classes', authenticateToken, teacherController.getClasses);
router.get('/subjects', authenticateToken, teacherController.getSubjects);

module.exports = router;
