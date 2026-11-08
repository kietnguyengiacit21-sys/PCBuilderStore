export interface StaffAccount {
  userId: string;
  fullName: string;
  email: string;
  roleCode: "ADMIN" | "SALES" | "CUSTOMER";
  accountStatus: string;
  updatedAt: string | null;
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

export async function fetchStaffAccounts(search: string): Promise<StaffAccount[]> {
  const query = search.trim();
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  const response = await fetch(`${apiBaseUrl}/admin/accounts${params.size ? `?${params}` : ""}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw await readError(response);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error("Danh sách tài khoản không hợp lệ.");
  return payload as StaffAccount[];
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
