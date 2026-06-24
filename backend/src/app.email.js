// backend/src/app.email.js

require('dotenv').config();
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
  console.warn('⚠️ Email service is not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD in .env');
}

if (transporter) {
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email service error:', error);
    } else {
      console.log('✅ Email service ready');
    }
  });
} else {
  console.warn('⚠️ Email transporter was not created due to missing email configuration.');
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

  if (!transporter) {
    const errorMessage = 'Email service is not configured';
    console.warn('⚠️', errorMessage);
    return { success: false, error: errorMessage };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: error.message };
  }
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

  if (!transporter) {
    const errorMessage = 'Email service is not configured';
    console.warn('⚠️', errorMessage);
    return { success: false, error: errorMessage };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Grade notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendSubmissionConfirmation,
  sendGradeNotification
};