const { sendSubmissionConfirmation } = require('../app.email');
const { SUBMISSIONS_DIR } = require('../app.config');
const { validateEmail } = require('../app.utils');
const path = require('path');
const fs = require('fs');

async function handleSubmission(studentId, assignmentId, file) {
  try {
    // --- Validate file and student email ---
    if (!file) throw new Error('Keine Datei hochgeladen');
    
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new Error('Student nicht gefunden');
    
    if (!validateEmail(student.email)) {
      console.warn(`Ungültige E-Mail-Adresse für Student ${studentId}: ${student.email}`);
      throw new Error('Ungültige E-Mail-Adresse des Studenten');
    }
    
    // --- Save file to disk ---
    const uniqueFilename = `${Date.now()}-${file.originalname}`;
    const savePath = path.join(SUBMISSIONS_DIR, uniqueFilename);
    
    fs.writeFileSync(savePath, file.buffer);
    
    // --- Create submission record in database ---
    const submission = await prisma.submission.create({
      data: {
        studentId,
        assignmentId,
        filename: uniqueFilename,
        submittedAt: new Date()
      }
    });
    
    // --- Send confirmation email ---
    await sendSubmissionConfirmation(student.email, student.name, submission.assignment.title, submission.submittedAt);
    
    return { success: true, submissionId: submission.id };
  } catch (error) {
    console.error('Fehler bei der Bearbeitung der Abgabe:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  handleSubmission
};