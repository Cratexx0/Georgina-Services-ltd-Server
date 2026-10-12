"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const adminOrderController_1 = require("../Controllers/adminOrderController");
const authenticate_1 = __importDefault(require("../Utils/authenticate"));
// Admin order management routes (using the functions you actually have)
router.get('/api/admin/orders', authenticate_1.default, adminOrderController_1.getAllOrders);
router.get('/api/admin/orders/:id', authenticate_1.default, adminOrderController_1.getOrderById);
router.put('/api/admin/orders/:id/status', authenticate_1.default, adminOrderController_1.updateOrderStatus);
router.delete('/api/admin/orders/:id', authenticate_1.default, adminOrderController_1.deleteOrder);
router.get('/api/admin/orders-stats', authenticate_1.default, adminOrderController_1.getOrderStats);
exports.default = router;
