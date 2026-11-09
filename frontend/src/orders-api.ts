export type OrderStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "PROCESSING"
  | "READY_TO_SHIP"
  | "SHIPPING"
  | "DELIVERED"
  | "CANCELLATION_REQUESTED"
  | "CANCELLED";

export interface OrderSummary {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  shipmentStatus: string;
  shippingCarrier: string;
  trackingNumber: string;
  currencyCode: string | null;
  showFinancials: boolean;
  total: number;
  placedAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productName: string;
  condition: string;
  quantity: number;
  currencyCode: string;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderStatusHistory {
  previousStatus: string | null;
  newStatus: string;
  action: string;
  actorName: string;
  actorRole: string;
  note: string | null;
  createdAt: string;
}

export interface OrderDetail {
  order: OrderSummary;
  shippingAddress: string;
  shippingRegion: string | null;
  shippingPostalCode: string | null;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  items: OrderItem[];
  statusHistory: OrderStatusHistory[];
  refundRetryAvailable: boolean;
}

export interface CheckoutRequest {
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingRegion: string;
  shippingPostalCode: string;
  paymentMethod: "COD" | "SIMULATED_ONLINE";
  items: { offerId: string; quantity: number }[];
}

export interface GuestCheckoutRequest extends CheckoutRequest {
  customerEmail: string;
}

export interface GuestOrderLookupRequest {
  orderNumber: string;
  customerPhone: string;
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Order service returned an invalid response (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    const error = typeof payload === "object" && payload !== null && "error" in payload
      ? payload.error
      : null;
    const message = typeof error === "object" && error !== null && "message" in error
      && typeof error.message === "string"
      ? error.message
      : `Order request failed (HTTP ${response.status}).`;
    throw new Error(message);
  }
  return payload as T;
}

async function csrfToken(): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/auth/csrf`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Could not obtain a CSRF token (HTTP ${response.status}).`);
  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null
      || !("token" in payload) || typeof payload.token !== "string") {
    throw new Error("Authentication service returned an invalid CSRF token.");
  }
  return payload.token;
}

async function mutate<T>(path: string, method: "PATCH" | "POST", body: unknown): Promise<T> {
  const token = await csrfToken();
  return request<T>(path, {
    method,
    headers: { "X-XSRF-TOKEN": token },
    body: JSON.stringify(body),
  });
}

export function fetchAdminOrders(filters: {
  status?: OrderStatus | "";
  paymentStatus?: string;
  q?: string;
} = {}): Promise<OrderSummary[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
  if (filters.q) params.set("q", filters.q);
  const query = params.size ? `?${params.toString()}` : "";
  return request<OrderSummary[]>(`/orders/admin${query}`);
}

export function fetchAdminOrder(orderNumber: string): Promise<OrderDetail> {
  return request<OrderDetail>(`/orders/admin/${encodeURIComponent(orderNumber)}`);
}

export function updateOrderStatus(
  orderNumber: string,
  status: OrderStatus,
  note: string,
): Promise<OrderDetail> {
  return mutate(`/orders/admin/${encodeURIComponent(orderNumber)}/status`, "PATCH", { status, note });
}

export function updateOrderShipping(
  orderNumber: string,
  carrier: string,
  trackingNumber: string,
  note: string,
): Promise<OrderDetail> {
  return mutate(`/orders/admin/${encodeURIComponent(orderNumber)}/shipping`, "PATCH", {
    carrier,
    trackingNumber,
    note,
  });
}

export function decideOrderCancellation(
  orderNumber: string,
  approve: boolean,
  note: string,
): Promise<OrderDetail> {
  return mutate(
    `/orders/admin/${encodeURIComponent(orderNumber)}/cancellation-decision`,
    "PATCH",
    { approve, note },
  );
}

export function retryFailedOrderRefund(
  orderNumber: string,
  idempotencyKey: string,
  note: string,
): Promise<OrderDetail> {
  return mutateWithIdempotency(
    `/orders/admin/${encodeURIComponent(orderNumber)}/refund-retries`,
    "POST",
    { note },
    idempotencyKey,
  );
}

export function fetchCustomerOrders(): Promise<OrderSummary[]> {
  return request<OrderSummary[]>("/orders");
}

export function fetchCustomerOrder(orderNumber: string): Promise<OrderDetail> {
  return request<OrderDetail>(`/orders/${encodeURIComponent(orderNumber)}`);
}

export function requestOrderCancellation(orderNumber: string, reason: string): Promise<OrderDetail> {
  return mutate(
    `/orders/${encodeURIComponent(orderNumber)}/cancellation-requests`,
    "POST",
    { reason },
  );
}

export function processOrderPayment(orderNumber: string): Promise<OrderDetail> {
  return requestPayment(orderNumber, crypto.randomUUID());
}

export function createOrder(
  checkout: CheckoutRequest,
  idempotencyKey: string,
): Promise<OrderDetail> {
  return mutateWithIdempotency("/orders", "POST", checkout, idempotencyKey);
}

export function createGuestOrder(
  checkout: GuestCheckoutRequest,
  idempotencyKey: string,
): Promise<OrderDetail> {
  return mutateWithIdempotency("/orders/guest", "POST", checkout, idempotencyKey);
}

export function lookupGuestOrder(
  lookup: GuestOrderLookupRequest,
): Promise<OrderDetail> {
  return mutate("/orders/guest/lookup", "POST", lookup);
}

export function processGuestOrderPayment(
  orderNumber: string,
  customerPhone: string,
  idempotencyKey: string,
): Promise<OrderDetail> {
  return mutateWithIdempotency(
    `/orders/guest/${encodeURIComponent(orderNumber)}/payments`,
    "POST",
    { customerPhone },
    idempotencyKey,
  );
}

async function mutateWithIdempotency<T>(
  path: string,
  method: "POST",
  body: unknown,
  idempotencyKey: string,
): Promise<T> {
  const token = await csrfToken();
  return request<T>(path, {
    method,
    headers: {
      "X-XSRF-TOKEN": token,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });
}

function requestPayment(orderNumber: string, idempotencyKey: string): Promise<OrderDetail> {
  return paymentMutation(
    `/orders/${encodeURIComponent(orderNumber)}/payments`,
    idempotencyKey,
  );
}

async function paymentMutation(path: string, idempotencyKey: string): Promise<OrderDetail> {
  const token = await csrfToken();
  return request<OrderDetail>(path, {
    method: "POST",
    headers: {
      "X-XSRF-TOKEN": token,
      "Idempotency-Key": idempotencyKey,
    },
  });
}
