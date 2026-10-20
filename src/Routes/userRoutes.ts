import express from "express";
const router =express.Router();
import { Protect, requireRole } from "../Middleware/Middelware";

import {createUser,userInfo, getAllUsers, updateUser, deleteUser} from "../Controllers/userController";
import authenticate from "../Utils/authenticate"
router.post("/api/user/create", authenticate, Protect, requireRole(['ADMIN']), createUser);
router.get("/api/user/getUser/:id",  Protect, requireRole(['ADMIN', 'USER']), authenticate, userInfo);
router.get("/api/user/getUsers", Protect, requireRole(['ADMIN', 'USER']), authenticate, getAllUsers);
router.put("/api/user/update/:id",  Protect, requireRole(['ADMIN', 'USER']), authenticate, updateUser);
router.delete("/api/user/delete/:id",  Protect, requireRole(['ADMIN', 'USER']), authenticate, deleteUser);

export default router;