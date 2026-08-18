import { db } from "@/db";
import {
  categories,
  products,
  variations,
  productImages,
  variationImages,
  paymentPlans,
  orders,
  orderItems,
  lipaAccounts,
  payments,
  deliveries,
  notifications,
  auditLogs,
  users,
  addresses,
  productSwitchRequests,
  refundRequests,
  inventoryLog,
  lipaStatusHistory,
} from "@/db/schema";
import {
  and,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  lte,
  or,
  sql,
  sum,
} from "drizzle-orm";

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function getTopCategories() {
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.active, true), sql`${categories.parentId} IS NULL`))
    .orderBy(categories.sortOrder, categories.name);
  return rows;
}

export async function getSubcategories(parentId?: number) {
  const rows = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.active, true),
        parentId ? eq(categories.parentId, parentId) : sql`${categories.parentId} IS NOT NULL`,
      ),
    )
    .orderBy(categories.sortOrder, categories.name);
  return rows;
}

export async function getAllCategories() {
  return db.select().from(categories).orderBy(categories.sortOrder, categories.name);
}

export async function getCategoryBySlug(slug: string) {
  const rows = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Products (enriched with variation pricing/stock)
// ---------------------------------------------------------------------------
export interface ProductCard {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  categoryId: number;
  categoryName: string;
  subcategoryId: number | null;
  description: string | null;
  coverImage: string | null;
  cashAvailable: boolean;
  lipaAvailable: boolean;
  minPrice: number;
  maxPrice: number;
  availableStock: number;
  soldStock: number;
  createdAt: Date;
}

export interface ListOptions {
  q?: string;
  categoryId?: number;
  lipaOnly?: boolean;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "popular";
}

export async function listProducts(opts: ListOptions = {}): Promise<ProductCard[]> {
  const conds = [eq(products.status, "active")];

  if (opts.q) {
    conds.push(
      or(ilike(products.name, `%${opts.q}%`), ilike(products.description, `%${opts.q}%`))!,
    );
  }
  if (opts.categoryId) {
    conds.push(
      or(eq(products.categoryId, opts.categoryId), eq(products.subcategoryId, opts.categoryId))!,
    );
  }
  if (opts.lipaOnly) conds.push(eq(products.lipaAvailable, true));

  const rows = await db
    .select()
    .from(products)
    .where(and(...conds))
    .orderBy(desc(products.createdAt))
    .limit(400);

  const ids = rows.map((r) => r.id);
  const catIds = Array.from(
    new Set(rows.map((r) => r.categoryId).filter(Boolean) as number[]),
  );

  const [varRows, catRows] = await Promise.all([
    ids.length ? db.select().from(variations).where(inArray(variations.productId, ids)) : [],
    catIds.length ? db.select().from(categories).where(inArray(categories.id, catIds)) : [],
  ]);

  const catName = new Map(catRows.map((c) => [c.id, c.name]));
  const byProduct = new Map<number, typeof varRows>();
  for (const v of varRows) {
    const list = byProduct.get(v.productId) ?? [];
    list.push(v);
    byProduct.set(v.productId, list);
  }

  let result: ProductCard[] = rows.map((p) => {
    const vs = (byProduct.get(p.id) ?? []).filter((v) => v.active);
    const prices = vs.map((v) => v.price);
    const availableStock = vs.reduce((a, v) => a + Math.max(0, v.availableStock), 0);
    const soldStock = vs.reduce((a, v) => a + v.soldStock, 0);
    const anyLipa = p.lipaAvailable || vs.some((v) => v.lipaAvailable);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      categoryId: p.categoryId,
      categoryName: catName.get(p.categoryId) ?? "",
      subcategoryId: p.subcategoryId,
      description: p.description,
      coverImage: p.coverImage,
      cashAvailable: p.cashAvailable,
      lipaAvailable: anyLipa,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      availableStock,
      soldStock,
      createdAt: p.createdAt,
    };
  });

  if (opts.inStock) result = result.filter((p) => p.availableStock > 0);
  if (opts.minPrice !== undefined) result = result.filter((p) => p.maxPrice >= opts.minPrice!);
  if (opts.maxPrice !== undefined) result = result.filter((p) => p.minPrice <= opts.maxPrice!);

  switch (opts.sort) {
    case "price_asc":
      result.sort((a, b) => a.minPrice - b.minPrice);
      break;
    case "price_desc":
      result.sort((a, b) => b.maxPrice - a.maxPrice);
      break;
    case "popular":
      result.sort((a, b) => b.soldStock - a.soldStock);
      break;
    default:
      result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  return result;
}

// ---------------------------------------------------------------------------
// Product detail
// ---------------------------------------------------------------------------
export interface VariationDetail {
  id: number;
  name: string;
  sku: string | null;
  price: number;
  totalStock: number;
  availableStock: number;
  reservedStock: number;
  soldStock: number;
  cashAvailable: boolean;
  lipaAvailable: boolean;
  active: boolean;
  plans: Array<{
    id: number;
    name: string;
    frequency: string;
    installmentAmount: number;
    initialPayment: number;
  }>;
}

export interface ProductDetail {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  subcategoryId: number | null;
  subcategoryName: string | null;
  description: string | null;
  coverImage: string | null;
  images: string[];
  cashAvailable: boolean;
  lipaAvailable: boolean;
  status: string;
  variations: VariationDetail[];
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const rows = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  const product = rows[0];
  if (!product) return null;

  const [varRows, imgRows, cat] = await Promise.all([
    db.select().from(variations).where(eq(variations.productId, product.id)),
    db.select().from(productImages).where(eq(productImages.productId, product.id)),
    db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1),
  ]);
  const subcat = product.subcategoryId
    ? (await db.select().from(categories).where(eq(categories.id, product.subcategoryId)).limit(1))[0]
    : null;

  const activeVariations = varRows.filter((v) => v.active);
  const varIds = activeVariations.map((v) => v.id);
  const planRows = varIds.length
    ? await db.select().from(paymentPlans).where(inArray(paymentPlans.variationId, varIds))
    : [];
  const vImages = varIds.length
    ? await db.select().from(variationImages).where(inArray(variationImages.variationId, varIds))
    : [];

  const plansByVar = new Map<number, VariationDetail["plans"]>();
  for (const p of planRows) {
    if (!p.active) continue;
    const list = plansByVar.get(p.variationId) ?? [];
    list.push({
      id: p.id,
      name: p.name,
      frequency: p.frequency,
      installmentAmount: p.installmentAmount,
      initialPayment: p.initialPayment || p.installmentAmount,
    });
    plansByVar.set(p.variationId, list);
  }

  const variationsOut: VariationDetail[] = activeVariations.map((v) => ({
    id: v.id,
    name: v.name,
    sku: v.sku,
    price: v.price,
    totalStock: v.totalStock,
    availableStock: v.availableStock,
    reservedStock: v.reservedStock,
    soldStock: v.soldStock,
    cashAvailable: v.cashAvailable,
    lipaAvailable: v.lipaAvailable,
    active: v.active,
    plans: (plansByVar.get(v.id) ?? []).sort((a, b) => a.installmentAmount - b.installmentAmount),
  }));

  const images = [...imgRows]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((i) => i.url);
  if (!images.length && product.coverImage) images.push(product.coverImage);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    categoryId: product.categoryId,
    categoryName: cat[0]?.name ?? "",
    categorySlug: cat[0]?.slug ?? "",
    subcategoryId: product.subcategoryId,
    subcategoryName: subcat?.name ?? null,
    description: product.description,
    coverImage: product.coverImage,
    images,
    cashAvailable: product.cashAvailable,
    lipaAvailable: product.lipaAvailable,
    status: product.status,
    variations: variationsOut,
  };
}

