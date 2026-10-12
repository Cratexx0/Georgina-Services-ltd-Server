// controllers/userController.ts
import type { Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../Middleware/Middelware.js";
import { UserRole } from "../generated/prisma/enums";

// Create User
export const createUser = async (
	req: AuthRequest,
	res: Response,
): Promise<any> => {
	try {
		const { name, email, password } = req.body;

		if (!name || !email || !password) {
			return res.status(400).json({ message: "All fields are required" });
		}

		const existingUser = await prisma.user.findUnique({ where: { email } });
		if (existingUser) {
			return res
				.status(400)
				.json({ message: "User already exists with this email" });
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const user = await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
				role: UserRole.USER,
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
	} catch (error: any) {
		console.error("Error creating user", error);
		return res
			.status(500)
			.json({ message: "Server error", error: error.message });
	}
};

// Get Current User Info
export const userInfo = async (
	req: AuthRequest,
	res: Response,
): Promise<any> => {
	try {
		if (!req.user || !req.user.id) {
			return res.status(401).json({ message: "Not authorized" });
		}

		const userId = Number(req.user.id);
		const user = await prisma.user.findUnique({
			where: { id: isNaN(userId) ? (req.user.id as any) : userId },
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
	} catch (error: any) {
		console.error("Error fetching user info", error);
		return res
			.status(500)
			.json({ message: "Server error", error: error.message });
	}
};

// Get All Users (Admin Only)
export const getAllUsers = async (
	req: AuthRequest,
	res: Response,
): Promise<any> => {
	try {
		const user = req.user;

		if (!user || user.role !== "ADMIN") {
			return res.status(403).json({ message: "Access denied. Admins only." });
		}

		const users = await prisma.user.findMany({
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
	} catch (error: any) {
		console.error("Error fetching users:", error);
		return res
			.status(500)
			.json({ message: "Server error", error: error.message });
	}
};

// Update User (Including Role)
export const updateUser = async (
	req: AuthRequest,
	res: Response,
): Promise<any> => {
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

		const existingUser = await prisma.user.findUnique({
			where: { id: userId },
		});
		if (!existingUser) {
			return res.status(404).json({ message: "User not found" });
		}

		const updateData: any = {};
		if (name) updateData.name = name;
		if (email) updateData.email = email;
		if (contact !== undefined) updateData.contact = contact;
		if (role) {
			const normalizedRole = String(role).toUpperCase() as UserRole;
			if (Object.values(UserRole).includes(normalizedRole)) {
				updateData.role = normalizedRole;
			}
		}

		const updatedUser = await prisma.user.update({
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

		return res
			.status(200)
			.json({ message: "User updated successfully", user: updatedUser });
	} catch (error: any) {
		console.error("Error updating user", error);
		return res
			.status(500)
			.json({ message: "Server error", error: error.message });
	}
};

// Delete User (Admin Only)
export const deleteUser = async (
	req: AuthRequest,
	res: Response,
): Promise<any> => {
	try {
		if (!req.user || req.user.role !== "ADMIN") {
			return res.status(403).json({ message: "Access denied. Admins only." });
		}

		const { id } = req.params;
		const userId = Number(id);

		if (isNaN(userId)) {
			return res.status(400).json({ message: "Invalid user ID format" });
		}

		const user = await prisma.user.findUnique({ where: { id: userId } });
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		await prisma.user.delete({ where: { id: userId } });

		return res.status(200).json({ message: "User deleted successfully" });
	} catch (error: any) {
		console.error("Error deleting user", error);
		return res
			.status(500)
			.json({ message: "Server error", error: error.message });
	}
};
