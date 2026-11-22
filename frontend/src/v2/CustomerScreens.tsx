import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { FormEvent, ReactNode } from "react";
import { useAuth } from "./auth";
import {
  changePassword,
  checkUsername,
  confirmPasswordReset,
  fetchProfile,
  registerAccount,
  removeQuickPin,
  requestPasswordReset,
  sendRegistrationCode,
  setQuickPin,
  updateProfile,
} from "../account-api";
import type { AccountProfile, RegisterInput, VerificationSent } from "../account-api";
import { CodeInput } from "./CodeInput";
import {
  PIN_LENGTH,
  SIGNUP_CODE_LENGTH,
  forgetUsername,
  normalizeUsername,
  pinProblem,
  rememberUsername,
  rememberedUsername,
  usernameProblem,
} from "./quick-login";
import { fetchMyBuilds } from "../builds-api";
import type { SavedBuildSummary } from "../builds-api";
import { money } from "../money";
import {
  fetchProductUpgrades,
} from "../catalog-api";
import type { PublicUpgradeConfiguration } from "../catalog-api";
import {
  clearCart,
  fetchCart,
  removeCartItem,
  updateCartItem,
  updateCartItemGifts,
} from "../cart-api";
import type { CartItem, CartResponse, GiftSelection } from "../cart-api";
import { verifiedCartSubtotal } from "../cart-pricing";
import {
  createGuestOrder,
  createOrder,
  fetchCustomerOrder,
  fetchCustomerOrders,
  lookupGuestOrder,
  processGuestOrderPayment,
  processOrderPayment,
  requestOrderCancellation,
} from "../orders-api";
import type {
  CheckoutRequest,
  GuestCheckoutRequest,
  OrderDetail,
  OrderStatus,
  OrderSummary,
} from "../orders-api";
import {
  Badge,
  Card,
  ConfirmationModal,
  EmptyState,
  ErrorState,
  FormField,
  IconButton,
  LoadingState,
  MinusIcon,
  PlusIcon,
  PrimaryButton,
  SecondaryButton,
} from "./components";
import { ProductArtwork } from "./storefront-components";
import { OrderPaymentInstructions, usePaymentOptions } from "./PaymentComponents";
import {
  historyActionText,
  label,
  orderStatusText,
  orderTone,
  paymentMethodText,
  paymentStatusText,
  paymentTone,
} from "../order-labels";

function redirectForRole(role: string): string {
  if (role === "ADMIN" || role === "SALES") return "/admin/dashboard";
  if (role === "CUSTOMER") return "/customer/home";
  return "/login";
}

export function RoleGate({ audience, children }: { audience: "customer" | "staff" | "admin"; children: ReactNode }) {
  const { user, loading, error } = useAuth();
  if (loading) return <div className="v2-page"><LoadingState message="Đang khôi phục phiên đăng nhập…" /></div>;
  if (error) return <div className="v2-page"><ErrorState title="Không thể kiểm tra phiên đăng nhập" message={error} /></div>;
  const valid = audience === "staff"
    ? user?.roleCode === "ADMIN" || user?.roleCode === "SALES"
    : audience === "admin" ? user?.roleCode === "ADMIN" : user?.roleCode === "CUSTOMER";
  if (!valid) {
    const back = `${window.location.pathname}${window.location.search}`;
    return <Navigate to={user ? redirectForRole(user.roleCode) : `/login?redirect=${encodeURIComponent(back)}`} replace />;
  }
  return <>{children}</>;
}

/** Only same-site paths, and only ones the role can open (customers never land on /admin). */
function safeRedirect(value: string | null, role: string): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  const staff = role === "ADMIN" || role === "SALES";
  if (staff !== value.startsWith("/admin")) return undefined;
  return value;
}

/** Where a user with an admin-issued temporary password goes to choose their own. */
export function passwordChangePath(role: string): string {
  return role === "CUSTOMER" ? "/customer/account?changePassword=1" : "/admin/profile?changePassword=1";
}

function PasswordInput({ id, value, onChange, autoComplete, minLength }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return <span className="v2-password-field">
    <input className="v2-form-input" id={id} type={visible ? "text" : "password"} autoComplete={autoComplete} required
      minLength={minLength} value={value} onChange={(event) => onChange(event.target.value)} />
    <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      aria-pressed={visible}>{visible ? "Ẩn" : "Hiện"}</button>
  </span>;
}

type LoginMode = "password" | "pin";

export function LoginPage() {
  const { user, loading, login, loginWithPin } = useAuth();
  const [params] = useSearchParams();
  const [remembered, setRemembered] = useState(() => rememberedUsername());
  const [mode, setMode] = useState<LoginMode>(() => (rememberedUsername() ? "pin" : "password"));
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const pinRef = useRef<HTMLInputElement>(null);

  if (loading) {
    return <div className="v2-theme v2-auth-page"><Card className="v2-auth-card"><LoadingState message="Đang tải…" /></Card></div>;
  }
  // Signing in sets the user and this redirect takes over. Navigating from the submit handler as
  // well would race it (router navigations run as transitions and lose to this render).
  if (user) {
    return <Navigate replace to={user.mustChangePassword
      ? passwordChangePath(user.roleCode)
      : safeRedirect(params.get("redirect"), user.roleCode) ?? redirectForRole(user.roleCode)} />;
  }
  const pinUsername = remembered || username;
  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    void login(identifier.trim(), password).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Không thể đăng nhập.");
    }).finally(() => setSubmitting(false));
  };
  const submitPin = (code = pin) => {
    setError("");
    if (!normalizeUsername(pinUsername)) {
      setError("Vui lòng nhập tên đăng nhập.");
      return;
    }
    if (code.length !== PIN_LENGTH) {
      setError(`Vui lòng nhập đủ ${PIN_LENGTH} số của mã PIN.`);
      return;
    }
    setSubmitting(true);
    void loginWithPin(normalizeUsername(pinUsername), code).then(() => {
      if (remember) rememberUsername(pinUsername);
      else forgetUsername();
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Không thể đăng nhập.");
      setPin("");
      window.setTimeout(() => pinRef.current?.focus(), 0);
    }).finally(() => setSubmitting(false));
  };
  const switchMode = (next: LoginMode) => {
    setMode(next);
    setError("");
  };

  return <div className="v2-theme v2-auth-page">
    <Card className="v2-auth-card">
      <p className="v2-eyebrow">PC Builder Store</p>
      <h1>Đăng nhập</h1>
      <div className="v2-auth-tabs" role="tablist" aria-label="Cách đăng nhập">
        <button type="button" role="tab" id="login-tab-password" aria-controls="login-panel" aria-selected={mode === "password"}
          onClick={() => switchMode("password")}>Mật khẩu</button>
        <button type="button" role="tab" id="login-tab-pin" aria-controls="login-panel" aria-selected={mode === "pin"}
          onClick={() => switchMode("pin")}>Mã PIN nhanh</button>
      </div>
      <div id="login-panel" role="tabpanel" aria-labelledby={mode === "pin" ? "login-tab-pin" : "login-tab-password"}>
        {mode === "password" ? <form className="v2-form-stack" onSubmit={submitPassword}>
          <FormField label="Email hoặc tên đăng nhập" htmlFor="login-identifier">
            <input className="v2-form-input" id="login-identifier" autoComplete="username" autoCapitalize="none" spellCheck={false}
              required maxLength={254} value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
          </FormField>
          <FormField label="Mật khẩu" htmlFor="login-password">
            <PasswordInput id="login-password" autoComplete="current-password" value={password} onChange={setPassword} />
          </FormField>
          <Link className="v2-auth-forgot" to="/customer/forgot-password">Quên mật khẩu?</Link>
          {error && <p className="v2-inline-error" role="alert">{error}</p>}
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Đang đăng nhập…" : "Đăng nhập"}</PrimaryButton>
        </form> : <form className="v2-form-stack" onSubmit={(event) => { event.preventDefault(); submitPin(); }}>
          {remembered ? <div className="v2-quick-login-user">
            <span className="v2-quick-login-avatar" aria-hidden="true">{remembered.charAt(0).toUpperCase()}</span>
            <span><small>Chào mừng trở lại</small><strong>@{remembered}</strong></span>
            <button type="button" className="v2-text-button" onClick={() => {
              forgetUsername();
              setRemembered("");
              setPin("");
              setError("");
            }}>Không phải bạn?</button>
          </div> : <FormField label="Tên đăng nhập" htmlFor="login-username">
            <span className="v2-username-field">
              <span aria-hidden="true">@</span>
              <input className="v2-form-input" id="login-username" autoComplete="username" autoCapitalize="none" spellCheck={false}
                maxLength={31} value={username} onChange={(event) => setUsername(event.target.value)} />
            </span>
          </FormField>}
          <div className="v2-form-field">
            <label htmlFor="login-pin">Mã PIN {PIN_LENGTH} số</label>
            <CodeInput ref={pinRef} id="login-pin" label={`Mã PIN ${PIN_LENGTH} số`} length={PIN_LENGTH} masked value={pin}
              autoFocus={Boolean(remembered)} invalid={Boolean(error)} disabled={submitting}
              onChange={(value) => { setPin(value); if (error) setError(""); }}
              onComplete={(value) => { if (normalizeUsername(pinUsername)) submitPin(value); }} />
          </div>
          {!remembered && <label className="v2-check-row">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
            <span>Ghi nhớ tên đăng nhập trên máy này</span>
          </label>}
          {error && <p className="v2-inline-error" role="alert">{error}</p>}
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Đang đăng nhập…" : "Đăng nhập"}</PrimaryButton>
          <p className="v2-auth-hint">Chưa có mã PIN? Đăng nhập bằng mật khẩu, rồi bật <strong>Đăng nhập nhanh</strong> trong trang Tài khoản. Mã PIN chỉ dành cho tài khoản khách hàng.</p>
        </form>}
      </div>
      <p className="v2-auth-switch">Chưa có tài khoản? <Link to={`/customer/register${params.get("redirect") ? `?redirect=${encodeURIComponent(params.get("redirect")!)}` : ""}`}>Tạo tài khoản mới</Link></p>
      <p className="v2-auth-switch"><Link to="/customer/home">← Về trang chủ</Link></p>
    </Card>
  </div>;
}

