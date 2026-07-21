import React from "react";
import Logo from "../../ui/Logo";
import Button from "../../ui/Button";
import ScoreMeter from "../../ui/ScoreMeter";
import { useSignup } from "./hooks/useSignup";
import { startGoogleOAuth } from "../../services/auth.service";
import type { TokenResponse } from "../../services/auth.service";
import "./auth.css";

export interface SignupPageProps {
  onSignupSuccess?: (data: TokenResponse) => void;
  onLoginClick?: () => void;
  onBack?: () => void;
}

const BENEFITS = [
  {
    title: "AI-led interviews",
    desc: "Realistic, adaptive sessions on demand.",
  },
  {
    title: "Scored on every round",
    desc: "Clarity, structure, and code — measured 0–10.",
  },
  {
    title: "Track your growth",
    desc: "Watch your signal climb across sessions.",
  },
];

const SignupPage: React.FC<SignupPageProps> = ({
  onSignupSuccess,
  onLoginClick,
  onBack,
}) => {
  const { form, isLoading, error, handleChange, handleSubmit } =
    useSignup(onSignupSuccess);

  return (
    <div
      id="signup-page"
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        color: "var(--ink)",
        fontFamily: "var(--font-body)",
      }}
    >
      <TopNav onBack={onBack} />

      <section className="auth-grid">
        {/* LEFT: accent side panel echoing the landing hero */}
        <AccentPanel />

        {/* RIGHT: the sign-up card */}
        <div className="auth-card-wrap">
          <div
            className="ix-reveal"
            style={{
              width: "100%",
              maxWidth: 420,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              padding: 32,
              boxShadow: "var(--shadow-md)",
            }}
          >
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 26,
                letterSpacing: "-0.8px",
                color: "var(--ink)",
                margin: 0,
              }}
            >
              Create your account
            </h1>
            <p
              style={{
                fontSize: 14.5,
                lineHeight: 1.5,
                color: "var(--muted)",
                margin: "8px 0 24px",
              }}
            >
              Free to start. No credit card required.
            </p>

            <SocialAuthRow disabled={isLoading} />

            <Divider label="or sign up with email" />

            <form onSubmit={handleSubmit} noValidate>
              {error && <ErrorAlert message={error} />}

              <Field
                id="signup-fullname"
                name="fullName"
                label="Full name"
                type="text"
                placeholder="Jane Doe"
                autoComplete="name"
                value={form.fullName}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
              <Field
                id="signup-email"
                name="email"
                label="Email address"
                type="email"
                placeholder="jane@example.com"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
              <Field
                id="signup-password"
                name="password"
                label="Password"
                type="password"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                disabled={isLoading}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isLoading}
                style={{
                  width: "100%",
                  marginTop: 4,
                  borderRadius: "var(--radius)",
                }}
              >
                {isLoading ? (
                  <>
                    <Spinner /> Creating account…
                  </>
                ) : (
                  <>
                    Create account
                    <Arrow />
                  </>
                )}
              </Button>
            </form>

            <p
              style={{
                textAlign: "center",
                fontSize: 12,
                color: "var(--muted-2)",
                marginTop: 16,
                lineHeight: 1.5,
              }}
            >
              By signing up, you agree to our{" "}
              <a
                href="#terms"
                style={{ color: "var(--ink)", textDecoration: "none" }}
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="#privacy"
                style={{ color: "var(--ink)", textDecoration: "none" }}
              >
                Privacy Policy
              </a>
              .
            </p>

            <div
              style={{
                marginTop: 18,
                paddingTop: 20,
                borderTop: "1px solid var(--line)",
                textAlign: "center",
                fontSize: 14,
                color: "var(--muted)",
              }}
            >
              Already have an account?{" "}
              <button
                type="button"
                onClick={onLoginClick}
                style={{
                  color: "var(--ink)",
                  background: "transparent",
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                }}
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// ── Accent side panel: a dark ink hero echoing the landing hero ────────────────

const AccentPanel = () => (
  <div
    className="auth-panel"
    style={{
      position: "relative",
      background: "var(--ink)",
      color: "var(--paper)",
      borderRadius: "var(--radius-lg)",
      padding: 40,
      minHeight: 460,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      overflow: "hidden",
      boxShadow: "var(--shadow-lg)",
    }}
  >
    <div>
      <span
        style={{
          display: "inline-block",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--signal)",
        }}
      >
        Candidate portal
      </span>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: "clamp(30px, 3.4vw, 42px)",
          letterSpacing: "-1.4px",
          lineHeight: 1.05,
          margin: "18px 0 0",
        }}
      >
        Get measured{" "}
        <span
          style={{
            color: "var(--signal)",
            fontStyle: "italic",
            fontWeight: 500,
          }}
        >
          fairly.
        </span>
      </h2>
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.6,
          color: "color-mix(in srgb, var(--paper) 72%, transparent)",
          maxWidth: 360,
          margin: "16px 0 28px",
        }}
      >
        Run AI-led interviews, get scored on every round, and grow your
        confidence — all in one place.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {BENEFITS.map((b) => (
          <div
            key={b.title}
            style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
          >
            <span
              style={{
                marginTop: 5,
                width: 6,
                height: 6,
                flexShrink: 0,
                borderRadius: "50%",
                background: "var(--signal)",
              }}
            />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{b.title}</div>
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "color-mix(in srgb, var(--paper) 62%, transparent)",
                }}
              >
                {b.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <ScoreCard />
  </div>
);

// A compact scored-answer card reusing the score-meter motif.
const ScoreCard = () => (
  <div
    style={{
      background: "var(--surface)",
      color: "var(--ink)",
      border: "1px solid var(--line)",
      borderRadius: "var(--radius)",
      padding: 18,
      boxShadow: "var(--shadow-md)",
    }}
  >
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.08em",
        color: "var(--muted-2)",
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      Evaluation
    </div>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <ScoreMeter score={8.4} size="lg" animate={false} />
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          padding: "6px 12px",
          borderRadius: 99,
          background: "var(--positive-tint)",
          color: "var(--positive)",
        }}
      >
        Recommend · Hire
      </span>
    </div>
  </div>
);

