import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Users & authentication
// ---------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("customer"), // customer | admin
    status: text("status").notNull().default("active"), // active | suspended
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("users_email_idx").on(t.email)],
);

// ---------------------------------------------------------------------------
// Categories (self-referencing for subcategories — fully dynamic)
// ---------------------------------------------------------------------------
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    imageUrl: text("image_url"),
    parentId: integer("parent_id"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("categories_parent_idx").on(t.parentId)],
);

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    sku: text("sku"),
    categoryId: integer("category_id").notNull(),
    subcategoryId: integer("subcategory_id"),
    description: text("description"),
    coverImage: text("cover_image"),
    status: text("status").notNull().default("active"), // active | inactive | draft
    cashAvailable: boolean("cash_available").notNull().default(true),
    lipaAvailable: boolean("lipa_available").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("products_category_idx").on(t.categoryId),
    index("products_status_idx").on(t.status),
  ],
);

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Product variations
// ---------------------------------------------------------------------------
export const variations = pgTable(
  "variations",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").notNull(),
    name: text("name").notNull(), // e.g. "6x6", "10 pieces"
    sku: text("sku"),
    price: integer("price").notNull().default(0), // whole KSh
    totalStock: integer("total_stock").notNull().default(0),
    availableStock: integer("available_stock").notNull().default(0),
    reservedStock: integer("reserved_stock").notNull().default(0),
    soldStock: integer("sold_stock").notNull().default(0),
    cashAvailable: boolean("cash_available").notNull().default(true),
    lipaAvailable: boolean("lipa_available").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("variations_product_idx").on(t.productId)],
);