type UsernameCheck = { state: "idle" | "checking" | "ok" | "bad"; message: string };

/** Live "is this username free?" check, debounced; {@code current} is the signed-in user's own name. */
function useUsernameCheck(value: string, current?: string | null): UsernameCheck {
  const [check, setCheck] = useState<UsernameCheck>({ state: "idle", message: "" });
  const normalized = normalizeUsername(value);
  useEffect(() => {
    if (!normalized || normalized === current) {
      setCheck({ state: "idle", message: "" });
      return;
    }
    const problem = usernameProblem(normalized);
    if (problem) {
      setCheck({ state: "bad", message: problem });
      return;
    }
    const controller = new AbortController();
    setCheck({ state: "checking", message: "Đang kiểm tra…" });
    const timer = window.setTimeout(() => {
      void checkUsername(normalized, controller.signal).then(
        (result) => setCheck({ state: result.available ? "ok" : "bad", message: result.message }),
        () => { if (!controller.signal.aborted) setCheck({ state: "idle", message: "" }); },
      );
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalized, current]);
  return check;
}

function UsernameStatus({ check }: { check: UsernameCheck }) {
  if (check.state === "idle") return null;
  return <span className={`v2-username-status is-${check.state}`} role={check.state === "bad" ? "alert" : "status"}>
    {check.state === "ok" ? "✓ " : ""}{check.message}
  </span>;
}

function useCountdown(until: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [until]);
  return Math.max(0, Math.ceil((until - now) / 1000));
}

export function RegisterPage() {
  const { user, loading, refresh } = useAuth();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ fullName: "", username: "", email: "", phone: "", password: "", confirm: "" });
  const [sent, setSent] = useState<VerificationSent>();
  const [registered, setRegistered] = useState(false);
  const [code, setCode] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const usernameCheck = useUsernameCheck(form.username);
  const resendIn = useCountdown(resendAt);

  if (loading) return <div className="v2-auth-page"><Card className="v2-auth-card"><LoadingState message="Đang tải…" /></Card></div>;
  // A new account lands where the customer came from (e.g. checkout) or on the welcome page.
  if (user) {
    return <Navigate replace to={registered
      ? safeRedirect(params.get("redirect"), "CUSTOMER") ?? "/customer/account?welcome=1"
      : redirectForRole(user.roleCode)} />;
  }
  const strength = passwordStrength(form.password);
  const input: RegisterInput = {
    fullName: form.fullName.trim(),
    username: normalizeUsername(form.username),
    email: form.email.trim(),
    password: form.password,
    phone: form.phone.trim() || undefined,
  };
  const field = (name: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [name]: event.target.value }));

  const requestCode = (resend: boolean) => {
    setError("");
    setNotice("");
    setSubmitting(true);
    void sendRegistrationCode(input).then((result) => {
      setSent(result);
      setCode("");
      setResendAt(Date.now() + result.resendAfterSeconds * 1000);
      if (resend) setNotice("Đã gửi mã mới. Mã cũ không còn dùng được.");
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không thể gửi mã xác minh."))
      .finally(() => setSubmitting(false));
  };
  const submitDetails = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const problem = usernameProblem(form.username);
    if (problem) {
      setError(problem);
      return;
    }
    if (form.password !== form.confirm) {
      setError("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    requestCode(false);
  };
  const verify = (value = code) => {
    setError("");
    setNotice("");
    if (value.length !== SIGNUP_CODE_LENGTH) {
      setError(`Vui lòng nhập đủ ${SIGNUP_CODE_LENGTH} số trong email.`);
      return;
    }
    setSubmitting(true);
    void registerAccount({ ...input, verificationCode: value })
      .then(() => {
        setRegistered(true);
        return refresh();
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Không thể tạo tài khoản.");
        setCode("");
      })
      .finally(() => setSubmitting(false));
  };

  return <div className="v2-auth-page"><Card className="v2-auth-card">
    <p className="v2-eyebrow">PC Builder Store</p>
    <h1>{sent ? "Xác minh email" : "Tạo tài khoản"}</h1>
    <ol className="v2-auth-steps" aria-label="Các bước tạo tài khoản">
      <li className={sent ? "is-done" : "is-current"} aria-current={sent ? undefined : "step"}><span>1</span>Thông tin</li>
      <li className={sent ? "is-current" : undefined} aria-current={sent ? "step" : undefined}><span>2</span>Xác minh email</li>
    </ol>
    {!sent ? <>
      <p>Theo dõi đơn hàng, lưu giỏ hàng trên mọi thiết bị và thanh toán nhanh hơn ở lần sau. Giỏ hàng hiện tại được giữ nguyên.</p>
      <form className="v2-form-stack" onSubmit={submitDetails}>
        <FormField label="Họ và tên" htmlFor="register-name">
          <input className="v2-form-input" id="register-name" autoComplete="name" required minLength={2} maxLength={160}
            value={form.fullName} onChange={field("fullName")} />
        </FormField>
        <FormField label="Tên đăng nhập" htmlFor="register-username" hint="3–30 ký tự: chữ thường không dấu, số, dấu chấm hoặc gạch dưới. Dùng để đăng nhập nhanh.">
          <span className="v2-username-field">
            <span aria-hidden="true">@</span>
            <input className="v2-form-input" id="register-username" autoComplete="username" autoCapitalize="none" spellCheck={false}
              required maxLength={31} placeholder="vd: khoa.tran" value={form.username} onChange={field("username")} />
          </span>
          <UsernameStatus check={usernameCheck} />
        </FormField>
        <FormField label="Email" htmlFor="register-email" hint="Chúng tôi sẽ gửi mã xác minh 6 số đến email này.">
          <input className="v2-form-input" id="register-email" type="email" autoComplete="email" required maxLength={254}
            value={form.email} onChange={field("email")} />
        </FormField>
        <FormField label="Số điện thoại (không bắt buộc)" htmlFor="register-phone" hint="Dùng để giao hàng và liên hệ khi cần.">
          <input className="v2-form-input" id="register-phone" type="tel" autoComplete="tel" maxLength={20}
            value={form.phone} onChange={field("phone")} />
        </FormField>
        <FormField label="Mật khẩu" htmlFor="register-password" hint="Ít nhất 8 ký tự, gồm cả chữ và số.">
          <PasswordInput id="register-password" autoComplete="new-password" minLength={8} value={form.password}
            onChange={(value) => setForm((current) => ({ ...current, password: value }))} />
        </FormField>
        {form.password && <div className={`v2-password-meter is-${strength.level}`} aria-live="polite">
          <span><i style={{ width: `${strength.score * 25}%` }} /></span><small>Độ mạnh: {strength.label}</small>
        </div>}
        <FormField label="Nhập lại mật khẩu" htmlFor="register-confirm">
          <input className="v2-form-input" id="register-confirm" type="password" autoComplete="new-password" required
            value={form.confirm} onChange={field("confirm")} />
        </FormField>
        {error && <p className="v2-inline-error" role="alert">{error}</p>}
        <PrimaryButton type="submit" disabled={submitting || usernameCheck.state === "bad"}>
          {submitting ? "Đang gửi mã…" : "Tiếp tục: gửi mã xác minh"}
        </PrimaryButton>
      </form>
    </> : <form className="v2-form-stack" onSubmit={(event) => { event.preventDefault(); verify(); }}>
      <p>Chúng tôi đã gửi mã {SIGNUP_CODE_LENGTH} số đến <strong>{sent.email}</strong>. Mã có hiệu lực {Math.round(sent.expiresInSeconds / 60)} phút.</p>
      {sent.developmentCode && <div className="v2-dev-code" role="note">
        <span>Bản chạy thử chưa cấu hình gửi email. Mã của bạn: <strong>{sent.developmentCode}</strong></span>
        <button type="button" className="v2-text-button" onClick={() => { setCode(sent.developmentCode!); verify(sent.developmentCode); }}>Dùng mã này</button>
      </div>}
      <div className="v2-form-field">
        <label htmlFor="register-code">Mã xác minh</label>
        <CodeInput id="register-code" label="Mã xác minh" length={SIGNUP_CODE_LENGTH} value={code} autoComplete="one-time-code"
          autoFocus invalid={Boolean(error)} disabled={submitting}
          onChange={(value) => { setCode(value); if (error) setError(""); }} onComplete={verify} />
      </div>
      {notice && <p className="v2-inline-success" role="status">{notice}</p>}
      {error && <p className="v2-inline-error" role="alert">{error}</p>}
      <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Đang xác minh…" : "Xác minh và tạo tài khoản"}</PrimaryButton>
      <div className="v2-auth-code-actions">
        <button type="button" className="v2-text-button" disabled={submitting || resendIn > 0} onClick={() => requestCode(true)}>
          {resendIn > 0 ? `Gửi lại mã sau ${resendIn} giây` : "Gửi lại mã"}
        </button>
        <button type="button" className="v2-text-button" disabled={submitting} onClick={() => { setSent(undefined); setError(""); setNotice(""); }}>
          ← Sửa thông tin
        </button>
      </div>
      <p className="v2-auth-hint">Không thấy email? Hãy kiểm tra thư mục Spam/Quảng cáo, hoặc bấm Gửi lại mã.</p>
    </form>}
    <p className="v2-auth-switch">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
  </Card></div>;
}

function passwordStrength(value: string): { score: number; level: "weak" | "fair" | "good" | "strong"; label: string } {
  let score = 0;
  if (value.length >= 8) score++;
  if (/\p{L}/u.test(value) && /\d/.test(value)) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (value.length >= 12 || /[^\p{L}\d]/u.test(value)) score++;
  const levels = [["weak", "yếu"], ["weak", "yếu"], ["fair", "trung bình"], ["good", "khá"], ["strong", "mạnh"]] as const;
  return { score, level: levels[score][0], label: levels[score][1] };
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return <div className="v2-auth-page"><Card className="v2-auth-card">
    <p className="v2-eyebrow">PC Builder Store</p>
    <h1>Quên mật khẩu</h1>
    <p>Nhập email đã đăng ký. Chúng tôi sẽ gửi link để bạn đặt mật khẩu mới (hiệu lực 30 phút).</p>
    {message ? <div className="v2-form-stack">
      <p className="v2-inline-success" role="status">{message}</p>
      <p className="v2-muted">Không thấy email? Hãy kiểm tra thư mục Spam/Quảng cáo, hoặc liên hệ cửa hàng để được cấp mật khẩu tạm.</p>
    </div> : <form className="v2-form-stack" onSubmit={(event) => {
      event.preventDefault();
      setBusy(true);
      setError("");
      void requestPasswordReset(email.trim()).then((result) => setMessage(result.message),
        (reason: unknown) => setError(reason instanceof Error ? reason.message : "Không thể gửi yêu cầu."))
        .finally(() => setBusy(false));
    }}>
      <FormField label="Email" htmlFor="forgot-email">
        <input className="v2-form-input" id="forgot-email" type="email" autoComplete="email" required value={email}
          onChange={(event) => setEmail(event.target.value)} />
      </FormField>
      {error && <p className="v2-inline-error" role="alert">{error}</p>}
      <PrimaryButton type="submit" disabled={busy}>{busy ? "Đang gửi…" : "Gửi link đặt lại mật khẩu"}</PrimaryButton>
    </form>}
    <p className="v2-auth-switch"><Link to="/login">← Quay lại đăng nhập</Link></p>
  </Card></div>;
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const strength = passwordStrength(password);
  return <div className="v2-auth-page"><Card className="v2-auth-card">
    <p className="v2-eyebrow">PC Builder Store</p>
    <h1>Đặt mật khẩu mới</h1>
    {!token ? <p className="v2-inline-error">Link không hợp lệ. Hãy mở đúng link trong email hoặc <Link to="/customer/forgot-password">yêu cầu link mới</Link>.</p>
      : done ? <div className="v2-form-stack">
        <p className="v2-inline-success" role="status">{done}</p>
        <Link className="v2-button v2-button-primary" to="/login">Đăng nhập</Link>
      </div> : <form className="v2-form-stack" onSubmit={(event) => {
        event.preventDefault();
        setError("");
        if (password !== confirm) {
          setError("Mật khẩu nhập lại chưa khớp.");
          return;
        }
        setBusy(true);
        void confirmPasswordReset(token, password).then((result) => setDone(result.message),
          (reason: unknown) => setError(reason instanceof Error ? reason.message : "Không thể đặt lại mật khẩu."))
          .finally(() => setBusy(false));
      }}>
        <FormField label="Mật khẩu mới" htmlFor="reset-password" hint="Ít nhất 8 ký tự, gồm cả chữ và số.">
          <PasswordInput id="reset-password" autoComplete="new-password" minLength={8} value={password} onChange={setPassword} />
        </FormField>
        {password && <div className={`v2-password-meter is-${strength.level}`} aria-live="polite">
          <span><i style={{ width: `${strength.score * 25}%` }} /></span><small>Độ mạnh: {strength.label}</small>
        </div>}
        <FormField label="Nhập lại mật khẩu mới" htmlFor="reset-confirm">
          <PasswordInput id="reset-confirm" autoComplete="new-password" value={confirm} onChange={setConfirm} />
        </FormField>
        {error && <p className="v2-inline-error" role="alert">{error}</p>}
        <PrimaryButton type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Đặt mật khẩu mới"}</PrimaryButton>
      </form>}
  </Card></div>;
}

export function CartPage() {
  const { user, loading, error } = useAuth();
  if (loading) return <div className="v2-page"><LoadingState message="Đang kiểm tra phiên đăng nhập…" /></div>;
  if (error) return <div className="v2-page"><ErrorState title="Không thể kiểm tra phiên đăng nhập" message={error} /></div>;
  if (user && user.roleCode !== "CUSTOMER") {
    return <Navigate to={redirectForRole(user.roleCode)} replace />;
  }
  return <CartContents />;
}

function CartContents() {
  const paymentOptions = usePaymentOptions();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyOfferId, setBusyOfferId] = useState("");
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    void fetchCart().then((result) => {
      if (active) setCart(result);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Không thể tải giỏ hàng.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const items = cart?.items ?? [];
  const verifiedSubtotal = verifiedCartSubtotal(items);
  const hasUnverifiedPrice = items.some((item) => item.unitPrice === null || item.subtotal === null);
  const oneCurrency = verifiedSubtotal !== null;
  const giftsComplete = items.every((item) => item.gifts.every((gift) =>
    !gift.selectionRequired || item.selectedGifts.some((selected) =>
      selected.promotionId === String(gift.promotionId) && selected.offerId === gift.offerId)));
  const update = async (offerId: string, operation: () => Promise<CartResponse>, doneMessage = "") => {
    setBusyOfferId(offerId);
    setError("");
    setNotice("");
    try {
      setCart(await operation());
      if (doneMessage) setNotice(doneMessage);
      setQuantityDrafts((drafts) => {
        const next = { ...drafts };
        delete next[offerId];
        return next;
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật giỏ hàng.");
    } finally {
      setBusyOfferId("");
    }
  };
  const setQuantity = (item: CartItem, quantity: number) => {
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
      setError("Số lượng mỗi sản phẩm từ 1 đến 100.");
      setQuantityDrafts((drafts) => ({ ...drafts, [item.offerId]: String(item.quantity) }));
      return;
    }
    if (quantity === item.quantity) return;
    void update(item.offerId, () => updateCartItem(item.offerId, quantity));
  };
  const blocked = items.filter((item) => item.availability !== "AVAILABLE");
  const canCheckout = !blocked.length && oneCurrency && giftsComplete && !hasUnverifiedPrice;
  const currency = verifiedSubtotal?.currency ?? items.find((item) => item.currency)?.currency ?? "VND";
  const savings = items.reduce((sum, item) => sum + (Number(item.discountAmount) || 0) * item.quantity, 0);
  const listTotal = verifiedSubtotal ? verifiedSubtotal.amount + savings : null;
  return <div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Giỏ hàng</p>
      <h1>Giỏ hàng của bạn{items.length ? ` (${cart?.itemCount ?? 0})` : ""}</h1></div></div>
    {loading && <LoadingState message="Đang tải giỏ hàng…" />}
    {error && <p className="v2-inline-error" role="alert">{error}</p>}
    {notice && <p className="v2-inline-success" role="status">{notice}</p>}
    {!loading && !items.length && !error && <EmptyState title="Giỏ hàng đang trống"
      message="Hãy chọn sản phẩm bạn thích, hoặc để chúng tôi gợi ý một cấu hình PC theo nhu cầu."
      action={<div className="v2-action-row">
        <Link className="v2-button v2-button-primary" to="/customer/parts">Mua sắm ngay</Link>
        <Link className="v2-button v2-button-secondary" to="/build-pc/start">Tự build PC</Link>
      </div>} />}
    {!loading && items.length > 0 && <div className="v2-commerce-layout v2-cart-layout">
      <Card title="Sản phẩm" action={<button type="button" className="v2-cart-clear" disabled={Boolean(busyOfferId)} onClick={() => {
        if (!window.confirm("Xóa toàn bộ sản phẩm trong giỏ hàng?")) return;
        void update("*", () => clearCart(), "Đã xóa toàn bộ giỏ hàng.");
      }}>Xóa tất cả</button>}>
        <div className="v2-cart-items">{items.map((item) => <CartLine
          key={item.offerId}
          item={item}
          quantityDraft={quantityDrafts[item.offerId] ?? String(item.quantity)}
          busy={busyOfferId === item.offerId || busyOfferId === "*"}
          onQuantityDraft={(value) => setQuantityDrafts((drafts) => ({ ...drafts, [item.offerId]: value }))}
          onSetQuantity={(quantity) => setQuantity(item, quantity)}
          onRemove={() => void update(item.offerId, () => removeCartItem(item.offerId), `Đã xóa "${item.productName}" khỏi giỏ.`)}
          onGiftsChange={(gifts) => void update(item.offerId, () => updateCartItemGifts(item.offerId, gifts))}
        />)}</div>
      </Card>
      <div className="v2-cart-summary-column">
        <Card title="Tóm tắt đơn hàng">
          <dl className="v2-cart-summary">
            {listTotal !== null && savings > 0 && <div><dt>Giá niêm yết</dt><dd>{formatCartMoney(listTotal, currency)}</dd></div>}
            {savings > 0 && <div className="is-saving"><dt>Tiết kiệm</dt><dd>−{formatCartMoney(savings, currency)}</dd></div>}
            <div><dt>Phí vận chuyển</dt><dd>Miễn phí</dd></div>
            <div className="is-total"><dt>Tổng cộng</dt><dd>{hasUnverifiedPrice ? "Chưa xác minh"
              : oneCurrency ? formatCartMoney(verifiedSubtotal.amount, verifiedSubtotal.currency) : "—"}</dd></div>
          </dl>
          <p className="v2-cart-summary-note">Giá và tồn kho được kiểm tra lại một lần nữa khi bạn đặt hàng.</p>
          {!oneCurrency && !hasUnverifiedPrice && <p className="v2-inline-error">Giỏ hàng có nhiều loại tiền tệ; vui lòng đặt riêng từng đơn.</p>}
          {canCheckout
            ? <Link className="v2-button v2-button-primary v2-cart-checkout" to="/customer/checkout">Tiến hành đặt hàng</Link>
            : <p className="v2-inline-error" role="status">{!giftsComplete
              ? "Vui lòng chọn đầy đủ quà tặng bắt buộc trước khi đặt hàng."
              : `Có ${blocked.length || "một số"} sản phẩm chưa thể đặt. Hãy điều chỉnh số lượng hoặc xóa sản phẩm đó.`}</p>}
          <Link className="v2-cart-continue" to="/customer/parts">← Tiếp tục mua sắm</Link>
        </Card>
        <ul className="v2-cart-assurances">
          <li>🚚 Miễn phí giao hàng toàn quốc</li>
          <li>🛡️ Bảo hành chính hãng theo từng sản phẩm</li>
          <li>💵 {paymentOptions.bankTransfer ? "Thanh toán khi nhận hàng hoặc chuyển khoản" : "Thanh toán khi nhận hàng (COD)"}</li>
        </ul>
      </div>
    </div>}
  </div>;
}

function CartLine({
  item,
  quantityDraft,
  busy,
  onQuantityDraft,
  onSetQuantity,
  onRemove,
  onGiftsChange,
}: {
  item: CartItem;
  quantityDraft: string;
  busy: boolean;
  onQuantityDraft: (value: string) => void;
  onSetQuantity: (quantity: number) => void;
  onRemove: () => void;
  onGiftsChange: (gifts: GiftSelection[]) => void;
}) {
  const [upgradeDetails, setUpgradeDetails] = useState<PublicUpgradeConfiguration>();
  useEffect(() => {
    if (!item.configuration) {
      setUpgradeDetails(undefined);
      return;
    }
    const controller = new AbortController();
    void fetchProductUpgrades(item.modelCode, item.offerId, controller.signal).then(
      setUpgradeDetails,
      () => {
        if (!controller.signal.aborted) setUpgradeDetails(undefined);
      },
    );
    return () => controller.abort();
  }, [item.modelCode, item.offerId, item.configuration]);
  const productLink = `/customer/product?modelCode=${encodeURIComponent(item.modelCode)}`;
  const maxQuantity = Math.max(1, Math.min(100, item.availableQuantity || 100));
  const commitDraft = () => {
    const value = Number(quantityDraft);
    if (quantityDraft.trim() === "" || value === item.quantity) {
      onQuantityDraft(String(item.quantity));
      return;
    }
    onSetQuantity(value);
  };
  const isGiftSelected = (gift: CartItem["gifts"][number]) =>
    item.selectedGifts.some((selected) =>
      selected.promotionId === String(gift.promotionId) && selected.offerId === gift.offerId);
  const changeGiftSelection = (gift: CartItem["gifts"][number], checked: boolean) => {
    const current = item.selectedGifts.filter((selected) =>
      selected.promotionId !== String(gift.promotionId) || selected.offerId !== gift.offerId);
    if (checked) current.push({
      promotionId: String(gift.promotionId),
      offerId: gift.offerId,
      quantity: gift.quantity,
    });
    onGiftsChange(current);
  };
  const blocked = item.availability !== "AVAILABLE";
  return <div className={`v2-cart-line${blocked ? " is-blocked" : ""}`}>
    <Link className="v2-cart-thumb" to={productLink} tabIndex={-1} aria-hidden="true">
      <ProductArtwork
        image={item.imageUrl ? { url: item.imageUrl, altText: item.productName, isPrimary: true } : undefined}
        productName={item.productName}
        productType={item.productType ?? "ACCESSORY"}
      />
    </Link>
    <div className="v2-cart-info">
      <Link className="v2-cart-name" to={productLink}>{item.productName}</Link>
      <span className="v2-cart-model">Mã: {item.modelCode}</span>
      {item.saleBadge && <span className="v2-cart-badges"><Badge tone="error">{item.saleBadge}</Badge>
        {item.promotionDisplayCopy && <Badge>{item.promotionDisplayCopy}</Badge>}</span>}
      {item.configuration && <div className="v2-cart-configuration">
        <strong>Lựa chọn cấu hình</strong>
        {upgradeDetails?.groups.map((group) => {
          const selection = item.configuration?.upgrades.find((choice) => choice.groupId === group.groupId);
          const option = group.options.find((choice) => choice.optionId === selection?.optionId);
          return option ? <span key={group.groupId}>
            {group.displayName}: {option.displayName} × {selection?.quantity}
          </span> : null;
        })}
        {item.configuration.bundles.map((selection) => {
          const bundle = upgradeDetails?.bundles.find((choice) => choice.bundleId === selection.bundleId);
          const items = bundle?.items.filter((choice) => selection.offerIds.includes(choice.offerId)) ?? [];
          return <span key={selection.bundleId}>
            {bundle?.name ?? "Gói sản phẩm"}: {items.map((choice) => choice.productName).join(", ")}
          </span>;
        })}
        {!upgradeDetails && <span className="v2-muted">Chi tiết nâng cấp hiện không tải được.</span>}
      </div>}
      {!item.saleBadge && item.promotionDisplayCopy && <Badge>{item.promotionDisplayCopy}</Badge>}
      {item.gifts.length > 0 && <fieldset className="v2-cart-gifts">
        <legend>Quà tặng khuyến mãi</legend>
        {item.gifts.map((gift) => {
          const enoughStock = gift.active && gift.availableQuantity >= gift.quantity * item.quantity;
          return <label key={`${gift.promotionId}-${gift.offerId}`} className="v2-cart-gift">
            <input
              type="checkbox"
              checked={isGiftSelected(gift)}
              disabled={busy
                || gift.selectionRequired && isGiftSelected(gift)
                || !enoughStock && !isGiftSelected(gift)}
              onChange={(event) => changeGiftSelection(gift, event.target.checked)}
            />
            <span>{gift.productName} × {gift.quantity}
              {gift.selectionRequired ? " · Bắt buộc" : " · Tùy chọn"}
              {!enoughStock ? " · Tạm hết hàng" : ""}
            </span>
          </label>;
        })}
      </fieldset>}
      {item.availability === "AVAILABLE" && item.availableQuantity > 0 && item.availableQuantity <= 5
        && <span className="v2-cart-stock">Chỉ còn {item.availableQuantity} sản phẩm</span>}
      {blocked && <p className="v2-inline-error" role="status">{item.availabilityMessage}</p>}
      {!blocked && item.availabilityMessage && <p className="v2-cart-notice" role="status">{item.availabilityMessage}</p>}
    </div>
    <div className="v2-cart-price">
      {item.unitPrice !== null && item.currency
        ? <><strong>{formatCartMoney(item.unitPrice, item.currency)}</strong>
          {item.baseUnitPrice !== null && item.baseUnitPrice > item.unitPrice
            && <s>{formatCartMoney(item.baseUnitPrice, item.currency)}</s>}</>
        : <span className="v2-muted">Chưa có giá</span>}
    </div>
    <div className="v2-cart-qty">
      <div className="v2-quantity-control v2-cart-stepper">
        <IconButton className="v2-quantity-stepper-button" label="Giảm số lượng"
          disabled={busy || item.quantity <= 1} onClick={() => onSetQuantity(item.quantity - 1)}><MinusIcon /></IconButton>
        <input className="v2-form-input" type="number" min="1" max={maxQuantity} inputMode="numeric"
          aria-label={`Số lượng ${item.productName}`} value={quantityDraft} disabled={busy}
          onChange={(event) => onQuantityDraft(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
        <IconButton className="v2-quantity-stepper-button" label="Tăng số lượng"
          disabled={busy || item.quantity >= maxQuantity} onClick={() => onSetQuantity(item.quantity + 1)}><PlusIcon /></IconButton>
      </div>
      <button type="button" className="v2-cart-remove" disabled={busy} onClick={onRemove}>Xóa</button>
    </div>
    <div className="v2-cart-line-total">
      <span>Thành tiền</span>
      <strong>{item.subtotal !== null && item.currency ? formatCartMoney(item.subtotal, item.currency) : "—"}</strong>
    </div>
  </div>;
}

function formatCartMoney(value: number | null, currency: string | null): string {
  if (value === null || currency === null
      || !Number.isFinite(value) || !/^[A-Z]{3}$/.test(currency)) return "Chưa xác minh";
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(value);
  } catch {
    return "Chưa xác minh";
  }
}

export function CheckoutPage() {
  const { user, loading, error } = useAuth();
  if (loading) return <div className="v2-page"><LoadingState message="Đang kiểm tra phiên đăng nhập…" /></div>;
  if (error) return <div className="v2-page"><ErrorState title="Không thể kiểm tra phiên đăng nhập" message={error} /></div>;
  if (user && user.roleCode !== "CUSTOMER") {
    return <Navigate to={redirectForRole(user.roleCode)} replace />;
  }
  return <CheckoutContents />;
}

function CheckoutContents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<CheckoutRequest["paymentMethod"]>("COD");
  const paymentOptions = usePaymentOptions();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loadingCart, setLoadingCart] = useState(true);
  const items = cart?.items ?? [];
  const verifiedSubtotal = verifiedCartSubtotal(items);
  const cartPurchasable = items.length > 0
    && items.every((item) => item.availability === "AVAILABLE")
    && items.every((item) => item.gifts.every((gift) =>
      !gift.selectionRequired || item.selectedGifts.some((selected) =>
        selected.promotionId === String(gift.promotionId) && selected.offerId === gift.offerId)))
    && verifiedSubtotal !== null;
  useEffect(() => {
    if (user && !name) setName(user.fullName);
  }, [name, user]);
  useEffect(() => {
    let active = true;
    void fetchCart().then((result) => {
      if (active) setCart(result);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Không thể tải giỏ hàng.");
    }).finally(() => {
      if (active) setLoadingCart(false);
    });
    return () => { active = false; };
  }, []);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!cartPurchasable) {
      setError("Hãy cập nhật hoặc xóa sản phẩm chưa đủ điều kiện trong giỏ hàng.");
      return;
    }
    setBusy(true);
    setError("");
    const checkout: CheckoutRequest = {
      customerName: name.trim(),
      customerPhone: phone.trim(),
      shippingAddress: address.trim(),
      shippingRegion: region.trim(),
      shippingPostalCode: postalCode.trim(),
      paymentMethod,
      items: items.map((item) => ({ offerId: item.offerId, quantity: item.quantity })),
    };
    const isCustomer = user?.roleCode === "CUSTOMER";
    const submission = isCustomer
      ? createOrder(checkout, idempotencyKey)
      : createGuestOrder({ ...checkout, customerEmail: email.trim() } satisfies GuestCheckoutRequest, idempotencyKey);
    void submission.then((detail) => {
      // The confirmation page receives the created order in router state, so a guest sees the full
      // summary (and transfer instructions) without having to look the order up again.
      navigate(`/customer/order-result?${isCustomer ? "" : "guest=true&"}orderNumber=${encodeURIComponent(detail.order.orderNumber)}`,
        { state: { order: detail } });
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Không thể tạo đơn hàng.");
    }).finally(() => setBusy(false));
  };
  return <div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Đặt hàng</p><h1>Thông tin giao hàng</h1></div></div>
    {loadingCart && <LoadingState message="Đang tải giỏ hàng…" />}
    {error && <ErrorState title="Không thể tải giỏ hàng" message={error} />}
    {!loadingCart && !cartPurchasable ? <EmptyState title="Giỏ hàng chưa sẵn sàng đặt hàng" message="Hãy kiểm tra tồn kho, giá và chọn đủ quà tặng bắt buộc trong giỏ hàng." action={<Link to="/customer/cart">Quay lại giỏ hàng</Link>} /> : !loadingCart && <div className="v2-commerce-layout">
      <Card title="Địa chỉ và phương thức thanh toán">
      <p>Đơn giá, tổng tiền và tồn kho sẽ được máy chủ kiểm tra lại khi đặt hàng.</p>
      <form className="v2-form-stack" onSubmit={submit}>
        <FormField label="Người nhận" htmlFor="checkout-name"><input id="checkout-name" className="v2-form-input" required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} /></FormField>
        {!user && <FormField label="Email" htmlFor="checkout-email"><input id="checkout-email" className="v2-form-input" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></FormField>}
        <FormField label="Điện thoại" htmlFor="checkout-phone"><input id="checkout-phone" className="v2-form-input" type="tel" required maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} /></FormField>
        <FormField label="Địa chỉ" htmlFor="checkout-address"><textarea id="checkout-address" className="v2-form-input" required maxLength={2000} value={address} onChange={(event) => setAddress(event.target.value)} /></FormField>
        <div className="v2-form-grid">
          <FormField label="Tỉnh/thành" htmlFor="checkout-region"><input id="checkout-region" className="v2-form-input" maxLength={160} value={region} onChange={(event) => setRegion(event.target.value)} /></FormField>
          <FormField label="Mã bưu chính" htmlFor="checkout-postal"><input id="checkout-postal" className="v2-form-input" maxLength={30} value={postalCode} onChange={(event) => setPostalCode(event.target.value)} /></FormField>
        </div>
        <fieldset className="v2-payment-methods">
          <legend>Phương thức thanh toán</legend>
          {paymentOptions.methods.map((method) => <label key={method} className={`v2-payment-method${paymentMethod === method ? " is-selected" : ""}`}>
            <input type="radio" name="checkout-payment" value={method} checked={paymentMethod === method}
              onChange={() => setPaymentMethod(method)} />
            <span>
              <strong>{paymentMethodText[method] ?? method}</strong>
              <small>{method === "COD" ? "Trả tiền mặt cho nhân viên giao hàng khi nhận được hàng."
                : method === "BANK_TRANSFER" ? `Quét mã VietQR hoặc chuyển khoản${paymentOptions.bankTransfer?.bankName ? ` qua ${paymentOptions.bankTransfer.bankName}` : ""}. Đơn được giao sau khi cửa hàng nhận tiền.`
                  : "Chỉ dùng để thử nghiệm, không có khoản tiền thật nào được thu."}</small>
            </span>
          </label>)}
        </fieldset>
        {error && <p className="v2-inline-error" role="alert">{error}</p>}
        <PrimaryButton type="submit" disabled={busy || !cartPurchasable}>{busy ? "Đang kiểm tra và đặt hàng…" : "Đặt hàng"}</PrimaryButton>
        <p className="v2-muted v2-checkout-terms">Bằng việc đặt hàng, bạn đồng ý với <Link to="/policies/terms">điều khoản mua hàng</Link> và <Link to="/policies/privacy">chính sách bảo mật</Link> của cửa hàng.</p>
      </form>
      </Card>
      <Card title="Tóm tắt đơn hàng">
        <div className="v2-order-items">
          {items.map((item) => <div className="v2-order-item-summary" key={item.offerId}>
            <Link to={`/customer/product?modelCode=${encodeURIComponent(item.modelCode)}`}>{item.productName}</Link>
            <span>{item.quantity} × {formatCartMoney(item.unitPrice, item.currency)}</span>
            <strong>{formatCartMoney(item.subtotal, item.currency)}</strong>
          </div>)}
        </div>
        <dl className="v2-cart-summary">
          <div><dt>Phí vận chuyển</dt><dd>Miễn phí</dd></div>
          <div className="is-total"><dt>Tổng thanh toán</dt><dd>{verifiedSubtotal
            ? formatCartMoney(verifiedSubtotal.amount, verifiedSubtotal.currency)
            : "Chưa xác minh"}</dd></div>
        </dl>
        <p className="v2-cart-summary-note">Giá và tồn kho được kiểm tra lại khi bạn bấm "Đặt hàng".</p>
        <Link className="v2-cart-continue" to="/customer/cart">← Chỉnh sửa giỏ hàng</Link>
      </Card>
    </div>}
  </div>;
}

