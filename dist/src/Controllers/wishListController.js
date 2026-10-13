"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearWishlist = exports.removeFromWishlist = exports.checkWishlist = exports.getWishlist = exports.addToWishlist = void 0;
const prisma_1 = require("../config/prisma"); // Adjust relative path as needed
// Helper to get user ID safely (supports authenticated req.user or fallback testing)
const getUserId = (req) => {
    if (req.user && req.user.id) {
        return Number(req.user.id);
    }
    return 1; // Fallback for testing if no auth header provided
};
// Add product to wishlist
const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = getUserId(req);
        const parsedProductId = Number(productId);
        if (isNaN(parsedProductId)) {
            return res.status(400).json({ message: "Invalid product ID format" });
        }
        // Check if product exists
        const product = await prisma_1.prisma.product.findUnique({
            where: { id: parsedProductId },
        });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        // Check if already in wishlist using Prisma's compound unique constraint
        const existing = await prisma_1.prisma.wishlist.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId: parsedProductId,
                },
            },
        });
        if (existing) {
            return res.status(400).json({ message: "Product already in wishlist" });
        }
        // Add to wishlist
        const wishlistItem = await prisma_1.prisma.wishlist.create({
            data: {
                userId,
                productId: parsedProductId,
            },
        });
        return res.status(201).json({
            message: "Added to wishlist",
            wishlistItem,
        });
    }
    catch (error) {
        console.error("Error adding to wishlist:", error);
        return res.status(500).json({
            message: "Error adding to wishlist",
            error: error.message,
        });
    }
};
exports.addToWishlist = addToWishlist;
// Get user's wishlist
const getWishlist = async (req, res) => {
    try {
        const userId = getUserId(req);
        // Get wishlist items with included product details
        const wishlistItems = await prisma_1.prisma.wishlist.findMany({
            where: { userId },
            include: {
                product: true,
            },
            orderBy: { createdAt: "desc" },
        });
        if (!wishlistItems || wishlistItems.length === 0) {
            return res.status(200).json({
                products: [],
                count: 0,
                message: "Wishlist is empty",
            });
        }
        // Filter active products and map with wishlist metadata
        const wishlistProducts = wishlistItems
            .filter((item) => item.product && item.product.isActive)
            .map((item) => ({
            ...item.product,
            addedAt: item.createdAt,
            wishlistId: item.id,
        }));
        return res.status(200).json({
            products: wishlistProducts,
            count: wishlistProducts.length,
            message: wishlistProducts.length > 0
                ? "Wishlist retrieved"
                : "Wishlist is empty",
        });
    }
    catch (error) {
        console.error("Error getting wishlist:", error);
        return res.status(500).json({
            message: "Error getting wishlist",
            error: error.message,
        });
    }
};
exports.getWishlist = getWishlist;
// Check if product is in wishlist
const checkWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = getUserId(req);
        const parsedProductId = Number(productId);
        if (isNaN(parsedProductId)) {
            return res.status(400).json({ message: "Invalid product ID format" });
        }
        const wishlistItem = await prisma_1.prisma.wishlist.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId: parsedProductId,
                },
            },
        });
        return res.status(200).json({
            inWishlist: !!wishlistItem,
            message: "Wishlist status checked",
        });
    }
    catch (error) {
        console.error("Error checking wishlist:", error);
        return res.status(500).json({
            message: "Error checking wishlist",
            error: error.message,
        });
    }
};
exports.checkWishlist = checkWishlist;
// Remove product from wishlist
const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = getUserId(req);
        const parsedProductId = Number(productId);
        if (isNaN(parsedProductId)) {
            return res.status(400).json({ message: "Invalid product ID format" });
        }
        try {
            await prisma_1.prisma.wishlist.delete({
                where: {
                    userId_productId: {
                        userId,
                        productId: parsedProductId,
                    },
                },
            });
        }
        catch (err) {
            // Prisma throws P2025 if record to delete is not found
            return res.status(404).json({ message: "Product not found in wishlist" });
        }
        return res.status(200).json({
            message: "Removed from wishlist",
        });
    }
    catch (error) {
        console.error("Error removing from wishlist:", error);
        return res.status(500).json({
            message: "Error removing from wishlist",
            error: error.message,
        });
    }
};
exports.removeFromWishlist = removeFromWishlist;
// Clear wishlist
const clearWishlist = async (req, res) => {
    try {
        const userId = getUserId(req);
        const deleteResult = await prisma_1.prisma.wishlist.deleteMany({
            where: { userId },
        });
        return res.status(200).json({
            message: "Wishlist cleared",
            deletedCount: deleteResult.count,
        });
    }
    catch (error) {
        console.error("Error clearing wishlist:", error);
        return res.status(500).json({
            message: "Error clearing wishlist",
            error: error.message,
        });
    }
};
exports.clearWishlist = clearWishlist;
