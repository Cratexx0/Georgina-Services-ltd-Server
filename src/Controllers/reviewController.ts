// controllers/reviewController.ts
import type { Request, Response } from "express";
import { prisma } from "../config/prisma"; // Adjust relative path as needed
// Helper function to update product rating stats
const updateProductRatingStats = async (productId: number): Promise<void> => {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        productId,
        isApproved: true,
      },
      select: { rating: true },
    });

    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;

      await prisma.product.update({
        where: { id: productId },
        data: {
          averageRating: parseFloat(averageRating.toFixed(1)),
          totalReviews: reviews.length,
        },
      });
    } else {
      await prisma.product.update({
        where: { id: productId },
        data: {
          averageRating: 0,
          totalReviews: 0,
        },
      });
    }
  } catch (error) {
    console.error("Error updating product rating stats:", error);
  }
};

// Create Review
export const createReview = async (req: Request, res: Response): Promise<any> => {
  try {
    const { productId } = req.params;
    const parsedProductId = Number(productId);
    const {
      userId,
      userName,
      userEmail,
      rating,
      title,
      comment,
      verifiedPurchase = false,
    } = req.body;

    if (isNaN(parsedProductId) || !userId || !userName || !rating || !comment) {
      return res.status(400).json({
        message: "Valid productId, userId, userName, rating, and comment are required",
      });
    }

    const parsedUserId = Number(userId);

    const product = await prisma.product.findUnique({ where: { id: parsedProductId } });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const existingReview = await prisma.review.findFirst({
      where: {
        productId: parsedProductId,
        userId: isNaN(parsedUserId) ? userId : parsedUserId,
      },
    });

    if (existingReview) {
      return res.status(400).json({
        message: "You have already reviewed this product",
      });
    }

    const review = await prisma.review.create({
      data: {
        productId: parsedProductId,
        userId: isNaN(parsedUserId) ? userId : parsedUserId,
        userName,
        userEmail: userEmail || null,
        rating: parseInt(rating, 10),
        title: title || null,
        comment,
        verifiedPurchase: Boolean(verifiedPurchase),
        isApproved: true,
      },
    });

    await updateProductRatingStats(parsedProductId);
    const updatedProduct = await prisma.product.findUnique({ where: { id: parsedProductId } });

    return res.status(201).json({
      message: "Review submitted successfully",
      review,
      productStats: {
        averageRating: updatedProduct?.averageRating || 0,
        totalReviews: updatedProduct?.totalReviews || 0,
      },
    });
  } catch (error: any) {
    console.error("Error creating review:", error);
    return res.status(500).json({
      message: "Error creating review",
      error: error.message,
    });
  }
};

// Get Product Reviews
export const getProductReviews = async (req: Request, res: Response): Promise<any> => {
  try {
    const { productId } = req.params;
    const parsedProductId = Number(productId);
    const {
      page = "1",
      limit = "10",
      sort = "newest",
      rating,
      verified,
    } = req.query;

    if (isNaN(parsedProductId)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const pageSize = parseInt(String(limit), 10);
    const currentPage = parseInt(String(page), 10);
    const skip = (currentPage - 1) * pageSize;

    const product = await prisma.product.findUnique({ where: { id: parsedProductId } });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const whereClause: any = { productId: parsedProductId, isApproved: true };
    let orderBy: any = [{ createdAt: "desc" }];

    if (rating) {
      whereClause.rating = parseInt(String(rating), 10);
    }

    if (verified === "true") {
      whereClause.verifiedPurchase = true;
    }

    switch (sort) {
      case "helpful":
        orderBy = [{ helpfulCount: "desc" }, { createdAt: "desc" }];
        break;
      case "rating_high":
        orderBy = [{ rating: "desc" }, { createdAt: "desc" }];
        break;
      case "rating_low":
        orderBy = [{ rating: "asc" }, { createdAt: "desc" }];
        break;
      default:
        orderBy = [{ createdAt: "desc" }];
    }

    const [reviews, count] = await Promise.all([
      prisma.review.findMany({
        where: whereClause,
        include: {
          product: {
            select: { id: true, name: true, slug: true, images: true },
          },
        },
        orderBy,
        take: pageSize,
        skip,
      }),
      prisma.review.count({ where: whereClause }),
    ]);

    const ratingDistribution: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = await prisma.review.count({
        where: { ...whereClause, rating: i },
      });
    }

    const avgRatingAgg = await prisma.review.aggregate({
      where: whereClause,
      _avg: { rating: true },
    });

    const averageRatingValue = avgRatingAgg._avg.rating ? Number(avgRatingAgg._avg.rating).toFixed(1) : "0.0";

    return res.status(200).json({
      reviews,
      pagination: {
        currentPage,
        totalPages: Math.ceil(count / pageSize),
        totalReviews: count,
        hasNext: skip + pageSize < count,
        hasPrev: currentPage > 1,
      },
      stats: {
        averageRating: averageRatingValue,
        ratingDistribution,
        totalReviews: count,
      },
      message: "Reviews retrieved successfully",
    });
  } catch (error: any) {
    console.error("Error getting product reviews:", error);
    return res.status(500).json({
      message: "Error retrieving reviews",
      error: error.message,
    });
  }
};

