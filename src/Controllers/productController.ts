// controllers/productController.ts
import type { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "../config/prisma"; // Adjust relative path as needed
// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to generate slug
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// Helper function to extract public_id from Cloudinary URL
const extractPublicIdFromUrl = (url: string): string | null => {
  const matches = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
  return matches ? matches[1] : null;
};

// Create Product
export const createProducts = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      name, description, price, categoryLevel1, categoryLevel2, categoryLevel3,
      unit, stock, brand, isActive, isFeatured, isTrending, isNewArrival,
      featuredOrder, trendingOrder, newArrivalOrder, weight, discount, tags, size
    } = req.body;

    if (!name || !price || !categoryLevel1) {
      return res.status(400).json({ message: "Name, price, and categoryLevel1 are required" });
    }

    const imageUrl = req.file ? req.file.path : null;
    if (!imageUrl) {
      return res.status(400).json({ message: "Image is required" });
    }

    const slug = generateSlug(name);

    const existingProduct = await prisma.product.findUnique({ where: { slug } });
    if (existingProduct) {
      try {
        const publicId = extractPublicIdFromUrl(imageUrl);
        if (publicId) await cloudinary.uploader.destroy(publicId);
      } catch (deleteError) {
        console.error("Error deleting image from Cloudinary:", deleteError);
      }
      return res.status(400).json({ message: "Product with similar name already exists" });
    }

    let tagsArray: string[] = [];
    try {
      tagsArray = typeof tags === "string" ? JSON.parse(tags) : (tags || []);
    } catch (e) {
      tagsArray = [];
    }

    let sizeArray: string[] = [];
    try {
      sizeArray = typeof size === "string" ? size.split(",").map((s) => s.trim()).filter(Boolean) : (size || []);
    } catch (e) {
      sizeArray = [];
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || null,
        weight: weight || null,
        price: parseFloat(price),
        discount: discount ? parseFloat(discount) : 0,
        categoryLevel1,
        categoryLevel2: categoryLevel2 || null,
        categoryLevel3: categoryLevel3 || null,
        unit: unit || "piece",
        stock: stock ? parseInt(stock) : 0,
        images: [imageUrl],
        isActive: isActive !== undefined ? isActive === "true" || isActive === true : true,
        isFeatured: isFeatured === "true" || isFeatured === true,
        isTrending: isTrending === "true" || isTrending === true,
        isNewArrival: isNewArrival === "true" || isNewArrival === true,
        featuredOrder: featuredOrder ? parseInt(featuredOrder) : 0,
        trendingOrder: trendingOrder ? parseInt(trendingOrder) : 0,
        newArrivalOrder: newArrivalOrder ? parseInt(newArrivalOrder) : 0,
        tags: tagsArray,
        size: sizeArray,
        brand: brand || null,
      },
    });

    return res.status(201).json({ message: "Product created successfully", product });
  } catch (error: any) {
    if (req.file && req.file.path) {
      try {
        const publicId = extractPublicIdFromUrl(req.file.path);
        if (publicId) await cloudinary.uploader.destroy(publicId);
      } catch (deleteError) {
        console.error("Error deleting image from Cloudinary:", deleteError);
      }
    }
    console.error("Error creating product:", error);
    return res.status(500).json({ message: "Error creating product", error: error.message });
  }
};

