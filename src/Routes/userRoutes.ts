import express from "express";
const router =express.Router();
import { Protect, requireRole } from "../Middleware/Middelware";

const {createUser,userInfo, getAllUsers, updateUser, deleteUser} =require("../Controllers/userController");
const authenticate =require("../Utils/authenticate")
router.post("/api/user/create",createUser);
router.get("/api/user/getUser/:id", userInfo);
router.get("/api/user/getUsers", getAllUsers);
router.put("/api/user/update/:id", updateUser);
router.delete("/api/user/delete/:id", deleteUser);

export default router;