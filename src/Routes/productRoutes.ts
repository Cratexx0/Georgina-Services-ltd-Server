import express, { Request, Response, NextFunction } from "express";
import multer from "multer"; // 1. Import multer so it's recognized
const router = express.Router();

import { authorizeRoles, requireRole, Protect } from '../Middleware/Middelware';
import {
    createProducts,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    getProductsByCategory,
    toggleProductStatus,
    getAdminProducts,
    getAdminProductById,
    getFeaturedProducts,
    getTrendingProducts,
    getNewArrivals,
    updateProductSpecialCategories,
    getAdminSpecialProducts,
    getProductBySlug,
    bulkUpdateSpecialCategories,
    debugProductCategories
}  from '../Controllers/productController';
import authenticate from '../Utils/authenticate'; // 2. Import the authenticate middleware

// Import Cloudinary upload configuration
const { upload } = require('../config/cloudinary');

/** 
 * 🛒 Public User Routes — No Authentication Required
 */
router.get('/api/products', getProducts);

// Special products routes
router.get('/api/products/featured', getFeaturedProducts);
router.get('/api/products/trending', getTrendingProducts);
router.get('/api/products/new-arrivals', getNewArrivals);

router.get('/api/debug/categories', debugProductCategories);
router.get('/api/products/category/:level1', getProductsByCategory);
router.get('/api/products/category/:level1/:level2', getProductsByCategory);
router.get('/api/products/category/:level1/:level2/:level3', getProductsByCategory);
router.get('/api/products/slug/:slug', getProductBySlug);


router.get('/api/admin/products/special', authenticate, authorizeRoles('ADMIN'), getAdminSpecialProducts);


/** 
 * 🛠️ Admin Routes — Authentication & Authorization Required
 */

router.post(
    '/api/admin/products',
    authenticate,
    authorizeRoles('ADMIN'),
    upload.single('image'),
    createProducts
);

router.get(
    '/api/admin/products',
    authenticate,
    authorizeRoles('ADMIN'),
    getAdminProducts
);

router.patch('/:productId/special-categories', updateProductSpecialCategories);

router.get(
    '/api/admin/products/:productId',
    authenticate,
    authorizeRoles('ADMIN'),
    getAdminProductById
);

router.get('/api/products/:productId', getProduct);

router.put(
    '/api/admin/products/:productId',
    authenticate,
    authorizeRoles('ADMIN'),
    upload.single('image'),
    updateProduct
);

router.patch(
    '/api/admin/products/:productId/toggle-status',
    authenticate,
    authorizeRoles('ADMIN'),
    toggleProductStatus
);

router.delete(
    '/api/admin/products/:productId',
    authenticate,
    authorizeRoles('ADMIN'),
    deleteProduct
);

// Error handling middleware with proper TypeScript typing
router.use((error: any, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof multer.MulterError) {
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

export default router;