// Update Product
export const updateProduct = async (req: Request, res: Response): Promise<any> => {
  try {
    const { productId } = req.params;
    const parsedId = Number(productId);
    const queryId = isNaN(parsedId) ? (productId as any) : parsedId;

    const product = await prisma.product.findUnique({ where: { id: queryId } });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const updateData: any = { ...req.body };

    if (req.file) {
      const newImageUrl = req.file.path;
      if (product.images && Array.isArray(product.images)) {
        for (const oldImageUrl of product.images as string[]) {
          try {
            const publicId = extractPublicIdFromUrl(oldImageUrl);
            if (publicId) {
              await cloudinary.uploader.destroy(publicId);
            }
          } catch (deleteError) {
            console.error("Error deleting old image from Cloudinary:", deleteError);
          }
        }
      }
      updateData.images = [newImageUrl];
    }

    if (updateData.name && updateData.name !== product.name) {
      updateData.slug = generateSlug(updateData.name);
      const existingProduct = await prisma.product.findFirst({
        where: {
          slug: updateData.slug,
          NOT: { id: queryId },
        },
      });

      if (existingProduct) {
        if (req.file) {
          try {
            const publicId = extractPublicIdFromUrl(req.file.path);
            if (publicId) await cloudinary.uploader.destroy(publicId);
          } catch (deleteError) {
            console.error("Error deleting image from Cloudinary:", deleteError);
          }
        }
        return res.status(400).json({ message: "Product with similar name already exists" });
      }
    }

    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.discount !== undefined) updateData.discount = parseFloat(updateData.discount);
    if (updateData.stock) updateData.stock = parseInt(updateData.stock);
    if (updateData.featuredOrder) updateData.featuredOrder = parseInt(updateData.featuredOrder);
    if (updateData.trendingOrder) updateData.trendingOrder = parseInt(updateData.trendingOrder);
    if (updateData.newArrivalOrder) updateData.newArrivalOrder = parseInt(updateData.newArrivalOrder);

    if (updateData.tags) {
      updateData.tags = typeof updateData.tags === "string" ? JSON.parse(updateData.tags) : updateData.tags;
    }
    if (updateData.size) {
      updateData.size = typeof updateData.size === "string"
        ? updateData.size.split(",").map((s: string) => s.trim()).filter(Boolean)
        : updateData.size;
    }
    if (updateData.isActive !== undefined) {
      updateData.isActive = updateData.isActive === "true" || updateData.isActive === true;
    }
    if (updateData.isFeatured !== undefined) {
      updateData.isFeatured = updateData.isFeatured === "true" || updateData.isFeatured === true;
    }
    if (updateData.isTrending !== undefined) {
      updateData.isTrending = updateData.isTrending === "true" || updateData.isTrending === true;
    }
    if (updateData.isNewArrival !== undefined) {
      updateData.isNewArrival = updateData.isNewArrival === "true" || updateData.isNewArrival === true;
    }

    const updatedProduct = await prisma.product.update({
      where: { id: queryId },
      data: updateData,
    });

    return res.status(200).json({ product: updatedProduct, message: "Product updated successfully" });
  } catch (error: any) {
    if (req.file && req.file.path) {
      try {
        const publicId = extractPublicIdFromUrl(req.file.path);
        if (publicId) await cloudinary.uploader.destroy(publicId);
      } catch (deleteError) {
        console.error("Error deleting image from Cloudinary:", deleteError);
      }
    }
    console.error("Error updating product:", error);
    return res.status(500).json({ error: "Error updating product", message: error.message });
  }
};

// Get Products
export const getProducts = async (req: Request, res: Response): Promise<any> => {
  try {
    const { categoryLevel1, categoryLevel2, categoryLevel3, isActive, search, minPrice, maxPrice, brand } = req.query;

    const whereClause: any = {};

    if (categoryLevel1) {
      whereClause.categoryLevel1 = { equals: String(categoryLevel1).trim(), mode: "insensitive" };
    }
    if (categoryLevel2) {
      whereClause.categoryLevel2 = { equals: String(categoryLevel2).trim(), mode: "insensitive" };
    }
    if (categoryLevel3) whereClause.categoryLevel3 = String(categoryLevel3);
    if (brand) whereClause.brand = String(brand);

    if (isActive !== undefined) {
      whereClause.isActive = isActive === "true";
    }

    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price.gte = parseFloat(String(minPrice));
      if (maxPrice) whereClause.price.lte = parseFloat(String(maxPrice));
    }

    if (search) {
      const searchTerm = String(search);
      whereClause.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { brand: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ products, message: "Products retrieved successfully" });
  } catch (error: any) {
    console.error("Error retrieving products:", error);
    return res.status(500).json({ error: "Error retrieving products", message: error.message });
  }
};

// Get Featured Products
export const getFeaturedProducts = async (req: Request, res: Response): Promise<any> => {
  try {
    const { limit } = req.query;
    const products = await prisma.product.findMany({
      where: { isFeatured: true, isActive: true },
      orderBy: [{ featuredOrder: "asc" }, { createdAt: "desc" }],
      take: limit ? parseInt(String(limit)) : undefined,
    });
    return res.status(200).json({ products, message: "Featured products retrieved successfully" });
  } catch (error: any) {
    console.error("Error retrieving featured products:", error);
    return res.status(500).json({ error: "Error retrieving featured products", message: error.message });
  }
};

