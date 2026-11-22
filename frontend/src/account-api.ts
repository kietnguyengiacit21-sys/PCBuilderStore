import { apiGet, apiSend } from "./api-client";

export type CustomerSegment = "IT" | "NON_IT" | "UNSPECIFIED";

export interface AccountProfile {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  roleCode: "ADMIN" | "SALES" | "CUSTOMER";
  customerSegment: CustomerSegment;
  accountStatus: string;
  createdAt: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  customerSegment?: CustomerSegment;
}

export const fetchProfile = (signal?: AbortSignal) => apiGet<AccountProfile>("/auth/profile", signal);

export const updateProfile = (input: { fullName: string; phone: string; customerSegment: CustomerSegment }) =>
  apiSend<AccountProfile>("/auth/profile", "PUT", input);

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiSend<{ message: string }>("/auth/password", "POST", { currentPassword, newPassword });

/** Registration also signs the new customer in (session cookie). */
export const registerAccount = (input: RegisterInput) => apiSend<unknown>("/auth/register", "POST", input);

export const requestPasswordReset = (email: string) =>
  apiSend<{ message: string }>("/auth/password-reset/request", "POST", { email });

export const confirmPasswordReset = (token: string, newPassword: string) =>
  apiSend<{ message: string }>("/auth/password-reset/confirm", "POST", { token, newPassword });
