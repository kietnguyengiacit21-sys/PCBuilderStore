import { apiGet, apiSend } from "./api-client";

export interface StaffAccount {
  userId: string;
  fullName: string;
  email: string;
  roleCode: "ADMIN" | "SALES" | "CUSTOMER";
  accountStatus: string;
  updatedAt: string | null;
  phone?: string | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  mustChangePassword?: boolean;
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

async function readError(response: Response): Promise<Error> {
  try {
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload !== null && "error" in payload) {
      const detail = payload.error;
      if (typeof detail === "object" && detail !== null
          && "message" in detail && typeof detail.message === "string") {
        return new Error(detail.message);
      }
    }
  } catch {
    return new Error(`Không thể đọc phản hồi máy chủ (HTTP ${response.status}).`);
  }
  return new Error(`Yêu cầu không thành công (HTTP ${response.status}).`);
}

async function csrfToken(): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/auth/csrf`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw await readError(response);
  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null
      || !("token" in payload) || typeof payload.token !== "string") {
    throw new Error("Không nhận được mã xác thực yêu cầu.");
  }
  return payload.token;
}

export async function updateStaffAccountRole(
  userId: string,
  roleCode: "CUSTOMER" | "SALES",
): Promise<StaffAccount> {
  const token = await csrfToken();
  const response = await fetch(
    `${apiBaseUrl}/admin/accounts/${encodeURIComponent(userId)}/role`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": token,
      },
      body: JSON.stringify({ roleCode }),
    },
  );
  if (!response.ok) throw await readError(response);
  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null
      || !("userId" in payload) || typeof payload.userId !== "string"
      || !("roleCode" in payload)
      || (payload.roleCode !== "CUSTOMER" && payload.roleCode !== "SALES" && payload.roleCode !== "ADMIN")) {
    throw new Error("Thông tin tài khoản sau cập nhật không hợp lệ.");
  }
  return payload as StaffAccount;
}

export interface AccountWithPassword {
  account: StaffAccount;
  /** Shown once; the person must change it after logging in. */
  temporaryPassword: string;
}

export interface AccountEvent {
  type: "ROLE_CHANGED" | "CREATED" | "LOCKED" | "UNLOCKED" | "PASSWORD_RESET_BY_ADMIN" | "PASSWORD_RESET_BY_EMAIL";
  description: string;
  actorEmail: string | null;
  createdAt: string;
}

export const searchAccounts = (query: string, role: "" | "ADMIN" | "SALES" | "CUSTOMER") => {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (role) params.set("role", role);
  return apiGet<StaffAccount[]>(`/admin/accounts${params.size ? `?${params}` : ""}`);
};

export const createStaffAccount = (input: { fullName: string; email: string; phone: string }) =>
  apiSend<AccountWithPassword>("/admin/accounts", "POST", input);

export const setAccountStatus = (userId: string, status: "ACTIVE" | "LOCKED", note: string) =>
  apiSend<StaffAccount>(`/admin/accounts/${encodeURIComponent(userId)}/status`, "PATCH", { status, note });

export const resetAccountPassword = (userId: string) =>
  apiSend<AccountWithPassword>(`/admin/accounts/${encodeURIComponent(userId)}/password-reset`, "POST");

export const fetchAccountHistory = (userId: string) =>
  apiGet<AccountEvent[]>(`/admin/accounts/${encodeURIComponent(userId)}/history`);

// --- Operations dashboard (admin + sales) ---------------------------------------

export interface DashboardOverview {
  ordersToday: number;
  revenueToday: number;
  revenue30Days: number;
  orders30Days: number;
  averageOrderValue30Days: number;
  newCustomers30Days: number;
  pendingReviews: number;
  ordersByStatus: Record<string, number>;
  revenueByDay: { day: string; revenue: number; orders: number }[];
  topProducts: { productName: string; quantity: number; revenue: number }[];
  lowStock: { modelCode: string; productName: string; productType: string; available: number; threshold: number }[];
  recentOrders: { orderNumber: string; customerName: string; status: string; paymentStatus: string; total: number; placedAt: string }[];
}

export const fetchDashboard = (signal?: AbortSignal) => apiGet<DashboardOverview>("/admin/dashboard", signal);
