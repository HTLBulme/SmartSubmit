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
const passport = require('../src/app.passport');
const jwt = require('jsonwebtoken');

// --- OAUTH 2.0 GOOGLE ROUTES ---
// 1. Initiate Google Login
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// 2. Google Callback (where Google redirects after successful/failed login)
router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: 'http://localhost:5173/?error=oauth_failed', session: false }),
  (req, res) => {
    try {
      const user = req.user;
      
      // We need to determine the single role to pass, or pass all roles
      // For simplicity, we just take the first role's name if it exists
      let roleName = "Student";
      if (user.userRoles && user.userRoles.length > 0) {
        roleName = user.userRoles[0].role.name;
      }

// Create JWT token (Must match what app.utils.js does: 'userId')
      const token = jwt.sign(
        { 
          userId: user.id 
        },
        process.env.JWT_SECRET || 'super_secret_jwt_key_123',
        { expiresIn: '7d' }
      );

      // Redirect back to frontend frontend login page with the token
      // You might need to change localhost:5173 to your production URL later
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/?token=${token}&role=${roleName}`);
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.redirect('http://localhost:5173/?error=token_generation_failed');
    }
  }
);


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

// --- TEACHER PAGE (authenticated) ---
router.post('/teacher/assignments', authenticateToken, uploadDisk.array('files', 10), teacherController.createAssignment);
router.get('/teacher/assignments', authenticateToken, teacherController.getTeacherAssignments);
router.delete('/teacher/assignments/:assignmentId', authenticateToken, teacherController.deleteAssignment);
router.get('/teacher/assignments/:assignmentId/submissions', authenticateToken, teacherController.getAssignmentSubmissions);
router.patch('/teacher/assignments/:assignmentId/archive', authenticateToken, teacherController.setAssignmentArchived);
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