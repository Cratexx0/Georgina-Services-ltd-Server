"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/wishlistRoute.js
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
// CORRECT: Import the controller functions
const wishListController_1 = require("../Controllers/wishListController");
// CORRECT: Route definitions - each route calls a function
router.post('/api/wishlist/add', wishListController_1.addToWishlist);
router.get('/api/wishlist/my-wishlist', wishListController_1.getWishlist);
router.get('/api/wishlist/check/:productId', wishListController_1.checkWishlist);
router.delete('/api/wishlist/remove/:productId', wishListController_1.removeFromWishlist);
router.delete('/api/wishlist/clear', wishListController_1.clearWishlist);
// Export the router
exports.default = router;