export function OrderResultPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const isGuestOrder = params.get("guest") === "true";
  const orderNumber = params.get("orderNumber") ?? "";
  const passed = (location.state as { order?: OrderDetail } | null)?.order;
  const [detail, setDetail] = useState<OrderDetail | undefined>(
    passed?.order.orderNumber === orderNumber ? passed : undefined);

  useEffect(() => {
    // Reloading the page loses router state: signed-in customers can fetch their order again.
    if (detail || isGuestOrder || !orderNumber || user?.roleCode !== "CUSTOMER") return;
    let active = true;
    void fetchCustomerOrder(orderNumber).then((loaded) => { if (active) setDetail(loaded); }, () => undefined);
    return () => { active = false; };
  }, [detail, isGuestOrder, orderNumber, user?.roleCode]);

  if (!orderNumber) {
    if (authLoading) return <div className="v2-page"><LoadingState message="Đang tải…" /></div>;
    return <Navigate to={user?.roleCode === "CUSTOMER" ? "/customer/orders" : "/customer/guest-order-lookup"} replace />;
  }
  const order = detail?.order;
  return <div className="v2-page v2-order-result">
    <section className="v2-order-success">
      <span className="v2-order-success-icon" aria-hidden="true">✓</span>
      <div>
        <p className="v2-eyebrow">Đặt hàng thành công</p>
        <h1>Cảm ơn bạn đã mua hàng!</h1>
        <p>Mã đơn hàng của bạn: <strong className="v2-order-code">{orderNumber}</strong></p>
        <p className="v2-muted">{order?.paymentMethod === "BANK_TRANSFER"
          ? "Đơn hàng sẽ được xác nhận ngay khi cửa hàng nhận được chuyển khoản."
          : "Cửa hàng sẽ gọi điện xác nhận đơn trong giờ làm việc trước khi giao hàng."}
          {isGuestOrder && " Hãy lưu lại mã đơn và số điện thoại để tra cứu đơn hàng."}</p>
      </div>
    </section>
    {detail && <OrderPaymentInstructions detail={detail} />}
    {detail && order && <div className="v2-account-grid">
      <Card title="Thông tin đơn hàng">
        <dl className="v2-cart-summary">
          <div><dt>Ngày đặt</dt><dd>{formatOrderDate(order.placedAt)}</dd></div>
          <div><dt>Thanh toán</dt><dd>{label(paymentMethodText, order.paymentMethod)}</dd></div>
          <div><dt>Trạng thái</dt><dd>{label(paymentStatusText, order.paymentStatus)}</dd></div>
          <div><dt>Người nhận</dt><dd>{order.customerName} · {order.customerPhone}</dd></div>
          <div><dt>Giao đến</dt><dd>{[detail.shippingAddress, detail.shippingRegion].filter(Boolean).join(", ")}</dd></div>
          <div className="is-total"><dt>Tổng thanh toán</dt><dd>{order.currencyCode ? formatCartMoney(order.total, order.currencyCode) : "—"}</dd></div>
        </dl>
      </Card>
      <Card title={`Sản phẩm (${detail.items.reduce((sum, item) => sum + item.quantity, 0)})`}>
        <ul className="v2-order-result-items">{detail.items.map((item, index) => <li key={`${item.productName}-${index}`}>
          <span>{item.productName} <small>× {item.quantity}</small></span>
          <strong>{formatCartMoney(item.lineTotal, item.currencyCode)}</strong>
        </li>)}</ul>
      </Card>
    </div>}
    <div className="v2-action-row">
      {isGuestOrder
        ? <Link className="v2-button v2-button-primary" to="/customer/guest-order-lookup">Tra cứu đơn hàng</Link>
        : <Link className="v2-button v2-button-primary" to={`/customer/order-detail?orderNumber=${encodeURIComponent(orderNumber)}`}>Theo dõi đơn hàng</Link>}
      <Link className="v2-button v2-button-secondary" to="/customer/home">Tiếp tục mua sắm</Link>
    </div>
  </div>;
}

