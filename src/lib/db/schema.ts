import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (value) => Buffer.from(value),
});

const money = (name: string) => numeric(name, { precision: 12, scale: 2, mode: "number" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  // customer | owner | manager | pharmacist | sales | inventory
  role: text("role").notNull().default("customer"),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: createdAt(),
});

export const addresses = pgTable(
  "addresses",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // home | office | other
    label: text("label").notNull().default("home"),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  // product | branding | prescription
  kind: text("kind").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  data: bytea("data").notNull(),
  ownerId: integer("owner_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull().default("pill"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    genericName: text("generic_name").notNull().default(""),
    brand: text("brand").notNull().default(""),
    shortDescription: text("short_description").notNull().default(""),
    description: text("description").notNull().default(""),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    price: money("price").notNull(),
    comparePrice: money("compare_price"),
    costPrice: money("cost_price").notNull().default(0),
    stock: integer("stock").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
    available: boolean("available").notNull().default(true),
    requiresPrescription: boolean("requires_prescription").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    popular: boolean("popular").notNull().default(false),
    imageFileId: uuid("image_file_id").references(() => files.id, { onDelete: "set null" }),
    expiryDate: date("expiry_date", { mode: "string" }),
    ratingAvg: numeric("rating_avg", { precision: 3, scale: 2, mode: "number" }).notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    soldCount: integer("sold_count").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("products_category_idx").on(t.categoryId),
    check("products_stock_non_negative", sql`${t.stock} >= 0`),
    check("products_price_non_negative", sql`${t.price} >= 0`),
  ],
);

export const wishlist = pgTable(
  "wishlist",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    accessToken: text("access_token").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    customerName: text("customer_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    notes: text("notes").notNull().default(""),
    subtotal: money("subtotal").notNull(),
    deliveryCharge: money("delivery_charge").notNull(),
    total: money("total").notNull(),
    // cod | jazzcash | bank
    paymentMethod: text("payment_method").notNull(),
    paymentReference: text("payment_reference").notNull().default(""),
    // unpaid | pending | paid
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    // pending | confirmed | processing | shipped | delivered | cancelled
    status: text("status").notNull().default("pending"),
    prescriptionFileId: uuid("prescription_file_id").references(() => files.id, { onDelete: "set null" }),
    // none | pending | approved | rejected
    prescriptionStatus: text("prescription_status").notNull().default("none"),
    createdAt: createdAt(),
  },
  (t) => [index("orders_user_idx").on(t.userId), index("orders_created_idx").on(t.createdAt)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    categoryId: integer("category_id"),
    name: text("name").notNull(),
    price: money("price").notNull(),
    costPrice: money("cost_price").notNull().default(0),
    quantity: integer("quantity").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId), check("order_items_qty_positive", sql`${t.quantity} > 0`)],
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    byUserId: integer("by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("order_history_order_idx").on(t.orderId)],
);

export const medicineRequests = pgTable("medicine_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  medicineName: text("medicine_name").notNull(),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  quantity: integer("quantity"),
  message: text("message").notNull().default(""),
  prescriptionFileId: uuid("prescription_file_id").references(() => files.id, { onDelete: "set null" }),
  // new | in_review | available | unavailable | closed
  status: text("status").notNull().default("new"),
  adminNote: text("admin_note").notNull().default(""),
  createdAt: createdAt(),
});

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("reviews_product_user_idx").on(t.productId, t.userId),
    check("reviews_rating_range", sql`${t.rating} between 1 and 5`),
  ],
);

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  email: text("email").notNull().default(""),
  createdAt: createdAt(),
});

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  supplierName: text("supplier_name").notNull(),
  supplierInvoiceNumber: text("supplier_invoice_number").notNull().default(""),
  purchaseDate: date("purchase_date", { mode: "string" }).notNull(),
  subtotal: money("subtotal").notNull(),
  tax: money("tax").notNull().default(0),
  total: money("total").notNull(),
  createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const purchaseItems = pgTable(
  "purchase_items",
  {
    id: serial("id").primaryKey(),
    purchaseId: integer("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    batchNumber: text("batch_number").notNull().default(""),
    expiryDate: date("expiry_date", { mode: "string" }),
    quantity: integer("quantity").notNull(),
    purchasePrice: money("purchase_price").notNull(),
    salePrice: money("sale_price").notNull(),
  },
  (t) => [
    index("purchase_items_purchase_idx").on(t.purchaseId),
    check("purchase_items_qty_positive", sql`${t.quantity} > 0`),
  ],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    change: integer("change").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    // purchase | sale | adjustment | cancellation
    reason: text("reason").notNull(),
    reference: text("reference").notNull().default(""),
    note: text("note").notNull().default(""),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("stock_movements_product_idx").on(t.productId)],
);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    userName: text("user_name").notNull(),
    action: text("action").notNull(),
    details: text("details").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("activity_created_idx").on(t.createdAt)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});
