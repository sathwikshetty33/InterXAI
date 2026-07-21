import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "signal" | "ghost" | "quiet";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const PAD: Record<Size, string> = {
  sm: "8px 14px",
  md: "11px 20px",
  lg: "14px 26px",
};
const FONT: Record<Size, number> = { sm: 13, md: 14, lg: 15.5 };

const VARIANTS: Record<Variant, React.CSSProperties> = {
  // Ink is the workhorse action; amber "signal" is reserved for the single
  // most important CTA on a surface so it stays meaningful.
  primary: {
    background: "var(--ink)",
    color: "var(--paper)",
    border: "1px solid var(--ink)",
  },
  signal: {
    background: "var(--signal)",
    color: "var(--ink)",
    border: "1px solid var(--signal-strong)",
  },
  ghost: {
    background: "transparent",
    color: "var(--ink)",
    border: "1px solid var(--line-strong)",
  },
  quiet: {
    background: "transparent",
    color: "var(--muted)",
    border: "1px solid transparent",
  },
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        padding: PAD[size],
        fontSize: FONT[size],
        fontWeight: 600,
        fontFamily: "var(--font-body)",
        borderRadius: 999,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        letterSpacing: "-0.1px",
        transition:
          "transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease",
        whiteSpace: "nowrap",
        ...VARIANTS[variant],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(-1px)";
        if (variant === "primary" || variant === "signal")
          e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {children}
    </button>
  );
}