export function GuestOrderLookupPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submitLookup = (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    setDetail(null);
    void lookupGuestOrder({ orderNumber: orderNumber.trim(), customerPhone: phone.trim() })
      .then(setDetail)
      .catch((reason: unknown) => setError(
        reason instanceof Error ? reason.message : "Không thể tìm thấy đơn hàng.",
      ))
      .finally(() => setLoading(false));
  };

  const retryPayment = () => {
    if (!detail) return;
    setBusy(true);
    setError("");
    setNotice("");
    void processGuestOrderPayment(
      detail.order.orderNumber,
      phone.trim(),
      crypto.randomUUID(),
    ).then((updated) => {
      setDetail(updated);
      setNotice(`Kết quả thanh toán: ${label(paymentStatusText, updated.order.paymentStatus)}.`);
    }).catch((reason: unknown) => setError(
      reason instanceof Error ? reason.message : "Không thể xử lý thanh toán.",
    )).finally(() => setBusy(false));
  };

  const order = detail?.order;
  return <div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Đơn hàng khách</p><h1>Tra cứu đơn hàng</h1></div></div>
    <Card title="Xác minh đơn hàng">
      <p>Nhập mã đơn hàng (ví dụ PC261122-7KQ4M) và số điện thoại bạn đã dùng khi đặt hàng.</p>
      <form className="v2-form-stack" onSubmit={submitLookup}>
        <FormField label="Mã đơn hàng" htmlFor="guest-order-number">
          <input id="guest-order-number" className="v2-form-input" required maxLength={100}
            autoComplete="off" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} />
        </FormField>
        <FormField label="Số điện thoại" htmlFor="guest-order-phone">
          <input id="guest-order-phone" className="v2-form-input" type="tel" required maxLength={40}
            autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </FormField>
        {error && <p className="v2-inline-error" role="alert">{error}</p>}
        <PrimaryButton type="submit" disabled={loading}>{loading ? "Đang tra cứu…" : "Tra cứu đơn hàng"}</PrimaryButton>
      </form>
    </Card>
    {notice && <p role="status" className="v2-inline-success">{notice}</p>}
    {order && detail && <OrderDetailView detail={detail}>
      {order.paymentMethod === "SIMULATED_ONLINE"
        && ["UNPAID", "FAILED", "CANCELLED"].includes(order.paymentStatus)
        && <Card title="Thanh toán trực tuyến (thử nghiệm)">
          <p>Môi trường thử nghiệm: không có khoản tiền thật nào được thu.</p>
          {error && <p className="v2-inline-error" role="alert">{error}</p>}
          <PrimaryButton type="button" disabled={busy} onClick={retryPayment}>
            {busy ? "Đang xử lý…" : "Thanh toán"}
          </PrimaryButton>
        </Card>}
      {canRequestCancellation(order.status) && <p className="v2-muted">Muốn hủy hoặc thay đổi đơn hàng? Vui lòng liên hệ cửa hàng
        qua trang <Link to="/contact">Liên hệ</Link> và cung cấp mã đơn {order.orderNumber}.</p>}
    </OrderDetailView>}
  </div>;
}

