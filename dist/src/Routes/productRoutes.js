"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer")); // 1. Import multer so it's recognized
const router = express_1.default.Router();
const Middelware_1 = require("../Middleware/Middelware");
const productController_1 = require("../Controllers/productController");
const authenticate_1 = __importDefault(require("../Utils/authenticate")); // 2. Import the authenticate middleware
// Import Cloudinary upload configuration
const { upload } = require('../config/cloudinary');
/**
 * 🛒 Public User Routes — No Authentication Required
 */
router.get('/api/products', productController_1.getProducts);
// Special products routes
router.get('/api/products/featured', productController_1.getFeaturedProducts);
router.get('/api/products/trending', productController_1.getTrendingProducts);
router.get('/api/products/new-arrivals', productController_1.getNewArrivals);
router.get('/api/debug/categories', productController_1.debugProductCategories);
router.get('/api/products/category/:level1', productController_1.getProductsByCategory);
router.get('/api/products/category/:level1/:level2', productController_1.getProductsByCategory);
router.get('/api/products/category/:level1/:level2/:level3', productController_1.getProductsByCategory);
router.get('/api/products/slug/:slug', productController_1.getProductBySlug);
router.get('/api/admin/products/special', authenticate_1.default, (0, Middelware_1.authorizeRoles)('ADMIN'), productController_1.getAdminSpecialProducts);
/**
 * 🛠️ Admin Routes — Authentication & Authorization Required
 */
router.post('/api/admin/products', authenticate_1.default, (0, Middelware_1.authorizeRoles)('ADMIN'), upload.single('image'), productController_1.createProducts);
router.get('/api/admin/products', authenticate_1.default, (0, Middelware_1.authorizeRoles)('ADMIN'), productController_1.getAdminProducts);
router.patch('/:productId/special-categories', productController_1.updateProductSpecialCategories);
router.get('/api/admin/products/:productId', authenticate_1.default, (0, Middelware_1.authorizeRoles)('ADMIN'), productController_1.getAdminProductById);
router.get('/api/products/:productId', productController_1.getProduct);
router.put('/api/admin/products/:productId', authenticate_1.default, (0, Middelware_1.authorizeRoles)('ADMIN'), upload.single('image'), productController_1.updateProduct);
router.patch('/api/admin/products/:productId/toggle-status', authenticate_1.default, (0, Middelware_1.authorizeRoles)('ADMIN'), productController_1.toggleProductStatus);
router.delete('/api/admin/products/:productId', authenticate_1.default, (0, Middelware_1.authorizeRoles)('ADMIN'), productController_1.deleteProduct);
// Error handling middleware with proper TypeScript typing
router.use((error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                message: 'File too large. Maximum size is 5MB.'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                message: 'Too many files uploaded.'
            });
        }
    }
    return res.status(400).json({ message: error.message });
});
exports.default = router;
