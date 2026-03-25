const express = require('express');
const router = express.Router();

// --- Import controllers ---
const loginController = require('./controllers/login.controller');
const registerController = require('./controllers/register.controller');
const adminController = require('./controllers/admin.controller');
const teacherController = require('./controllers/teacher.controller');
const studentController = require('./controllers/student.controller');
const changePasswordController = require('./controllers/changePassword.controller');//new

// --- Import middleware ---
const { authenticateToken, authenticateAdmin } = require('./app.middleware');
const { uploadMemory, uploadDisk, uploadSubmissionsDisk } = require('./app.config');

// --- ADMIN CHECK (public) ---
router.get('/admin/check', adminController.checkAdminExists);

// --- REGISTER PAGE (first admin only) ---
router.post('/register', registerController.register);

// --- LOGIN PAGE ---
router.post('/login', loginController.login);
router.post('/logout', loginController.logout);

// --- ADMIN PAGE (authenticated) ---
router.post('/admin/import/students', authenticateAdmin, uploadMemory.single('file'), adminController.importStudents);
router.post('/admin/import/teachers', authenticateAdmin, uploadMemory.single('file'), adminController.importTeachers);
// NEW: routes for student/teacher management
router.get('/admin/classes', authenticateAdmin, adminController.getClasses);
router.get('/admin/students', authenticateAdmin, adminController.getStudentsByClass);
router.get('/admin/subjects', authenticateAdmin, adminController.getSubjects);
router.get('/admin/teachers', authenticateAdmin, adminController.getTeachersBySubject);
router.delete('/admin/users/:id', authenticateAdmin, adminController.deleteUser);

// --- TEACHER PAGE (authenticated) ---
router.post('/teacher/assignments', authenticateToken, uploadDisk.array('files', 10), teacherController.createAssignment);
router.get('/teacher/assignments', authenticateToken, teacherController.getTeacherAssignments);
router.delete('/teacher/assignments/:assignmentId', authenticateToken, teacherController.deleteAssignment);
router.get('/teacher/assignments/:assignmentId/submissions', authenticateToken, teacherController.getAssignmentSubmissions);
router.patch('/teacher/assignments/:assignmentId/archive', authenticateToken, teacherController.setAssignmentArchived);//Partial update, only modifies the specified fields.
router.patch('/teacher/submissions/:submissionId', authenticateToken, teacherController.gradeSubmission);

// --- STUDENT PAGE (authenticated) ---
router.get('/student/assignments', authenticateToken, studentController.getAssignments);
router.post('/student/submit', authenticateToken, uploadSubmissionsDisk.array('files', 10), studentController.submitAssignment);
router.get('/student/submissions', authenticateToken, studentController.getMySubmissions);

// --- CHANGE PASSWORD ---
router.post('/change-password', authenticateToken, changePasswordController.changePassword);
// --- CLASSES & SUBJECTS (authenticated) ---
router.get('/classes', authenticateToken, teacherController.getClasses);
router.get('/subjects', authenticateToken, teacherController.getSubjects);

module.exports = router;