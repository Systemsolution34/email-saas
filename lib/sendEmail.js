const nodemailer = require('nodemailer');

// Create a transporter using Gmail's SMTP server
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,  // Your Gmail email address (from .env)
    pass: process.env.GMAIL_APP_PASSWORD,  // The Gmail App Password (from .env)
  },
});

// Function to send an email
function sendEmail(to, subject, body) {
  const mailOptions = {
    from: `"${process.env.SENDER_NAME}" <${process.env.GMAIL_EMAIL}>`, // Sender's email (from .env)
    to: to,                       // Recipient's email
    subject: subject,             // Email subject
    text: body,                   // Plain text or HTML body
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

module.exports = sendEmail;