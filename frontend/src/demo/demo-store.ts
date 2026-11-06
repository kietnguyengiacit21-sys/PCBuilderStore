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
  offerCode?: string;
  condition?: string;
  availableQuantity?: number;
  warrantyMonths?: number | null;
  isDemo?: boolean;
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

export function addProductToCart(product: CatalogProduct, offer: CatalogOffer = product.offers[0]): void {
  if (!offer) throw new Error("This product has no active offer to add to the demo cart.");
  const cart = getCart();
  const existing = cart.find((item) => item.modelCode === product.modelCode && item.offerCode === offer.offerCode);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      modelCode: product.modelCode,
      productName: product.productName,
      price: String(offer.price),
      currency: offer.currency,
      quantity: 1,
      offerCode: offer.offerCode,
      condition: offer.condition,
      availableQuantity: offer.availableQuantity,
      warrantyMonths: offer.warrantyMonths,
      isDemo: offer.isDemo,
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
