"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const { createUser, userInfo, getAllUsers, updateUser, deleteUser } = require("../Controllers/userController");
const authenticate = require("../Utils/authenticate");
router.post("/api/user/create", createUser);
router.get("/api/user/getUser/:id", userInfo);
router.get("/api/user/getUsers", getAllUsers);
router.put("/api/user/update/:id", updateUser);
router.delete("/api/user/delete/:id", deleteUser);
exports.default = router;
