


// backend/middleware/Middleware.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { prisma } from "../config/prisma";

export interface AuthRequest extends Request {
  user?: {
    id: number; // <-- Changed from string to number
    name: string;
    email: string;
    role: string; // or UserRole if imported
    createdAt?: Date;
    updatedAt?: Date;
    [key: string]: any;
  };
}


export const Protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
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

    const decoded = jwt.verify(tokenPart, secret) as JwtPayload;
    const userId = decoded.id || decoded.userId;

    if (!decoded || typeof decoded === "string" || !userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    const userRecord = await prisma.user.findUnique({
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
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// Aliases for convenience across your routes
export const authenticateToken = Protect;

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): any => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: insufficient permissions",
      });
    }
    next();
  };
};


// Add this helper/alias to your existing Middleware.ts
export const authorizeRoles = (...allowedRoles: string[]) => {
  const flattenedRoles = allowedRoles.flat();
  return (req: AuthRequest, res: Response, next: NextFunction): any => {
    if (!req.user || !flattenedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: insufficient permissions",
      });
    }
    next();
  };
};