export function AccountPage() {
  const { user, logout } = useAuth();
  const [params] = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <RoleGate audience="customer"><div className="v2-page v2-account-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Tài khoản</p><h1>Xin chào, {user?.fullName}</h1></div>
      <SecondaryButton type="button" disabled={busy} onClick={() => {
        setBusy(true); setError("");
        void logout().then(() => window.location.assign("/login")).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không thể đăng xuất.")).finally(() => setBusy(false));
      }}>{busy ? "Đang đăng xuất…" : "Đăng xuất"}</SecondaryButton>
    </div>
    {params.get("welcome") && <p className="v2-inline-success" role="status">Tạo tài khoản thành công, email đã được xác minh. Giỏ hàng của bạn được giữ nguyên. Mẹo: bật <strong>Đăng nhập nhanh bằng mã PIN</strong> bên dưới để lần sau vào chỉ với tên đăng nhập và 8 số.</p>}
    {error && <p className="v2-inline-error" role="alert">{error}</p>}
    <div className="v2-account-shortcuts">
      <Link to="/customer/orders"><span aria-hidden="true">📦</span><strong>Đơn hàng của tôi</strong><small>Theo dõi, thanh toán, yêu cầu hủy</small></Link>
      <Link to="/customer/cart"><span aria-hidden="true">🛒</span><strong>Giỏ hàng</strong><small>Đồng bộ trên mọi thiết bị</small></Link>
      <Link to="/build-pc/start"><span aria-hidden="true">🖥️</span><strong>Tự build PC</strong><small>Gợi ý cấu hình theo nhu cầu</small></Link>
    </div>
    <AccountSettings />
    <MySavedBuilds />
  </div></RoleGate>;
}

