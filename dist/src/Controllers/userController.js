"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.getAllUsers = exports.userInfo = exports.createUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../config/prisma"); // Adjust relative path as needed
const client_1 = require("@prisma/client");
// Create User
const createUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
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
                role: client_1.UserRole.USER,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });
        return res.status(201).json({
            message: "User created successfully",
            user,
        });
    }
    catch (error) {
        console.error("Error creating user", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};
exports.createUser = createUser;
// Get Current User Info
const userInfo = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Not authorized" });
        }
        const userId = Number(req.user.id);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: isNaN(userId) ? req.user.id : userId },
            select: {
                id: true,
                name: true,
                email: true,
                contact: true,
                role: true,
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
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};
exports.userInfo = userInfo;
// Get All Users (Admin Only)
const getAllUsers = async (req, res) => {
    try {
        const user = req.user;
        if (!user || user.role !== "ADMIN") {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }
        const users = await prisma_1.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                contact: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: "desc" },
        });
        return res.status(200).json(users);
    }
    catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};
exports.getAllUsers = getAllUsers;
// Update User (Including Role)
const updateUser = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "ADMIN") {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }
        const { id } = req.params;
        const { name, email, role, contact } = req.body;
        const userId = Number(id);
        if (isNaN(userId)) {
            return res.status(400).json({ message: "Invalid user ID format" });
        }
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }
        const updateData = {};
        if (name)
            updateData.name = name;
        if (email)
            updateData.email = email;
        if (contact !== undefined)
            updateData.contact = contact;
        if (role) {
            const normalizedRole = String(role).toUpperCase();
            if (Object.values(client_1.UserRole).includes(normalizedRole)) {
                updateData.role = normalizedRole;
            }
        }
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                contact: true,
                role: true,
                updatedAt: true,
            },
        });
        return res.status(200).json({ message: "User updated successfully", user: updatedUser });
    }
    catch (error) {
        console.error("Error updating user", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};
exports.updateUser = updateUser;
// Delete User (Admin Only)
const deleteUser = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "ADMIN") {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }
        const { id } = req.params;
        const userId = Number(id);
        if (isNaN(userId)) {
            return res.status(400).json({ message: "Invalid user ID format" });
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        await prisma_1.prisma.user.delete({ where: { id: userId } });
        return res.status(200).json({ message: "User deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting user", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};
exports.deleteUser = deleteUser;
