/**
 * Helpers for the customer quick login (username + 8-digit PIN) and the sign-up form.
 * The rules mirror the server (AccountService.username, QuickPinService.validPin) so the form can
 * answer instantly; the server still decides.
 */

export const PIN_LENGTH = 8;
export const SIGNUP_CODE_LENGTH = 6;

const REMEMBERED_USERNAME_KEY = "pcbs.quickLoginUsername";

/** Lowercase, without spaces or a leading "@". */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, "");
}

/** Null when the username follows the rules, otherwise the reason (Vietnamese). */
export function usernameProblem(value: string): string | null {
  const username = normalizeUsername(value);
  if (!username) return "Vui lòng nhập tên đăng nhập.";
  if (username.length < 3 || username.length > 30) return "Tên đăng nhập cần từ 3 đến 30 ký tự.";
  if (!/^[a-z0-9._]+$/.test(username)) return "Chỉ dùng chữ thường không dấu, số, dấu chấm hoặc gạch dưới.";
  if (!/^[a-z0-9].*[a-z0-9]$/.test(username)) return "Tên đăng nhập phải bắt đầu và kết thúc bằng chữ hoặc số.";
  if (/[._]{2}/.test(username)) return "Không dùng hai dấu chấm/gạch dưới liền nhau.";
  if (!/[a-z]/.test(username)) return "Tên đăng nhập cần có ít nhất một chữ cái.";
  return null;
}

/** Same patterns the server refuses: 12345678, 87654321, 11111111, 12121212, 12341234. */
export function isObviousPin(pin: string): boolean {
  if (!/^\d+$/.test(pin) || pin.length < 2) return false;
  let ascending = true;
  let descending = true;
  for (let index = 1; index < pin.length; index++) {
    const step = pin.charCodeAt(index) - pin.charCodeAt(index - 1);
    if (step !== 1) ascending = false;
    if (step !== -1) descending = false;
  }
  if (ascending || descending) return true;
  return [1, 2, 4].some((block) => pin.length % block === 0 && pin === pin.slice(0, block).repeat(pin.length / block));
}

/** Null when the PIN can be used, otherwise the reason (Vietnamese). */
export function pinProblem(pin: string): string | null {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) return `Mã PIN cần đúng ${PIN_LENGTH} chữ số.`;
  if (isObviousPin(pin)) return "Mã PIN quá dễ đoán (số lặp lại hoặc dãy liên tiếp). Hãy chọn mã khác.";
  return null;
}

/** The username this browser offers on the quick-login tab (never the PIN). */
export function rememberedUsername(): string {
  try {
    return window.localStorage.getItem(REMEMBERED_USERNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberUsername(username: string): void {
  try {
    window.localStorage.setItem(REMEMBERED_USERNAME_KEY, normalizeUsername(username));
  } catch {
    // Private mode or blocked storage: the customer just types the name next time.
  }
}

export function forgetUsername(): void {
  try {
    window.localStorage.removeItem(REMEMBERED_USERNAME_KEY);
  } catch {
    // Nothing stored.
  }
}
