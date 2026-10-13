import { Request, Response } from "express";
import { prisma } from "../config/prisma"; // Adjust relative path as needed

// const prisma = new PrismaClient();

// Helper to safely extract single string from query/params
const getStringParam = (param: unknown): string | undefined => {
	if (!param) return undefined;
	if (Array.isArray(param))
		return typeof param[0] === "string" ? param[0] : undefined;
	return typeof param === "string" ? param : String(param);
};

// Helper function to generate slug
const generateSlug = (name: string): string => {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
};

// Create category with hierarchy support
export const createCategory = async (
	req: Request,
	res: Response,
): Promise<Response> => {
	try {
		const { name, slug, level, parentId, description, sortOrder } = req.body;

		if (!name || level === undefined) {
			return res.status(400).json({ error: "Name and level are required" });
		}

		const parsedLevel: number = parseInt(level, 10);
		const parsedParentId: string | null = parentId ? String(parentId) : null;

		if (parsedLevel === 1 && parsedParentId) {
			return res
				.status(400)
				.json({ error: "Level 1 categories cannot have a parent" });
		}

		if (parsedLevel > 1 && !parsedParentId) {
			return res
				.status(400)
				.json({ error: `Level ${parsedLevel} categories must have a parent` });
		}

		if (parsedParentId) {
			const parent = await prisma.category.findUnique({
				where: { id: parsedParentId },
			});
			if (!parent) {
				return res.status(404).json({ error: "Parent category not found" });
			}
			if (parent.level !== parsedLevel - 1) {
				return res
					.status(400)
					.json({ error: `Parent category must be level ${parsedLevel - 1}` });
			}
		}

		const categorySlug: string = slug ? String(slug) : generateSlug(name);

		const category = await prisma.category.create({
			data: {
				name: String(name),
				slug: categorySlug,
				level: parsedLevel,
				parentId: parsedParentId,
				description: description ? String(description) : null,
				sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : 0,
			},
		});

		return res.status(201).json(category);
	} catch (err: any) {
		if (err.code === "P2002") {
			return res.status(400).json({ error: "Category slug must be unique" });
		}
		return res.status(400).json({ error: err.message });
	}
};

// Get all categories WITHOUT hierarchy includes
export const getCategories = async (
	req: Request,
	res: Response,
): Promise<Response> => {
	try {
		const levelQuery = getStringParam(req.query.level);
		const parentIdQuery = getStringParam(req.query.parentId);

		const where: any = {};
		if (levelQuery) where.level = parseInt(levelQuery, 10);
		if (parentIdQuery !== undefined) {
			where.parentId = parentIdQuery === "null" ? null : parentIdQuery;
		}

		const categories = await prisma.category.findMany({
			where,
			orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
		});

		return res.status(200).json(categories);
	} catch (err: any) {
		console.error("Error in getCategories:", err);
		return res.status(500).json({ error: err.message });
	}
};

// Get category by ID
export const getCategoryById = async (
	req: Request,
	res: Response,
): Promise<Response> => {
	try {
		const id = getStringParam(req.params.id);
		if (!id) return res.status(400).json({ error: "Invalid ID parameter" });

		const category = await prisma.category.findUnique({ where: { id } });

		if (!category) {
			return res.status(404).json({ error: "Category not found" });
		}

		return res.status(200).json(category);
	} catch (err: any) {
		console.error("Error in getCategoryById:", err);
		return res.status(500).json({ error: err.message });
	}
};

// Get category hierarchy (tree structure)
// Get category hierarchy (tree structure)
export const getCategoryTree = async (
	req: Request,
	res: Response,
): Promise<Response> => {
	try {
		const allCategories = await prisma.category.findMany({
			orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
		});

		// Fix: Use a type alias with intersection instead of 'interface extends'
		type CategoryTreeItem = (typeof allCategories)[number] & {
			children: CategoryTreeItem[];
		};

		const buildTree = (parentId: string | null = null): CategoryTreeItem[] => {
			return allCategories
				.filter((cat) => cat.parentId === parentId)
				.map((cat) => ({
					...cat,
					children: buildTree(cat.id),
				}));
		};

		const categoryTree = buildTree(null);

		return res.status(200).json(categoryTree);
	} catch (err: any) {
		console.error("Error in getCategoryTree:", err);
		return res.status(500).json({ error: err.message });
	}
};

