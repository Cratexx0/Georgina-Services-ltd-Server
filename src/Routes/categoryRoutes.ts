import express from "express";
import { Protect, requireRole } from "../Middleware/Middelware";
import {
  createCategory,
  getCategories,
  getCategoryById,
  getCategoryTree,
  updateCategory,
  deleteCategory,
  bulkCreateCategories,
  getCategoriesByLevel,
  getSubcategories,
  deleteSubcategories,
  deleteSubcategory,
  safeDeleteCategory
} from "../Controllers/categoryController";

const router = express.Router();

/** 
 * 🛒 Public & General Category Routes
 */
router.get('/api/categories', getCategories);
router.get('/api/categories-tree', getCategoryTree);

// Structured path routes (MUST be placed before general :id routes to prevent parameter hijacking)
router.get('/api/categories/level/:level', getCategoriesByLevel);
router.get('/api/categories/parent/:parentId/children', getSubcategories);

// Get categories by parent (alias for subcategories)
router.get('/api/categories/parent/:parentId', (req: any, res, next) => {
  req.params.parentId = req.params.parentId;
  next();
}, getSubcategories);

// Get children of specific category
router.get('/api/categories/:id/children', (req: any, res, next) => {
  req.params.parentId = req.params.id;
  next();
}, getSubcategories);

// General dynamic category route
router.get('/api/categories/:id', getCategoryById);

/** 
 * 🛠️ Admin Category Routes — Requires Authentication and Admin Role
 */
router.post(
  '/api/admin/categories',
  Protect,
  requireRole(['ADMIN']), // Wrapped in array
  createCategory
);

router.post(
  '/api/admin/categories/bulk',
  Protect,
  requireRole(['ADMIN']), // Wrapped in array
  bulkCreateCategories
);

router.put(
  '/api/admin/categories/:id',
  Protect,
  requireRole(['ADMIN']), // Wrapped in array
  updateCategory
);

router.delete(
  '/api/admin/categories/:id',
  Protect,
  requireRole(['ADMIN']), // Wrapped in array
  deleteCategory
);

router.delete(
  '/api/admin/categories/:id/safe',
  Protect,
  requireRole(['ADMIN']), // Wrapped in array
  safeDeleteCategory
);

router.delete(
  '/api/admin/categories/:parentId/subcategories',
  Protect,
  requireRole(['ADMIN']), // Wrapped in array
  deleteSubcategories
);

router.delete(
  '/api/admin/categories/:parentId/subcategories/:subcategoryId',
  Protect,
  requireRole(['ADMIN']), // Wrapped in array
  deleteSubcategory
);

export default router;