// Update Review Helpful Count
export const markReviewHelpful = async (req: Request, res: Response): Promise<any> => {
  try {
    const { reviewId } = req.params;
    const parsedReviewId = Number(reviewId);

    if (isNaN(parsedReviewId)) {
      return res.status(400).json({ message: "Invalid review ID format" });
    }

    const review = await prisma.review.findUnique({ where: { id: parsedReviewId } });
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const updatedReview = await prisma.review.update({
      where: { id: parsedReviewId },
      data: { helpfulCount: review.helpfulCount + 1 },
    });

    return res.status(200).json({
      message: "Review marked as helpful",
      helpfulCount: updatedReview.helpfulCount,
    });
  } catch (error: any) {
    console.error("Error marking review helpful:", error);
    return res.status(500).json({
      message: "Error marking review as helpful",
      error: error.message,
    });
  }
};

// Reply to Review (Admin/Store Owner)
export const replyToReview = async (req: Request, res: Response): Promise<any> => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;
    const parsedReviewId = Number(reviewId);

    if (isNaN(parsedReviewId) || !reply) {
      return res.status(400).json({ message: "Valid review ID and reply content are required" });
    }

    const review = await prisma.review.findUnique({ where: { id: parsedReviewId } });
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const updatedReview = await prisma.review.update({
      where: { id: parsedReviewId },
      data: {
        reply,
        repliedAt: new Date(),
      },
    });

    return res.status(200).json({
      message: "Reply added successfully",
      review: updatedReview,
    });
  } catch (error: any) {
    console.error("Error replying to review:", error);
    return res.status(500).json({
      message: "Error adding reply",
      error: error.message,
    });
  }
};

