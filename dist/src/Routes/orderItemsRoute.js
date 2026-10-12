"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const orderItemsController_1 = require("../Controllers/orderItemsController");
const authenticate_1 = __importDefault(require("../Utils/authenticate"));
// Admin order item management
router.post('/api/admin/order-items', authenticate_1.default, orderItemsController_1.createOrderItem);
router.get('/api/admin/order-items', authenticate_1.default, orderItemsController_1.getOrderItems);
router.get('/api/admin/order-items/:id', authenticate_1.default, orderItemsController_1.getOrderItemById);
router.put('/api/admin/order-items/:id', authenticate_1.default, orderItemsController_1.updateOrderItem);
router.delete('/api/admin/order-items/:id', authenticate_1.default, orderItemsController_1.deleteOrderItem);
exports.default = router;
