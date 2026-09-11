// backend/src/app.email.js

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
const nodemailer = require('nodemailer');

const emailHost = process.env.EMAIL_HOST;
const emailPort = Number(process.env.EMAIL_PORT || 587);
const emailSecure = String(process.env.EMAIL_SECURE).toLowerCase() === 'true';
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
const emailFrom = process.env.EMAIL_FROM || `"SmartSubmit" <${emailUser}>`;

let transporter = null;
if (emailHost && emailUser && emailPassword) {
  transporter = nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailSecure,
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });
} else {
  const missing = [
    !emailHost && 'EMAIL_HOST',
    !emailUser && 'EMAIL_USER',
    !emailPassword && 'EMAIL_PASSWORD (or EMAIL_PASS)',
  ].filter(Boolean);
  console.warn(`⚠️ Email service is not configured. Missing: ${missing.join(', ')}`);
}

function sanitizeSmtpMessage(value) {
  let message = String(value || 'Unknown SMTP error').replace(/[\r\n]+/g, ' ').slice(0, 500);
  if (emailPassword) message = message.split(emailPassword).join('[redacted]');
  return message;
}

function getSafeSmtpError(error) {
  return {
    code: String(error?.code || 'SMTP_ERROR'),
    command: String(error?.command || 'unknown'),
    message: sanitizeSmtpMessage(error?.message),
  };
}

function logSmtpError(context, error) {
  const safeError = getSafeSmtpError(error);
  console.error(`❌ ${context}:`, safeError);
  return safeError;
}

async function verifyEmailTransport() {
  if (!transporter) {
    const result = {
      success: false,
      configured: false,
      code: 'EMAIL_NOT_CONFIGURED',
      command: 'CONFIG',
      message: 'Email service is not configured',
    };
    console.warn('⚠️ SMTP verification skipped: email service is not configured.');
    return result;
  }

  try {
    await transporter.verify();
    console.log(`✅ SMTP ready (${emailHost}:${emailPort}, secure=${emailSecure})`);
    return { success: true, configured: true };
  } catch (error) {
    return { success: false, configured: true, ...logSmtpError('SMTP verification failed', error) };
  }
}

async function sendWithTransport(mailOptions, emailType) {
  if (!transporter) {
    return {
      success: false,
      code: 'EMAIL_NOT_CONFIGURED',
      command: 'CONFIG',
      error: 'Email service is not configured',
    };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ ${emailType} sent:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const safeError = logSmtpError(`${emailType} failed`, error);
    return {
      success: false,
      code: safeError.code,
      command: safeError.command,
      error: safeError.message,
    };
  }
}

/**
 * Send submission confirmation email
 */
async function sendSubmissionConfirmation(studentEmail, studentName, assignmentTitle, submittedAt) {
  const mailOptions = {
    from: emailFrom,
    to: studentEmail,
    subject: `✅ Submission confirmed: ${assignmentTitle}`,
    
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px; }
          .header { background-color: #1d77e8; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background-color: white; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
          .info-box { background-color: #e8f4fd; border-left: 4px solid #1d77e8; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SmartSubmit</h1>
          </div>
          <div class="content">
            <div class="success-icon">✅</div>
            
            <h2>Hello ${studentName},</h2>
            
            <p>You have successfully submitted your assignment!</p>
            
            <div class="info-box">
              <strong>Assignment:</strong> ${assignmentTitle}<br>
              <strong>Submitted on:</strong> ${new Date(submittedAt).toLocaleString('de-AT')}<br>
              <strong>Status:</strong> Submitted ✓
            </div>
            
            <p>Your teacher will evaluate the submission as soon as possible.</p>
            
            <p>Good luck!<br>
            Your SmartSubmit Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>HTL Bulme Graz-Gösting</p>
          </div>
        </div>
      </body>
      </html>
    `,
    
    text: `
Hello ${studentName},

Your assignment has been submitted successfully!

Assignment: ${assignmentTitle}
Submitted on: ${new Date(submittedAt).toLocaleString('de-AT')}
Status: Submitted ✓

Your teacher will evaluate the submission as soon as possible.

Good luck!
Your SmartSubmit Team
    `
  };

  return sendWithTransport(mailOptions, 'Submission confirmation');
}

/**
 * Send grade notification email
 */
async function sendGradeNotification(studentEmail, studentName, assignmentTitle, grade, feedback) {
  const mailOptions = {
    from: emailFrom,
    to: studentEmail,
    subject: `📊 Grade received: ${assignmentTitle}`,
    
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px; }
          .header { background-color: #1d77e8; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background-color: white; padding: 30px; border-radius: 0 0 10px 10px; }
          .grade-box { background-color: #e8f4fd; border-left: 4px solid #1d77e8; padding: 20px; margin: 20px 0; font-size: 18px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SmartSubmit</h1>
          </div>
          <div class="content">
            <h2>Hello ${studentName},</h2>
            <p>You have received a grade for your assignment.</p>
            
            <div class="grade-box">
              <strong>Assignment:</strong> ${assignmentTitle}<br>
              <strong>Grade:</strong> ${grade}%<br>
              ${feedback ? `<br><strong>Feedback:</strong><br>${feedback}` : ''}
            </div>
            
            <p>You can view the complete evaluation in SmartSubmit.</p>
            
            <p>Good luck!<br>Your SmartSubmit Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>HTL Bulme Graz-Gösting</p>
          </div>
        </div>
      </body>
      </html>
    `,
    
    text: `
Hello ${studentName},

You have received a grade for your assignment.

Assignment: ${assignmentTitle}
Grade: ${grade}%
${feedback ? `Feedback: ${feedback}` : ''}

Good luck!
Your SmartSubmit Team
    `
  };

  return sendWithTransport(mailOptions, 'Grade notification');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendAssignmentReminder(studentEmail, studentName, assignmentTitle, dueDate) {
  const parsedDueDate = new Date(dueDate);
  const due = Number.isNaN(parsedDueDate.getTime()) ? 'nicht angegeben' : parsedDueDate.toLocaleString('de-AT');
  const subjectTitle = String(assignmentTitle ?? '').replace(/[\r\n]+/g, ' ').trim();
  const safeName = escapeHtml(studentName);
  const safeTitle = escapeHtml(assignmentTitle);
  const mailOptions = {
    from: emailFrom,
    to: studentEmail,
    subject: `Erinnerung: ${subjectTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
        <h2>SmartSubmit</h2>
        <p>Hallo ${safeName},</p>
        <p>für die Aufgabe <strong>${safeTitle}</strong> ist noch keine Abgabe vorhanden.</p>
        <p><strong>Abgabetermin:</strong> ${escapeHtml(due)}</p>
        <p>Bitte reiche die Aufgabe rechtzeitig über SmartSubmit ein.</p>
      </div>
    `,
    text: `Hallo ${studentName},\n\nfür die Aufgabe "${assignmentTitle}" ist noch keine Abgabe vorhanden.\nAbgabetermin: ${due}\n\nBitte reiche die Aufgabe rechtzeitig über SmartSubmit ein.`
  };

  return sendWithTransport(mailOptions, 'Assignment reminder');
}

module.exports = {
  sendSubmissionConfirmation,
  sendGradeNotification,
  sendAssignmentReminder,
  verifyEmailTransport,
};
