"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.requireRole = exports.authenticateToken = exports.Protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const Protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Not authorized",
            });
        }
        const tokenPart = authHeader.split(" ")[1];
        if (!tokenPart) {
            return res.status(401).json({
                success: false,
                message: "Not authorized, token missing",
            });
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({
                success: false,
                message: "JWT secret is not configured",
            });
        }
        const decoded = jsonwebtoken_1.default.verify(tokenPart, secret);
        const userId = decoded.id || decoded.userId;
        if (!decoded || typeof decoded === "string" || !userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid token payload",
            });
        }
        const userRecord = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!userRecord) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }
        req.user = userRecord;
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid token",
        });
    }
};
exports.Protect = Protect;
// Aliases for convenience across your routes
exports.authenticateToken = exports.Protect;
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied: insufficient permissions",
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
// Add this helper/alias to your existing Middleware.ts
const authorizeRoles = (...allowedRoles) => {
    const flattenedRoles = allowedRoles.flat();
    return (req, res, next) => {
        if (!req.user || !flattenedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied: insufficient permissions",
            });
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
