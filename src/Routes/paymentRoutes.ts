

import express from "express";
const router = express.Router();

import { 
    createEmbeddedCheckout,
    getSessionStatus,
    confirmPayment, 
    stripeWebhook ,
    PaymentIntent
} from "../Controllers/paymentController";

import { Protect, requireRole } from "../Middleware/Middelware";
router.post("/api/payment", Protect, requireRole(['USER']), PaymentIntent);
router.post("/api/payment/checkout", Protect, requireRole(['USER']), createEmbeddedCheckout);


router.get("/api/session-status", Protect, requireRole(['USER']), getSessionStatus);
router.post("/api/confirm-payment", Protect, requireRole(['USER']), confirmPayment);

// Webhook route
router.post("/api/webhook", stripeWebhook);

export default router;