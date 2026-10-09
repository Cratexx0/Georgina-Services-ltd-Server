

import express from "express";
const router = express.Router();

import { 
    createEmbeddedCheckout,
    getSessionStatus,
    confirmPayment, 
    stripeWebhook ,
    PaymentIntent
} from "../Controllers/paymentController";


router.post("/api/payment", PaymentIntent);
router.post("/api/payment/checkout", createEmbeddedCheckout);


router.get("/api/session-status", getSessionStatus);
router.post("/api/confirm-payment", confirmPayment);

// Webhook route
router.post("/api/webhook", stripeWebhook);

export default router;