// Get Trending Products
export const getTrendingProducts = async (req: Request, res: Response): Promise<any> => {
  try {
    const { limit } = req.query;
    const products = await prisma.product.findMany({
      where: { isTrending: true, isActive: true },
      orderBy: [{ trendingOrder: "asc" }, { createdAt: "desc" }],
      take: limit ? parseInt(String(limit)) : undefined,
    });
    return res.status(200).json({ products, message: "Trending products retrieved successfully" });
  } catch (error: any) {
    console.error("Error retrieving trending products:", error);
    return res.status(500).json({ error: "Error retrieving trending products", message: error.message });
  }
};

// Get New Arrivals
export const getNewArrivals = async (req: Request, res: Response): Promise<any> => {
  try {
    const { limit, days = "30" } = req.query;
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - parseInt(String(days), 10));

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        createdAt: { gte: dateThreshold },
      },
      orderBy: [{ isNewArrival: "desc" }, { newArrivalOrder: "asc" }, { createdAt: "desc" }],
      take: limit ? parseInt(String(limit)) : undefined,
    });

    return res.status(200).json({ products, message: "New arrivals retrieved successfully" });
  } catch (error: any) {
    console.error("Error retrieving new arrivals:", error);
    return res.status(500).json({ error: "Error retrieving new arrivals", message: error.message });
  }
};

// Update Product Special Categories
export const updateProductSpecialCategories = async (req: Request, res: Response): Promise<any> => {
  try {
    const { productId } = req.params;
    const parsedId = Number(productId);
    const queryId = isNaN(parsedId) ? (productId as any) : parsedId;

    const product = await prisma.product.findUnique({ where: { id: queryId } });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const { isFeatured, isTrending, isNewArrival, featuredOrder, trendingOrder, newArrivalOrder } = req.body;
    const updateData: any = {};

    if (isFeatured !== undefined) updateData.isFeatured = isFeatured === "true" || isFeatured === true;
    if (isTrending !== undefined) updateData.isTrending = isTrending === "true" || isTrending === true;
    if (isNewArrival !== undefined) updateData.isNewArrival = isNewArrival === "true" || isNewArrival === true;
    if (featuredOrder !== undefined) updateData.featuredOrder = parseInt(featuredOrder) || 0;
    if (trendingOrder !== undefined) updateData.trendingOrder = parseInt(trendingOrder) || 0;
    if (newArrivalOrder !== undefined) updateData.newArrivalOrder = parseInt(newArrivalOrder) || 0;

    const updatedProduct = await prisma.product.update({
      where: { id: queryId },
      data: updateData,
    });

    return res.status(200).json({ product: updatedProduct, message: "Product special categories updated successfully" });
  } catch (error: any) {
    console.error("Error updating product special categories:", error);
    return res.status(500).json({ error: "Error updating product special categories", message: error.message });
  }
};

// Get Single Product by ID or Slug
// Get Single Product by ID or Slug
export const getProduct = async (req: Request, res: Response): Promise<any> => {
  try {
    const { productId } = req.params;
    const cleanProductId = String(productId); // Ensure it's a string, not string[]
    const parsedId = Number(cleanProductId);

    let product = null;
    if (!isNaN(parsedId)) {
      product = await prisma.product.findUnique({ where: { id: parsedId } });
    }

    if (!product) {
      // Cast the object or pass the clean string explicitly to satisfy TypeScript
      product = await prisma.product.findUnique({ where: { slug: cleanProductId } });
    }

    if (!product) {
      return res.status(404).json({ message: "Product not found", productId: cleanProductId });
    }

    return res.status(200).json({ product, message: "Product retrieved successfully" });
  } catch (error: any) {
    console.error("Error retrieving product:", error);
    return res.status(500).json({ error: "Error retrieving product", message: error.message });
  }
};

// Delete Product
export const deleteProduct = async (req: Request, res: Response): Promise<any> => {
  try {
    const { productId } = req.params;
    const parsedId = Number(productId);
    const queryId = isNaN(parsedId) ? (productId as any) : parsedId;

    const product = await prisma.product.findUnique({ where: { id: queryId } });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.images && Array.isArray(product.images)) {
      for (const imagePath of product.images as string[]) {
        try {
          const publicId = extractPublicIdFromUrl(imagePath);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (delErr) {
          console.error("Error deleting image from Cloudinary:", delErr);
        }
      }
    }

    await prisma.product.delete({ where: { id: queryId } });

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return res.status(500).json({ error: "Error deleting product", message: error.message });
  }
};