// Update category
export const updateCategory = async (
	req: Request,
	res: Response,
): Promise<Response> => {
	try {
		const id = getStringParam(req.params.id);
		if (!id) return res.status(400).json({ error: "Invalid ID parameter" });

		const category = await prisma.category.findUnique({ where: { id } });

		if (!category) {
			return res.status(404).json({ error: "Category not found" });
		}

		const { name, slug, level, parentId, description, sortOrder, isActive } =
			req.body;
		const parsedLevel: number =
			level !== undefined ? parseInt(level, 10) : category.level;

		if (parsedLevel !== category.level) {
			const childrenCount = await prisma.category.count({
				where: { parentId: category.id },
			});
			if (childrenCount > 0) {
				return res
					.status(400)
					.json({ error: "Cannot change level of category that has children" });
			}
		}

		let categorySlug: string | undefined = slug ? String(slug) : undefined;
		if (name && name !== category.name && !slug) {
			categorySlug = generateSlug(name);
		}

		const updatedCategory = await prisma.category.update({
			where: { id },
			data: {
				...(name && { name: String(name) }),
				...(categorySlug && { slug: categorySlug }),
				...(level !== undefined && { level: parsedLevel }),
				...(parentId !== undefined && {
					parentId: parentId ? String(parentId) : null,
				}),
				...(description !== undefined && {
					description: description ? String(description) : null,
				}),
				...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder, 10) }),
				...(isActive !== undefined && { isActive: Boolean(isActive) }),
			},
		});

		return res.status(200).json(updatedCategory);
	} catch (err: any) {
		return res.status(400).json({ error: err.message });
	}
};

// Bulk create categories
export const bulkCreateCategories = async (
	req: Request,
	res: Response,
): Promise<Response> => {
	try {
		const { categories } = req.body;

		if (!categories || !Array.isArray(categories)) {
			return res.status(400).json({ error: "Categories array is required" });
		}

		const created = await prisma.category.createMany({
			data: categories.map((cat: any) => ({
				name: String(cat.name),
				slug: cat.slug ? String(cat.slug) : generateSlug(cat.name),
				level: parseInt(cat.level, 10),
				parentId: cat.parentId ? String(cat.parentId) : null,
				description: cat.description ? String(cat.description) : null,
				sortOrder: cat.sortOrder ? parseInt(cat.sortOrder, 10) : 0,
				isActive: cat.isActive !== undefined ? Boolean(cat.isActive) : true,
			})),
			skipDuplicates: true,
		});

		return res.status(201).json({
			message: "Categories bulk created successfully",
			count: created.count,
		});
	} catch (err: any) {
		return res.status(400).json({ error: err.message });
	}
};

// Get categories by level
export const getCategoriesByLevel = async (
	req: Request,
	res: Response,
): Promise<Response> => {
	try {
		const levelStr = getStringParam(req.params.level);
		if (!levelStr)
			return res.status(400).json({ error: "Level parameter is required" });

		const level: number = parseInt(levelStr, 10);

		const categories = await prisma.category.findMany({
			where: { level },
			orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
		});

		return res.status(200).json(categories);
	} catch (err: any) {
		console.error("Error in getCategoriesByLevel:", err);
		return res.status(500).json({ error: err.message });
	}
};

// Get subcategories by parent ID
export const getSubcategories = async (
	req: Request,
	res: Response,
): Promise<Response> => {
	try {
		const parentId = getStringParam(req.params.parentId);
		if (!parentId)
			return res.status(400).json({ error: "Parent ID parameter is required" });

		const subcategories = await prisma.category.findMany({
			where: { parentId },
			orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
		});

		return res.status(200).json(subcategories);
	} catch (err: any) {
		console.error("Error in getSubcategories:", err);
		return res.status(500).json({ error: err.message });
	}
};

