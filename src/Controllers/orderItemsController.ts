import { Request, Response } from "express";
import { prisma } from "../config/prisma";

export const getOrderItems = async (
	req: Request,
	res: Response,
): Promise<any> => {
	try {
		const orderItems = await prisma.orderItem.findMany({
			include: {
				order: {
					include: {
						user: {
							select: { id: true, name: true, email: true },
						},
					},
				},
				product: true,
			},
		});

		console.log("=== getOrderItems Debug ===");
		console.log("Total orderItems found:", orderItems.length);
		orderItems.forEach(
			(
				item: {
					id: any;
					orderId: any;
					order: { orderNumber: any };
					product: { name: any };
					quantity: any;
				},
				index: number,
			) => {
				console.log(`OrderItem ${index + 1}:`, {
					id: item.id,
					orderId: item.orderId,
					orderNumber: item.order?.orderNumber,
					productName: item.product?.name,
					quantity: item.quantity,
				});
			},
		);

		return res.status(200).json({
			success: true,
			data: orderItems,
		});
	} catch (err: any) {
		console.error("Error in getOrderItems:", err);
		return res.status(500).json({
			success: false,
			error: err.message,
		});
	}
};

export const getOrderItemById = async (
	req: Request,
	res: Response,
): Promise<any> => {
	try {
		const itemId = Number(req.params.id);
		if (isNaN(itemId)) {
			return res
				.status(400)
				.json({ success: false, error: "Invalid order item ID format" });
		}

		const orderItem = await prisma.orderItem.findUnique({
			where: { id: itemId },
			include: {
				order: {
					include: {
						user: {
							select: { id: true, name: true, email: true },
						},
					},
				},
				product: true,
			},
		});

		console.log("=== getOrderItemById Debug ===");
		console.log("Requested ID:", req.params.id);
		if (orderItem) {
			console.log("OrderItem found:", {
				id: orderItem.id,
				orderId: orderItem.orderId,
				orderNumber: orderItem.order?.orderNumber,
				orderData: orderItem.order,
				productName: orderItem.product?.name,
				quantity: orderItem.quantity,
			});
		} else {
			console.log("OrderItem not found");
		}

		if (!orderItem) {
			return res.status(404).json({
				success: false,
				error: "OrderItem not found",
			});
		}

		return res.status(200).json({
			success: true,
			data: orderItem,
		});
	} catch (err: any) {
		console.error("Error in getOrderItemById:", err);
		return res.status(500).json({
			success: false,
			error: err.message,
		});
	}
};

export const createOrderItem = async (
	req: Request,
	res: Response,
): Promise<any> => {
	try {
		console.log("=== createOrderItem Debug ===");
		console.log("Request body:", req.body);

		const orderItem = await prisma.orderItem.create({
			data: req.body,
		});

		console.log("Created orderItem:", {
			id: orderItem.id,
			orderId: orderItem.orderId,
			productId: orderItem.productId,
			quantity: orderItem.quantity,
		});

		return res.status(201).json({
			success: true,
			data: orderItem,
		});
	} catch (err: any) {
		return res.status(400).json({
			success: false,
			error: err.message,
		});
	}
};

export const updateOrderItem = async (
	req: Request,
	res: Response,
): Promise<any> => {
	try {
		console.log("=== updateOrderItem Debug ===");
		console.log("OrderItem ID:", req.params.id);
		console.log("Update data:", req.body);

		const itemId = Number(req.params.id);
		if (isNaN(itemId)) {
			return res
				.status(400)
				.json({ success: false, error: "Invalid order item ID format" });
		}

		const existingItem = await prisma.orderItem.findUnique({
			where: { id: itemId },
		});

		if (!existingItem) {
			return res.status(404).json({
				success: false,
				error: "OrderItem not found",
			});
		}

		console.log("Before update:", existingItem);
		const updatedOrderItem = await prisma.orderItem.update({
			where: { id: itemId },
			data: req.body,
		});
		console.log("After update:", updatedOrderItem);

		return res.status(200).json({
			success: true,
			data: updatedOrderItem,
		});
	} catch (err: any) {
		return res.status(400).json({
			success: false,
			error: err.message,
		});
	}
};

export const deleteOrderItem = async (
	req: Request,
	res: Response,
): Promise<any> => {
	try {
		const itemId = Number(req.params.id);
		if (isNaN(itemId)) {
			return res
				.status(400)
				.json({ success: false, error: "Invalid order item ID format" });
		}

		const existingItem = await prisma.orderItem.findUnique({
			where: { id: itemId },
		});

		if (!existingItem) {
			return res.status(404).json({
				success: false,
				error: "OrderItem not found",
			});
		}

		await prisma.orderItem.delete({
			where: { id: itemId },
		});

		return res.status(200).json({
			success: true,
			message: "Order item deleted successfully",
		});
	} catch (err: any) {
		return res.status(500).json({
			success: false,
			error: err.message,
		});
	}
};
