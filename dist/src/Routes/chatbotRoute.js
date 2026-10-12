"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/chatbotRoutes.js
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const chatbotController_1 = require("../Controllers/chatbotController");
// Apply rate limiting if you have it
// const { chatLimiter } = require('../middleware/rateLimit');
// Public chatbot routes (no authentication required)
router.get('/api/chat/session/:sessionId', chatbotController_1.getOrCreateSession);
router.post('/api/chat/send', chatbotController_1.sendMessage); // Add chatLimiter here if needed
router.get('/api/chat/history/:sessionId', chatbotController_1.getChatHistory);
router.patch('/api/chat/read/:sessionId', chatbotController_1.markAsRead);
router.get('/api/chat/unread/:sessionId', chatbotController_1.getUnreadCount);
// Create new session (redirect to session endpoint)
router.get('/api/chat/session', (req, res) => {
    res.redirect('/api/chat/session/new');
});
exports.default = router;
