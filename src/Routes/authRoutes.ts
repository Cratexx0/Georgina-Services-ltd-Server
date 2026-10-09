

import express from "express";
const router = express.Router();

import {
  loginUser,
  loginAdmin,
  verifyToken,
  registerUser,
  registerAdmin,
  forgotPassword,
  resetPassword,
  userInfo,
adminChangeOwnPassword,
adminChangePassword,
  socialLoginGoogle,
  socialLoginFacebook,
  
} from "../Controllers/authController";

// E-commerce user routes
router.post("/api/auth/user/register", registerUser);
router.post("/api/auth/user/login", loginUser);
router.post("/api/auth/google", socialLoginGoogle);
router.post("/api/auth/facebook", socialLoginFacebook);
// Admin change password routes
router.post('/admin/change-password', adminChangePassword);
router.post('/auth/admin/change-own-password', adminChangeOwnPassword);

// Dashboard admin/staff routes
router.post("/api/auth/admin/register", registerAdmin);
router.post("/api/auth/admin/login", loginAdmin);
// mail password reset routes


// Shared routes
router.post("/api/auth/verify-token", verifyToken);
router.post("/api/auth/forgot-password", forgotPassword);
router.post("/api/auth/resetpassword", resetPassword);
router.get("/api/auth/userinfo/:id", userInfo);


export default router;