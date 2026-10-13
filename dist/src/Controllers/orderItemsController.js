"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrderItem = exports.updateOrderItem = exports.createOrderItem = exports.getOrderItemById = exports.getOrderItems = void 0;
const prisma_1 = require("../config/prisma");
const getOrderItems = async (req, res) => {
    try {
        const orderItems = await prisma_1.prisma.orderItem.findMany({
            include: {
                order: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true },
                        },
                    },
                },
                product: true,
            },
        });
        console.log("=== getOrderItems Debug ===");
        console.log("Total orderItems found:", orderItems.length);
        orderItems.forEach((item, index) => {
            console.log(`OrderItem ${index + 1}:`, {
                id: item.id,
                orderId: item.orderId,
                orderNumber: item.order?.orderNumber,
                productName: item.product?.name,
                quantity: item.quantity,
            });
        });
        return res.status(200).json({
            success: true,
            data: orderItems,
        });
    }
    catch (err) {
        console.error("Error in getOrderItems:", err);
        return res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};
exports.getOrderItems = getOrderItems;
const getOrderItemById = async (req, res) => {
    try {
        const itemId = Number(req.params.id);
        if (isNaN(itemId)) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid order item ID format" });
        }
        const orderItem = await prisma_1.prisma.orderItem.findUnique({
            where: { id: itemId },
            include: {
                order: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true },
                        },
                    },
                },
                product: true,
            },
        });
        console.log("=== getOrderItemById Debug ===");
        console.log("Requested ID:", req.params.id);
        if (orderItem) {
            console.log("OrderItem found:", {
                id: orderItem.id,
                orderId: orderItem.orderId,
                orderNumber: orderItem.order?.orderNumber,
                orderData: orderItem.order,
                productName: orderItem.product?.name,
                quantity: orderItem.quantity,
            });
        }
        else {
            console.log("OrderItem not found");
        }
        if (!orderItem) {
            return res.status(404).json({
                success: false,
                error: "OrderItem not found",
            });
        }
        return res.status(200).json({
            success: true,
            data: orderItem,
        });
    }
    catch (err) {
        console.error("Error in getOrderItemById:", err);
        return res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};
exports.getOrderItemById = getOrderItemById;
const createOrderItem = async (req, res) => {
    try {
        console.log("=== createOrderItem Debug ===");
        console.log("Request body:", req.body);
        const orderItem = await prisma_1.prisma.orderItem.create({
            data: req.body,
        });
        console.log("Created orderItem:", {
            id: orderItem.id,
            orderId: orderItem.orderId,
            productId: orderItem.productId,
            quantity: orderItem.quantity,
        });
        return res.status(201).json({
            success: true,
            data: orderItem,
        });
    }
    catch (err) {
        return res.status(400).json({
            success: false,
            error: err.message,
        });
    }
};
exports.createOrderItem = createOrderItem;
const updateOrderItem = async (req, res) => {
    try {
        console.log("=== updateOrderItem Debug ===");
        console.log("OrderItem ID:", req.params.id);
        console.log("Update data:", req.body);
        const itemId = Number(req.params.id);
        if (isNaN(itemId)) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid order item ID format" });
        }
        const existingItem = await prisma_1.prisma.orderItem.findUnique({
            where: { id: itemId },
        });
        if (!existingItem) {
            return res.status(404).json({
                success: false,
                error: "OrderItem not found",
            });
        }
        console.log("Before update:", existingItem);
        const updatedOrderItem = await prisma_1.prisma.orderItem.update({
            where: { id: itemId },
            data: req.body,
        });
        console.log("After update:", updatedOrderItem);
        return res.status(200).json({
            success: true,
            data: updatedOrderItem,
        });
    }
    catch (err) {
        return res.status(400).json({
            success: false,
            error: err.message,
        });
    }
};
exports.updateOrderItem = updateOrderItem;
const deleteOrderItem = async (req, res) => {
    try {
        const itemId = Number(req.params.id);
        if (isNaN(itemId)) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid order item ID format" });
        }
        const existingItem = await prisma_1.prisma.orderItem.findUnique({
            where: { id: itemId },
        });
        if (!existingItem) {
            return res.status(404).json({
                success: false,
                error: "OrderItem not found",
            });
        }
        await prisma_1.prisma.orderItem.delete({
            where: { id: itemId },
        });
        return res.status(200).json({
            success: true,
            message: "Order item deleted successfully",
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};
exports.deleteOrderItem = deleteOrderItem;
