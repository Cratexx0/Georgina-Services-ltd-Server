import "dotenv/config";
import * as bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma, UserRole } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error("DIRECT_URL or DATABASE_URL must be configured in .env");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "Secure@321";

const ADULT = ["XS", "S", "M", "L", "XL", "XXL"];
const MEN = ["S", "M", "L", "XL", "XXL", "XXXL"];
const KIDS = ["2Y", "4Y", "6Y", "8Y", "10Y", "12Y"];
const BABY = ["0-3M", "3-6M", "6-12M", "12-18M", "18-24M"];

type SeedProduct = {
	audience: "women" | "men" | "kids";
	name: string;
	slug: string;
	description: string;
	price: number;
	discountPrice?: number;
	sizes: string[];
	colors: string[];
	featured?: boolean;
	trending?: boolean;
	newArrival?: boolean;
	stock?: number;
};

const products: SeedProduct[] = [
	// WOMEN
	{
		audience: "women",
		name: "African Print Maxi Dress",
		slug: "african-print-maxi-dress",
		description:
			"Floor-length African print maxi dress in vibrant wax print cotton.",
		price: 89.99,
		discountPrice: 69.99,
		sizes: ADULT,
		colors: ["Multi"],
		featured: true,
		trending: true,
	},
	{
		audience: "women",
		name: "African Print Blouse",
		slug: "african-print-blouse",
		description:
			"Easy-to-style African print blouse for casual and formal occasions.",
		price: 49.99,
		sizes: ADULT,
		colors: ["Multi", "Red", "Blue"],
	},
	{
		audience: "women",
		name: "Traditional African Wear Set",
		slug: "traditional-african-wear-set",
		description:
			"Matching top and wrapper set for weddings, church and special occasions.",
		price: 129.99,
		sizes: ADULT,
		colors: ["Gold", "Royal Blue", "Purple"],
		featured: true,
	},
	{
		audience: "women",
		name: "African Wear Kaftan",
		slug: "african-wear-kaftan",
		description:
			"Relaxed kaftan with intricate embroidery, easy to dress up or down.",
		price: 95.99,
		sizes: ADULT,
		colors: ["White", "Cream", "Black"],
		newArrival: true,
	},
	{
		audience: "women",
		name: "Ankara Maxi Dress",
		slug: "ankara-maxi-dress",
		description: "Bold Ankara maxi dress with a flattering flowing silhouette.",
		price: 85.99,
		sizes: ADULT,
		colors: ["Multi"],
		trending: true,
	},
	{
		audience: "women",
		name: "Ankara Pencil Skirt",
		slug: "ankara-pencil-skirt",
		description: "Fitted Ankara pencil skirt for the office or an evening out.",
		price: 45.99,
		sizes: ADULT,
		colors: ["Multi", "Red", "Green"],
	},
	{
		audience: "women",
		name: "Ankara Peplum Dress",
		slug: "ankara-peplum-dress",
		description:
			"Fitted bodice with a flared peplum waist in a statement Ankara print.",
		price: 79.99,
		sizes: ADULT,
		colors: ["Multi"],
		newArrival: true,
	},
	{
		audience: "women",
		name: "Ankara Wrap Dress",
		slug: "ankara-wrap-dress",
		description: "Adjustable wrap dress that flatters every shape.",
		price: 74.99,
		sizes: ADULT,
		colors: ["Multi", "Orange", "Teal"],
	},
	{
		audience: "women",
		name: "Ankara Off-Shoulder Dress",
		slug: "ankara-off-shoulder-dress",
		description: "Off-shoulder Ankara dress for parties and celebrations.",
		price: 82.99,
		sizes: ADULT,
		colors: ["Multi"],
		trending: true,
	},
	{
		audience: "women",
		name: "Ankara Mermaid Gown",
		slug: "ankara-mermaid-gown",
		description: "Show-stopping fitted gown with a flared mermaid hem.",
		price: 139.99,
		sizes: ADULT,
		colors: ["Multi", "Gold"],
		featured: true,
		stock: 15,
	},
	{
		audience: "women",
		name: "Ankara Puff-Sleeve Blouse",
		slug: "ankara-puff-sleeve-blouse",
		description:
			"Statement puff-sleeve blouse that pairs with skirts and trousers.",
		price: 44.99,
		sizes: ADULT,
		colors: ["Multi", "Yellow", "Blue"],
	},
	{
		audience: "women",
		name: "Ankara Palazzo Trousers",
		slug: "ankara-palazzo-trousers",
		description: "Wide-leg palazzo trousers in a bold, breathable print.",
		price: 54.99,
		sizes: ADULT,
		colors: ["Multi"],
	},
	{
		audience: "women",
		name: "Ankara Skirt and Blouse Set",
		slug: "ankara-skirt-and-blouse-set",
		description: "Coordinated two-piece set — one outfit, zero effort.",
		price: 99.99,
		sizes: ADULT,
		colors: ["Multi", "Green", "Red"],
		featured: true,
	},
	{
		audience: "women",
		name: "Ankara Jumpsuit",
		slug: "ankara-jumpsuit",
		description: "Tailored Ankara jumpsuit with a belted waist.",
		price: 89.99,
		sizes: ADULT,
		colors: ["Multi"],
		newArrival: true,
	},

	// MEN
	{
		audience: "men",
		name: "Men's African Wear Dashiki",
		slug: "mens-african-wear-dashiki",
		description: "Traditional dashiki with embroidered neckline.",
		price: 79.99,
		sizes: MEN,
		colors: ["White", "Black", "Blue", "Gold"],
		featured: true,
	},
	{
		audience: "men",
		name: "African Senator Suit",
		slug: "african-senator-suit",
		description: "Elegant senator-style suit for formal occasions.",
		price: 149.99,
		discountPrice: 129.99,
		sizes: MEN,
		colors: ["White", "Navy", "Burgundy"],
		trending: true,
		stock: 15,
	},
	{
		audience: "men",
		name: "Men's African Print Trousers",
		slug: "mens-african-print-trousers",
		description: "Comfortable straight-cut trousers in African print.",
		price: 69.99,
		discountPrice: 54.99,
		sizes: MEN,
		colors: ["Multi", "Brown", "Navy"],
	},
	{
		audience: "men",
		name: "Men's Ankara Short-Sleeve Shirt",
		slug: "mens-ankara-short-sleeve-shirt",
		description: "Slim-fit short-sleeve shirt in a bold Ankara print.",
		price: 44.99,
		sizes: MEN,
		colors: ["Multi", "Blue", "Orange"],
		newArrival: true,
	},
	{
		audience: "men",
		name: "Men's Ankara Long-Sleeve Shirt",
		slug: "mens-ankara-long-sleeve-shirt",
		description:
			"Long-sleeve Ankara shirt that works for the office or a party.",
		price: 54.99,
		sizes: MEN,
		colors: ["Multi", "Green"],
	},
	{
		audience: "men",
		name: "Men's Ankara Shirt and Trousers Set",
		slug: "mens-ankara-shirt-and-trousers-set",
		description: "Matching two-piece set ready for weddings and celebrations.",
		price: 109.99,
		sizes: MEN,
		colors: ["Multi", "Navy"],
		featured: true,
	},
	{
		audience: "men",
		name: "Men's Ankara Kaftan Set",
		slug: "mens-ankara-kaftan-set",
		description: "Kaftan top with matching trousers in Ankara print.",
		price: 119.99,
		sizes: MEN,
		colors: ["Multi", "Gold"],
		trending: true,
	},
	{
		audience: "men",
		name: "Men's Ankara Agbada",
		slug: "mens-ankara-agbada",
		description:
			"Three-piece agbada with Ankara detailing for ceremonial wear.",
		price: 179.99,
		sizes: MEN,
		colors: ["Multi", "Royal Blue"],
		stock: 10,
	},
	{
		audience: "men",
		name: "Men's Ankara Bomber Jacket",
		slug: "mens-ankara-bomber-jacket",
		description: "Lightweight bomber with an Ankara print shell.",
		price: 89.99,
		sizes: MEN,
		colors: ["Multi"],
		newArrival: true,
	},
	{
		audience: "men",
		name: "Men's Ankara Waistcoat",
		slug: "mens-ankara-waistcoat",
		description: "Tailored waistcoat to layer over a plain shirt.",
		price: 59.99,
		sizes: MEN,
		colors: ["Multi"],
	},
	{
		audience: "men",
		name: "Men's Ankara Shorts",
		slug: "mens-ankara-shorts",
		description: "Relaxed Ankara shorts for warm days.",
		price: 34.99,
		sizes: MEN,
		colors: ["Multi", "Blue"],
	},

	// KIDS
	{
		audience: "kids",
		name: "Kids African Wear Complete Outfit",
		slug: "kids-african-wear-complete-outfit",
		description: "Complete African wear outfit with matching accessories.",
		price: 49.99,
		sizes: KIDS,
		colors: ["Multi", "Blue", "Pink", "Yellow"],
		featured: true,
		newArrival: true,
	},
	{
		audience: "kids",
		name: "Children's Traditional Dashiki Set",
		slug: "childrens-traditional-dashiki-set",
		description: "Traditional dashiki set for boys and girls.",
		price: 45.99,
		sizes: KIDS,
		colors: ["Red", "Gold", "Green", "Purple"],
	},
	{
		audience: "kids",
		name: "Kids Ankara Dress",
		slug: "kids-ankara-dress",
		description: "Playful Ankara dress for girls in vibrant patterns.",
		price: 39.99,
		sizes: KIDS,
		colors: ["Multi", "Pink", "Blue"],
		trending: true,
	},
	{
		audience: "kids",
		name: "Girls' Ankara Puff-Sleeve Dress",
		slug: "girls-ankara-puff-sleeve-dress",
		description: "Twirl-worthy puff-sleeve dress for birthdays and festivals.",
		price: 42.99,
		sizes: KIDS,
		colors: ["Multi", "Yellow"],
		newArrival: true,
	},
	{
		audience: "kids",
		name: "Girls' Ankara Skirt and Top Set",
		slug: "girls-ankara-skirt-and-top-set",
		description: "Comfortable two-piece set for everyday and special days.",
		price: 44.99,
		sizes: KIDS,
		colors: ["Multi", "Pink"],
	},
	{
		audience: "kids",
		name: "Boys' Ankara Shirt and Shorts Set",
		slug: "boys-ankara-shirt-and-shorts-set",
		description: "Smart-casual Ankara shirt and shorts set for boys.",
		price: 41.99,
		sizes: KIDS,
		colors: ["Multi", "Blue"],
	},
	{
		audience: "kids",
		name: "Kids Ankara Mini Kaftan",
		slug: "kids-ankara-mini-kaftan",
		description: "Mini kaftan with matching trousers for little gentlemen.",
		price: 38.99,
		sizes: KIDS,
		colors: ["Multi", "Gold"],
	},
	{
		audience: "kids",
		name: "Ankara Baby Onesie",
		slug: "ankara-baby-onesie",
		description: "Soft cotton onesie in cheerful Ankara print.",
		price: 19.99,
		sizes: BABY,
		colors: ["Multi"],
		stock: 50,
	},
	{
		audience: "kids",
		name: "Mother and Daughter Ankara Dress Pair",
		slug: "mother-daughter-ankara-dress-pair",
		description:
			"Matching dresses in the same print — adult and child sizes in one order.",
		price: 89.99,
		sizes: KIDS,
		colors: ["Multi"],
		featured: true,
		stock: 20,
	},
	{
		audience: "kids",
		name: "Father and Son Ankara Shirt Pair",
		slug: "father-son-ankara-shirt-pair",
		description: "Matching shirts for dad and son in the same Ankara print.",
		price: 79.99,
		sizes: KIDS,
		colors: ["Multi"],
		stock: 20,
	},
];

