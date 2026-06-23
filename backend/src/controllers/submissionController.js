const { sendSubmissionConfirmation } = require('../app.email');
const { SUBMISSIONS_DIR, prisma } = require('../app.config'); // ADD prisma here
const { validateEmail } = require('../app.utils');
const path = require('path');
const fs = require('fs');
const { logSubmission } = require('../app.submissionLog');

async function handleSubmission(req, studentId, assignmentId, file) { // ADD req as parameter
  try {
    if (!file) throw new Error('No file uploaded');

    const student = await prisma.user.findUnique({ where: { id: studentId } }); // user, not student
    if (!student) throw new Error('Student not found');

    if (!validateEmail(student.email)) {
      throw new Error('Invalid E-Mail Address of the Student');
    }

    const uniqueFilename = `${Date.now()}-${file.originalname}`;
    const savePath = path.join(SUBMISSIONS_DIR, uniqueFilename);
    fs.writeFileSync(savePath, file.buffer);

    const clientIp = req.ip;

    const submission = await prisma.submission.create({
      data: {
        studentId,
        assignmentId,
        files: JSON.stringify([{ originalName: file.originalname, storedName: uniqueFilename }]),
        submittedAt: new Date()
      },
      include: { assignment: true } // needed to access submission.assignment.title below
    });

    await logSubmission({
      studentName: `${student.firstName} ${student.lastName}`,
      filename: file.originalname,
      ip: clientIp,
      assignmentId
    });

    await sendSubmissionConfirmation(student.email, `${student.firstName} ${student.lastName}`, submission.assignment.title, submission.submittedAt);

    return { success: true, submissionId: submission.id };
  } catch (error) {
    console.error('Error during submission processing:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { handleSubmission };