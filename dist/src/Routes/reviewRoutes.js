"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const Middelware_1 = require("../Middleware/Middelware");
const reviewController_1 = require("../Controllers/reviewController");
const authenticate_1 = __importDefault(require("../Utils/authenticate"));
// Public: list reviews for a product
router.get('/api/products/:productId/reviews', reviewController_1.getProductReviews);
// Authenticated user: create a review
router.post('/api/products/:productId/reviews', authenticate_1.default, reviewController_1.createReview);
// Authenticated user: mark a review as helpful
router.post('/api/reviews/:reviewId/helpful', authenticate_1.default, reviewController_1.markReviewHelpful);
// Authenticated user: list their own reviews
router.get('/api/users/:userId/reviews', authenticate_1.default, reviewController_1.getUserReviews);
// Admin: reply to a review
router.post('/api/reviews/:reviewId/reply', authenticate_1.default, (0, Middelware_1.authorizeRoles)('admin'), reviewController_1.replyToReview);
// Admin: get/manage all reviews
router.get('/api/admin/reviews', authenticate_1.default, (0, Middelware_1.authorizeRoles)('admin'), reviewController_1.getAllReviews);
router.patch('/api/admin/reviews/:reviewId/status', authenticate_1.default, (0, Middelware_1.authorizeRoles)('admin'), reviewController_1.updateReviewStatus);
router.delete('/api/admin/reviews/:reviewId', authenticate_1.default, (0, Middelware_1.authorizeRoles)('admin'), reviewController_1.deleteReview);
exports.default = router;
