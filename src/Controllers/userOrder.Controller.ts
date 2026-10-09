// controllers/userOrderController.ts
import type { Response } from "express";
import { prisma } from "../config/prisma"; // Adjust relative path as needed
import { OrderStatus } from "@prisma/client";
import type { AuthRequest } from "../Middleware/Middelware.js";

export const userOrderController = {
  // Create a new order
  createOrder: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      const { items, totalAmount, shippingAddress, paymentMethod } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Not authorized" });
      }

      console.log("🔐 Creating order for user:", userId);
      console.log("📦 Order items:", items);

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Order items are required",
        });
      }

      // Check for duplicate order (created in last 1 minute with same total)
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentOrder = await prisma.order.findFirst({
        where: {
          userId,
          status: OrderStatus.PENDING,
          totalAmount: Number(totalAmount),
          createdAt: { gte: oneMinuteAgo },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (recentOrder) {
        console.log(`♻️ Preventing duplicate - returning existing order ${recentOrder.id}`);
        return res.status(200).json({
          success: true,
          message: "Order already exists",
          data: recentOrder,
          isDuplicate: true,
        });
      }

      // Fetch product details to grab images
      const productIds = items.map((item: any) => Number(item.productId));
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, images: true },
      });

      const productMap = products.reduce((map: Record<number, any>, product) => {
        map[product.id] = product;
        return map;
      }, {});

      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Create order and order items atomically using Prisma
      const order = await prisma.order.create({
        data: {
          orderNumber,
          userId,
          totalAmount: Number(totalAmount),
          shippingAddress: shippingAddress || null,
          paymentMethod: paymentMethod || null,
          status: OrderStatus.PENDING,
          items: {
            create: items.map((item: any) => {
              const product = productMap[Number(item.productId)];
              let imageUrl: string | null = null;
              if (product && product.images && Array.isArray(product.images) && product.images.length > 0) {
                imageUrl = String(product.images[0]);
              }

              return {
                productId: Number(item.productId),
                productName: item.productName,
                image: imageUrl,
                quantity: parseInt(item.quantity, 10) || 1,
                price: Number(item.price),
              };
            }),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      return res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: order,
      });
    } catch (error: any) {
      console.error("Error creating order:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create order",
        error: error.message,
      });
    }
  },

  // Get user's orders
  getMyOrders: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Not authorized" });
      }

      console.log("🔐 Fetching orders for user:", userId);

      const orders = await prisma.order.findMany({
        where: { userId },
        include: {
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

      console.log("✅ Found orders:", orders.length);

      return res.json({
        success: true,
        data: orders,
        message: "Orders retrieved successfully",
      });
    } catch (error: any) {
      console.error("❌ Error fetching user orders:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch orders",
        error: error.message,
      });
    }
  },

  // Get specific order by orderNumber
  getOrderById: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      const orderNumber = String(req.params.id);

      if (!userId) {
        return res.status(401).json({ success: false, message: "Not authorized" });
      }

      console.log("🔐 Fetching order:", orderNumber, "for user:", userId);

      const order = await prisma.order.findFirst({
        where: {
          orderNumber,
          userId,
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, price: true, images: true },
              },
            },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      return res.json({
        success: true,
        data: order,
        message: "Order retrieved successfully",
      });
    } catch (error: any) {
      console.error("Error fetching order:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch order",
        error: error.message,
      });
    }
  },

  // Cancel order
  cancelOrder: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      const orderNumber = String(req.params.id);

      if (!userId) {
        return res.status(401).json({ success: false, message: "Not authorized" });
      }

      console.log("🔐 Cancelling order:", orderNumber, "for user:", userId);

      const order = await prisma.order.findFirst({
        where: {
          orderNumber,
          userId,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (order.status !== OrderStatus.PENDING) {
        return res.status(400).json({
          success: false,
          message: `Order cannot be cancelled. Current status: ${order.status}`,
        });
      }

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });

      return res.json({
        success: true,
        message: "Order cancelled successfully",
        data: updatedOrder,
      });
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to cancel order",
        error: error.message,
      });
    }
  },

  // Delete order (only pending or cancelled orders can be deleted)
  deleteOrder: async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      const orderNumber = String(req.params.id);

      if (!userId) {
        return res.status(401).json({ success: false, message: "Not authorized" });
      }

      console.log("🔐 Deleting order:", orderNumber, "for user:", userId);

      const order = await prisma.order.findFirst({
        where: {
          orderNumber,
          userId,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CANCELLED) {
        return res.status(400).json({
          success: false,
          message: `Order cannot be deleted. Only pending or cancelled orders can be deleted. Current status: ${order.status}`,
        });
      }

      // Delete the order (items will be deleted automatically due to onDelete: Cascade in schema)
      await prisma.order.delete({
        where: { id: order.id },
      });

      return res.json({
        success: true,
        message: "Order deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting order:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete order",
        error: error.message,
      });
    }
  },
};

export default userOrderController;