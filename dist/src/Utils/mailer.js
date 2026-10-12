"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
/**
 * Send an email using Gmail SMTP
 */
async function sendEmail({ to, subject, html, text, from }) {
    const transporter = nodemailer_1.default.createTransport({
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
    }
    catch (error) {
        console.error("Gmail SMTP email error:", error);
        throw error;
    }
}
exports.default = { sendEmail };
