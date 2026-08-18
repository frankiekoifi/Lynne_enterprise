import "dotenv/config";
import { db } from "../src/db";
import * as s from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { DEFAULT_SETTINGS } from "../src/lib/settings";

const IMG = {
  kitchen1:
    "https://images.pexels.com/photos/20430670/pexels-photo-20430670.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  kitchen2:
    "https://images.pexels.com/photos/15245007/pexels-photo-15245007.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  kitchen3:
    "https://images.pexels.com/photos/15569110/pexels-photo-15569110.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  bed1: "https://images.pexels.com/photos/6957090/pexels-photo-6957090.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  bed2: "https://images.pexels.com/photos/6636249/pexels-photo-6636249.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  bedsheet:
    "https://images.pexels.com/photos/7765000/pexels-photo-7765000.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  bedding:
    "https://images.pexels.com/photos/9252955/pexels-photo-9252955.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  sofa1:
    "https://images.pexels.com/photos/16825059/pexels-photo-16825059.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  sofa2:
    "https://images.pexels.com/photos/6758245/pexels-photo-6758245.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  living:
    "https://images.pexels.com/photos/6580396/pexels-photo-6580396.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  storage:
    "https://images.pexels.com/photos/33784616/pexels-photo-33784616.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  baskets:
    "https://images.pexels.com/photos/8580730/pexels-photo-8580730.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
};

