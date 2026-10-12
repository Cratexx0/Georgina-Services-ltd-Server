"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Middelware_1 = require("../Middleware/Middelware");
const categoryController_1 = require("../Controllers/categoryController");
const router = express_1.default.Router();
/**
 * 🛒 Public & General Category Routes
 */
router.get('/api/categories', categoryController_1.getCategories);
router.get('/api/categories-tree', categoryController_1.getCategoryTree);
// Structured path routes (MUST be placed before general :id routes to prevent parameter hijacking)
router.get('/api/categories/level/:level', categoryController_1.getCategoriesByLevel);
router.get('/api/categories/parent/:parentId/children', categoryController_1.getSubcategories);
// Get categories by parent (alias for subcategories)
router.get('/api/categories/parent/:parentId', (req, res, next) => {
    req.params.parentId = req.params.parentId;
    next();
}, categoryController_1.getSubcategories);
// Get children of specific category
router.get('/api/categories/:id/children', (req, res, next) => {
    req.params.parentId = req.params.id;
    next();
}, categoryController_1.getSubcategories);
// General dynamic category route
router.get('/api/categories/:id', categoryController_1.getCategoryById);
/**
 * 🛠️ Admin Category Routes — Requires Authentication and Admin Role
 */
router.post('/api/admin/categories', Middelware_1.Protect, (0, Middelware_1.requireRole)(['ADMIN']), // Wrapped in array
categoryController_1.createCategory);
router.post('/api/admin/categories/bulk', Middelware_1.Protect, (0, Middelware_1.requireRole)(['ADMIN']), // Wrapped in array
categoryController_1.bulkCreateCategories);
router.put('/api/admin/categories/:id', Middelware_1.Protect, (0, Middelware_1.requireRole)(['ADMIN']), // Wrapped in array
categoryController_1.updateCategory);
router.delete('/api/admin/categories/:id', Middelware_1.Protect, (0, Middelware_1.requireRole)(['ADMIN']), // Wrapped in array
categoryController_1.deleteCategory);
router.delete('/api/admin/categories/:id/safe', Middelware_1.Protect, (0, Middelware_1.requireRole)(['ADMIN']), // Wrapped in array
categoryController_1.safeDeleteCategory);
router.delete('/api/admin/categories/:parentId/subcategories', Middelware_1.Protect, (0, Middelware_1.requireRole)(['ADMIN']), // Wrapped in array
categoryController_1.deleteSubcategories);
router.delete('/api/admin/categories/:parentId/subcategories/:subcategoryId', Middelware_1.Protect, (0, Middelware_1.requireRole)(['ADMIN']), // Wrapped in array
categoryController_1.deleteSubcategory);
exports.default = router;