export async function getFeaturedProducts(limit = 8): Promise<ProductCard[]> {
  return listProducts({ sort: "popular", inStock: true }).then((r) => r.slice(0, limit));
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export async function getOrderById(orderId: number) {
  const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const delivery = (await db.select().from(deliveries).where(eq(deliveries.orderId, orderId)).limit(1))[0] ?? null;
  const orderPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(desc(payments.createdAt));
  return { ...order, items, delivery, payments: orderPayments };
}

export async function getOrdersByUser(userId: number) {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
  const items = rows.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map((r) => r.id)))
    : [];
  const byOrder = new Map<number, typeof items>();
  for (const it of items) {
    const list = byOrder.get(it.orderId) ?? [];
    list.push(it);
    byOrder.set(it.orderId, list);
  }
  return rows.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] }));
}

export async function getAllOrders() {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(500);
  const uids = Array.from(new Set(rows.map((r) => r.userId)));
  const usrRows = uids.length ? await db.select().from(users).where(inArray(users.id, uids)) : [];
  const nameBy = new Map(usrRows.map((u) => [u.id, u.fullName]));
  return rows.map((o) => ({ ...o, customerName: nameBy.get(o.userId) ?? "—" }));
}

// ---------------------------------------------------------------------------
// Lipa Polepole
// ---------------------------------------------------------------------------
export async function getLipaAccount(accountId: number) {
  const rows = await db.select().from(lipaAccounts).where(eq(lipaAccounts.id, accountId)).limit(1);
  const account = rows[0];
  if (!account) return null;
  const [variation, plan, user, history, accountPayments] = await Promise.all([
    db.select().from(variations).where(eq(variations.id, account.variationId)).limit(1),
    db.select().from(paymentPlans).where(eq(paymentPlans.id, account.planId)).limit(1),
    db.select().from(users).where(eq(users.id, account.userId)).limit(1),
    db.select().from(lipaStatusHistory).where(eq(lipaStatusHistory.lipaAccountId, accountId)).orderBy(desc(lipaStatusHistory.createdAt)),
    db.select().from(payments).where(eq(payments.lipaAccountId, accountId)).orderBy(desc(payments.createdAt)),
  ]);
  const product = variation[0]
    ? (await db.select().from(products).where(eq(products.id, variation[0].productId)).limit(1))[0]
    : null;
  return {
    ...account,
    variation: variation[0] ?? null,
    plan: plan[0] ?? null,
    product: product ?? null,
    customerName: user[0]?.fullName ?? "—",
    customerEmail: user[0]?.email ?? "—",
    customerPhone: user[0]?.phone ?? "—",
    history,
    payments: accountPayments,
  };
}

