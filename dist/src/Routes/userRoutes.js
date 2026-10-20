"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const Middelware_1 = require("../Middleware/Middelware");
const userController_1 = require("../Controllers/userController");
const authenticate_1 = __importDefault(require("../Utils/authenticate"));
router.post("/api/user/create", authenticate_1.default, Middelware_1.Protect, (0, Middelware_1.requireRole)(['ADMIN']), userController_1.createUser);
router.get("/api/user/getUser/:id", Middelware_1.Protect, (0, Middelware_1.requireRole)(['ADMIN', 'USER']), authenticate_1.default, userController_1.userInfo);
router.get("/api/user/getUsers", Middelware_1.Protect, (0, Middelware_1.requireRole)(['ADMIN', 'USER']), authenticate_1.default, userController_1.getAllUsers);
router.put("/api/user/update/:id", Middelware_1.Protect, (0, Middelware_1.requireRole)(['ADMIN', 'USER']), authenticate_1.default, userController_1.updateUser);
router.delete("/api/user/delete/:id", Middelware_1.Protect, (0, Middelware_1.requireRole)(['ADMIN', 'USER']), authenticate_1.default, userController_1.deleteUser);
exports.default = router;
