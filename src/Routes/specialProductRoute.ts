import express from "express";
const router = express.Router();
import {
    getAdminSpecialProducts,
    updateProductSpecialCategories,
    bulkUpdateSpecialCategories
} from '../Controllers/productController';

import {  authorizeRoles }  from '../Middleware/Middelware';
import authenticate from "../Utils/authenticate";

// Admin special products routes
router.get(
    '/api/admin/products/special',
    authenticate,
    authorizeRoles('admin'),
    getAdminSpecialProducts
);

// router.get(
//     '/api/admin/products/special/available',
//     authenticate,
//     authorizeRoles('admin'),
//     getProductsNotInSpecialCategories
// );
router.patch(
    '/api/admin/products/special/bulk/update',
    authenticate,
    authorizeRoles('admin'),
    bulkUpdateSpecialCategories
);

router.patch(
    '/api/admin/products/special/:productId',
    authenticate,
    authorizeRoles('admin'),
    updateProductSpecialCategories
);

export default router;