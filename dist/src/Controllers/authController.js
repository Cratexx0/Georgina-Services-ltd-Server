"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminChangeOwnPassword = exports.adminChangePassword = exports.verifyToken = exports.userInfo = exports.resetPassword = exports.forgotPassword = exports.socialLoginFacebook = exports.socialLoginGoogle = exports.loginAdmin = exports.loginUser = exports.registerAdmin = exports.registerUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const axios_1 = __importDefault(require("axios"));
const google_auth_library_1 = require("google-auth-library");
const prisma_1 = require("../config/prisma"); // Adjust relative path as needed
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// Reusable mail transporter builder with SMTP override + Gmail fallback
const buildMailTransporter = () => {
    if (process.env.SMTP_HOST) {
        return nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || "587", 10),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    return nodemailer_1.default.createTransport({
        service: "Gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};
// Register User (for e-commerce users)
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email, and password are required",
            });
        }
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists with this email" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "USER",
            },
        });
        return res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                contact: user.contact,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error("Error registering user", error);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.registerUser = registerUser;
// Register Admin (for dashboard admins/staff)
const registerAdmin = async (req, res) => {
    try {
        const { name, email, password, contact } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email, and password are required",
            });
        }
        const existingAdmin = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin already exists with this email" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const admin = await prisma_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                contact,
                role: "ADMIN",
            },
        });
        return res.status(201).json({
            message: "Admin registered successfully",
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                contact: admin.contact,
                role: admin.role,
            },
        });
    }
    catch (error) {
        console.error("Error registering admin", error);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.registerAdmin = registerAdmin;
// Login User (for e-commerce users)
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        if (user.role !== "USER") {
            return res.status(403).json({ message: "Access denied. User login only." });
        }
        if (!user.password) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const validPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "8h" });
        return res.status(200).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error("Error logging in user", error);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.loginUser = loginUser;
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const admin = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!admin) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        if (admin.role !== "ADMIN") {
            return res.status(403).json({ message: "Access denied. Admin login only." });
        }
        if (!admin.password) {
            return res.status(500).json({ message: "Account configuration error" });
        }
        const validPassword = await bcryptjs_1.default.compare(password, admin.password);
        if (!validPassword) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const token = jsonwebtoken_1.default.sign({ userId: admin.id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: "8h" });
        return res.status(200).json({
            token,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
            },
        });
    }
    catch (error) {
        console.error("Error logging in admin", error);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.loginAdmin = loginAdmin;
// Google OAuth login/register
const socialLoginGoogle = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ message: "idToken is required" });
        }
        if (!process.env.GOOGLE_CLIENT_ID) {
            return res.status(500).json({ message: "Google OAuth is not configured" });
        }
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return res.status(400).json({ message: "Unable to verify Google account" });
        }
        const email = payload.email.toLowerCase();
        const name = payload.name || payload.given_name || payload.family_name || email;
        let user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma_1.prisma.user.create({
                data: {
                    name,
                    email,
                    password: "", // Passwordless OAuth user
                    role: "USER",
                },
            });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "8h" });
        return res.status(200).json({
            token,
            provider: "google",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error("Error with Google OAuth", error);
        return res.status(500).json({ message: "Google authentication failed" });
    }
};
exports.socialLoginGoogle = socialLoginGoogle;
// Facebook OAuth login/register
const socialLoginFacebook = async (req, res) => {
    try {
        const { accessToken } = req.body;
        if (!accessToken) {
            return res.status(400).json({ message: "accessToken is required" });
        }
        if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
            return res.status(500).json({ message: "Facebook OAuth is not configured" });
        }
        const appAccessToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
        const debugResponse = await axios_1.default.get("https://graph.facebook.com/debug_token", {
            params: {
                input_token: accessToken,
                access_token: appAccessToken,
            },
        });
        const tokenData = debugResponse.data?.data;
        if (!tokenData?.is_valid || tokenData.app_id !== process.env.FACEBOOK_APP_ID) {
            return res.status(401).json({ message: "Invalid Facebook token" });
        }
        const profileResponse = await axios_1.default.get("https://graph.facebook.com/me", {
            params: {
                access_token: accessToken,
                fields: "id,name,email",
            },
        });
        const { id, name, email: fbEmail } = profileResponse.data || {};
        const email = (fbEmail || `fb-${id}@facebook.com`).toLowerCase();
        const displayName = name || "Facebook User";
        let user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma_1.prisma.user.create({
                data: {
                    name: displayName,
                    email,
                    password: "",
                    role: "USER",
                },
            });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "8h" });
        return res.status(200).json({
            token,
            provider: "facebook",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            facebookId: id,
            rawEmail: fbEmail || null,
        });
    }
    catch (error) {
        console.error("Error with Facebook OAuth", error.response?.data || error);
        return res.status(500).json({ message: "Facebook authentication failed" });
    }
};
exports.socialLoginFacebook = socialLoginFacebook;
// Forgot Password
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const resetToken = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "12h" });
        const transporter = buildMailTransporter();
        await transporter.verify();
        const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
        const resetLink = `${clientUrl}/reset-password?token=${resetToken}`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset Request",
            html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link will expire in 15 minutes.</p>`,
        };
        await transporter.sendMail(mailOptions);
        return res.json({ message: "Password reset email sent. Please check your inbox." });
    }
    catch (error) {
        console.error("Error in forgot password", error);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.forgotPassword = forgotPassword;
// Reset Password
const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });
        return res.json({ message: "Password reset successfully." });
    }
    catch (error) {
        console.error("Error resetting password", error);
        return res.status(400).json({ message: "Invalid or expired token." });
    }
};
exports.resetPassword = resetPassword;
// Get User Info
const userInfo = async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: isNaN(userId) ? req.params.id : userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                contact: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.json({ user });
    }
    catch (error) {
        console.error("Error fetching user info", error);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.userInfo = userInfo;
// Verify Token Endpoint
const verifyToken = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Access token is required",
            });
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access token is required",
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId || decoded.id || decoded.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid token structure - no user ID found",
            });
        }
        const parsedUserId = Number(userId);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: isNaN(parsedUserId) ? userId : parsedUserId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                contact: true,
            },
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }
        return res.status(200).json({
            success: true,
            data: { user },
            message: "Token is valid",
        });
    }
    catch (error) {
        console.error("Token verification error:", error);
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ success: false, message: "Invalid token" });
        }
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Token has expired" });
        }
        return res.status(500).json({
            success: false,
            message: "Server error during token verification",
        });
    }
};
exports.verifyToken = verifyToken;
const adminChangePassword = async (req, res) => {
    try {
        const { userId, newPassword, confirmPassword } = req.body;
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "Access token is required" });
        }
        const token = authHeader.split(" ")[1];
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const requesterId = Number(decoded.userId);
        const requester = await prisma_1.prisma.user.findUnique({
            where: { id: isNaN(requesterId) ? decoded.userId : requesterId },
        });
        if (!requester || requester.role !== "ADMIN") {
            return res.status(403).json({ success: false, message: "Access denied. Admin privileges required." });
        }
        if (!userId || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: "User ID, new password, and confirm password are required" });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
        }
        const targetUserId = Number(userId);
        const userToUpdate = await prisma_1.prisma.user.findUnique({
            where: { id: isNaN(targetUserId) ? userId : targetUserId },
        });
        if (!userToUpdate) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: userToUpdate.id },
            data: { password: hashedPassword },
        });
        try {
            const transporter = buildMailTransporter();
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: userToUpdate.email,
                subject: "Your Password Has Been Updated",
                html: `
          <p>Hello ${userToUpdate.name},</p>
          <p>Your password has been updated by an administrator.</p>
          <p>If you did not request this change, please contact our support team immediately.</p>
          <p>Best regards,<br>The Admin Team</p>
        `,
            };
            await transporter.sendMail(mailOptions);
        }
        catch (emailError) {
            console.error("Error sending notification email:", emailError);
        }
        return res.status(200).json({
            success: true,
            message: "Password updated successfully",
            data: {
                userId: userToUpdate.id,
                email: userToUpdate.email,
                name: userToUpdate.name,
                updatedBy: requester.id,
                updatedByEmail: requester.email,
            },
        });
    }
    catch (error) {
        console.error("Error in admin change password:", error);
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ success: false, message: "Invalid token" });
        }
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Token has expired" });
        }
        return res.status(500).json({ success: false, message: "Server error during password change" });
    }
};
exports.adminChangePassword = adminChangePassword;
const adminChangeOwnPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "Access token is required" });
        }
        const token = authHeader.split(" ")[1];
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const adminId = Number(decoded.userId);
        const admin = await prisma_1.prisma.user.findUnique({
            where: { id: isNaN(adminId) ? decoded.userId : adminId },
        });
        if (!admin || admin.role !== "ADMIN") {
            return res.status(403).json({ success: false, message: "Access denied. Admin privileges required." });
        }
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: "Current password, new password, and confirm password are required" });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "New passwords do not match" });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "New password must be at least 6 characters long" });
        }
        if (!admin.password) {
            return res.status(400).json({ success: false, message: "Account configuration error" });
        }
        const validPassword = await bcryptjs_1.default.compare(currentPassword, admin.password);
        if (!validPassword) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: admin.id },
            data: { password: hashedPassword },
        });
        return res.status(200).json({
            success: true,
            message: "Your password has been updated successfully",
        });
    }
    catch (error) {
        console.error("Error in admin change own password:", error);
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ success: false, message: "Invalid token" });
        }
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Token has expired" });
        }
        return res.status(500).json({ success: false, message: "Server error during password change" });
    }
};
exports.adminChangeOwnPassword = adminChangeOwnPassword;
