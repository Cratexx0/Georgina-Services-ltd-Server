"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserPurchase = exports.purchaseItem = void 0;
const prisma_1 = require("../config/prisma"); // Adjust relative path as needed
// Place an order
const purchaseItem = async (req, res) => {
    const { userId, productId, quantity, shippingAddress, paymentMethod } = req.body;
    try {
        const parsedUserId = Number(userId);
        const parsedProductId = Number(productId);
        const qty = parseInt(quantity, 10) || 1;
        const [user, product] = await Promise.all([
            prisma_1.prisma.user.findUnique({
                where: { id: isNaN(parsedUserId) ? userId : parsedUserId },
            }),
            prisma_1.prisma.product.findUnique({
                where: { id: isNaN(parsedProductId) ? productId : parsedProductId },
            }),
        ]);
        if (!user || !product) {
            return res.status(404).json({ message: "User or Product not found" });
        }
        const totalAmount = Number(product.price) * qty;
        // Safely extract the first image string from the JSON images field
        let imageUrl = null;
        if (product.images &&
            Array.isArray(product.images) &&
            product.images.length > 0) {
            imageUrl = String(product.images[0]);
        }
        // Generate a unique order number required by your Order schema
        const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        // Create order and order item atomically
        const order = await prisma_1.prisma.order.create({
            data: {
                orderNumber,
                userId: user.id,
                totalAmount,
                status: "CONFIRMED",
                shippingAddress: shippingAddress || null,
                paymentMethod: paymentMethod || null,
                items: {
                    create: {
                        productId: product.id,
                        productName: product.name,
                        image: imageUrl, // Safe string type asserted
                        price: Number(product.price),
                        quantity: qty,
                    },
                },
            },
            include: {
                items: true,
            },
        });
        return res.status(201).json({
            message: "Purchase successful",
            order,
            orderItem: order.items[0],
        });
    }
    catch (error) {
        console.error("Error placing order:", error);
        return res
            .status(500)
            .json({ message: "Internal server error", error: error.message });
    }
};
exports.purchaseItem = purchaseItem;
// Get user's purchases
// Get user's purchases
const getUserPurchase = async (req, res) => {
    const { id } = req.params;
    try {
        const userId = Number(id);
        if (isNaN(userId)) {
            return res.status(400).json({ message: "Invalid user ID format" });
        }
        const orders = await prisma_1.prisma.order.findMany({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        if (!orders || orders.length === 0) {
            return res
                .status(404)
                .json({ message: "No purchases found for this user" });
        }
        // Extract products from order items safely
        const products = orders.flatMap((order) => order.items.map((item) => {
            const prod = item.product;
            let fallbackImage = null;
            if (prod &&
                prod.images &&
                Array.isArray(prod.images) &&
                prod.images.length > 0) {
                fallbackImage = String(prod.images[0]);
            }
            return {
                id: prod ? prod.id : item.productId,
                name: prod ? prod.name : item.productName,
                slug: prod ? prod.slug : "",
                description: prod ? prod.description : null,
                price: Number(item.price),
                categoryLevel1: prod ? prod.categoryLevel1 : "",
                categoryLevel2: prod ? prod.categoryLevel2 : null,
                categoryLevel3: prod ? prod.categoryLevel3 : null,
                image: item.image || fallbackImage,
                purchaseDate: order.createdAt,
                quantity: item.quantity,
                orderId: order.id,
                orderStatus: order.status,
                total: Number(item.price) * item.quantity,
            };
        }));
        return res.status(200).json({
            success: true,
            products,
            totalOrders: orders.length,
        });
    }
    catch (error) {
        console.error("Error fetching orders:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
exports.getUserPurchase = getUserPurchase;
