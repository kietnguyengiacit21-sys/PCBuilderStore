import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export interface AuthUser {
  userId: string;
  fullName: string;
  email: string;
  roleCode: "ADMIN" | "SALES" | "CUSTOMER";
  customerSegment: string | null;
  accountStatus: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
const csrfHeaderName = "X-XSRF-TOKEN";

function parseAuthUser(value: unknown): AuthUser {
  if (typeof value !== "object" || value === null) {
    throw new Error("Authentication service returned an invalid user.");
  }
  const fields = value as Record<string, unknown>;
  if (
    typeof fields.userId !== "string"
    || typeof fields.fullName !== "string"
    || typeof fields.email !== "string"
    || (fields.roleCode !== "ADMIN" && fields.roleCode !== "SALES" && fields.roleCode !== "CUSTOMER")
    || (fields.customerSegment !== null && typeof fields.customerSegment !== "string")
    || typeof fields.accountStatus !== "string"
  ) {
    throw new Error("Authentication service returned an invalid user.");
  }
  return {
    userId: fields.userId,
    fullName: fields.fullName,
    email: fields.email,
    roleCode: fields.roleCode,
    customerSegment: fields.customerSegment,
    accountStatus: fields.accountStatus,
  };
}

async function responseError(response: Response): Promise<Error> {
  let message = `Authentication request failed (HTTP ${response.status}).`;
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "error" in body) {
      const error = body.error;
      if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
        message = error.message;
      }
    }
  } catch {
    message = `Authentication service returned an invalid response (HTTP ${response.status}).`;
  }
  return new Error(message);
}

async function csrfToken(): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/auth/csrf`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw await responseError(response);
  const result: unknown = await response.json();
  if (typeof result !== "object" || result === null || !("token" in result) || typeof result.token !== "string") {
    throw new Error("Authentication service returned an invalid CSRF token.");
  }
  return result.token;
}

async function currentUser(): Promise<AuthUser | null> {
  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (response.status === 401) return null;
  if (!response.ok) throw await responseError(response);
  try {
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload !== null && "authenticated" in payload
        && payload.authenticated === false) {
      return null;
    }
    if (typeof payload === "object" && payload !== null && "authenticated" in payload
        && payload.authenticated === true && "user" in payload) {
      return parseAuthUser(payload.user);
    }
    return parseAuthUser(payload);
  } catch (reason) {
    if (reason instanceof Error) throw reason;
    throw new Error("Authentication service returned an invalid response.");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const authenticatedUser = await currentUser();
      setUser(authenticatedUser);
      setError(null);
      return authenticatedUser;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not restore the login session.");
      throw reason;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    error,
    refresh,
    async login(email, password) {
      const token = await csrfToken();
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          [csrfHeaderName]: token,
        },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw await responseError(response);
      const authenticatedUser = parseAuthUser(await response.json());
      setUser(authenticatedUser);
      setError(null);
      return authenticatedUser;
    },
    async logout() {
      const token = await csrfToken();
      const response = await fetch(`${apiBaseUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", [csrfHeaderName]: token },
      });
      if (!response.ok) throw await responseError(response);
      setUser(null);
      setError(null);
    },
  }), [error, loading, refresh, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
