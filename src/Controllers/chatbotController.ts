import { Request, Response } from "express";
import OpenAI from "openai";

// const prisma = new PrismaClient();
import { prisma } from "../config/prisma"; // Adjust relative path as needed
import { ChatSender, MessageType } from "../generated/prisma/enums";

// Initialize OpenAI
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

// Helper to safely extract string params
const getStringParam = (param: unknown): string | undefined => {
	if (!param) return undefined;
	if (Array.isArray(param))
		return typeof param[0] === "string" ? param[0] : undefined;
	return typeof param === "string" ? param : String(param);
};

// Get or create chat session
export const getOrCreateSession = async (
	req: Request,
	res: Response,
): Promise<Response> => {
	try {
		const rawSessionId = getStringParam(req.params.sessionId);

		let session = rawSessionId;
		if (
			!rawSessionId ||
			rawSessionId === "new" ||
			rawSessionId === "undefined"
		) {
			session = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		}

		// Get existing messages for this session
		const messages = await prisma.chatMessage.findMany({
			where: { sessionId: session! },
			orderBy: { timestamp: "asc" },
			take: 50,
		});

		let allMessages = [...messages];

		// If no messages, create welcome message
		if (allMessages.length === 0) {
			const welcomeMessage = await prisma.chatMessage.create({
				data: {
					sessionId: session!,
					message:
						"Hello! I'm Georgina, your cleaning service assistant. I can help you with booking cleanings, checking prices, or answering any questions about our services. What would you like to know?",
					sender: ChatSender.BOT,
					messageType: MessageType.TEXT,
					metadata: {
						quickReplies: [
							"What services do you offer?",
							"How do I book a cleaning?",
							"What are your prices?",
							"Contact support",
						],
					},
				},
			});
			allMessages.push(welcomeMessage);
		}

		return res.status(200).json({
			success: true,
			data: {
				sessionId: session,
				messages: allMessages,
			},
		});
	} catch (error: any) {
		console.error("Error getting chat session:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to get chat session",
			error: error.message,
		});
	}
};

// Enhanced bot response with AI
const generateBotResponse = async (
	userMessage: string,
	sessionId: string,
	conversationHistory: any[] = [],
) => {
	try {
		const messages: any[] = [
			{
				role: "system",
				content: `You are a helpful customer service assistant for a professional cleaning service company called "Georgina Cleaning Service". 

Company Information:
- Services: Office Cleaning, Kitchen Cleaning, Bathroom Cleaning, Dusting Service, Mopping Service, Vacuuming Service
- Pricing: Office $150, Kitchen $200, Bathroom $100, Dusting $80, Mopping $90, Vacuuming $85
- Contact: Phone +233 123 456 789, Email support@cleaningservice.com
- Address: 123 Market Street, Accra, Ghana
- Hours: Mon-Fri 8am-6pm, Sat 9am-4pm

Guidelines:
- Be friendly, professional, and helpful
- Keep responses concise but informative
- If you don't know something, suggest contacting support
- Always maintain a positive tone
- Use emojis sparingly to make it friendly
- For booking requests, direct them to the website or phone
- For pricing questions, provide general ranges and offer custom quotes
`,
			},
			...conversationHistory.slice(-10).map((msg: any) => ({
				role: msg.sender === ChatSender.USER ? "user" : "assistant",
				content: msg.message,
			})),
			{
				role: "user",
				content: userMessage,
			},
		];

		const completion = await openai.chat.completions.create({
			model: "gpt-3.5-turbo",
			messages: messages,
			max_tokens: 150,
			temperature: 0.7,
		});

		const aiResponse =
			completion.choices[0].message.content || "I'm here to help!";

		return {
			sessionId,
			message: aiResponse,
			sender: ChatSender.BOT,
			messageType: MessageType.TEXT,
			metadata: {
				isAI: true,
				model: "gpt-3.5-turbo",
			},
		};
	} catch (error) {
		console.error("AI API Error:", error);
		return generateFallbackResponse(userMessage, sessionId);
	}
};

