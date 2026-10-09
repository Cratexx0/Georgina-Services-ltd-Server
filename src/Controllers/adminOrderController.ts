// controllers/adminOrderController.ts
import type { Request, Response } from "express";
import { prisma } from "../config/prisma"; // Adjust relative path as needed
import { OrderStatus } from "@prisma/client";

// Get all orders (admin only)
export const getAllOrders = async (req: Request, res: Response): Promise<any> => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, images: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Get order by ID (admin - can access any order)
export const getOrderById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const orderId = Number(id);

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid order ID format",
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, images: true },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Update order status (admin only)
export const updateOrderStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const orderId = Number(id);

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid order ID format",
      });
    }

    const normalizedStatus = String(status).toUpperCase() as OrderStatus;
    const validStatuses = Object.values(OrderStatus);

    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status",
      });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: normalizedStatus },
    });

    return res.status(200).json({
      success: true,
      data: updatedOrder,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Delete order (admin only)
export const deleteOrder = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const orderId = Number(id);

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid order ID format",
      });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    await prisma.order.delete({ where: { id: orderId } });

    return res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Get order statistics (admin only)
export const getOrderStats = async (req: Request, res: Response): Promise<any> => {
  try {
    const [
      totalOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      revenueResult,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: OrderStatus.CONFIRMED } }),
      prisma.order.count({ where: { status: OrderStatus.PROCESSING } }),
      prisma.order.count({ where: { status: OrderStatus.SHIPPED } }),
      prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      prisma.order.aggregate({
        where: { status: OrderStatus.DELIVERED },
        _sum: { totalAmount: true },
      }),
    ]);

    const totalRevenue = revenueResult._sum.totalAmount || 0;

    return res.status(200).json({
      success: true,
      data: {
        totalOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};


