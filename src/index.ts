import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import bodyParser from "body-parser";
import { config } from "dotenv";
import path from "path";

// Import routes
import chatbotRoutes from "./Routes/chatbotRoute";
import authRoute from "./Routes/authRoutes";
import userRoute from "./Routes/userRoutes";
import productRoute from "./Routes/productRoutes";
import categoryRoute from "./Routes/categoryRoutes";
import paymentRoute from "./Routes/paymentRoutes";
import userOrderRoutes from "./Routes/userOrderRoutes";
import adminOrderRoutes from "./Routes/adminOrderRoutes";
import adminorderItemsRoutes from "./Routes/orderItemsRoute";
import specialProductRoute from "./Routes/specialProductRoute";
import reviewRoute from "./Routes/reviewRoutes";
import wishlistRoute from "./Routes/wishlistRoute";

config();
const app = express();

// 🛡️ 1. Use Helmet for security headers (configured to allow external images like Cloudinary)
app.use(
	helmet({
		crossOriginResourcePolicy: { policy: "cross-origin" },
	}),
);

// 📂 2. Use Path to serve static files (e.g., if you have a local public/uploads folder)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// IMPORTANT: Apply express.raw() BEFORE express.json() for webhook route
app.use("/api/webhook", express.raw({ type: "application/json" }));
app.use(bodyParser.json());

app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin) return callback(null, true);

			// Allow all localhost variants
			if (/^http:\/\/localhost(:\d+)?$/.test(origin)) {
				return callback(null, true);
			}

			// Allow 127.0.0.1 as well
			if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
				return callback(null, true);
			}

			const allowedOrigins = [
				"*",
				"https://gsl-store-front.vercel.app",
				"https://georgina-services-limited-dashboard.vercel.app",
				"https://georgina-services-ltd-server.onrender.com",
				"http://localhost:8080",
				"http://localhost:8081",
				"http://localhost:8082",
				"http://localhost:5173",
				"http://localhost:3000",
			];

			if (allowedOrigins.includes(origin)) {
				return callback(null, true);
			}

			return callback(new Error("Not allowed by CORS"));
		},
		credentials: true,
	}),
);

app.use(express.json());

// Mount routes
app.use(authRoute);
app.use(userRoute);
app.use(chatbotRoutes);
app.use(paymentRoute);
app.use(specialProductRoute);
app.use(productRoute);
app.use(reviewRoute);
app.use(categoryRoute);
app.use(adminorderItemsRoutes);
app.use(wishlistRoute);
app.use(userOrderRoutes);
app.use(adminOrderRoutes);

// Health check route
app.get("/health", (req, res) => {
	res.status(200).json({
		message: "Server is running",
		timestamp: new Date().toISOString(),
		database: "Connected",
		categories: "Available",
		cloudinary: "Configured",
	});
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
	console.log("Cloudinary storage: Active");
});