// Helper function to recursively delete category with all children
const deleteCategoryWithChildren = async (
	categoryId: string,
): Promise<void> => {
	const children = await prisma.category.findMany({
		where: { parentId: categoryId },
	});

	for (const child of children) {
		await deleteCategoryWithChildren(child.id);
	}

	await prisma.category.delete({ where: { id: categoryId } });
};

// Enhanced Delete Category with multiple options
export const deleteCategory = async (
	req: Request,
	res: Response,
): Promise<Response> => {
	try {
		const id = getStringParam(req.params.id);
		if (!id) return res.status(400).json({ error: "Invalid ID parameter" });

		const deleteSubcategoriesQuery = getStringParam(
			req.query.deleteSubcategories,
		);
		const moveToParentQuery = getStringParam(req.query.moveToParent);

		const category = await prisma.category.findUnique({ where: { id } });
		if (!category) {
			return res.status(404).json({ error: "Category not found" });
		}

		const children = await prisma.category.findMany({
			where: { parentId: id },
		});
		const hasChildren = children.length > 0;

		if (hasChildren) {
			if (deleteSubcategoriesQuery === "true") {
				await deleteCategoryWithChildren(id);

				return res.status(200).json({
					message: "Category and all its subcategories deleted successfully",
					deletedCategory: {
						id: category.id,
						name: category.name,
						level: category.level,
					},
					deletedSubcategories: children.length,
					totalDeleted: children.length + 1,
				});
			}

			if (moveToParentQuery === "true" && category.parentId) {
				const parentCategory = await prisma.category.findUnique({
					where: { id: category.parentId },
				});
				if (!parentCategory) {
					return res.status(400).json({ error: "Parent category not found" });
				}

				await prisma.category.updateMany({
					where: { parentId: id },
					data: { parentId: category.parentId },
				});

				await prisma.category.delete({ where: { id } });

				return res.status(200).json({
					message:
						"Category deleted and subcategories moved to parent category",
					movedSubcategories: children.length,
					newParent: { id: parentCategory.id, name: parentCategory.name },
				});
			}

			if (moveToParentQuery === "root" && category.level === 2) {
				await prisma.category.updateMany({
					where: { parentId: id },
					data: { parentId: null, level: 1 },
				});

				await prisma.category.delete({ where: { id } });

				return res.status(200).json({
					message: "Category deleted and subcategories moved to root level",
					movedSubcategories: children.length,
					promotedToLevel: 1,
				});
			}

			return res.status(400).json({
				error: "Category has subcategories",
				message: `"${category.name}" contains ${children.length} subcategory/ies. Choose how to handle them:`,
				category: {
					id: category.id,
					name: category.name,
					level: category.level,
					subcategoriesCount: children.length,
				},
				options: {
					deleteSubcategories: `Add ?deleteSubcategories=true to delete all ${children.length} subcategories`,
					...(category.parentId && {
						moveToParent: `Add ?moveToParent=true to move subcategories to parent category`,
					}),
					...(category.level === 2 && {
						moveToRoot: `Add ?moveToParent=root to move subcategories to root level`,
					}),
				},
			});
		}

		await prisma.category.delete({ where: { id } });

		return res.status(200).json({
			message: "Category deleted successfully",
			deletedCategory: {
				id: category.id,
				name: category.name,
				level: category.level,
			},
		});
	} catch (err: any) {
		console.error("❌ Error in deleteCategory:", err);
		return res.status(500).json({ error: err.message });
	}
};

