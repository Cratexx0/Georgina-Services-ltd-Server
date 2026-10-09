import express  from "express";
import userOrderController from "../Controllers/userOrder.Controller";
import { Protect }  from "../Middleware/Middelware";
import authenticate from "../Utils/authenticate";
const router = express.Router();

// User order routes
router.post("/api/orders", authenticate, userOrderController.createOrder);
router.get("/api/orders/my-orders", authenticate, userOrderController.getMyOrders);
router.get("/api/orders/:id", authenticate, userOrderController.getOrderById);
router.put("/api/orders/:id/cancel", authenticate, userOrderController.cancelOrder);
router.delete("/api/orders/:id", authenticate, userOrderController.deleteOrder);

export default router;