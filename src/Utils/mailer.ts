import nodemailer from "nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

/**
 * Send an email using Gmail SMTP
 */
export async function sendEmail({ to, subject, html, text, from }: EmailOptions): Promise<boolean> {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: from || process.env.EMAIL_USER,
    to,
    subject,
    html,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Gmail SMTP email error:", error);
    throw error;
  }
}

export default { sendEmail };