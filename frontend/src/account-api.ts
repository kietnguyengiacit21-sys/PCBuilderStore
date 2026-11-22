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
  /** Older accounts have none until they set one. */
  username: string | null;
  quickPinEnabled: boolean;
  quickPinUpdatedAt: string | null;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  username: string;
  password: string;
  phone?: string;
  customerSegment?: CustomerSegment;
  /** Only on the final step, after the code was emailed. */
  verificationCode?: string;
}

export interface VerificationSent {
  email: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  /** Only on local setups without SMTP (AUTH_EXPOSE_DEVELOPMENT_CODE). */
  developmentCode?: string;
}

export interface UsernameAvailability {
  available: boolean;
  message: string;
}

export const fetchProfile = (signal?: AbortSignal) => apiGet<AccountProfile>("/auth/profile", signal);

export const updateProfile = (input: { fullName: string; phone: string; customerSegment: CustomerSegment; username?: string }) =>
  apiSend<AccountProfile>("/auth/profile", "PUT", input);

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiSend<{ message: string }>("/auth/password", "POST", { currentPassword, newPassword });

/** Step 1 of sign-up: validates the form and emails a 6-digit code. */
export const sendRegistrationCode = (input: RegisterInput) =>
  apiSend<VerificationSent>("/auth/register/verification", "POST", { ...input, verificationCode: undefined });

/** Step 2 of sign-up: creates the account with the emailed code and signs the customer in (session cookie). */
export const registerAccount = (input: RegisterInput & { verificationCode: string }) =>
  apiSend<unknown>("/auth/register", "POST", input);

export const checkUsername = (username: string, signal?: AbortSignal) =>
  apiGet<UsernameAvailability>(`/auth/username-availability?username=${encodeURIComponent(username)}`, signal);

export const setQuickPin = (currentPassword: string, pin: string) =>
  apiSend<{ message: string }>("/auth/quick-pin", "PUT", { currentPassword, pin });

export const removeQuickPin = () => apiSend<{ message: string }>("/auth/quick-pin", "DELETE");

export const requestPasswordReset = (email: string) =>
  apiSend<{ message: string }>("/auth/password-reset/request", "POST", { email });

export const confirmPasswordReset = (token: string, newPassword: string) =>
  apiSend<{ message: string }>("/auth/password-reset/confirm", "POST", { token, newPassword });