/** Staff and admin: their own profile and password (temporary passwords are changed here). */
export function AdminProfilePage() {
  const { user } = useAuth();
  return <RoleGate audience="staff"><div className="v2-page v2-account-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">{user?.roleCode === "ADMIN" ? "Quản trị viên" : "Nhân viên bán hàng"}</p><h1>Tài khoản của tôi</h1></div></div>
    <AccountSettings />
  </div></RoleGate>;
}

/** Profile and password cards shared by customer and staff account pages (plus quick login for customers). */
function AccountSettings() {
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState<AccountProfile>();
  const [profileForm, setProfileForm] = useState({ fullName: "", phone: "", username: "" });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ ok: boolean; text: string }>();
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string }>();
  const [error, setError] = useState("");
  const usernameCheck = useUsernameCheck(profileForm.username, profile?.username);

  const applyProfile = (loaded: AccountProfile) => {
    setProfile(loaded);
    setProfileForm({ fullName: loaded.fullName, phone: loaded.phone ?? "", username: loaded.username ?? "" });
  };
  useEffect(() => {
    const controller = new AbortController();
    void fetchProfile(controller.signal).then(applyProfile, (reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải hồ sơ.");
    });
    return () => controller.abort();
  }, []);

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    setProfileBusy(true);
    setProfileMessage(undefined);
    const username = normalizeUsername(profileForm.username);
    void updateProfile({
      fullName: profileForm.fullName,
      phone: profileForm.phone,
      customerSegment: profile?.customerSegment ?? "UNSPECIFIED",
      // Accounts without a username may leave it empty; once set it can be changed but not removed.
      username: profile?.username || username ? username : undefined,
    })
      .then((saved) => {
        applyProfile(saved);
        setProfileMessage({ ok: true, text: "Đã lưu thông tin." });
        return refresh();
      })
      .catch((reason: unknown) => setProfileMessage({ ok: false, text: reason instanceof Error ? reason.message : "Không thể lưu." }))
      .finally(() => setProfileBusy(false));
  };
  const savePassword = (event: FormEvent) => {
    event.preventDefault();
    setPasswordMessage(undefined);
    if (passwords.next !== passwords.confirm) {
      setPasswordMessage({ ok: false, text: "Mật khẩu mới nhập lại chưa khớp." });
      return;
    }
    setPasswordBusy(true);
    void changePassword(passwords.current, passwords.next)
      .then((result) => {
        setPasswords({ current: "", next: "", confirm: "" });
        setPasswordMessage({ ok: true, text: result.message });
        void fetchProfile().then(applyProfile, () => undefined);
        return refresh();
      })
      .catch((reason: unknown) => setPasswordMessage({ ok: false, text: reason instanceof Error ? reason.message : "Không thể đổi mật khẩu." }))
      .finally(() => setPasswordBusy(false));
  };

  return <>
    {error && <p className="v2-inline-error" role="alert">{error}</p>}
    {user?.mustChangePassword && <p className="v2-inline-error" role="alert">Bạn đang dùng mật khẩu tạm do cửa hàng cấp. Hãy đặt mật khẩu của riêng bạn ở ô "Đổi mật khẩu".</p>}
    <div className="v2-account-grid">
      <Card title="Thông tin cá nhân" description={profile ? `Tài khoản tạo ngày ${new Date(profile.createdAt).toLocaleDateString("vi-VN")}` : undefined}>
        <form className="v2-form-stack" onSubmit={saveProfile}>
          <FormField label="Họ và tên" htmlFor="account-name">
            <input className="v2-form-input" id="account-name" required minLength={2} maxLength={160} autoComplete="name"
              value={profileForm.fullName} onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))} />
          </FormField>
          <FormField label="Tên đăng nhập" htmlFor="account-username"
            hint={profile && !profile.username ? "Đặt tên đăng nhập để đăng nhập bằng tên thay cho email và dùng mã PIN nhanh." : "Có thể dùng thay cho email khi đăng nhập."}>
            <span className="v2-username-field">
              <span aria-hidden="true">@</span>
              <input className="v2-form-input" id="account-username" autoComplete="username" autoCapitalize="none" spellCheck={false}
                maxLength={31} placeholder="vd: khoa.tran" value={profileForm.username}
                onChange={(event) => setProfileForm((current) => ({ ...current, username: event.target.value }))} />
            </span>
            <UsernameStatus check={usernameCheck} />
          </FormField>
          <FormField label="Email đăng nhập" htmlFor="account-email" hint="Email dùng để đăng nhập, không thay đổi được.">
            <input className="v2-form-input" id="account-email" value={profile?.email ?? user?.email ?? ""} readOnly />
          </FormField>
          <FormField label="Số điện thoại" htmlFor="account-phone">
            <input className="v2-form-input" id="account-phone" type="tel" maxLength={20} autoComplete="tel"
              value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} />
          </FormField>
          {profileMessage && <p className={profileMessage.ok ? "v2-inline-success" : "v2-inline-error"} role="status">{profileMessage.text}</p>}
          <PrimaryButton type="submit" disabled={profileBusy || !profile || usernameCheck.state === "bad"}>{profileBusy ? "Đang lưu…" : "Lưu thông tin"}</PrimaryButton>
        </form>
      </Card>
      <Card title="Đổi mật khẩu" description="Mật khẩu mới cần ít nhất 8 ký tự, gồm cả chữ và số.">
        <form className="v2-form-stack" id="change-password" onSubmit={savePassword}>
          <FormField label="Mật khẩu hiện tại" htmlFor="account-current-password">
            <PasswordInput id="account-current-password" autoComplete="current-password" value={passwords.current}
              onChange={(value) => setPasswords((current) => ({ ...current, current: value }))} />
          </FormField>
          <FormField label="Mật khẩu mới" htmlFor="account-new-password">
            <PasswordInput id="account-new-password" autoComplete="new-password" minLength={8} value={passwords.next}
              onChange={(value) => setPasswords((current) => ({ ...current, next: value }))} />
          </FormField>
          <FormField label="Nhập lại mật khẩu mới" htmlFor="account-confirm-password">
            <PasswordInput id="account-confirm-password" autoComplete="new-password" value={passwords.confirm}
              onChange={(value) => setPasswords((current) => ({ ...current, confirm: value }))} />
          </FormField>
          {passwordMessage && <p className={passwordMessage.ok ? "v2-inline-success" : "v2-inline-error"} role="status">{passwordMessage.text}</p>}
          <PrimaryButton type="submit" disabled={passwordBusy}>{passwordBusy ? "Đang đổi…" : "Đổi mật khẩu"}</PrimaryButton>
        </form>
      </Card>
      {user?.roleCode === "CUSTOMER" && profile && <QuickPinCard profile={profile} onChanged={applyProfile} />}
    </div>
  </>;
}

