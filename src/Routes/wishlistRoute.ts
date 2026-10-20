// routes/wishlistRoute.js
import  express from "express";
const router = express.Router();
import { Protect, requireRole } from "../Middleware/Middelware";
// CORRECT: Import the controller functions
import {addToWishlist, getWishlist,checkWishlist, removeFromWishlist,clearWishlist}  from '../Controllers/wishListController';

// CORRECT: Route definitions - each route calls a function
router.post('/api/wishlist/add', Protect, requireRole([ 'USER']), addToWishlist);
router.get('/api/wishlist/my-wishlist',  getWishlist);
router.get('/api/wishlist/check/:productId',  checkWishlist);
router.delete('/api/wishlist/remove/:productId',  removeFromWishlist);
router.delete('/api/wishlist/clear',  clearWishlist);

// Export the router
export default router;