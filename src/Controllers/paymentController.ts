// controllers/stripeController.ts
import type { Request, Response } from "express";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import { prisma } from "../config/prisma";
import { OrderStatus } from "../generated/prisma/enums";

// const stripe = new Stripe(process.env.STRIPE_SECRET as string, {
//   apiVersion: "2025-02-28.acacia" as any,
// });
type productItem = {
	productName: string;
	product?: { description?: string | null } | null;
	price: unknown;
	quantity: number;
};

const buildStripeLineItems = (
	items: productItem[],
	currency: string,
): Stripe.Checkout.SessionCreateParams.LineItem[] =>
	items.map(
		(item): Stripe.Checkout.SessionCreateParams.LineItem => ({
			price_data: {
				currency,
				product_data: {
					name: item.productName,
					description: item.product?.description ?? undefined,
				},
				unit_amount: Math.round(Number(item.price) * 100),
			},
			quantity: Number(item.quantity),
		}),
	);

const stripeKey = process.env.STRIPE_SECRET_KEY || "";

if (!stripeKey) {
	console.warn(
		"⚠️ Warning: STRIPE_SECRET_KEY is missing from environment variables.",
	);
}

const stripe = new Stripe(stripeKey, {
	apiVersion: "2025-02-24.acacia" as any, // Or your current Stripe API version
});

