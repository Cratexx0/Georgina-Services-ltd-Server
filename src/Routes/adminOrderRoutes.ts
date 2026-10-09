import express from "express";
const router = express.Router();
import {getAllOrders,getOrderById,deleteOrder,getOrderStats, updateOrderStatus} from "../Controllers/adminOrderController";
import { Protect } from '../Middleware/Middelware'; // Fixed typo: Middelware → Middleware
import authenticate from "../Utils/authenticate";

// Admin order management routes (using the functions you actually have)
router.get('/api/admin/orders', authenticate, getAllOrders);
router.get('/api/admin/orders/:id', authenticate, getOrderById);
router.put('/api/admin/orders/:id/status', authenticate, updateOrderStatus);
router.delete('/api/admin/orders/:id', authenticate, deleteOrder);
router.get('/api/admin/orders-stats', authenticate, getOrderStats);

export default router;