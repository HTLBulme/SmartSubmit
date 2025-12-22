const express = require('express');
const router = express.Router();

// Import controllers
const loginController = require('./controllers/login.controller');
const registerController = require('./controllers/register.controller');
const adminController = require('./controllers/admin.controller');
const teacherController = require('./controllers/teacher.controller');
const studentController = require('./controllers/student.controller');

// Import middleware
const { authenticateToken, authenticateAdmin } = require('./app.middleware');
const { uploadMemory, uploadDisk } = require('./app.config');

// ================================ ADMIN CHECK (public) ================================
router.get('/admin/check', adminController.checkAdminExists);

// ================================ REGISTER PAGE (first admin only) ================================
router.post('/register', registerController.register);

// ================================ LOGIN PAGE ================================
router.post('/login', loginController.login);
router.post('/logout', loginController.logout);

// ================================ ADMIN PAGE (authenticated) ================================
router.post('/admin/import/students', authenticateAdmin, uploadMemory.single('file'), adminController.importStudents);
router.post('/admin/import/teachers', authenticateAdmin, uploadMemory.single('file'), adminController.importTeachers);

// ================================ TEACHER PAGE (authenticated) ================================
router.post('/teacher/assignments', authenticateToken, uploadDisk.array('files', 10), teacherController.createAssignment);

// ================================ STUDENT PAGE (authenticated) ================================
router.get('/student/assignments', authenticateToken, studentController.getAssignments);
router.post('/student/submit', authenticateToken, studentController.submitAssignment);
router.get('/student/submissions', authenticateToken, studentController.getMySubmissions);

module.exports = router;