/** Customer quick login: username + an 8-digit PIN instead of the password. */
function QuickPinCard({ profile, onChanged }: { profile: AccountProfile; onChanged: (profile: AccountProfile) => void }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const enabled = profile.quickPinEnabled;
  const reload = () => fetchProfile().then(onChanged, () => undefined);

  const save = (event: FormEvent) => {
    event.preventDefault();
    setMessage(undefined);
    const problem = pinProblem(pin);
    if (problem) {
      setMessage({ ok: false, text: problem });
      return;
    }
    if (pin !== confirmPin) {
      setMessage({ ok: false, text: "Hai lần nhập mã PIN chưa khớp." });
      return;
    }
    setBusy(true);
    void setQuickPin(password, pin).then((result) => {
      setPin("");
      setConfirmPin("");
      setPassword("");
      if (profile.username) rememberUsername(profile.username);
      setMessage({ ok: true, text: result.message });
      return reload();
    }).catch((reason: unknown) => setMessage({ ok: false, text: reason instanceof Error ? reason.message : "Không thể lưu mã PIN." }))
      .finally(() => setBusy(false));
  };
  const turnOff = () => {
    setBusy(true);
    setMessage(undefined);
    void removeQuickPin().then((result) => {
      setConfirmOff(false);
      setMessage({ ok: true, text: result.message });
      return reload();
    }).catch((reason: unknown) => setMessage({ ok: false, text: reason instanceof Error ? reason.message : "Không thể tắt đăng nhập nhanh." }))
      .finally(() => setBusy(false));
  };

  return <Card title="Đăng nhập nhanh bằng mã PIN" className="v2-quick-pin-card"
    description={`Lần sau chỉ cần nhập tên đăng nhập và mã PIN ${PIN_LENGTH} số, không cần mật khẩu.`}>
    <div className="v2-quick-pin-status">
      <Badge tone={enabled ? "success" : "neutral"}>{enabled ? "Đang bật" : "Chưa bật"}</Badge>
      {enabled && profile.quickPinUpdatedAt && <small>Đặt ngày {new Date(profile.quickPinUpdatedAt).toLocaleDateString("vi-VN")}</small>}
      {profile.username && <small>Tên đăng nhập: <strong>@{profile.username}</strong></small>}
    </div>
    {!profile.username ? <p className="v2-muted">Hãy đặt <strong>Tên đăng nhập</strong> ở ô Thông tin cá nhân trước, vì đăng nhập nhanh dùng tên đăng nhập + mã PIN.</p>
      : <form className="v2-form-stack" onSubmit={save}>
        <div className="v2-form-field">
          <label htmlFor="quick-pin">{enabled ? "Mã PIN mới" : "Chọn mã PIN"} ({PIN_LENGTH} số)</label>
          <CodeInput id="quick-pin" label={`Mã PIN ${PIN_LENGTH} số`} length={PIN_LENGTH} masked value={pin} onChange={setPin} disabled={busy} />
        </div>
        <div className="v2-form-field">
          <label htmlFor="quick-pin-confirm">Nhập lại mã PIN</label>
          <CodeInput id="quick-pin-confirm" label="Nhập lại mã PIN" length={PIN_LENGTH} masked value={confirmPin} onChange={setConfirmPin}
            disabled={busy} invalid={confirmPin.length === PIN_LENGTH && confirmPin !== pin} />
        </div>
        <FormField label="Mật khẩu hiện tại (để xác nhận)" htmlFor="quick-pin-password">
          <PasswordInput id="quick-pin-password" autoComplete="current-password" value={password} onChange={setPassword} />
        </FormField>
        <p className="v2-auth-hint">Không dùng ngày sinh, số điện thoại hay dãy số dễ đoán. Nhập sai 5 lần, mã PIN bị tạm khóa 15 phút. Mã PIN tự tắt khi bạn đổi mật khẩu.</p>
        {message && <p className={message.ok ? "v2-inline-success" : "v2-inline-error"} role="status">{message.text}</p>}
        <div className="v2-quick-pin-actions">
          <PrimaryButton type="submit" disabled={busy}>{busy ? "Đang lưu…" : enabled ? "Đổi mã PIN" : "Bật đăng nhập nhanh"}</PrimaryButton>
          {enabled && <SecondaryButton type="button" disabled={busy} onClick={() => setConfirmOff(true)}>Tắt đăng nhập nhanh</SecondaryButton>}
        </div>
      </form>}
    {!profile.username && message && <p className={message.ok ? "v2-inline-success" : "v2-inline-error"} role="status">{message.text}</p>}
    <ConfirmationModal open={confirmOff} onClose={() => setConfirmOff(false)} onConfirm={turnOff} busy={busy}
      title="Tắt đăng nhập nhanh?" confirmLabel="Tắt mã PIN"
      message="Sau khi tắt, bạn cần dùng email hoặc tên đăng nhập kèm mật khẩu để đăng nhập. Bạn có thể bật lại bất cứ lúc nào." />
  </Card>;
}

export function MySavedBuilds() {
  const [builds, setBuilds] = useState<SavedBuildSummary[]>();
  useEffect(() => {
    const controller = new AbortController();
    void fetchMyBuilds(controller.signal).then(setBuilds, () => setBuilds([]));
    return () => controller.abort();
  }, []);
  if (!builds) return null;
  return <Card title="Cấu hình PC đã lưu" description="Mở lại để xem báo giá mới nhất, in hoặc chia sẻ."
    action={<Link to="/build-pc/start">+ Build cấu hình mới</Link>}>
    {builds.length ? <ul className="v2-saved-builds">{builds.map((build) => <li key={build.shareCode}>
      <Link to={`/build-pc/saved?code=${encodeURIComponent(build.shareCode)}`}>
        <strong>{build.name}</strong>
        <span>{build.itemCount} linh kiện · lưu ngày {new Date(build.createdAt.replace(" ", "T")).toLocaleDateString("vi-VN")}</span>
      </Link>
      <b>{money(build.savedTotal, "VND")}</b>
    </li>)}</ul> : <p className="v2-muted">Chưa có cấu hình nào. Trong trang Build PC, bấm "Lưu, chia sẻ hoặc in báo giá" để lưu lại.</p>}
  </Card>;
}

export function OrderHistoryPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void fetchCustomerOrders().then((result) => {
      if (active) setOrders(result);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Không thể tải lịch sử đơn hàng.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);
  return <RoleGate audience="customer"><div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Tài khoản</p><h1>Đơn hàng của tôi</h1></div></div>
    {loading && <LoadingState message="Đang tải đơn hàng…" />}
    {error && <ErrorState title="Không thể tải lịch sử đơn hàng" message={error} />}
    {!loading && !error && !orders.length && <EmptyState
      title="Bạn chưa có đơn hàng nào"
      message="Các đơn hàng bạn đặt sẽ hiển thị tại đây để theo dõi."
      action={<Link className="v2-button v2-button-primary" to="/customer/parts">Mua sắm ngay</Link>}
    />}
    {!loading && !error && orders.length > 0 && <ul className="v2-order-list">{orders.map((order) => {
      const href = `/customer/order-detail?orderNumber=${encodeURIComponent(order.orderNumber)}`;
      const awaitingTransfer = order.paymentMethod === "BANK_TRANSFER" && order.paymentStatus === "UNPAID"
        && order.status !== "CANCELLED" && order.status !== "CANCELLATION_REQUESTED";
      return <li key={order.orderNumber}>
        <div className="v2-order-list-main">
          <Link to={href} className="v2-order-code">{order.orderNumber}</Link>
          <span className="v2-muted">Đặt lúc {formatOrderDate(order.placedAt)} · {label(paymentMethodText, order.paymentMethod)}</span>
          <span className="v2-admin-badges">
            <Badge tone={orderTone(order.status)}>{label(orderStatusText, order.status)}</Badge>
            <Badge tone={paymentTone(order.paymentStatus)}>{label(paymentStatusText, order.paymentStatus)}</Badge>
          </span>
        </div>
        <div className="v2-order-list-side">
          <strong>{formatOrderMoney(order.total, order.currencyCode, order.showFinancials)}</strong>
          <Link className={`v2-button ${awaitingTransfer ? "v2-button-primary" : "v2-button-secondary"}`} to={href}>
            {awaitingTransfer ? "Thanh toán ngay" : "Xem chi tiết"}
          </Link>
        </div>
      </li>;
    })}</ul>}
  </div></RoleGate>;
}