// Fallback responses
const generateFallbackResponse = (userMessage: string, sessionId: string) => {
	const message = userMessage.toLowerCase().trim();

	const response: any = {
		sessionId,
		sender: ChatSender.BOT,
		messageType: MessageType.TEXT,
		metadata: { isAI: false },
	};

	if (
		message.includes("hello") ||
		message.includes("hi") ||
		message.includes("hey")
	) {
		response.message =
			"Hello! 👋 Welcome to Georgina Cleaning Service. How can I help you today?";
		response.metadata.quickReplies = [
			"Book a cleaning service",
			"View pricing",
			"Contact support",
			"Service areas",
		];
	} else if (message.includes("service") || message.includes("offer")) {
		response.message =
			"We offer professional cleaning services including:\n\nOffice Cleaning 🏢\nKitchen Cleaning 🍳\nBathroom Cleaning 🚿\nDusting Service 🌬️\nMopping Service 🧹\nVacuuming Service 🧽\n\nWhich service are you interested in?";
		response.metadata.quickReplies = [
			"Office Cleaning",
			"Kitchen Cleaning",
			"Bathroom Cleaning",
			"View all services",
		];
	} else if (message.includes("price") || message.includes("cost")) {
		response.message =
			"Our pricing starts from:\n\nOffice Cleaning: $150\nKitchen Cleaning: $200\nBathroom Cleaning: $100\nDusting Service: $80\nMopping Service: $90\nVacuuming Service: $85\n\nPrices may vary based on space size. Would you like a custom quote?";
		response.metadata.quickReplies = [
			"Get a custom quote",
			"Book a service",
			"View service details",
		];
	} else {
		response.message = `I understand you're asking about "${userMessage}". For detailed assistance, please contact our support team at +233 123 456 789 or email support@cleaningservice.com. Is there anything else I can help you with?`;
		response.metadata.quickReplies = [
			"Contact support",
			"View services",
			"Check pricing",
		];
	}

	return response;
};

// Send a message
export const sendMessage = async (
	req: Request,
	res: Response,
): Promise<Response> => {
	try {
		const { sessionId, message, metadata } = req.body;

		if (!sessionId || !message) {
			return res.status(400).json({
				success: false,
				message: "Session ID and message are required",
			});
		}

		// Get conversation history for context
		const conversationHistory = await prisma.chatMessage.findMany({
			where: { sessionId },
			orderBy: { timestamp: "asc" },
			take: 10,
		});

		// Save user message
		const userMessage = await prisma.chatMessage.create({
			data: {
				sessionId,
				message: String(message).trim(),
				sender: ChatSender.USER,
				messageType: MessageType.TEXT,
				metadata: metadata || null,
			},
		});

		// Generate AI response
		const botResponseData = await generateBotResponse(
			message,
			sessionId,
			conversationHistory,
		);

		// Save bot response
		const botMessage = await prisma.chatMessage.create({
			data: botResponseData,
		});

		// Get updated conversation
		const messages = await prisma.chatMessage.findMany({
			where: { sessionId },
			orderBy: { timestamp: "asc" },
			take: 50,
		});

		return res.status(200).json({
			success: true,
			data: {
				userMessage,
				botMessage,
				messages,
				sessionId,
			},
		});
	} catch (error: any) {
		console.error("Error sending message:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to send message",
			error: error.message,
		});
	}
};

// Get chat history
export const getChatHistory = async (
	req: Request,
	res: Response,
): Promise<Response> => {
	try {
		const sessionId = getStringParam(req.params.sessionId);
		if (!sessionId)
			return res.status(400).json({ error: "Session ID is required" });

		const messages = await prisma.chatMessage.findMany({
			where: { sessionId },
			orderBy: { timestamp: "asc" },
			take: 100,
		});

		return res.status(200).json({
			success: true,
			data: {
				sessionId,
				messages,
				total: messages.length,
			},
		});
	} catch (error: any) {
		console.error("Error getting chat history:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to get chat history",
			error: error.message,
		});
	}
};

// Mark messages as read
export const markAsRead = async (
	req: Request,
	res: Response,
): Promise<Response> => {
	try {
		const sessionId = getStringParam(req.params.sessionId);
		if (!sessionId)
			return res.status(400).json({ error: "Session ID is required" });

		await prisma.chatMessage.updateMany({
			where: {
				sessionId,
				sender: ChatSender.USER,
				isRead: false,
			},
			data: { isRead: true },
		});

		return res.status(200).json({
			success: true,
			message: "Messages marked as read",
		});
	} catch (error: any) {
		console.error("Error marking messages as read:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to mark messages as read",
			error: error.message,
		});
	}
};

// Get unread message count
export const getUnreadCount = async (
	req: Request,
	res: Response,
): Promise<Response> => {
	try {
		const sessionId = getStringParam(req.params.sessionId);
		if (!sessionId)
			return res.status(400).json({ error: "Session ID is required" });

		const count = await prisma.chatMessage.count({
			where: {
				sessionId,
				sender: ChatSender.USER,
				isRead: false,
			},
		});

		return res.status(200).json({
			success: true,
			data: { unreadCount: count },
		});
	} catch (error: any) {
		console.error("Error getting unread count:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to get unread count",
			error: error.message,
		});
	}
};