// ── Nav ───────────────────────────────────────────────────────────────────────

const TopNav: React.FC<{ onBack?: () => void }> = ({ onBack }) => (
  <nav
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "18px 24px",
      maxWidth: 1120,
      margin: "0 auto",
      borderBottom: "1px solid var(--line)",
    }}
  >
    <button
      onClick={onBack}
      style={{
        display: "flex",
        alignItems: "center",
        background: "transparent",
        border: "none",
        cursor: onBack ? "pointer" : "default",
        padding: 0,
      }}
    >
      <Logo size={19} />
    </button>
    {onBack && (
      <Button variant="ghost" size="sm" onClick={onBack}>
        <BackArrow />
        Back to home
      </Button>
    )}
  </nav>
);

// ── Social auth ────────────────────────────────────────────────────────────────

const SocialAuthRow: React.FC<{ disabled?: boolean }> = ({ disabled }) => (
  <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
    <SocialBtn disabled={disabled} label="Google" onClick={startGoogleOAuth}>
      <GoogleIcon />
    </SocialBtn>
    <SocialBtn disabled={disabled} label="LinkedIn">
      <LinkedInIcon />
    </SocialBtn>
  </div>
);

const SocialBtn: React.FC<{
  disabled?: boolean;
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ disabled, label, onClick, children }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "10px 12px",
      background: "var(--surface)",
      border: "1px solid var(--line-strong)",
      borderRadius: "var(--radius-sm)",
      color: "var(--ink)",
      fontSize: 13.5,
      fontWeight: 600,
      fontFamily: "var(--font-body)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1,
    }}
  >
    {children}
    {label}
  </button>
);

const Divider: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 20,
    }}
  >
    <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 700,
        color: "var(--muted-2)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
    <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
  </div>
);

const ErrorAlert: React.FC<{ message: string }> = ({ message }) => (
  <div
    role="alert"
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      padding: "10px 14px",
      borderRadius: "var(--radius-sm)",
      background: "var(--negative-tint)",
      border: "1px solid color-mix(in srgb, var(--negative) 35%, transparent)",
      color: "var(--negative)",
      fontSize: 13,
      fontWeight: 500,
      marginBottom: 16,
    }}
  >
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 5v3.5M8 11h.01"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
    <span>{message}</span>
  </div>
);

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

const Field: React.FC<FieldProps> = ({
  label,
  id,
  type = "text",
  ...props
}) => {
  const [revealed, setRevealed] = React.useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (revealed ? "text" : "password") : type;

  return (
    <div style={{ marginBottom: 16 }}>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--ink-2)",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={inputType}
          style={{
            width: "100%",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            padding: "11px 14px",
            paddingRight: isPassword ? 40 : 14,
            fontSize: 14,
            fontFamily: "var(--font-body)",
            color: "var(--ink)",
            outline: "none",
          }}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            tabIndex={-1}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: "var(--muted-2)",
              cursor: "pointer",
              padding: 0,
              display: "flex",
            }}
            aria-label={revealed ? "Hide password" : "Show password"}
          >
            {revealed ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M2 2l14 14M7.4 7.5A2.25 2.25 0 0011.5 11.6M5.2 5.3C3.2 6.5 1 9 1 9s3 5.5 8 5.5c1.5 0 2.9-.4 4.1-1.1M13.5 12.3C15.3 11 17 9 17 9S14 3.5 9 3.5c-.8 0-1.5.1-2.2.3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M1 9S4 3.5 9 3.5 17 9 17 9s-3 5.5-8 5.5S1 9 1 9z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <circle
                  cx="9"
                  cy="9"
                  r="2.25"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Icons ──────────────────────────────────────────────────────────────────────

const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
    <path
      d="M1 6h10M7 2l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BackArrow = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M9 3L5 7l4 4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Spinner = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    style={{ animation: "spin 1s linear infinite" }}
  >
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <circle
      cx="8"
      cy="8"
      r="6"
      stroke="currentColor"
      strokeWidth="2"
      strokeOpacity="0.25"
    />
    <path
      d="M14 8a6 6 0 00-6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
    <path
      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      fill="#4285F4"
    />
    <path
      d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
      fill="#34A853"
    />
    <path
      d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      fill="#FBBC05"
    />
    <path
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"
      fill="#EA4335"
    />
  </svg>
);

const LinkedInIcon = () => (
  <svg width="16" height="16" viewBox="0 0 18 18" fill="#0A66C2">
    <path d="M15.75 0H2.25A2.25 2.25 0 000 2.25v13.5A2.25 2.25 0 002.25 18h13.5A2.25 2.25 0 0018 15.75V2.25A2.25 2.25 0 0015.75 0zM5.625 15H3V6.75h2.625V15zm-1.312-9.45a1.519 1.519 0 110-3.037 1.519 1.519 0 010 3.037zM15 15h-2.625V10.5c0-.99-.018-2.263-1.378-2.263-1.381 0-1.593 1.078-1.593 2.19V15H6.779V6.75h2.52v1.163h.036c.35-.664 1.207-1.363 2.484-1.363 2.656 0 3.147 1.748 3.147 4.022V15H15z" />
  </svg>
);

export default SignupPage;