export function OrderDetailPage() {
  const [params] = useSearchParams();
  const orderNumber = params.get("orderNumber") ?? "";
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    if (!orderNumber) {
      setError("Thiếu mã đơn hàng.");
      setLoading(false);
      return () => { active = false; };
    }
    void fetchCustomerOrder(orderNumber).then((result) => {
      if (active) setDetail(result);
    }).catch((problem: unknown) => {
      if (active) setError(problem instanceof Error ? problem.message : "Không thể tải đơn hàng.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [orderNumber]);

  const submitCancellation = () => {
    setBusy(true);
    setError("");
    void requestOrderCancellation(orderNumber, reason.trim()).then(setDetail).then(() => setReason("")).catch(
      (problem: unknown) => setError(problem instanceof Error ? problem.message : "Không thể gửi yêu cầu hủy."),
    ).finally(() => setBusy(false));
  };
  const submitPayment = () => {
    setBusy(true);
    setError("");
    setPaymentMessage("");
    void processOrderPayment(orderNumber).then((result) => {
      setDetail(result);
      setPaymentMessage(`Kết quả thanh toán: ${label(paymentStatusText, result.order.paymentStatus)}.`);
    }).catch((problem: unknown) => {
      setError(problem instanceof Error ? problem.message : "Không thể xử lý thanh toán.");
    }).finally(() => setBusy(false));
  };
  const order = detail?.order;
  if (!orderNumber) return <Navigate to="/customer/orders" replace />;
  return <RoleGate audience="customer"><div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Tài khoản</p><h1>Chi tiết đơn hàng</h1></div><Link to="/customer/orders">← Đơn hàng của tôi</Link></div>
    {loading && <LoadingState message="Đang tải chi tiết đơn hàng…" />}
    {error && <p className="v2-inline-error" role="alert">{error}</p>}
    {paymentMessage && <p className="v2-inline-success" role="status">{paymentMessage}</p>}
    {detail && order && <OrderDetailView detail={detail}>
      {canRequestCancellation(order.status) && <Card title="Hủy đơn hàng"
        description="Đơn chưa giao có thể yêu cầu hủy. Cửa hàng sẽ xác nhận và hoàn tiền nếu bạn đã thanh toán.">
        <FormField label="Lý do hủy" htmlFor="cancellation-reason">
          <textarea id="cancellation-reason" className="v2-form-input" rows={3} maxLength={2000}
            placeholder="Ví dụ: đặt nhầm sản phẩm, muốn đổi cấu hình…"
            value={reason} onChange={(event) => setReason(event.target.value)} />
        </FormField>
        <SecondaryButton type="button" disabled={busy || !reason.trim()} onClick={submitCancellation}>
          {busy ? "Đang gửi…" : "Gửi yêu cầu hủy"}
        </SecondaryButton>
      </Card>}
      {order.paymentMethod === "SIMULATED_ONLINE"
        && ["UNPAID", "FAILED", "CANCELLED"].includes(order.paymentStatus)
        && <Card title="Thanh toán trực tuyến (thử nghiệm)">
        <p>Môi trường thử nghiệm: không có khoản tiền thật nào được thu.</p>
        <PrimaryButton type="button" disabled={busy} onClick={submitPayment}>
          {busy ? "Đang xử lý…" : "Thanh toán"}
        </PrimaryButton>
      </Card>}
    </OrderDetailView>}
  </div></RoleGate>;
}

const ORDER_STEPS = ["Đặt hàng", "Đã xác nhận", "Chuẩn bị hàng", "Đang giao", "Đã giao"];
const ORDER_STEP_INDEX: Partial<Record<OrderStatus, number>> = {
  PENDING_CONFIRMATION: 0, CONFIRMED: 1, PROCESSING: 2, READY_TO_SHIP: 2, SHIPPING: 3, DELIVERED: 4,
};

/** Progress bar for an order; cancelled orders show a notice instead. */
function OrderTracker({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED" || status === "CANCELLATION_REQUESTED") {
    return <p className={status === "CANCELLED" ? "v2-order-cancelled" : "v2-cart-notice"}>
      {status === "CANCELLED" ? "Đơn hàng đã được hủy." : "Yêu cầu hủy đơn đang chờ cửa hàng xử lý."}
    </p>;
  }
  const current = ORDER_STEP_INDEX[status] ?? 0;
  return <ol className="v2-order-tracker" aria-label="Tiến trình đơn hàng">
    {ORDER_STEPS.map((step, index) => <li key={step}
      className={index < current ? "is-done" : index === current ? "is-current" : undefined}
      aria-current={index === current ? "step" : undefined}>
      <span aria-hidden="true">{index < current ? "✓" : index + 1}</span>{step}
    </li>)}
  </ol>;
}

/** Shared by the customer's order page and the guest lookup. */
function OrderDetailView({ detail, children }: { detail: OrderDetail; children?: ReactNode }) {
  const order = detail.order;
  const showMoney = (value: number, currency: string | null = order.currencyCode) =>
    formatOrderMoney(value, currency, order.showFinancials);
  return <div className="v2-order-view">
    <Card title={`Đơn hàng ${order.orderNumber}`}
      description={`Đặt lúc ${formatOrderDate(order.placedAt)}`}
      action={<span className="v2-admin-badges">
        <Badge tone={orderTone(order.status)}>{label(orderStatusText, order.status)}</Badge>
        <Badge tone={paymentTone(order.paymentStatus)}>{label(paymentStatusText, order.paymentStatus)}</Badge>
      </span>}>
      <OrderTracker status={order.status} />
    </Card>
    <OrderPaymentInstructions detail={detail} />
    <div className="v2-account-grid">
      <Card title="Thông tin nhận hàng">
        <dl className="v2-cart-summary">
          <div><dt>Người nhận</dt><dd>{order.customerName}</dd></div>
          <div><dt>Điện thoại</dt><dd>{order.customerPhone}</dd></div>
          {order.customerEmail && <div><dt>Email</dt><dd>{order.customerEmail}</dd></div>}
          <div><dt>Địa chỉ</dt><dd>{[detail.shippingAddress, detail.shippingRegion, detail.shippingPostalCode].filter(Boolean).join(", ")}</dd></div>
          {order.shippingCarrier && <div><dt>Đơn vị vận chuyển</dt><dd>{order.shippingCarrier}</dd></div>}
          {order.trackingNumber && <div><dt>Mã vận đơn</dt><dd>{order.trackingNumber}</dd></div>}
        </dl>
      </Card>
      <Card title="Thanh toán">
        <dl className="v2-cart-summary">
          <div><dt>Phương thức</dt><dd>{label(paymentMethodText, order.paymentMethod)}</dd></div>
          <div><dt>Tạm tính</dt><dd>{showMoney(detail.subtotal + detail.discountAmount)}</dd></div>
          {detail.discountAmount > 0 && <div className="is-saving"><dt>Giảm giá</dt><dd>−{showMoney(detail.discountAmount)}</dd></div>}
          <div><dt>Phí vận chuyển</dt><dd>{detail.shippingFee > 0 ? showMoney(detail.shippingFee) : "Miễn phí"}</dd></div>
          <div className="is-total"><dt>Tổng cộng</dt><dd>{showMoney(order.total)}</dd></div>
        </dl>
      </Card>
    </div>
    <Card title={`Sản phẩm (${detail.items.reduce((sum, item) => sum + item.quantity, 0)})`}>
      {detail.items.length ? <ul className="v2-order-result-items">{detail.items.map((item, index) => <li key={`${item.productName}-${index}`}>
        <span>{item.productName} <small>× {item.quantity} · {showMoney(item.unitPrice, item.currencyCode)}</small></span>
        <strong>{showMoney(item.lineTotal, item.currencyCode)}</strong>
      </li>)}</ul> : <p className="v2-muted">Đơn hàng không có sản phẩm.</p>}
    </Card>
    <Card title="Lịch sử đơn hàng">
      {detail.statusHistory.length ? <ol className="v2-account-history">{[...detail.statusHistory].reverse().map((entry, index) => <li key={`${entry.createdAt}-${index}`}>
        <strong>{label(historyActionText, entry.action)}{entry.newStatus && entry.newStatus !== entry.previousStatus
          ? ` · ${label(orderStatusText, entry.newStatus)}` : ""}</strong>
        <small>{formatOrderDate(entry.createdAt)} · {entry.actorRole === "CUSTOMER" || entry.actorRole === "GUEST" ? "Khách hàng" : "Cửa hàng"}</small>
        {entry.note && <span>{entry.note}</span>}
      </li>)}</ol> : <p className="v2-muted">Chưa có cập nhật.</p>}
    </Card>
    {children}
  </div>;
}

function canRequestCancellation(status: OrderStatus): boolean {
  return ["PENDING_CONFIRMATION", "CONFIRMED", "PROCESSING", "READY_TO_SHIP"].includes(status);
}

function formatOrderDate(value: string): string {
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value
    : date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatOrderMoney(value: number, currencyCode: string | null, verified: boolean): string {
  if (!verified || !currencyCode || !/^[A-Z]{3}$/.test(currencyCode)) return "Chưa xác minh";
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: currencyCode }).format(value);
  } catch {
    return "Chưa xác minh";
  }
}