export const variationImages = pgTable("variation_images", {
  id: serial("id").primaryKey(),
  variationId: integer("variation_id").notNull(),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Lipa Polepole payment plans (per variation, manually configured)
// ---------------------------------------------------------------------------
export const paymentPlans = pgTable(
  "payment_plans",
  {
    id: serial("id").primaryKey(),
    variationId: integer("variation_id").notNull(),
    name: text("name").notNull(), // e.g. "Daily", "Weekly"
    frequency: text("frequency").notNull(), // daily | weekly | biweekly | monthly
    installmentAmount: integer("installment_amount").notNull().default(0),
    initialPayment: integer("initial_payment").notNull().default(0),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("payment_plans_variation_idx").on(t.variationId)],
);

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------
export const addresses = pgTable(
  "addresses",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    label: text("label").notNull().default("Home"),
    phone: text("phone"),
    town: text("town"),
    area: text("area"),
    details: text("details"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Orders (cash "buy in full" checkout)
// ---------------------------------------------------------------------------
export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    userId: integer("user_id").notNull(),
    status: text("status").notNull().default("pending"), // pending | confirmed | preparing | ready | assigned | out_for_delivery | delivered | cancelled
    subtotal: integer("subtotal").notNull().default(0),
    deliveryFee: integer("delivery_fee").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    total: integer("total").notNull().default(0),
    deliveryMethod: text("delivery_method").notNull().default("delivery"), // delivery | collection
    deliveryAddress: text("delivery_address"),
    deliveryDistanceKm: integer("delivery_distance_km"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("orders_user_idx").on(t.userId)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull(),
    variationId: integer("variation_id").notNull(),
    productName: text("product_name").notNull(),
    variationName: text("variation_name").notNull(),
    unitPrice: integer("unit_price").notNull().default(0),
    quantity: integer("quantity").notNull().default(1),
    total: integer("total").notNull().default(0),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

// ---------------------------------------------------------------------------
// Cart (user-specific shopping cart)
// ---------------------------------------------------------------------------
export const cart = pgTable(
  "cart",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    variationId: integer("variation_id").notNull(),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("cart_user_idx").on(t.userId),
    index("cart_variation_idx").on(t.variationId),
  ],
);

// ---------------------------------------------------------------------------
// Lipa Polepole accounts
// ---------------------------------------------------------------------------
export const lipaAccounts = pgTable(
  "lipa_accounts",
  {
    id: serial("id").primaryKey(),
    accountNumber: text("account_number").notNull().unique(),
    userId: integer("user_id").notNull(),
    variationId: integer("variation_id").notNull(),
    planId: integer("plan_id").notNull(),
    planSnapshot: text("plan_snapshot").notNull(),
    totalAmount: integer("total_amount").notNull().default(0),
    paidAmount: integer("paid_amount").notNull().default(0),
    remainingAmount: integer("remaining_amount").notNull().default(0),
    progress: integer("progress").notNull().default(0), // 0-100
    status: text("status").notNull().default("pending"), // pending | active | payment_due | overdue | extension_requested | extension_approved | completed | ready_for_collection | ready_for_delivery | delivered | cancelled | refunded | switch_requested | switched
    nextPaymentDue: timestamp("next_payment_due", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("lipa_user_idx").on(t.userId),
    index("lipa_variation_idx").on(t.variationId),
  ],
);

export const lipaStatusHistory = pgTable(
  "lipa_status_history",
  {
    id: serial("id").primaryKey(),
    lipaAccountId: integer("lipa_account_id").notNull(),
    status: text("status").notNull(),
    note: text("note"),
    actorId: integer("actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("lipa_status_account_idx").on(t.lipaAccountId)],
);

// ---------------------------------------------------------------------------
// Payment transactions (single source of truth for financial totals)
// ---------------------------------------------------------------------------
export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    reference: text("reference").notNull().unique(),
    userId: integer("user_id").notNull(),
    orderId: integer("order_id"),
    lipaAccountId: integer("lipa_account_id"),
    amount: integer("amount").notNull().default(0),
    method: text("method").notNull().default("mpesa"), // mpesa | cash | card | bank
    status: text("status").notNull().default("pending"), // pending | successful | failed | refunded
    mpesaReceipt: text("mpesa_receipt"),
    mpesaPhone: text("mpesa_phone"),
    mpesaTransactionId: text("mpesa_transaction_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (t) => [
    index("payments_user_idx").on(t.userId),
    index("payments_lipa_idx").on(t.lipaAccountId),
    index("payments_order_idx").on(t.orderId),
  ],
);

// ---------------------------------------------------------------------------
// Product switch requests
// ---------------------------------------------------------------------------
export const productSwitchRequests = pgTable(
  "product_switch_requests",
  {
    id: serial("id").primaryKey(),
    lipaAccountId: integer("lipa_account_id").notNull(),
    userId: integer("user_id").notNull(),
    fromVariationId: integer("from_variation_id").notNull(),
    toVariationId: integer("to_variation_id").notNull(),
    reason: text("reason"),
    status: text("status").notNull().default("pending"), // pending | approved | rejected | more_info
    adminNote: text("admin_note"),
    reviewedBy: integer("reviewed_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [index("switch_lipa_idx").on(t.lipaAccountId)],
);

// ---------------------------------------------------------------------------
// Refund requests
// ---------------------------------------------------------------------------
export const refundRequests = pgTable(
  "refund_requests",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    orderId: integer("order_id"),
    lipaAccountId: integer("lipa_account_id"),
    amount: integer("amount").notNull().default(0),
    reason: text("reason"),
    status: text("status").notNull().default("requested"), // requested | under_review | approved | rejected | processed
    refundAmount: integer("refund_amount"),
    refundMethod: text("refund_method"),
    adminNote: text("admin_note"),
    reviewedBy: integer("reviewed_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [index("refund_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Inventory ledger (every stock change with a reason)
// ---------------------------------------------------------------------------
export const inventoryLog = pgTable(
  "inventory_log",
  {
    id: serial("id").primaryKey(),
    variationId: integer("variation_id").notNull(),
    change: integer("change").notNull().default(0), // +n / -n
    reason: text("reason").notNull(), // new_stock | cash_sale | lipa_reservation | product_release | product_switch | damaged | manual_adjustment | returned
    note: text("note"),
    actorId: integer("actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("inventory_variation_idx").on(t.variationId)],
);

// ---------------------------------------------------------------------------
// Deliveries
// ---------------------------------------------------------------------------
export const deliveries = pgTable(
  "deliveries",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id"),
    lipaAccountId: integer("lipa_account_id"),
    userId: integer("user_id").notNull(),
    status: text("status").notNull().default("pending"), // pending | preparing | ready | assigned | out_for_delivery | delivered | cancelled
    address: text("address"),
    trackingNote: text("tracking_note"),
    assignedTo: text("assigned_to"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("deliveries_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------------
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: integer("entity_id"),
    previousValue: text("previous_value"),
    newValue: text("new_value"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("audit_action_idx").on(t.action)],
);

// ---------------------------------------------------------------------------
// Business settings (key/value store — nothing hardcoded)
// ---------------------------------------------------------------------------
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
