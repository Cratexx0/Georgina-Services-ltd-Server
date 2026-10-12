"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userOrder_Controller_1 = __importDefault(require("../Controllers/userOrder.Controller"));
const authenticate_1 = __importDefault(require("../Utils/authenticate"));
const router = express_1.default.Router();
// User order routes
router.post("/api/orders", authenticate_1.default, userOrder_Controller_1.default.createOrder);
router.get("/api/orders/my-orders", authenticate_1.default, userOrder_Controller_1.default.getMyOrders);
router.get("/api/orders/:id", authenticate_1.default, userOrder_Controller_1.default.getOrderById);
router.put("/api/orders/:id/cancel", authenticate_1.default, userOrder_Controller_1.default.cancelOrder);
router.delete("/api/orders/:id", authenticate_1.default, userOrder_Controller_1.default.deleteOrder);
exports.default = router;
