"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const authController_1 = require("../Controllers/authController");
// E-commerce user routes
router.post("/api/auth/user/register", authController_1.registerUser);
router.post("/api/auth/user/login", authController_1.loginUser);
router.post("/api/auth/google", authController_1.socialLoginGoogle);
router.post("/api/auth/facebook", authController_1.socialLoginFacebook);
// Admin change password routes
router.post('/admin/change-password', authController_1.adminChangePassword);
router.post('/auth/admin/change-own-password', authController_1.adminChangeOwnPassword);
// Dashboard admin/staff routes
router.post("/api/auth/admin/register", authController_1.registerAdmin);
router.post("/api/auth/admin/login", authController_1.loginAdmin);
// mail password reset routes
// Shared routes
router.post("/api/auth/verify-token", authController_1.verifyToken);
router.post("/api/auth/forgot-password", authController_1.forgotPassword);
router.post("/api/auth/resetpassword", authController_1.resetPassword);
router.get("/api/auth/userinfo/:id", authController_1.userInfo);
exports.default = router;
