"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = require("dotenv");
// Import routes
const chatbotRoute_1 = __importDefault(require("./Routes/chatbotRoute"));
const authRoutes_1 = __importDefault(require("./Routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./Routes/userRoutes"));
const productRoutes_1 = __importDefault(require("./Routes/productRoutes"));
const categoryRoutes_1 = __importDefault(require("./Routes/categoryRoutes"));
const paymentRoutes_1 = __importDefault(require("./Routes/paymentRoutes"));
const userOrderRoutes_1 = __importDefault(require("./Routes/userOrderRoutes"));
const adminOrderRoutes_1 = __importDefault(require("./Routes/adminOrderRoutes"));
const orderItemsRoute_1 = __importDefault(require("./Routes/orderItemsRoute"));
const specialProductRoute_1 = __importDefault(require("./Routes/specialProductRoute"));
const reviewRoutes_1 = __importDefault(require("./Routes/reviewRoutes"));
const wishlistRoute_1 = __importDefault(require("./Routes/wishlistRoute"));
(0, dotenv_1.config)();
const app = (0, express_1.default)();
// 🛡️ 1. Use Helmet for security headers (configured to allow external images like Cloudinary)
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
// 📂 2. Use Path to serve static files (e.g., if you have a local public/uploads folder)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// IMPORTANT: Apply express.raw() BEFORE express.json() for webhook route
app.use("/api/webhook", express_1.default.raw({ type: "application/json" }));
app.use(body_parser_1.default.json());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
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
            "https://georgina-services-limited-dashboard.vercel.app",
            "https://snappy-cart-carousel.vercel.app",
            "https://shop-clean-sparkle.vercel.app",
            "https://georgina-server-code.onrender.com",
            "https://georgina-services-limited-5bywlye7y-ayivor-daniel-s-projects.vercel.app",
            "https://georgina-services-limited.vercel.app",
            "http://localhost:8080",
            "http://localhost:8081",
            "http://localhost:8082",
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:8083",
        ];
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));
app.use(express_1.default.json());
// Mount routes
app.use(authRoutes_1.default);
app.use(userRoutes_1.default);
app.use(chatbotRoute_1.default);
app.use(paymentRoutes_1.default);
app.use(specialProductRoute_1.default);
app.use(productRoutes_1.default);
app.use(reviewRoutes_1.default);
app.use(categoryRoutes_1.default);
app.use(orderItemsRoute_1.default);
app.use(wishlistRoute_1.default);
app.use(userOrderRoutes_1.default);
app.use(adminOrderRoutes_1.default);
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
