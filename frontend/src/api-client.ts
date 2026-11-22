/** Shared JSON/multipart request helper (session cookie + CSRF header) for the newer API modules. */
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

async function readError(response: Response): Promise<Error> {
  try {
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload !== null && "error" in payload) {
      const detail = payload.error;
      if (typeof detail === "object" && detail !== null && "message" in detail && typeof detail.message === "string") {
        return new Error(detail.message);
      }
    }
  } catch {
    return new Error(`Không thể đọc phản hồi máy chủ (HTTP ${response.status}).`);
  }
  return new Error(`Yêu cầu không thành công (HTTP ${response.status}).`);
}

async function csrfToken(): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/auth/csrf`, { credentials: "include", headers: { Accept: "application/json" } });
  if (!response.ok) throw await readError(response);
  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null || !("token" in payload) || typeof payload.token !== "string") {
    throw new Error("Không nhận được mã xác thực yêu cầu.");
  }
  return payload.token;
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { credentials: "include", headers: { Accept: "application/json" }, signal });
  if (!response.ok) throw await readError(response);
  return await response.json() as T;
}

/** Sends JSON (plain objects) or multipart (FormData) with the CSRF header; resolves undefined for 204. */
export async function apiSend<T>(path: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const token = await csrfToken();
  const headers: Record<string, string> = { Accept: "application/json", "X-XSRF-TOKEN": token };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const response = await fetch(`${apiBaseUrl}${path}`, { method, credentials: "include", headers, body: payload });
  if (!response.ok) throw await readError(response);
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}
