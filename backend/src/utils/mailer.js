const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOtpEmail = async (to, otp) => {
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@coreinventory.io',
    to,
    subject: 'CoreInventory – Your Password Reset OTP',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #eee;border-radius:8px">
        <h2 style="color:#534AB7">CoreInventory</h2>
        <p>You requested a password reset. Use the OTP below (valid for <strong>10 minutes</strong>):</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;text-align:center;padding:24px 0;color:#534AB7">
          ${otp}
        </div>
        <p style="color:#666;font-size:13px">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
  console.log('OTP email sent:', info.messageId);
};

module.exports = { sendOtpEmail };
