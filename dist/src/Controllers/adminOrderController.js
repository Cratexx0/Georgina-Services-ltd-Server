"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderStats = exports.deleteOrder = exports.updateOrderStatus = exports.getOrderById = exports.getAllOrders = void 0;
const prisma_1 = require("../config/prisma"); //
const enums_1 = require("../generated/prisma/enums");
// Get all orders (admin only)
const getAllOrders = async (req, res) => {
    try {
        const orders = await prisma_1.prisma.order.findMany({
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
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};
exports.getAllOrders = getAllOrders;
// Get order by ID (admin - can access any order)
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const orderId = Number(id);
        if (isNaN(orderId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid order ID format",
            });
        }
        const order = await prisma_1.prisma.order.findUnique({
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
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};
exports.getOrderById = getOrderById;
// Update order status (admin only)
const updateOrderStatus = async (req, res) => {
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
        const normalizedStatus = String(status).toUpperCase();
        const validStatuses = Object.values(enums_1.OrderStatus);
        if (!validStatuses.includes(normalizedStatus)) {
            return res.status(400).json({
                success: false,
                error: "Invalid status",
            });
        }
        const order = await prisma_1.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
            return res.status(404).json({
                success: false,
                error: "Order not found",
            });
        }
        const updatedOrder = await prisma_1.prisma.order.update({
            where: { id: orderId },
            data: { status: normalizedStatus },
        });
        return res.status(200).json({
            success: true,
            data: updatedOrder,
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};
exports.updateOrderStatus = updateOrderStatus;
// Delete order (admin only)
const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const orderId = Number(id);
        if (isNaN(orderId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid order ID format",
            });
        }
        const order = await prisma_1.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
            return res.status(404).json({
                success: false,
                error: "Order not found",
            });
        }
        await prisma_1.prisma.order.delete({ where: { id: orderId } });
        return res.status(200).json({
            success: true,
            message: "Order deleted successfully",
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};
exports.deleteOrder = deleteOrder;
// Get order statistics (admin only)
const getOrderStats = async (req, res) => {
    try {
        const [totalOrders, confirmedOrders, processingOrders, shippedOrders, deliveredOrders, cancelledOrders, revenueResult,] = await Promise.all([
            prisma_1.prisma.order.count(),
            prisma_1.prisma.order.count({ where: { status: enums_1.OrderStatus.CONFIRMED } }),
            prisma_1.prisma.order.count({ where: { status: enums_1.OrderStatus.PROCESSING } }),
            prisma_1.prisma.order.count({ where: { status: enums_1.OrderStatus.SHIPPED } }),
            prisma_1.prisma.order.count({ where: { status: enums_1.OrderStatus.DELIVERED } }),
            prisma_1.prisma.order.count({ where: { status: enums_1.OrderStatus.CANCELLED } }),
            prisma_1.prisma.order.aggregate({
                where: { status: enums_1.OrderStatus.DELIVERED },
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
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};
exports.getOrderStats = getOrderStats;