// Get Product by Slug
export const getProductBySlug = async (req: Request, res: Response): Promise<any> => {
  try {
 

const slug = String(req.params.slug); // Cast to string

    const product = await prisma.product.findFirst({
      where: { slug, isActive: true },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found", slug });
    }

    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryLevel1: product.categoryLevel1,
        NOT: { id: product.id },
        isActive: true,
      },
      take: 4,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ product, relatedProducts, message: "Product retrieved successfully by slug" });
  } catch (error: any) {
    console.error("Error retrieving product by slug:", error);
    return res.status(500).json({ error: "Error retrieving product", message: error.message });
  }
};

// Get Products by Category
export const getProductsByCategory = async (req: Request, res: Response): Promise<any> => {
  try {
    const { level1, level2, level3 } = req.params;
    const whereClause: any = {};
    if (level1) whereClause.categoryLevel1 = level1;
    if (level2) whereClause.categoryLevel2 = level2;
    if (level3) whereClause.categoryLevel3 = level3;

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ products, message: "Products retrieved successfully" });
  } catch (error: any) {
    console.error("Error retrieving products by category:", error);
    return res.status(500).json({ error: "Error retrieving products", message: error.message });
  }
};

// Toggle Product Active Status
export const toggleProductStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { productId } = req.params;
    const parsedId = Number(productId);
    const queryId = isNaN(parsedId) ? (productId as any) : parsedId;

    const product = await prisma.product.findUnique({ where: { id: queryId } });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: queryId },
      data: { isActive: !product.isActive },
    });

    return res.status(200).json({
      product: updatedProduct,
      message: `Product ${updatedProduct.isActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (error: any) {
    console.error("Error toggling product status:", error);
    return res.status(500).json({ error: "Error updating product status", message: error.message });
  }
};

// Get Admin Products
export const getAdminProducts = async (req: Request, res: Response): Promise<any> => {
  try {
    const { categoryLevel1, categoryLevel2, categoryLevel3, isActive, search, minPrice, maxPrice, brand, lowStock } = req.query;

    const whereClause: any = {};
    if (categoryLevel1) whereClause.categoryLevel1 = String(categoryLevel1);
    if (categoryLevel2) whereClause.categoryLevel2 = String(categoryLevel2);
    if (categoryLevel3) whereClause.categoryLevel3 = String(categoryLevel3);
    if (brand) whereClause.brand = String(brand);

    if (isActive !== undefined) {
      whereClause.isActive = isActive === "true";
    }

    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price.gte = parseFloat(String(minPrice));
      if (maxPrice) whereClause.price.lte = parseFloat(String(maxPrice));
    }

    if (lowStock === "true") {
      whereClause.stock = { lt: 10 };
    }

    if (search) {
      const searchTerm = String(search);
      whereClause.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { brand: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    const analytics = {
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.isActive).length,
      inactiveProducts: products.filter((p) => !p.isActive).length,
      lowStockProducts: products.filter((p) => p.stock < 10).length,
      outOfStockProducts: products.filter((p) => p.stock === 0).length,
      totalValue: products.reduce((sum, p) => sum + Number(p.price) * p.stock, 0),
    };

    return res.status(200).json({ products, analytics, message: "Admin products retrieved successfully" });
  } catch (error: any) {
    console.error("Error retrieving admin products:", error);
    return res.status(500).json({ error: "Error retrieving admin products", message: error.message });
  }
};

// Debug Product Categories
export const debugProductCategories = async (req: Request, res: Response): Promise<any> => {
  try {
    const products = await prisma.product.findMany();
    const categoryCounts: Record<string, number> = {};

    products.forEach((p) => {
      const cat1 = p.categoryLevel1 || "Unknown Level1";
      categoryCounts[cat1] = (categoryCounts[cat1] || 0) + 1;
    });

    return res.status(200).json({
      categoryDistribution: categoryCounts,
      totalProducts: products.length,
    });
  } catch (error: any) {
    console.error("Error debugging categories:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Get Admin Product By ID
export const getAdminProductById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { productId } = req.params;
    const parsedId = Number(productId);
    const queryId = isNaN(parsedId) ? (productId as any) : parsedId;

    const product = await prisma.product.findUnique({ where: { id: queryId } });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryLevel1: product.categoryLevel1,
        NOT: { id: product.id },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ product, relatedProducts, message: "Admin product retrieved successfully" });
  } catch (error: any) {
    console.error("Error retrieving admin product:", error);
    return res.status(500).json({ error: "Error retrieving admin product", message: error.message });
  }
};

// Get Admin Special Products
export const getAdminSpecialProducts = async (req: Request, res: Response): Promise<any> => {
  try {
    const { type, limit = "20", page = "1", search } = req.query;
    const pageSize = parseInt(String(limit), 10);
    const currentPage = parseInt(String(page), 10);
    const skip = (currentPage - 1) * pageSize;

    let whereClause: any = {};
    let orderBy: any = [{ updatedAt: "desc" }];

    if (type && ["featured", "trending", "new-arrivals"].includes(String(type))) {
      switch (type) {
        case "featured":
          whereClause.isFeatured = true;
          orderBy = [{ featuredOrder: "asc" }, { createdAt: "desc" }];
          break;
        case "trending":
          whereClause.isTrending = true;
          orderBy = [{ trendingOrder: "asc" }, { createdAt: "desc" }];
          break;
        case "new-arrivals":
          whereClause.isNewArrival = true;
          orderBy = [{ newArrivalOrder: "asc" }, { createdAt: "desc" }];
          break;
      }
    } else {
      whereClause.OR = [{ isFeatured: true }, { isTrending: true }, { isNewArrival: true }];
    }

    if (search) {
      const searchTerm = String(search);
      const searchCondition = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { brand: { contains: searchTerm, mode: "insensitive" } },
      ];

      if (whereClause.OR) {
        whereClause = {
          AND: [
            { OR: whereClause.OR },
            { OR: searchCondition },
          ],
        };
      } else {
        whereClause.OR = searchCondition;
      }
    }

    const [products, count] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        orderBy,
        take: pageSize,
        skip,
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    const [totalFeatured, totalTrending, totalNewArrivals, activeFeatured, activeTrending, activeNewArrivals] = await Promise.all([
      prisma.product.count({ where: { isFeatured: true } }),
      prisma.product.count({ where: { isTrending: true } }),
      prisma.product.count({ where: { isNewArrival: true } }),
      prisma.product.count({ where: { isFeatured: true, isActive: true } }),
      prisma.product.count({ where: { isTrending: true, isActive: true } }),
      prisma.product.count({ where: { isNewArrival: true, isActive: true } }),
    ]);

    const analytics = {
      totalFeatured,
      totalTrending,
      totalNewArrivals,
      activeFeatured,
      activeTrending,
      activeNewArrivals,
    };

    return res.status(200).json({
      success: true,
      products,
      analytics,
      pagination: {
        currentPage,
        totalPages: Math.ceil(count / pageSize),
        totalProducts: count,
        hasNext: skip + pageSize < count,
        hasPrev: currentPage > 1,
      },
      message: "Admin special products retrieved successfully",
    });
  } catch (error: any) {
    console.error("Error retrieving admin special products:", error);
    return res.status(500).json({
      success: false,
      error: "Error retrieving admin special products",
      message: error.message,
    });
  }
};

// Bulk Update Special Categories
export const bulkUpdateSpecialCategories = async (req: Request, res: Response): Promise<any> => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Products array is required" });
    }

    const results = [];
    const errors = [];

    for (const item of products) {
      try {
        const { productId, updates } = item;
        const parsedId = Number(productId);
        const queryId = isNaN(parsedId) ? productId : parsedId;

        const product = await prisma.product.findUnique({ where: { id: queryId } });
        if (!product) {
          errors.push({ productId, error: "Product not found" });
          continue;
        }

        const updateData: any = {};
        if (updates.isFeatured !== undefined) updateData.isFeatured = updates.isFeatured;
        if (updates.isTrending !== undefined) updateData.isTrending = updates.isTrending;
        if (updates.isNewArrival !== undefined) updateData.isNewArrival = updates.isNewArrival;
        if (updates.featuredOrder !== undefined) updateData.featuredOrder = parseInt(updates.featuredOrder) || 0;
        if (updates.trendingOrder !== undefined) updateData.trendingOrder = parseInt(updates.trendingOrder) || 0;
        if (updates.newArrivalOrder !== undefined) updateData.newArrivalOrder = parseInt(updates.newArrivalOrder) || 0;

        const updated = await prisma.product.update({
          where: { id: queryId },
          data: updateData,
        });

        results.push(updated);
      } catch (err: any) {
        errors.push({ productId: item.productId, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      results,
      errors,
      message: "Bulk update completed",
    });
  } catch (error: any) {
    console.error("Error in bulk update special categories:", error);
    return res.status(500).json({ error: "Error during bulk update", message: error.message });
  }
};