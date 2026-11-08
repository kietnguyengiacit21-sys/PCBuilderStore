import type { CatalogOffer, CatalogProduct } from "../catalog-api";

export const demoLabel = "DỮ LIỆU DEMO — CHƯA ĐƯỢC LƯU VÀO DATABASE";
const cartKey = "pcbs.v2.demo.cart.v1";
const orderKey = "pcbs.v2.demo.orders.v1";
const customerKey = "pcbs.v2.demo.customers.v1";

export interface DemoCartItem {
  modelCode: string;
  productName: string;
  price: string;
  currency: string;
  quantity: number;
  offerId?: string;
  condition?: string;
  availableQuantity?: number;
  warrantyMonths?: number | null;
  productType?: string;
  specifications?: Record<string, unknown>;
}

export interface DemoOrder {
  orderCode: string;
  createdAt: string;
  customerName: string;
  phone: string;
  address: string;
  paymentMethod: string;
  paymentStatus: "SIMULATED" | "FAILED";
  status: "DEMO_RECEIVED" | "DEMO_PROCESSING";
  items: DemoCartItem[];
  total: string;
}

export interface DemoCustomer {
  fullName: string;
  phone: string;
  email: string;
  segment: "IT" | "NON_IT";
}

function readList<T>(key: string): T[] {
  const stored = localStorage.getItem(key);
  if (stored === null) return [];
  let data: unknown;
  try {
    data = JSON.parse(stored);
  } catch (reason) {
    throw new Error(`Local demo data for "${key}" is not valid JSON.`, { cause: reason });
  }
  if (!Array.isArray(data)) throw new Error(`Local demo data for "${key}" must be a list.`);
  return data as T[];
}

function writeList<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getCart(): DemoCartItem[] {
  return readList<DemoCartItem>(cartKey);
}

export function saveCart(items: DemoCartItem[]): void {
  writeList(cartKey, items.filter((item) => item.quantity > 0));
}

export function addProductToCart(
  product: CatalogProduct,
  offer: CatalogOffer = product.offers[0],
  quantity = 1,
): void {
  if (!offer || !/^[0-9]{1,20}$/.test(offer.offerId)) {
    throw new Error("This product has no valid active offer to add to the cart.");
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error("Cart quantity must be a positive whole number.");
  }
  const cart = getCart();
  const existing = cart.find((item) => item.modelCode === product.modelCode && item.offerId === offer.offerId);
  const totalQuantity = (existing?.quantity ?? 0) + quantity;
  if (!Number.isSafeInteger(offer.availableQuantity) || offer.availableQuantity < totalQuantity) {
    throw new Error("There is not enough available stock for this offer.");
  }
  if (!Number.isFinite(Number(offer.price)) || Number(offer.price) < 0
      || !/^[A-Z]{3}$/.test(offer.currency)) {
    throw new Error("This offer has invalid stored price or currency information.");
  }
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      modelCode: product.modelCode,
      productName: product.productName,
      price: String(offer.price),
      currency: offer.currency,
      quantity,
      offerId: offer.offerId,
      condition: offer.condition,
      availableQuantity: offer.availableQuantity,
      warrantyMonths: offer.warrantyMonths,
      productType: product.productType,
      specifications: { ...product.specifications },
    });
  }
  saveCart(cart);
}

export function getOrders(): DemoOrder[] {
  return readList<DemoOrder>(orderKey);
}

export function saveOrders(orders: DemoOrder[]): void {
  writeList(orderKey, orders);
}

export function saveOrder(order: DemoOrder): void {
  saveOrders([order, ...getOrders()]);
}

export function getOrder(orderCode: string | null): DemoOrder | undefined {
  if (!orderCode) return undefined;
  return getOrders().find((order) => order.orderCode === orderCode);
}

const sampleCustomers: DemoCustomer[] = [
  { fullName: "Nguyễn Văn An", phone: "0900000001", email: "customer@pcbuilder.test", segment: "IT" },
  { fullName: "Trần Minh Hà", phone: "0900000002", email: "sample.customer2@pcbuilder.test", segment: "NON_IT" },
];

export function getDemoCustomers(): DemoCustomer[] {
  if (localStorage.getItem(customerKey) === null) writeList(customerKey, sampleCustomers);
  return readList<DemoCustomer>(customerKey);
}

export function resetDemoData(): void {
  localStorage.removeItem(cartKey);
  localStorage.removeItem(orderKey);
  localStorage.removeItem(customerKey);
}

export function orderTotal(items: DemoCartItem[]): number {
  return items.reduce((total, item) => total + Number(item.price) * item.quantity, 0);
}

export function money(value: number | string, currency = "VND"): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