async function main() {
	const hashedPassword = await bcrypt.hash(PASSWORD, 12);

	// Create or update the admin account.
	await prisma.user.upsert({
		where: { email: "admin@example.com" },
		update: {
			name: "Admin",
			password: hashedPassword,
			role: UserRole.ADMIN,
		},
		create: {
			name: "Admin",
			email: "admin@example.com",
			password: hashedPassword,
			role: UserRole.ADMIN,
		},
	});

	// Create or update the normal user account.
	await prisma.user.upsert({
		where: { email: "user@example.com" },
		update: {
			name: "Test User",
			password: hashedPassword,
			role: UserRole.USER,
		},
		create: {
			name: "Test User",
			email: "user@example.com",
			password: hashedPassword,
			role: UserRole.USER,
		},
	});

	for (const product of products) {
		const discount = product.discountPrice
			? ((product.price - product.discountPrice) / product.price) * 100
			: 0;

		const productData = {
			name: product.name,
			description: product.description,
			price: new Prisma.Decimal(product.price),
			discount: new Prisma.Decimal(discount.toFixed(2)),
			categoryLevel1: product.audience,
			categoryLevel2: null,
			categoryLevel3: null,
			stock: product.stock ?? 0,
			size: {
				sizes: product.sizes,
				colors: product.colors,
			} as Prisma.InputJsonValue,
			tags: [product.audience, "african-wear"] as Prisma.InputJsonValue,
			isActive: true,
			isFeatured: product.featured ?? false,
			isTrending: product.trending ?? false,
			isNewArrival: product.newArrival ?? false,
			featuredOrder: product.featured ? 1 : 0,
			trendingOrder: product.trending ? 1 : 0,
			newArrivalOrder: product.newArrival ? 1 : 0,
		};

		await prisma.product.upsert({
			where: { slug: product.slug },
			update: productData,
			create: {
				slug: product.slug,
				...productData,
			},
		});
	}

	console.log("Seeding completed successfully.");
	console.log(`Users seeded: 2`);
	console.log(`Products seeded: ${products.length}`);
}

main()
	.catch((error) => {
		console.error("Seeding failed:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