// Reusable email sender
const sendEmail = async (
	userEmail: string,
	subject: string,
	text: string,
): Promise<void> => {
	try {
		const transporter = nodemailer.createTransport({
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
	} catch (error) {
		console.error("Email sending error:", error);
	}
};

// Create Checkout Session for Embedded Checkout
export const createEmbeddedCheckout = async (
	req: Request,
	res: Response,
): Promise<any> => {
	const { productId, userId, quantity, countryCode, orderId } = req.body;

	try {
		let order: any;
		const qty = parseInt(quantity, 10) || 1;

		if (orderId) {
			const parsedOrderId = Number(orderId);
			order = await prisma.order.findUnique({
				where: { id: isNaN(parsedOrderId) ? orderId : parsedOrderId },
			});
			if (!order) {
				return res.status(404).json({ message: "Order not found" });
			}
		} else {
			const parsedProductId = Number(productId);
			const parsedUserId = Number(userId);

			const [product, user] = await Promise.all([
				prisma.product.findUnique({
					where: { id: isNaN(parsedProductId) ? productId : parsedProductId },
				}),
				prisma.user.findUnique({
					where: { id: isNaN(parsedUserId) ? userId : parsedUserId },
				}),
			]);

			if (!product || !user) {
				return res.status(404).json({ message: "Product or User not found" });
			}

			const totalAmount = Number(product.price) * qty;
			let imageUrl: string | null = null;
			if (
				product.images &&
				Array.isArray(product.images) &&
				product.images.length > 0
			) {
				imageUrl = String(product.images[0]);
			}

			const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

			order = await prisma.order.create({
				data: {
					orderNumber,
					userId: user.id,
					totalAmount,
					status: OrderStatus.PENDING,
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

		const fullOrder = await prisma.order.findUnique({
			where: { id: order.id },
			include: {
				items: {
					include: { product: true },
				},
			},
		});

		const user = await prisma.user.findUnique({ where: { id: order.userId } });
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		let currency = "eur";
		if (countryCode === "GB") currency = "gbp";
		else if (countryCode === "US") currency = "usd";
		else if (countryCode === "CH") currency = "chf";
		else if (countryCode === "NO") currency = "nok";
		else if (countryCode === "SE") currency = "sek";
		else if (countryCode === "DK") currency = "dkk";

		const lineItems = buildStripeLineItems(fullOrder!.items as any, currency);

		const successUrl =
			process.env.SUCCESS_URL ||
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

		await prisma.order.update({
			where: { id: order.id },
			data: { paymentIntentId: session.id },
		});

		return res.json({
			clientSecret: session.client_secret,
			orderId: order.id,
			sessionId: session.id,
		});
	} catch (error: any) {
		console.error("Error creating embedded checkout:", error);
		return res.status(500).json({
			message: "Internal server error",
			error: error.message,
		});
	}
};

// Payment Intent Controller
export const PaymentIntent = async (
	req: Request,
	res: Response,
): Promise<any> => {
	const {
		productId,
		userId,
		quantity,
		countryCode,
		paymentIntentMode,
		orderId,
	} = req.body;

	try {
		let order: any;
		let user: any;
		let product: any;
		let totalAmount = 0;
		const qty = parseInt(quantity, 10) || 1;

		if (orderId) {
			const parsedOrderId = Number(orderId);
			order = await prisma.order.findUnique({
				where: { id: isNaN(parsedOrderId) ? orderId : parsedOrderId },
				include: { items: { include: { product: true } } },
			});

			if (!order) {
				return res.status(404).json({ message: "Order not found" });
			}

			user = await prisma.user.findUnique({ where: { id: order.userId } });
			if (!user) {
				return res.status(404).json({ message: "User not found" });
			}
		} else {
			const parsedProductId = Number(productId);
			const parsedUserId = Number(userId);

			[product, user] = await Promise.all([
				prisma.product.findUnique({
					where: { id: isNaN(parsedProductId) ? productId : parsedProductId },
				}),
				prisma.user.findUnique({
					where: { id: isNaN(parsedUserId) ? userId : parsedUserId },
				}),
			]);

			if (!product || !user) {
				return res.status(404).json({ message: "Product or User not found" });
			}

			totalAmount = Number(product.price) * qty;
		}

		let currency = "eur";
		if (countryCode === "GB") currency = "gbp";
		else if (countryCode === "US") currency = "usd";
		else if (countryCode === "CH") currency = "chf";
		else if (countryCode === "NO") currency = "nok";
		else if (countryCode === "SE") currency = "sek";
		else if (countryCode === "DK") currency = "dkk";
		else if (countryCode === "GH") currency = "ghs";

		if (paymentIntentMode) {
			if (!orderId) {
				const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
				const recentOrder = await prisma.order.findFirst({
					where: {
						userId: user.id,
						status: OrderStatus.PENDING,
						paymentIntentId: null,
						createdAt: { gte: twoMinutesAgo },
					},
					include: { items: true },
					orderBy: { createdAt: "desc" },
				});

				if (
					recentOrder &&
					Math.abs(Number(recentOrder.totalAmount) - totalAmount) < 0.01
				) {
					order = recentOrder;
				} else {
					let imageUrl: string | null = null;
					if (
						product.images &&
						Array.isArray(product.images) &&
						product.images.length > 0
					) {
						imageUrl = String(product.images[0]);
					}

					const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

					order = await prisma.order.create({
						data: {
							orderNumber,
							userId: user.id,
							totalAmount,
							status: OrderStatus.PENDING,
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

			await prisma.order.update({
				where: { id: order.id },
				data: { paymentIntentId: paymentIntent.id },
			});

			return res.json({
				clientSecret: paymentIntent.client_secret,
				paymentIntentId: paymentIntent.id,
				orderId: order.id,
				type: "payment_intent",
			});
		} else {
			if (!orderId) {
				const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
				const recentOrder = await prisma.order.findFirst({
					where: {
						userId: user.id,
						status: OrderStatus.PENDING,
						paymentIntentId: null,
						createdAt: { gte: twoMinutesAgo },
					},
					include: { items: true },
					orderBy: { createdAt: "desc" },
				});

				if (
					recentOrder &&
					Math.abs(Number(recentOrder.totalAmount) - totalAmount) < 0.01
				) {
					order = recentOrder;
				} else {
					let imageUrl: string | null = null;
					if (
						product.images &&
						Array.isArray(product.images) &&
						product.images.length > 0
					) {
						imageUrl = String(product.images[0]);
					}

					const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

					order = await prisma.order.create({
						data: {
							orderNumber,
							userId: user.id,
							totalAmount,
							status: OrderStatus.PENDING,
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

			const fullOrder = await prisma.order.findUnique({
				where: { id: order.id },
				include: { items: { include: { product: true } } },
			});

			const lineItems = buildStripeLineItems(fullOrder!.items as any, currency);

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

			await prisma.order.update({
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
	} catch (error: any) {
		console.error("Error creating payment intent:", error);
		return res.status(500).json({
			message: "Internal server error",
			error: error.message,
		});
	}
};

// Retrieve session status
export const getSessionStatus = async (
	req: Request,
	res: Response,
): Promise<any> => {
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
	} catch (error: any) {
		console.error("Error retrieving session:", error);
		return res.status(500).json({
			message: "Error retrieving session status",
			error: error.message,
		});
	}
};

// Stripe Webhook Handler
export const stripeWebhook = async (
	req: Request,
	res: Response,
): Promise<any> => {
	const sig = req.headers["stripe-signature"];
	const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret!);
	} catch (err: any) {
		console.error("⚠️ Webhook signature verification failed:", err.message);
		return res.status(400).send(`Webhook Error: ${err.message}`);
	}

	try {
		switch (event.type) {
			case "checkout.session.completed": {
				const session = event.data.object as Stripe.Checkout.Session;
				const order = await prisma.order.findFirst({
					where: { paymentIntentId: session.id },
					include: { items: { include: { product: true } } },
				});

				if (order) {
					await prisma.order.update({
						where: { id: order.id },
						data: { status: OrderStatus.CONFIRMED },
					});

					const user = await prisma.user.findUnique({
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

						await sendEmail(
							user.email,
							"Payment Confirmation - Order Successful",
							`Dear ${user.name || user.email},\n\nYour payment was successful!\n\nOrder Details:\nOrder ID: ${order.id}\nProduct: ${firstItemName}\nAmount: ${amount} ${currency}\nStatus: Confirmed\nPayment Date: ${new Date().toLocaleString()}\n\nThank you for your purchase!\n\nBest regards,\nGeorgina Services Limited`,
						);
					}
				}
				break;
			}
			case "checkout.session.expired": {
				const session = event.data.object as Stripe.Checkout.Session;
				const expiredOrder = await prisma.order.findFirst({
					where: { paymentIntentId: session.id },
				});

				if (expiredOrder && expiredOrder.status === OrderStatus.PENDING) {
					await prisma.order.update({
						where: { id: expiredOrder.id },
						data: { status: OrderStatus.CANCELLED },
					});
				}
				break;
			}
			case "payment_intent.payment_failed": {
				const paymentIntent = event.data.object as Stripe.PaymentIntent;
				const failedOrder = await prisma.order.findFirst({
					where: { paymentIntentId: paymentIntent.id },
				});

				if (failedOrder) {
					await prisma.order.update({
						where: { id: failedOrder.id },
						data: { status: OrderStatus.FAILED },
					});

					const user = await prisma.user.findUnique({
						where: { id: failedOrder.userId },
					});
					if (user) {
						await sendEmail(
							user.email,
							"Payment Failed - Action Required",
							`Dear ${user.name || user.email},\n\nUnfortunately, your payment for order ${failedOrder.id} was unsuccessful.\n\nPlease try again or contact our support team if you need assistance.\n\nBest regards,\nGeorgina Services Limited`,
						);
					}
				}
				break;
			}
		}

		return res.json({ received: true });
	} catch (error: any) {
		console.error("❌ Error processing webhook:", error);
		return res.status(500).json({ error: "Webhook processing failed" });
	}
};

// Confirm payment manually
export const confirmPayment = async (
	req: Request,
	res: Response,
): Promise<any> => {
	const { sessionId } = req.body;

	try {
		const session = await stripe.checkout.sessions.retrieve(sessionId);
		const order = await prisma.order.findFirst({
			where: { paymentIntentId: sessionId },
			include: { items: true },
		});

		if (!order) {
			return res.status(404).json({ message: "Order not found" });
		}

		if (session.payment_status === "paid") {
			if (order.status !== OrderStatus.CONFIRMED) {
				await prisma.order.update({
					where: { id: order.id },
					data: { status: OrderStatus.CONFIRMED },
				});

				const user = await prisma.user.findUnique({
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

					await sendEmail(
						user.email,
						"Payment Confirmation - Order Successful",
						`Dear ${user.name || user.email},\n\nYour payment was successful!\n\nOrder Details:\nOrder ID: ${order.id}\nProduct: ${firstItemName}\nAmount: ${amount} ${currency}\nStatus: Confirmed\n\nThank you for your purchase!\n\nBest regards,\nGeorgina Services Limited`,
					);
				}
			}

			return res.json({
				success: true,
				message: "Payment confirmed successfully",
				order,
				paymentStatus: session.payment_status,
			});
		} else {
			return res.status(400).json({
				success: false,
				message: "Payment not completed",
				status: session.payment_status,
			});
		}
	} catch (error: any) {
		console.error("Payment confirmation error:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};
