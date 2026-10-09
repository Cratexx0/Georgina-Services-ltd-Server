import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";

// Extend Express Request to include the authenticated user property
export interface AuthenticatedRequest extends Request {
  user?: any; // You can replace 'any' with your generated Prisma User type if preferred
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const authHeader = req.header("Authorization");
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number | string };
    
    // Since your User ID in the Prisma schema is an Int, ensure it's parsed as a number
    const userId = Number(decoded.userId);
    if (isNaN(userId)) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // Find the user using Prisma's findUnique instead of Sequelize's findByPk
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user; // Attach user to request object
    next();
  } catch (error: any) {
    return res.status(401).json({ 
      message: "Invalid or expired token", 
      error: error.message 
    });
  }
};

export default authenticate;