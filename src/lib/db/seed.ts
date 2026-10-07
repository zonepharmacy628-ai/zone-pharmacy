import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import type { DB } from "./index";
import { categories, products, settings, users } from "./schema";
import { DEFAULT_SETTINGS } from "../settings-shared";
import { slugify } from "../utils";

const CATEGORY_SEED: [name: string, icon: string][] = [
  ["Medicines", "pill"],
  ["Pain Relief", "activity"],
  ["Cold & Flu", "thermometer"],
  ["Vitamins & Supplements", "leaf"],
  ["Baby Care", "baby"],
  ["Personal Care", "sparkles"],
  ["Skin Care", "droplet"],
  ["Hair Care", "scissors"],
  ["Oral Care", "smile"],
  ["First Aid", "cross"],
  ["Diabetes Care", "syringe"],
  ["Medical Devices", "stethoscope"],
  ["Women's Health", "heart"],
  ["Men's Health", "shield"],
  ["Health & Wellness", "flower"],
];

type P = {
  name: string;
  cat: string;
  brand: string;
  generic?: string;
  short: string;
  price: number;
  compare?: number;
  cost: number;
  stock: number;
  rx?: boolean;
  featured?: boolean;
  popular?: boolean;
};

const PRODUCT_SEED: P[] = [
  { name: "Panadol 500mg", cat: "Pain Relief", brand: "GSK", generic: "Paracetamol", short: "Pain Relief | 20 Tablets", price: 180, compare: 220, cost: 130, stock: 120, featured: true, popular: true },
  { name: "Ibuprofen 400mg", cat: "Pain Relief", brand: "Abbott", generic: "Ibuprofen", short: "Pain Relief | 20 Tablets", price: 220, cost: 160, stock: 80, popular: true },
  { name: "Disprin 300mg", cat: "Pain Relief", brand: "Reckitt", generic: "Aspirin", short: "Headache Relief | 100 Tablets", price: 260, cost: 190, stock: 60 },
  { name: "Voltral Emulgel 20g", cat: "Pain Relief", brand: "Novartis", generic: "Diclofenac", short: "Joint & Muscle Pain | 20g", price: 310, compare: 350, cost: 230, stock: 45 },
  { name: "Strepsils Lozenges", cat: "Cold & Flu", brand: "Reckitt", short: "Throat Lozenges | 16 Lozenges", price: 320, compare: 365, cost: 240, stock: 90, featured: true, popular: true },
  { name: "Vicks VapoRub 50g", cat: "Cold & Flu", brand: "Vicks", short: "Cold Relief | 50g", price: 420, cost: 320, stock: 55, popular: true },
  { name: "Arinac Forte", cat: "Cold & Flu", brand: "Abbott", generic: "Ibuprofen + Pseudoephedrine", short: "Flu Relief | 10 Tablets", price: 150, cost: 105, stock: 8 },
  { name: "Omeprazole 20mg", cat: "Medicines", brand: "Getz", generic: "Omeprazole", short: "Acidity Relief | 30 Capsules", price: 350, cost: 250, stock: 70, popular: true },
  { name: "Amoxicillin 250mg", cat: "Medicines", brand: "GSK", generic: "Amoxicillin", short: "Antibiotic | 16 Capsules", price: 290, cost: 200, stock: 40, rx: true },
  { name: "Augmentin 625mg", cat: "Medicines", brand: "GSK", generic: "Co-amoxiclav", short: "Antibiotic | 6 Tablets", price: 540, cost: 410, stock: 35, rx: true },
  { name: "ORS Powder", cat: "Medicines", brand: "Searle", generic: "Oral Rehydration Salts", short: "Rehydration | 20 Sachets", price: 280, cost: 200, stock: 100, featured: true },
  { name: "Cetirizine 10mg", cat: "Medicines", brand: "Hilton", generic: "Cetirizine", short: "Allergy Relief | 10 Tablets", price: 95, cost: 60, stock: 150 },
  { name: "Vitamin C 1000mg", cat: "Vitamins & Supplements", brand: "Nutrifactor", generic: "Ascorbic Acid", short: "Immune Support | 60 Tablets", price: 850, compare: 945, cost: 620, stock: 65, featured: true, popular: true },
  { name: "Vitamin D3 1000 IU", cat: "Vitamins & Supplements", brand: "Nutrifactor", generic: "Cholecalciferol", short: "Bone Health | 60 Tablets", price: 780, cost: 560, stock: 6, featured: true },
  { name: "Multivitamin Daily", cat: "Vitamins & Supplements", brand: "Centrum", short: "Daily Wellness | 30 Tablets", price: 1450, compare: 1600, cost: 1100, stock: 30 },
  { name: "Omega-3 Fish Oil", cat: "Vitamins & Supplements", brand: "Seven Seas", short: "Heart Health | 60 Softgels", price: 1950, cost: 1500, stock: 25, popular: true },
  { name: "Baby Diapers Medium", cat: "Baby Care", brand: "Pampers", short: "Size 3 | 58 Pieces", price: 2450, compare: 2700, cost: 2050, stock: 40, featured: true },
  { name: "Baby Lotion 200ml", cat: "Baby Care", brand: "Johnson's", short: "Gentle Care | 200ml", price: 690, cost: 520, stock: 50 },
  { name: "Gripe Water 150ml", cat: "Baby Care", brand: "Woodward's", short: "Colic Relief | 150ml", price: 260, cost: 190, stock: 45 },
  { name: "Dettol Antiseptic Liquid", cat: "First Aid", brand: "Dettol", short: "Skin Protection | 500ml", price: 730, cost: 560, stock: 60, popular: true },
  { name: "Adhesive Bandages", cat: "First Aid", brand: "Saniplast", short: "Wound Care | 100 Strips", price: 240, cost: 170, stock: 110 },
  { name: "Cotton Roll 100g", cat: "First Aid", brand: "Kohinoor", short: "Absorbent Cotton | 100g", price: 160, cost: 110, stock: 75 },
  { name: "Cetaphil Gentle Skin Cleanser", cat: "Skin Care", brand: "Cetaphil", short: "For Sensitive Skin | 250ml", price: 1650, compare: 1850, cost: 1300, stock: 28, featured: true, popular: true },
  { name: "Sunblock SPF 60", cat: "Skin Care", brand: "Stiefel", short: "Sun Protection | 60ml", price: 1250, cost: 950, stock: 33 },
  { name: "Anti-Dandruff Shampoo", cat: "Hair Care", brand: "Nizoral", generic: "Ketoconazole", short: "Scalp Care | 100ml", price: 890, cost: 680, stock: 26 },
  { name: "Hair Oil 200ml", cat: "Hair Care", brand: "Dabur", short: "Nourishing Oil | 200ml", price: 480, cost: 350, stock: 48 },
  { name: "Sensodyne Toothpaste", cat: "Oral Care", brand: "Sensodyne", short: "Sensitive Teeth | 100g", price: 520, cost: 400, stock: 70 },
  { name: "Antiseptic Mouthwash 250ml", cat: "Oral Care", brand: "Listerine", short: "Fresh Breath | 250ml", price: 640, compare: 700, cost: 490, stock: 38 },
  { name: "Blood Glucose Test Strips", cat: "Diabetes Care", brand: "Accu-Chek", short: "50 Strips", price: 2850, cost: 2350, stock: 22, featured: true },
  { name: "Metformin 500mg", cat: "Diabetes Care", brand: "Merck", generic: "Metformin", short: "Blood Sugar Control | 50 Tablets", price: 210, cost: 150, stock: 85, rx: true },
  { name: "Digital Thermometer", cat: "Medical Devices", brand: "Omron", short: "Fast & Accurate", price: 950, cost: 700, stock: 30, popular: true },
  { name: "Blood Pressure Monitor", cat: "Medical Devices", brand: "Omron", short: "Automatic | Upper Arm", price: 8900, compare: 9800, cost: 7400, stock: 12, featured: true },
  { name: "Folic Acid 5mg", cat: "Women's Health", brand: "GSK", generic: "Folic Acid", short: "Prenatal Support | 100 Tablets", price: 190, cost: 130, stock: 60 },
  { name: "Iron Supplement", cat: "Women's Health", brand: "Abbott", short: "Energy & Blood Health | 30 Tablets", price: 460, cost: 330, stock: 42 },
  { name: "Men's Multivitamin", cat: "Men's Health", brand: "Nutrifactor", short: "Energy & Vitality | 30 Tablets", price: 1150, cost: 870, stock: 27 },
  { name: "Shaving Foam 200ml", cat: "Personal Care", brand: "Gillette", short: "Smooth Shave | 200ml", price: 780, cost: 600, stock: 34 },
  { name: "Hand Sanitizer 250ml", cat: "Personal Care", brand: "Dettol", short: "Kills 99.9% Germs | 250ml", price: 390, cost: 280, stock: 95 },
  { name: "Green Tea 25 Bags", cat: "Health & Wellness", brand: "Lipton", short: "Antioxidant Rich | 25 Bags", price: 340, cost: 250, stock: 58 },
  { name: "Isabgol Husk 140g", cat: "Health & Wellness", brand: "Qarshi", generic: "Psyllium Husk", short: "Digestive Health | 140g", price: 420, cost: 310, stock: 44 },
];

