"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmPayment = exports.stripeWebhook = exports.getSessionStatus = exports.PaymentIntent = exports.createEmbeddedCheckout = void 0;
const stripe_1 = __importDefault(require("stripe"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const prisma_1 = require("../config/prisma");
const enums_1 = require("../generated/prisma/enums");
const buildStripeLineItems = (items, currency) => items.map((item) => ({
    price_data: {
        currency,
        product_data: {
            name: item.productName,
            description: item.product?.description ?? undefined,
        },
        unit_amount: Math.round(Number(item.price) * 100),
    },
    quantity: Number(item.quantity),
}));
const stripeKey = process.env.STRIPE_SECRET_KEY || "";
if (!stripeKey) {
    console.warn("⚠️ Warning: STRIPE_SECRET_KEY is missing from environment variables.");
}
const stripe = new stripe_1.default(stripeKey, {
    apiVersion: "2025-02-24.acacia", // Or your current Stripe API version
});
// Reusable email sender
const sendEmail = async (userEmail, subject, text) => {
    try {
        const transporter = nodemailer_1.default.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject,
            text,
        });
        console.log(`Email sent to ${userEmail}`);
    }
    catch (error) {
        console.error("Email sending error:", error);
    }
};
// Create Checkout Session for Embedded Checkout
const createEmbeddedCheckout = async (req, res) => {
    const { productId, userId, quantity, countryCode, orderId } = req.body;
    try {
        let order;
        const qty = parseInt(quantity, 10) || 1;
        if (orderId) {
            const parsedOrderId = Number(orderId);
            order = await prisma_1.prisma.order.findUnique({
                where: { id: isNaN(parsedOrderId) ? orderId : parsedOrderId },
            });
            if (!order) {
                return res.status(404).json({ message: "Order not found" });
            }
        }
        else {
            const parsedProductId = Number(productId);
            const parsedUserId = Number(userId);
            const [product, user] = await Promise.all([
                prisma_1.prisma.product.findUnique({
                    where: { id: isNaN(parsedProductId) ? productId : parsedProductId },
                }),
                prisma_1.prisma.user.findUnique({
                    where: { id: isNaN(parsedUserId) ? userId : parsedUserId },
                }),
            ]);
            if (!product || !user) {
                return res.status(404).json({ message: "Product or User not found" });
            }
            const totalAmount = Number(product.price) * qty;
            let imageUrl = null;
            if (product.images &&
                Array.isArray(product.images) &&
                product.images.length > 0) {
                imageUrl = String(product.images[0]);
            }
            const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            order = await prisma_1.prisma.order.create({
                data: {
                    orderNumber,
                    userId: user.id,
                    totalAmount,
                    status: enums_1.OrderStatus.PENDING,
                    items: {
                        create: {
                            productId: product.id,
                            productName: product.name,
                            image: imageUrl,
                            price: Number(product.price),
                            quantity: qty,
                        },
                    },
                },
            });
        }
        const fullOrder = await prisma_1.prisma.order.findUnique({
            where: { id: order.id },
            include: {
                items: {
                    include: { product: true },
                },
            },
        });
        const user = await prisma_1.prisma.user.findUnique({ where: { id: order.userId } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        let currency = "eur";
        if (countryCode === "GB")
            currency = "gbp";
        else if (countryCode === "US")
            currency = "usd";
        else if (countryCode === "CH")
            currency = "chf";
        else if (countryCode === "NO")
            currency = "nok";
        else if (countryCode === "SE")
            currency = "sek";
        else if (countryCode === "DK")
            currency = "dkk";
        const lineItems = buildStripeLineItems(fullOrder.items, currency);
        const successUrl = process.env.SUCCESS_URL ||
            process.env.FRONTEND_URL ||
            "http://localhost:3000";
        const session = await stripe.checkout.sessions.create({
            ui_mode: "embedded",
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            return_url: `${successUrl}/payment-return?session_id={CHECKOUT_SESSION_ID}`,
            metadata: {
                orderId: order.id.toString(),
                userId: order.userId.toString(),
            },
            customer_email: user.email,
        });
        await prisma_1.prisma.order.update({
            where: { id: order.id },
            data: { paymentIntentId: session.id },
        });
        return res.json({
            clientSecret: session.client_secret,
            orderId: order.id,
            sessionId: session.id,
        });
    }
    catch (error) {
        console.error("Error creating embedded checkout:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};
exports.createEmbeddedCheckout = createEmbeddedCheckout;
// Payment Intent Controller
const PaymentIntent = async (req, res) => {
    const { productId, userId, quantity, countryCode, paymentIntentMode, orderId, } = req.body;
    try {
        let order;
        let user;
        let product;
        let totalAmount = 0;
        const qty = parseInt(quantity, 10) || 1;
        if (orderId) {
            const parsedOrderId = Number(orderId);
            order = await prisma_1.prisma.order.findUnique({
                where: { id: isNaN(parsedOrderId) ? orderId : parsedOrderId },
                include: { items: { include: { product: true } } },
            });
            if (!order) {
                return res.status(404).json({ message: "Order not found" });
            }
            user = await prisma_1.prisma.user.findUnique({ where: { id: order.userId } });
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
        }
        else {
            const parsedProductId = Number(productId);
            const parsedUserId = Number(userId);
            [product, user] = await Promise.all([
                prisma_1.prisma.product.findUnique({
                    where: { id: isNaN(parsedProductId) ? productId : parsedProductId },
                }),
                prisma_1.prisma.user.findUnique({
                    where: { id: isNaN(parsedUserId) ? userId : parsedUserId },
                }),
            ]);
            if (!product || !user) {
                return res.status(404).json({ message: "Product or User not found" });
            }
            totalAmount = Number(product.price) * qty;
        }
        let currency = "eur";
        if (countryCode === "GB")
            currency = "gbp";
        else if (countryCode === "US")
            currency = "usd";
        else if (countryCode === "CH")
            currency = "chf";
        else if (countryCode === "NO")
            currency = "nok";
        else if (countryCode === "SE")
            currency = "sek";
        else if (countryCode === "DK")
            currency = "dkk";
        else if (countryCode === "GH")
            currency = "ghs";
        if (paymentIntentMode) {
            if (!orderId) {
                const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
                const recentOrder = await prisma_1.prisma.order.findFirst({
                    where: {
                        userId: user.id,
                        status: enums_1.OrderStatus.PENDING,
                        paymentIntentId: null,
                        createdAt: { gte: twoMinutesAgo },
                    },
                    include: { items: true },
                    orderBy: { createdAt: "desc" },
                });
                if (recentOrder &&
                    Math.abs(Number(recentOrder.totalAmount) - totalAmount) < 0.01) {
                    order = recentOrder;
                }
                else {
                    let imageUrl = null;
                    if (product.images &&
                        Array.isArray(product.images) &&
                        product.images.length > 0) {
                        imageUrl = String(product.images[0]);
                    }
                    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    order = await prisma_1.prisma.order.create({
                        data: {
                            orderNumber,
                            userId: user.id,
                            totalAmount,
                            status: enums_1.OrderStatus.PENDING,
                            items: {
                                create: {
                                    productId: product.id,
                                    productName: product.name,
                                    image: imageUrl,
                                    price: Number(product.price),
                                    quantity: qty,
                                },
                            },
                        },
                    });
                }
            }
            const orderTotal = orderId ? Number(order.totalAmount) : totalAmount;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(orderTotal * 100),
                currency: currency,
                metadata: {
                    orderId: order.id.toString(),
                    userId: user.id.toString(),
                },
                automatic_payment_methods: { enabled: true },
                description: orderId
                    ? `Order #${order.orderNumber}`
                    : `Purchase of ${product?.name} (x${qty})`,
                receipt_email: user.email,
            });
            await prisma_1.prisma.order.update({
                where: { id: order.id },
                data: { paymentIntentId: paymentIntent.id },
            });
            return res.json({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                orderId: order.id,
                type: "payment_intent",
            });
        }
        else {
            if (!orderId) {
                const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
                const recentOrder = await prisma_1.prisma.order.findFirst({
                    where: {
                        userId: user.id,
                        status: enums_1.OrderStatus.PENDING,
                        paymentIntentId: null,
                        createdAt: { gte: twoMinutesAgo },
                    },
                    include: { items: true },
                    orderBy: { createdAt: "desc" },
                });
                if (recentOrder &&
                    Math.abs(Number(recentOrder.totalAmount) - totalAmount) < 0.01) {
                    order = recentOrder;
                }
                else {
                    let imageUrl = null;
                    if (product.images &&
                        Array.isArray(product.images) &&
                        product.images.length > 0) {
                        imageUrl = String(product.images[0]);
                    }
                    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    order = await prisma_1.prisma.order.create({
                        data: {
                            orderNumber,
                            userId: user.id,
                            totalAmount,
                            status: enums_1.OrderStatus.PENDING,
                            items: {
                                create: {
                                    productId: product.id,
                                    productName: product.name,
                                    image: imageUrl,
                                    price: Number(product.price),
                                    quantity: qty,
                                },
                            },
                        },
                    });
                }
            }
            const fullOrder = await prisma_1.prisma.order.findUnique({
                where: { id: order.id },
                include: { items: { include: { product: true } } },
            });
            const lineItems = buildStripeLineItems(fullOrder.items, currency);
            const successUrl = process.env.SUCCESS_URL || "http://localhost:3000";
            const cancelUrl = process.env.CANCEL_URL || "http://localhost:3000";
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                line_items: lineItems,
                mode: "payment",
                success_url: `${successUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${cancelUrl}/payment-failed`,
                metadata: {
                    orderId: order.id.toString(),
                    userId: user.id.toString(),
                },
                customer_email: user.email,
            });
            await prisma_1.prisma.order.update({
                where: { id: order.id },
                data: { paymentIntentId: session.id },
            });
            return res.json({
                url: session.url,
                orderId: order.id,
                sessionId: session.id,
                clientSecret: session.client_secret,
                type: "checkout_session",
            });
        }
    }
    catch (error) {
        console.error("Error creating payment intent:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};
exports.PaymentIntent = PaymentIntent;
// Retrieve session status
const getSessionStatus = async (req, res) => {
    const { session_id } = req.query;
    try {
        const session = await stripe.checkout.sessions.retrieve(String(session_id));
        return res.json({
            status: session.status,
            payment_status: session.payment_status,
            customer_email: session.customer_email,
            amount_total: session.amount_total,
            currency: session.currency,
        });
    }
    catch (error) {
        console.error("Error retrieving session:", error);
        return res.status(500).json({
            message: "Error retrieving session status",
            error: error.message,
        });
    }
};
exports.getSessionStatus = getSessionStatus;
// Stripe Webhook Handler
const stripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    }
    catch (err) {
        console.error("⚠️ Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                const order = await prisma_1.prisma.order.findFirst({
                    where: { paymentIntentId: session.id },
                    include: { items: { include: { product: true } } },
                });
                if (order) {
                    await prisma_1.prisma.order.update({
                        where: { id: order.id },
                        data: { status: enums_1.OrderStatus.CONFIRMED },
                    });
                    const user = await prisma_1.prisma.user.findUnique({
                        where: { id: order.userId },
                    });
                    if (user) {
                        const amount = session.amount_total
                            ? (session.amount_total / 100).toFixed(2)
                            : "0.00";
                        const currency = session.currency
                            ? session.currency.toUpperCase()
                            : "USD";
                        const firstItemName = order.items[0]?.productName || "N/A";
                        await sendEmail(user.email, "Payment Confirmation - Order Successful", `Dear ${user.name || user.email},\n\nYour payment was successful!\n\nOrder Details:\nOrder ID: ${order.id}\nProduct: ${firstItemName}\nAmount: ${amount} ${currency}\nStatus: Confirmed\nPayment Date: ${new Date().toLocaleString()}\n\nThank you for your purchase!\n\nBest regards,\nGeorgina Services Limited`);
                    }
                }
                break;
            }
            case "checkout.session.expired": {
                const session = event.data.object;
                const expiredOrder = await prisma_1.prisma.order.findFirst({
                    where: { paymentIntentId: session.id },
                });
                if (expiredOrder && expiredOrder.status === enums_1.OrderStatus.PENDING) {
                    await prisma_1.prisma.order.update({
                        where: { id: expiredOrder.id },
                        data: { status: enums_1.OrderStatus.CANCELLED },
                    });
                }
                break;
            }
            case "payment_intent.payment_failed": {
                const paymentIntent = event.data.object;
                const failedOrder = await prisma_1.prisma.order.findFirst({
                    where: { paymentIntentId: paymentIntent.id },
                });
                if (failedOrder) {
                    await prisma_1.prisma.order.update({
                        where: { id: failedOrder.id },
                        data: { status: enums_1.OrderStatus.FAILED },
                    });
                    const user = await prisma_1.prisma.user.findUnique({
                        where: { id: failedOrder.userId },
                    });
                    if (user) {
                        await sendEmail(user.email, "Payment Failed - Action Required", `Dear ${user.name || user.email},\n\nUnfortunately, your payment for order ${failedOrder.id} was unsuccessful.\n\nPlease try again or contact our support team if you need assistance.\n\nBest regards,\nGeorgina Services Limited`);
                    }
                }
                break;
            }
        }
        return res.json({ received: true });
    }
    catch (error) {
        console.error("❌ Error processing webhook:", error);
        return res.status(500).json({ error: "Webhook processing failed" });
    }
};
exports.stripeWebhook = stripeWebhook;
// Confirm payment manually
const confirmPayment = async (req, res) => {
    const { sessionId } = req.body;
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const order = await prisma_1.prisma.order.findFirst({
            where: { paymentIntentId: sessionId },
            include: { items: true },
        });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (session.payment_status === "paid") {
            if (order.status !== enums_1.OrderStatus.CONFIRMED) {
                await prisma_1.prisma.order.update({
                    where: { id: order.id },
                    data: { status: enums_1.OrderStatus.CONFIRMED },
                });
                const user = await prisma_1.prisma.user.findUnique({
                    where: { id: order.userId },
                });
                if (user) {
                    const amount = session.amount_total
                        ? (session.amount_total / 100).toFixed(2)
                        : "0.00";
                    const currency = session.currency
                        ? session.currency.toUpperCase()
                        : "USD";
                    const firstItemName = order.items[0]?.productName || "N/A";
                    await sendEmail(user.email, "Payment Confirmation - Order Successful", `Dear ${user.name || user.email},\n\nYour payment was successful!\n\nOrder Details:\nOrder ID: ${order.id}\nProduct: ${firstItemName}\nAmount: ${amount} ${currency}\nStatus: Confirmed\n\nThank you for your purchase!\n\nBest regards,\nGeorgina Services Limited`);
                }
            }
            return res.json({
                success: true,
                message: "Payment confirmed successfully",
                order,
                paymentStatus: session.payment_status,
            });
        }
        else {
            return res.status(400).json({
                success: false,
                message: "Payment not completed",
                status: session.payment_status,
            });
        }
    }
    catch (error) {
        console.error("Payment confirmation error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
exports.confirmPayment = confirmPayment;