// Delete only subcategories of a specific category
export const deleteSubcategories = async (
	req: Request,
	res: Response,
): Promise<Response> => {
	try {
		const parentId = getStringParam(req.params.parentId);
		if (!parentId)
			return res.status(400).json({ error: "Parent ID parameter is required" });

		const parentCategory = await prisma.category.findUnique({
			where: { id: parentId },
		});
		if (!parentCategory) {
			return res.status(404).json({ error: "Parent category not found" });
		}

		const subcategories = await prisma.category.findMany({
			where: { parentId },
		});

		if (subcategories.length === 0) {
			return res
				.status(404)
				.json({ error: "No subcategories found for this category" });
		}

		let totalDeleted = 0;
		for (const subcategory of subcategories) {
			await deleteCategoryWithChildren(subcategory.id);
			totalDeleted++;
		}

		return res.status(200).json({
			message: `All subcategories deleted successfully`,
			deletedCount: totalDeleted,
			parentCategory: {
				id: parentCategory.id,
				name: parentCategory.name,
				level: parentCategory.level,
			},
		});
	} catch (err: any) {
		console.error("❌ Error in deleteSubcategories:", err);
		return res.status(500).json({ error: err.message });
	}
};

// Delete a specific subcategory
export const deleteSubcategory = async (
	req: Request,
	res: Response,
): Promise<Response> => {
	try {
		const parentId = getStringParam(req.params.parentId);
		const subcategoryId = getStringParam(req.params.subcategoryId);

		if (!parentId || !subcategoryId) {
			return res.status(400).json({
				error: "Parent ID and Subcategory ID parameters are required",
			});
		}

		const subcategory = await prisma.category.findFirst({
			where: { id: subcategoryId, parentId },
		});

		if (!subcategory) {
			return res.status(404).json({
				error:
					"Subcategory not found or does not belong to the specified parent",
			});
		}

		const parentCategory = await prisma.category.findUnique({
			where: { id: parentId },
		});
		const children = await prisma.category.findMany({
			where: { parentId: subcategoryId },
		});

		if (children.length > 0) {
			return res.status(400).json({
				error: "Subcategory has child items",
				message: `"${subcategory.name}" contains ${children.length} child item(s).`,
				options: {
					deleteWithChildren: `Use the main delete endpoint with ?deleteSubcategories=true to delete with children`,
				},
			});
		}

		await prisma.category.delete({ where: { id: subcategoryId } });

		return res.status(200).json({
			message: "Subcategory deleted successfully",
			deletedSubcategory: {
				id: subcategory.id,
				name: subcategory.name,
				level: subcategory.level,
			},
			parentCategory: { id: parentCategory?.id, name: parentCategory?.name },
		});
	} catch (err: any) {
		console.error("❌ Error in deleteSubcategory:", err);
		return res.status(500).json({ error: err.message });
	}
};

// Safe delete with archive option
export const safeDeleteCategory = async (
	req: Request,
	res: Response,
): Promise<Response> => {
	try {
		const id = getStringParam(req.params.id);
		if (!id) return res.status(400).json({ error: "Invalid ID parameter" });

		const permanent = getStringParam(req.query.permanent);

		const category = await prisma.category.findUnique({ where: { id } });
		if (!category) {
			return res.status(404).json({ error: "Category not found" });
		}

		const children = await prisma.category.findMany({
			where: { parentId: id },
		});
		const hasChildren = children.length > 0;

		if (permanent === "true") {
			if (hasChildren) {
				return res.status(400).json({
					error: "Category has subcategories",
					message: "Cannot permanently delete category with subcategories",
					subcategoriesCount: children.length,
				});
			}

			await prisma.category.delete({ where: { id } });

			return res.status(200).json({
				message: "Category permanently deleted",
				permanentlyDeleted: true,
			});
		} else {
			const archivedCategory = await prisma.category.update({
				where: { id },
				data: { isActive: false },
			});

			return res.status(200).json({
				message: "Category archived successfully",
				archived: true,
				category: archivedCategory,
			});
		}
	} catch (err: any) {
		console.error("❌ Error in safeDeleteCategory:", err);
		return res.status(500).json({ error: err.message });
	}
};