/**
 * Idempotent. Creates the default settings row, the starter catalogue (only
 * when there are no categories yet) and the Owner account from
 * OWNER_EMAIL / OWNER_PASSWORD (only when no owner exists).
 */
export async function seedDatabase(db: DB) {
  await db.insert(settings).values({ key: "site", value: DEFAULT_SETTINGS }).onConflictDoNothing();

  const [{ count: categoryCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(categories);
  if (categoryCount === 0) {
    const inserted = await db
      .insert(categories)
      .values(CATEGORY_SEED.map(([name, icon], i) => ({ name, icon, slug: slugify(name), sortOrder: i })))
      .returning({ id: categories.id, name: categories.name });
    const byName = new Map(inserted.map((c) => [c.name, c.id]));
    const expiry = (months: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() + months);
      return d.toISOString().slice(0, 10);
    };
    await db.insert(products).values(
      PRODUCT_SEED.map((p, i) => ({
        name: p.name,
        slug: slugify(p.name),
        genericName: p.generic ?? "",
        brand: p.brand,
        shortDescription: p.short,
        description: `${p.name} by ${p.brand}. ${p.short.replace(" | ", ", ")}. Sourced from authorised distributors and stored under recommended conditions. Always read the label and use as directed by your doctor or pharmacist.`,
        categoryId: byName.get(p.cat) ?? null,
        price: p.price,
        comparePrice: p.compare ?? null,
        costPrice: p.cost,
        stock: p.stock,
        requiresPrescription: p.rx ?? false,
        featured: p.featured ?? false,
        popular: p.popular ?? false,
        expiryDate: expiry(i % 9 === 0 ? 2 : 10 + (i % 14)),
      })),
    );
  }

  const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.role, "owner")).limit(1);
  if (!owner) {
    const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
    const password = process.env.OWNER_PASSWORD;
    if (email && password && password.length >= 8) {
      await db
        .insert(users)
        .values({
          name: process.env.OWNER_NAME?.trim() || "Owner",
          email,
          passwordHash: await bcrypt.hash(password, 10),
          role: "owner",
        })
        .onConflictDoNothing();
      console.log(`[seed] Owner account created for ${email}`);
    } else {
      console.warn("[seed] No owner account exists. Set OWNER_EMAIL and OWNER_PASSWORD (min 8 chars) and run the seed again.");
    }
  }
}