export async function getLipaAccountsByUser(userId: number) {
  const rows = await db
    .select()
    .from(lipaAccounts)
    .where(eq(lipaAccounts.userId, userId))
    .orderBy(desc(lipaAccounts.createdAt));
  const varIds = Array.from(new Set(rows.map((r) => r.variationId)));
  const varRows = varIds.length ? await db.select().from(variations).where(inArray(variations.id, varIds)) : [];
  const prodIds = Array.from(new Set(varRows.map((v) => v.productId)));
  const prodRows = prodIds.length ? await db.select().from(products).where(inArray(products.id, prodIds)) : [];
  const prodName = new Map(prodRows.map((p) => [p.id, p.name]));
  const varName = new Map(varRows.map((v) => [v.id, v.name]));
  return rows.map((a) => ({
    ...a,
    productName: prodName.get(varRows.find((v) => v.id === a.variationId)?.productId ?? 0) ?? "Product",
    variationName: varName.get(a.variationId) ?? "—",
  }));
}

export async function getAllLipaAccounts() {
  const rows = await db.select().from(lipaAccounts).orderBy(desc(lipaAccounts.createdAt)).limit(500);
  const [varIds, uids] = [
    Array.from(new Set(rows.map((r) => r.variationId))),
    Array.from(new Set(rows.map((r) => r.userId))),
  ];
  const [varRows, usrRows] = await Promise.all([
    varIds.length ? db.select().from(variations).where(inArray(variations.id, varIds)) : [],
    uids.length ? db.select().from(users).where(inArray(users.id, uids)) : [],
  ]);
  const prodIds = Array.from(new Set(varRows.map((v) => v.productId)));
  const prodRows = prodIds.length ? await db.select().from(products).where(inArray(products.id, prodIds)) : [];
  const prodName = new Map(prodRows.map((p) => [p.id, p.name]));
  const varName = new Map(varRows.map((v) => [v.id, v.name]));
  const userName = new Map(usrRows.map((u) => [u.id, u.fullName]));
  return rows.map((a) => ({
    ...a,
    productName: prodName.get(varRows.find((v) => v.id === a.variationId)?.productId ?? 0) ?? "Product",
    variationName: varName.get(a.variationId) ?? "—",
    customerName: userName.get(a.userId) ?? "—",
  }));
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
export async function getPaymentsByUser(userId: number) {
  return db
    .select()
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt));
}

