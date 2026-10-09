import express  from "express";
const router = express.Router();
import {createOrderItem, getOrderItems, getOrderItemById, updateOrderItem, deleteOrderItem} from '../Controllers/orderItemsController';
import authenticate from "../Utils/authenticate";


// Admin order item management
router.post('/api/admin/order-items', authenticate,  createOrderItem);
router.get('/api/admin/order-items', authenticate,  getOrderItems);
router.get('/api/admin/order-items/:id', authenticate,  getOrderItemById);
router.put('/api/admin/order-items/:id', authenticate,  updateOrderItem);
router.delete('/api/admin/order-items/:id', authenticate,  deleteOrderItem);

export default router;