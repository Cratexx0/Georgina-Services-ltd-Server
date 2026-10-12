"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const productController_1 = require("../Controllers/productController");
const Middelware_1 = require("../Middleware/Middelware");
const authenticate_1 = __importDefault(require("../Utils/authenticate"));
// Admin special products routes
router.get('/api/admin/products/special', authenticate_1.default, (0, Middelware_1.authorizeRoles)('admin'), productController_1.getAdminSpecialProducts);
// router.get(
//     '/api/admin/products/special/available',
//     authenticate,
//     authorizeRoles('admin'),
//     getProductsNotInSpecialCategories
// );
router.patch('/api/admin/products/special/bulk/update', authenticate_1.default, (0, Middelware_1.authorizeRoles)('admin'), productController_1.bulkUpdateSpecialCategories);
router.patch('/api/admin/products/special/:productId', authenticate_1.default, (0, Middelware_1.authorizeRoles)('admin'), productController_1.updateProductSpecialCategories);
exports.default = router;