export async function getAllPayments(limit = 500) {
  const rows = await db.select().from(payments).orderBy(desc(payments.createdAt)).limit(limit);
  const uids = Array.from(new Set(rows.map((r) => r.userId)));
  const usrRows = uids.length ? await db.select().from(users).where(inArray(users.id, uids)) : [];
  const nameBy = new Map(usrRows.map((u) => [u.id, u.fullName]));
  return rows.map((p) => ({ ...p, customerName: nameBy.get(p.userId) ?? "—" }));
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export async function getNotifications(userId: number) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(100);
}

export async function unreadCount(userId: number) {
  const rows = await db
    .select({ c: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return rows[0]?.c ?? 0;
}

// ---------------------------------------------------------------------------
// Customers & addresses
// ---------------------------------------------------------------------------
export async function getCustomers() {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.role, "customer"))
    .orderBy(desc(users.createdAt));
  return rows;
}

export async function getCustomerById(id: number) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getAddresses(userId: number) {
  return db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), addresses.id);
}

// ---------------------------------------------------------------------------
// Admin stats
// ---------------------------------------------------------------------------
export async function getAdminStats() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [salesRow, todayRow, ordersRow, pendingOrdersRow, activeLipaRow, lipaCollectionsRow, outstandingRow, completedRow, deliveriesRow, lowStockRow, customersRow, txRow] =
    await Promise.all([
      db.select({ v: sum(payments.amount) }).from(payments).where(eq(payments.status, "successful")),
      db.select({ v: sum(payments.amount) }).from(payments).where(and(eq(payments.status, "successful"), gt(payments.createdAt, startOfDay))),
      db.select({ v: count() }).from(orders),
      db.select({ v: count() }).from(orders).where(inArray(orders.status, ["pending", "confirmed", "preparing"])),
      db.select({ v: count() }).from(lipaAccounts).where(inArray(lipaAccounts.status, ["active", "payment_due", "overdue", "pending"])),
      db.select({ v: sum(payments.amount) }).from(payments).where(and(eq(payments.status, "successful"), sql`${payments.lipaAccountId} IS NOT NULL`)),
      db.select({ v: sum(lipaAccounts.remainingAmount) }).from(lipaAccounts).where(inArray(lipaAccounts.status, ["active", "payment_due", "overdue"])),
      db.select({ v: count() }).from(lipaAccounts).where(inArray(lipaAccounts.status, ["completed", "ready_for_collection", "ready_for_delivery", "delivered"])),
      db.select({ v: count() }).from(deliveries).where(inArray(deliveries.status, ["pending", "preparing", "ready", "assigned", "out_for_delivery"])),
      db.select({ v: count() }).from(variations).where(and(eq(variations.active, true), lte(variations.availableStock, 5))),
      db.select({ v: count() }).from(users).where(eq(users.role, "customer")),
      db.select().from(payments).orderBy(desc(payments.createdAt)).limit(8),
    ]);

  return {
    totalSales: Number(salesRow[0]?.v ?? 0),
    todaySales: Number(todayRow[0]?.v ?? 0),
    totalOrders: Number(ordersRow[0]?.v ?? 0),
    pendingOrders: Number(pendingOrdersRow[0]?.v ?? 0),
    activeLipaPlans: Number(activeLipaRow[0]?.v ?? 0),
    totalLipaCollections: Number(lipaCollectionsRow[0]?.v ?? 0),
    outstandingLipaBalances: Number(outstandingRow[0]?.v ?? 0),
    completedPlans: Number(completedRow[0]?.v ?? 0),
    pendingDeliveries: Number(deliveriesRow[0]?.v ?? 0),
    lowStockProducts: Number(lowStockRow[0]?.v ?? 0),
    customers: Number(customersRow[0]?.v ?? 0),
    recentTransactions: txRow,
  };
}

