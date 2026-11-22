import { forwardRef, useState } from "react";
import type { CSSProperties } from "react";

/**
 * Digit code field drawn as separate boxes (email codes, PINs). It is one real input underneath,
 * so paste, autofill of one-time codes, the numeric keypad and screen readers all work normally.
 */
export const CodeInput = forwardRef<HTMLInputElement, {
  id: string;
  length: number;
  value: string;
  onChange: (value: string) => void;
  /** Called once the last digit is typed or pasted. */
  onComplete?: (value: string) => void;
  label: string;
  masked?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  invalid?: boolean;
}>(function CodeInput({
  id, length, value, onChange, onComplete, label, masked = false, autoComplete = "off", autoFocus, disabled, invalid,
}, ref) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hidden = masked && !revealed;
  const active = Math.min(value.length, length - 1);
  return <div className={`v2-code-input${focused ? " is-focused" : ""}${invalid ? " is-invalid" : ""}${disabled ? " is-disabled" : ""}`}
    style={{ "--v2-code-length": length } as CSSProperties} data-length={length}>
    <div className="v2-code-input-box">
      <input
        ref={ref}
        id={id}
        type={hidden ? "password" : "text"}
        inputMode="numeric"
        pattern={`\\d{${length}}`}
        maxLength={length}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        aria-label={label}
        aria-invalid={invalid || undefined}
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, "").slice(0, length);
          onChange(next);
          if (next.length === length && next !== value) onComplete?.(next);
        }}
      />
      <div className="v2-code-input-cells" aria-hidden="true">
        {Array.from({ length }, (_, index) => {
          const filled = index < value.length;
          const classes = [filled ? "is-filled" : "", focused && index === active ? "is-active" : ""].filter(Boolean).join(" ");
          return <span key={index} className={classes || undefined}>{filled ? (hidden ? "•" : value[index]) : ""}</span>;
        })}
      </div>
    </div>
    {masked && <button type="button" className="v2-code-input-toggle" onClick={() => setRevealed((current) => !current)}
      aria-pressed={revealed} aria-label={revealed ? "Ẩn mã" : "Hiện mã"}>{revealed ? "Ẩn" : "Hiện"}</button>}
  </div>;
});