async function main() {
  const existing = await db.select().from(s.users).limit(1);
  if (existing.length > 0) {
    console.log("Seed skipped: data already present.");
    return;
  }

  // Settings
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.insert(s.settings).values({ key, value: String(value) });
  }

  // Users
  const adminHash = await bcrypt.hash("admin123", 10);
  const custHash = await bcrypt.hash("customer123", 10);
  const [admin] = await db
    .insert(s.users)
    .values({
      fullName: "Lynne Admin",
      email: "admin@lynne.co.ke",
      phone: "+254 700 111 222",
      passwordHash: adminHash,
      role: "admin",
    })
    .returning({ id: s.users.id });
  const [customer] = await db
    .insert(s.users)
    .values({
      fullName: "Jane Wanjiku",
      email: "customer@lynne.co.ke",
      phone: "+254 722 000 000",
      passwordHash: custHash,
      role: "customer",
    })
    .returning({ id: s.users.id });

  await db.insert(s.addresses).values({
    userId: customer.id,
    label: "Home",
    phone: "+254 722 000 000",
    town: "Nairobi",
    area: "Westlands",
    details: "Mpaka Road, Green Court",
    isDefault: true,
  });

  // Categories
  const cat = async (
    name: string,
    slug: string,
    description: string,
    imageUrl: string,
    parentId?: number,
  ) => {
    const [row] = await db
      .insert(s.categories)
      .values({ name, slug, description, imageUrl, parentId: parentId ?? null })
      .returning({ id: s.categories.id });
    return row.id;
  };

  const kitchen = await cat(
    "Kitchen Utensils",
    "kitchen-utensils",
    "Cookware, plates, cups and more for your kitchen.",
    IMG.kitchen1,
  );
  const cookingSets = await cat(
    "Cooking Sets",
    "cooking-sets",
    "",
    IMG.kitchen2,
    kitchen,
  );
  const plates = await cat("Plates", "plates", "", IMG.kitchen3, kitchen);
  const household = await cat(
    "Household",
    "household",
    "Cleaning and storage essentials for the home.",
    IMG.storage,
  );
  const cleaning = await cat(
    "Cleaning",
    "cleaning",
    "",
    IMG.storage,
    household,
  );
  const storageCat = await cat(
    "Storage",
    "storage",
    "",
    IMG.baskets,
    household,
  );
  const beddings = await cat(
    "Beddings",
    "beddings",
    "Bedsheets, blankets and duvets.",
    IMG.bedding,
  );
  const bedsheets = await cat(
    "Bedsheets",
    "bedsheets",
    "",
    IMG.bedsheet,
    beddings,
  );
  const duvets = await cat("Duvets", "duvets", "", IMG.bedding, beddings);
  const furniture = await cat(
    "Furniture",
    "furniture",
    "Beds, sofas and tables for your home.",
    IMG.sofa1,
  );
  const beds = await cat("Beds", "beds", "", IMG.bed1, furniture);
  const sofas = await cat("Sofas", "sofas", "", IMG.sofa2, furniture);

  // Products
  interface PlanSeed {
    name: string;
    frequency: string;
    installment: number;
  }
  interface VariationSeed {
    name: string;
    sku: string;
    price: number;
    stock: number;
    cash: boolean;
    lipa: boolean;
    plans?: PlanSeed[];
  }
  interface ProductSeed {
    name: string;
    sku: string;
    categoryId: number;
    subcategoryId?: number;
    description: string;
    cover: string;
    images: string[];
    cash: boolean;
    lipa: boolean;
    variations: VariationSeed[];
  }

  const products: ProductSeed[] = [
    {
      name: "Luxury Bed (6x6)",
      sku: "BED-6X6",
      categoryId: furniture,
      subcategoryId: beds,
      description:
        "A premium, sturdy bed frame with a plush headboard. Available in multiple sizes. Fully eligible for Lipa Polepole.",
      cover: IMG.bed1,
      images: [IMG.bed1, IMG.bed2],
      cash: true,
      lipa: true,
      variations: [
        {
          name: "4x6",
          sku: "BED-4X6",
          price: 22000,
          stock: 6,
          cash: true,
          lipa: true,
          plans: [
            { name: "Daily", frequency: "daily", installment: 400 },
            { name: "Weekly", frequency: "weekly", installment: 2500 },
            { name: "Monthly", frequency: "monthly", installment: 9000 },
          ],
        },
        {
          name: "5x6",
          sku: "BED-5X6",
          price: 26000,
          stock: 5,
          cash: true,
          lipa: true,
          plans: [
            { name: "Weekly", frequency: "weekly", installment: 3000 },
            { name: "Monthly", frequency: "monthly", installment: 11000 },
          ],
        },
        {
          name: "6x6",
          sku: "BED-6X6-MAIN",
          price: 30000,
          stock: 10,
          cash: true,
          lipa: true,
          plans: [
            { name: "Daily", frequency: "daily", installment: 500 },
            { name: "Weekly", frequency: "weekly", installment: 3000 },
            { name: "Biweekly", frequency: "biweekly", installment: 6000 },
            { name: "Monthly", frequency: "monthly", installment: 12000 },
          ],
        },
      ],
    },
    {
      name: "Elegant Sofa Set",
      sku: "SOFA-SET",
      categoryId: furniture,
      subcategoryId: sofas,
      description:
        "Comfortable and elegant sofa set for your living room. Durable fabric and solid construction.",
      cover: IMG.sofa1,
      images: [IMG.sofa1, IMG.sofa2],
      cash: true,
      lipa: true,
      variations: [
        {
          name: "3 Seater",
          sku: "SOFA-3S",
          price: 45000,
          stock: 4,
          cash: true,
          lipa: true,
          plans: [
            { name: "Weekly", frequency: "weekly", installment: 5000 },
            { name: "Monthly", frequency: "monthly", installment: 18000 },
          ],
        },
        {
          name: "5 Seater",
          sku: "SOFA-5S",
          price: 65000,
          stock: 3,
          cash: true,
          lipa: true,
          plans: [
            { name: "Weekly", frequency: "weekly", installment: 7000 },
            { name: "Monthly", frequency: "monthly", installment: 24000 },
          ],
        },
      ],
    },
    {
      name: "Premium Bedsheet Set",
      sku: "SHEET-SET",
      categoryId: beddings,
      subcategoryId: bedsheets,
      description:
        "Soft, breathable bedsheet sets that add comfort and style to any bedroom. Multiple sizes available.",
      cover: IMG.bedsheet,
      images: [IMG.bedsheet, IMG.bedding],
      cash: true,
      lipa: true,
      variations: [
        {
          name: "4x6",
          sku: "SHEET-4X6",
          price: 1800,
          stock: 25,
          cash: true,
          lipa: false,
        },
        {
          name: "5x6",
          sku: "SHEET-5X6",
          price: 2200,
          stock: 20,
          cash: true,
          lipa: false,
        },
        {
          name: "6x6",
          sku: "SHEET-6X6",
          price: 2600,
          stock: 18,
          cash: true,
          lipa: true,
          plans: [
            { name: "Weekly", frequency: "weekly", installment: 650 },
            { name: "Biweekly", frequency: "biweekly", installment: 1300 },
          ],
        },
      ],
    },
    {
      name: "Cooking Set",
      sku: "COOK-SET",
      categoryId: kitchen,
      subcategoryId: cookingSets,
      description:
        "Complete cooking set with pots, pans and lids. A kitchen essential for every home.",
      cover: IMG.kitchen2,
      images: [IMG.kitchen2, IMG.kitchen1],
      cash: true,
      lipa: true,
      variations: [
        {
          name: "6 Pieces",
          sku: "COOK-6",
          price: 4500,
          stock: 30,
          cash: true,
          lipa: false,
        },
        {
          name: "10 Pieces",
          sku: "COOK-10",
          price: 7200,
          stock: 22,
          cash: true,
          lipa: true,
          plans: [
            { name: "Daily", frequency: "daily", installment: 250 },
            { name: "Weekly", frequency: "weekly", installment: 1600 },
          ],
        },
        {
          name: "15 Pieces",
          sku: "COOK-15",
          price: 10500,
          stock: 15,
          cash: true,
          lipa: true,
          plans: [{ name: "Weekly", frequency: "weekly", installment: 2400 }],
        },
      ],
    },
    {
      name: "Dinner Plates Set",
      sku: "PLATES-SET",
      categoryId: kitchen,
      subcategoryId: plates,
      description:
        "Elegant dinner plate set — perfect for family meals and gatherings.",
      cover: IMG.kitchen3,
      images: [IMG.kitchen3],
      cash: true,
      lipa: false,
      variations: [
        {
          name: "6 Pieces",
          sku: "PLATE-6",
          price: 1800,
          stock: 40,
          cash: true,
          lipa: false,
        },
        {
          name: "12 Pieces",
          sku: "PLATE-12",
          price: 3200,
          stock: 35,
          cash: true,
          lipa: false,
        },
      ],
    },
    {
      name: "Storage Baskets (Set of 3)",
      sku: "BASKET-3",
      categoryId: household,
      subcategoryId: storageCat,
      description:
        "Stylish woven storage baskets to keep your home tidy and organised.",
      cover: IMG.baskets,
      images: [IMG.baskets, IMG.storage],
      cash: true,
      lipa: false,
      variations: [
        {
          name: "Small",
          sku: "BASKET-S",
          price: 1800,
          stock: 28,
          cash: true,
          lipa: false,
        },
        {
          name: "Large",
          sku: "BASKET-L",
          price: 2600,
          stock: 24,
          cash: true,
          lipa: false,
        },
      ],
    },
  ];

  for (const p of products) {
    const [prod] = await db
      .insert(s.products)
      .values({
        name: p.name,
        slug: p.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
        sku: p.sku,
        categoryId: p.categoryId,
        subcategoryId: p.subcategoryId ?? null,
        description: p.description,
        coverImage: p.cover,
        status: "active",
        cashAvailable: p.cash,
        lipaAvailable: p.lipa,
      })
      .returning({ id: s.products.id });

    for (let i = 0; i < p.images.length; i++) {
      await db.insert(s.productImages).values({
        productId: prod.id,
        url: p.images[i],
        sortOrder: i,
      });
    }

    for (const v of p.variations) {
      const [variation] = await db
        .insert(s.variations)
        .values({
          productId: prod.id,
          name: v.name,
          sku: v.sku,
          price: v.price,
          totalStock: v.stock,
          availableStock: v.stock,
          reservedStock: 0,
          soldStock: 0,
          cashAvailable: v.cash,
          lipaAvailable: v.lipa,
          active: true,
        })
        .returning({ id: s.variations.id });

      await db.insert(s.inventoryLog).values({
        variationId: variation.id,
        change: v.stock,
        reason: "new_stock",
        note: "Initial stock",
        actorId: admin.id,
      });

      if (v.plans) {
        for (let pi = 0; pi < v.plans.length; pi++) {
          const plan = v.plans[pi];
          await db.insert(s.paymentPlans).values({
            variationId: variation.id,
            name: plan.name,
            frequency: plan.frequency,
            installmentAmount: plan.installment,
            initialPayment: plan.installment,
            active: true,
            sortOrder: pi,
          });
        }
      }
    }
  }

  // A welcome notification for the demo customer
  await db.insert(s.notifications).values({
    userId: customer.id,
    type: "welcome",
    title: "Karibu to Lynne Enterprise",
    message:
      "Browse our store, buy in full or use Lipa Polepole to pay gradually.",
  });

  await db.insert(s.auditLogs).values({
    userId: admin.id,
    action: "seed.initialize",
    entity: "system",
    newValue: JSON.stringify({ message: "Initial seed data created" }),
  });

  console.log(
    "Seed complete. Admin: admin@lynne.co.ke / admin123, Customer: customer@lynne.co.ke / customer123",
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