// ---------------------------------------------------------------------------
// Inventory (admin)
// ---------------------------------------------------------------------------
export async function getInventory() {
  const rows = await db.select().from(variations).orderBy(desc(variations.updatedAt)).limit(500);
  const prodIds = Array.from(new Set(rows.map((r) => r.productId)));
  const prodRows = prodIds.length ? await db.select().from(products).where(inArray(products.id, prodIds)) : [];
  const prodName = new Map(prodRows.map((p) => [p.id, p.name]));
  return rows.map((v) => ({ ...v, productName: prodName.get(v.productId) ?? "—" }));
}

export async function getInventoryLog(limit = 200) {
  return db.select().from(inventoryLog).orderBy(desc(inventoryLog.createdAt)).limit(limit);
}

// ---------------------------------------------------------------------------
// Requests & audit
// ---------------------------------------------------------------------------
export async function getSwitchRequests() {
  const rows = await db.select().from(productSwitchRequests).orderBy(desc(productSwitchRequests.createdAt)).limit(500);
  const [lipaIds, userIds, varIds] = [
    Array.from(new Set(rows.map((r) => r.lipaAccountId))),
    Array.from(new Set(rows.map((r) => r.userId))),
    Array.from(new Set([...rows.map((r) => r.fromVariationId), ...rows.map((r) => r.toVariationId)])),
  ];
  const [lipaRows, usrRows, varRows] = await Promise.all([
    lipaIds.length ? db.select().from(lipaAccounts).where(inArray(lipaAccounts.id, lipaIds)) : [],
    userIds.length ? db.select().from(users).where(inArray(users.id, userIds)) : [],
    varIds.length ? db.select().from(variations).where(inArray(variations.id, varIds)) : [],
  ]);
  const lipaNo = new Map(lipaRows.map((l) => [l.id, l.accountNumber]));
  const userName = new Map(usrRows.map((u) => [u.id, u.fullName]));
  const varName = new Map(varRows.map((v) => [v.id, v.name]));
  return rows.map((r) => ({
    ...r,
    accountNumber: lipaNo.get(r.lipaAccountId) ?? "—",
    customerName: userName.get(r.userId) ?? "—",
    fromName: varName.get(r.fromVariationId) ?? "—",
    toName: varName.get(r.toVariationId) ?? "—",
  }));
}

export async function getRefundRequests() {
  const rows = await db.select().from(refundRequests).orderBy(desc(refundRequests.createdAt)).limit(500);
  const uids = Array.from(new Set(rows.map((r) => r.userId)));
  const usrRows = uids.length ? await db.select().from(users).where(inArray(users.id, uids)) : [];
  const nameBy = new Map(usrRows.map((u) => [u.id, u.fullName]));
  return rows.map((r) => ({ ...r, customerName: nameBy.get(r.userId) ?? "—" }));
}