// Get User Reviews
export const getUserReviews = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const parsedUserId = Number(userId);
    const { page = "1", limit = "10" } = req.query;

    if (isNaN(parsedUserId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const pageSize = parseInt(String(limit), 10);
    const currentPage = parseInt(String(page), 10);
    const skip = (currentPage - 1) * pageSize;

    const [reviews, count] = await Promise.all([
      prisma.review.findMany({
        where: { userId: parsedUserId },
        include: {
          product: {
            select: { id: true, name: true, slug: true, images: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip,
      }),
      prisma.review.count({ where: { userId: parsedUserId } }),
    ]);

    return res.status(200).json({
      reviews,
      pagination: {
        currentPage,
        totalPages: Math.ceil(count / pageSize),
        totalReviews: count,
        hasNext: skip + pageSize < count,
        hasPrev: currentPage > 1,
      },
      message: "User reviews retrieved successfully",
    });
  } catch (error: any) {
    console.error("Error getting user reviews:", error);
    return res.status(500).json({
      message: "Error retrieving user reviews",
      error: error.message,
    });
  }
};

// Admin: Get All Reviews (with filtering)
export const getAllReviews = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      page = "1",
      limit = "20",
      productId,
      userId,
      rating,
      isApproved,
      verifiedPurchase,
      search,
    } = req.query;

    const pageSize = parseInt(String(limit), 10);
    const currentPage = parseInt(String(page), 10);
    const skip = (currentPage - 1) * pageSize;

    let whereClause: any = {};

    if (productId) whereClause.productId = Number(productId);
    if (userId) whereClause.userId = Number(userId);
    if (rating) whereClause.rating = parseInt(String(rating), 10);
    if (isApproved !== undefined) whereClause.isApproved = isApproved === "true";
    if (verifiedPurchase !== undefined) whereClause.verifiedPurchase = verifiedPurchase === "true";

    if (search) {
      const searchTerm = String(search);
      whereClause.OR = [
        { userName: { contains: searchTerm, mode: "insensitive" } },
        { userEmail: { contains: searchTerm, mode: "insensitive" } },
        { comment: { contains: searchTerm, mode: "insensitive" } },
        { title: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    const [reviews, count, totalReviews, approvedReviews, pendingReviews, avgRatingAgg] = await Promise.all([
      prisma.review.findMany({
        where: whereClause,
        include: {
          product: {
            select: { id: true, name: true, slug: true, categoryLevel1: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip,
      }),
      prisma.review.count({ where: whereClause }),
      prisma.review.count(),
      prisma.review.count({ where: { isApproved: true } }),
      prisma.review.count({ where: { isApproved: false } }),
      prisma.review.aggregate({ _avg: { rating: true } }),
    ]);

    const stats = {
      totalReviews,
      approvedReviews,
      pendingReviews,
      averageRating: avgRatingAgg._avg.rating ? Number(avgRatingAgg._avg.rating).toFixed(1) : "0.0",
    };

    return res.status(200).json({
      reviews,
      pagination: {
        currentPage,
        totalPages: Math.ceil(count / pageSize),
        totalReviews: count,
        hasNext: skip + pageSize < count,
        hasPrev: currentPage > 1,
      },
      stats,
      message: "All reviews retrieved successfully",
    });
  } catch (error: any) {
    console.error("Error getting all reviews:", error);
    return res.status(500).json({
      message: "Error retrieving reviews",
      error: error.message,
    });
  }
};

// Admin: Update Review Status
export const updateReviewStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { reviewId } = req.params;
    const { isApproved } = req.body;
    const parsedReviewId = Number(reviewId);

    if (isNaN(parsedReviewId)) {
      return res.status(400).json({ message: "Invalid review ID format" });
    }

    const review = await prisma.review.findUnique({ where: { id: parsedReviewId } });
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const previousStatus = review.isApproved;
    const updatedReview = await prisma.review.update({
      where: { id: parsedReviewId },
      data: { isApproved: Boolean(isApproved) },
    });

    if (previousStatus !== Boolean(isApproved)) {
      await updateProductRatingStats(review.productId);
    }

    return res.status(200).json({
      message: `Review ${isApproved ? "approved" : "disapproved"} successfully`,
      review: updatedReview,
    });
  } catch (error: any) {
    console.error("Error updating review status:", error);
    return res.status(500).json({
      message: "Error updating review status",
      error: error.message,
    });
  }
};

// Delete Review
export const deleteReview = async (req: Request, res: Response): Promise<any> => {
  try {
    const { reviewId } = req.params;
    const parsedReviewId = Number(reviewId);

    if (isNaN(parsedReviewId)) {
      return res.status(400).json({ message: "Invalid review ID format" });
    }

    const review = await prisma.review.findUnique({ where: { id: parsedReviewId } });
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const productId = review.productId;
    await prisma.review.delete({ where: { id: parsedReviewId } });

    await updateProductRatingStats(productId);

    return res.status(200).json({
      message: "Review deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting review:", error);
    return res.status(500).json({
      message: "Error deleting review",
      error: error.message,
    });
  }
};