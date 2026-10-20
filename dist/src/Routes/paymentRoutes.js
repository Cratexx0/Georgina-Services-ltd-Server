"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const paymentController_1 = require("../Controllers/paymentController");
router.post("/api/payment", paymentController_1.PaymentIntent);
router.post("/api/payment/checkout", paymentController_1.createEmbeddedCheckout);
router.get("/api/session-status", paymentController_1.getSessionStatus);
router.post("/api/confirm-payment", paymentController_1.confirmPayment);
// Webhook route
router.post("/api/webhook", paymentController_1.stripeWebhook);
exports.default = router;