export async function getAuditLogs(limit = 300) {
  const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  const uids = Array.from(new Set(rows.map((r) => r.userId).filter(Boolean) as number[]));
  const usrRows = uids.length ? await db.select().from(users).where(inArray(users.id, uids)) : [];
  const nameBy = new Map(usrRows.map((u) => [u.id, u.fullName]));
  return rows.map((r) => ({ ...r, userName: r.userId ? nameBy.get(r.userId) ?? "System" : "System" }));
}

export async function getDeliveries() {
  const rows = await db.select().from(deliveries).orderBy(desc(deliveries.createdAt)).limit(500);
  const uids = Array.from(new Set(rows.map((r) => r.userId)));
  const usrRows = uids.length ? await db.select().from(users).where(inArray(users.id, uids)) : [];
  const nameBy = new Map(usrRows.map((u) => [u.id, u.fullName]));
  return rows.map((d) => ({ ...d, customerName: nameBy.get(d.userId) ?? "—" }));
}

export async function getAdminProducts() {
  const rows = await db.select().from(products).orderBy(desc(products.createdAt)).limit(500);
  const prodIds = rows.map((r) => r.id);
  const catIds = Array.from(new Set(rows.map((r) => r.categoryId)));
  const [varRows, catRows] = await Promise.all([
    prodIds.length ? db.select().from(variations).where(inArray(variations.productId, prodIds)) : [],
    catIds.length ? db.select().from(categories).where(inArray(categories.id, catIds)) : [],
  ]);
  const catName = new Map(catRows.map((c) => [c.id, c.name] as const));
  const byProd = new Map<number, typeof varRows>();
  for (const v of varRows) {
    const list = byProd.get(v.productId) ?? [];
    list.push(v);
    byProd.set(v.productId, list);
  }
  return rows.map((p) => {
    const vs = byProd.get(p.id) ?? [];
    return {
      ...p,
      categoryName: catName.get(p.categoryId) ?? "—",
      variationCount: vs.length,
      totalStock: vs.reduce((a, v) => a + v.totalStock, 0),
      availableStock: vs.reduce((a, v) => a + v.availableStock, 0),
      reservedStock: vs.reduce((a, v) => a + v.reservedStock, 0),
      soldStock: vs.reduce((a, v) => a + v.soldStock, 0),
      hasLipa: vs.some((v) => v.lipaAvailable) || p.lipaAvailable,
    };
  });
}

export async function getProductForAdmin(id: number) {
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  const product = rows[0];
  if (!product) return null;
  const varRows = await db.select().from(variations).where(eq(variations.productId, id));
  const planRows = varRows.length
    ? await db
        .select()
        .from(paymentPlans)
        .where(inArray(paymentPlans.variationId, varRows.map((v) => v.id)))
    : [];
  const plansByVariation: Record<number, typeof planRows> = {};
  for (const p of planRows) {
    (plansByVariation[p.variationId] ??= []).push(p);
  }
  return { product, variations: varRows, plansByVariation };
}

export async function getSwitchableVariations() {
  const rows = await db
    .select()
    .from(variations)
    .where(and(eq(variations.active, true), eq(variations.lipaAvailable, true)))
    .orderBy(desc(variations.updatedAt))
    .limit(300);
  const prodIds = Array.from(new Set(rows.map((r) => r.productId)));
  const prodRows = prodIds.length ? await db.select().from(products).where(inArray(products.id, prodIds)) : [];
  const prodName = new Map(prodRows.map((p) => [p.id, p.name] as const));
  return rows
    .filter((v) => v.availableStock > 0)
    .map((v) => ({ id: v.id, name: v.name, price: v.price, productName: prodName.get(v.productId) ?? "Product" }));
}

export async function getDeliveriesByUser(userId: number) {
  return db
    .select()
    .from(deliveries)
    .where(eq(deliveries.userId, userId))
    .orderBy(desc(deliveries.createdAt));
}
