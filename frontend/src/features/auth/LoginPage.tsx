import React from "react";
import Logo from "../../ui/Logo";
import Button from "../../ui/Button";
import ScoreMeter from "../../ui/ScoreMeter";
import { useLogin } from "./hooks/useLogin";
import { startGoogleOAuth } from "../../services/auth.service";
import type { TokenResponse } from "../../services/auth.service";
import "./auth.css";

export interface LoginPageProps {
  onLoginSuccess?: (data: TokenResponse) => void;
  onSignupClick?: () => void;
  onBack?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onSignupClick,
  onBack,
}) => {
  const { form, isLoading, error, handleChange, handleSubmit } =
    useLogin(onLoginSuccess);

  return (
    <div
      id="login-page"
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

        {/* RIGHT: the sign-in card */}
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
              Sign in
            </h1>
            <p
              style={{
                fontSize: 14.5,
                lineHeight: 1.5,
                color: "var(--muted)",
                margin: "8px 0 24px",
              }}
            >
              Welcome back. Pick up your interview prep where you left off.
            </p>

            <SocialAuthRow disabled={isLoading} />

            <Divider label="or sign in with username" />

            <form onSubmit={handleSubmit} noValidate>
              {error && <ErrorAlert message={error} />}

              <Field
                id="username"
                name="username"
                label="Username"
                type="text"
                placeholder="your_username"
                autoComplete="username"
                value={form.username}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
              <Field
                id="password"
                name="password"
                label="Password"
                type="password"
                placeholder="Your password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                disabled={isLoading}
                required
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  margin: "2px 0 20px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    style={{
                      width: 14,
                      height: 14,
                      accentColor: "var(--signal)",
                      cursor: "pointer",
                    }}
                  />
                  Remember me
                </label>
                <a
                  href="#forgot"
                  style={{
                    fontSize: 13,
                    color: "var(--ink)",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isLoading}
                style={{ width: "100%", borderRadius: "var(--radius)" }}
              >
                {isLoading ? (
                  <>
                    <Spinner /> Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <Arrow />
                  </>
                )}
              </Button>
            </form>

            <div
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: "1px solid var(--line)",
                textAlign: "center",
                fontSize: 14,
                color: "var(--muted)",
              }}
            >
              New to InterXAI?{" "}
              <button
                type="button"
                onClick={onSignupClick}
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
                Create an account
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// ── Accent side panel: a dark ink hero echoing the landing session motif ──────

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
        Welcome back.
      </h2>
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.6,
          color: "color-mix(in srgb, var(--paper) 72%, transparent)",
          maxWidth: 360,
          margin: "16px 0 0",
        }}
      >
        Every answer measured on the same rubric — questions, live coding, and
        résumé follow-ups, all scored 0–10.
      </p>
    </div>

    <LastSessionCard />
  </div>
);

// A compact "your last session" card reusing the score-meter motif.
const LastSessionCard = () => (
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
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 14.5,
          letterSpacing: "-0.3px",
        }}
      >
        Your last session
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          color: "var(--muted-2)",
        }}
      >
        3 rounds
      </span>
    </div>
    {[
      { name: "Questions", score: 8.4 },
      { name: "DSA", score: 7.2 },
      { name: "Résumé", score: 9.1 },
    ].map((r) => (
      <div
        key={r.name}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "8px 0",
          borderTop: "1px solid var(--line)",
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
          {r.name}
        </span>
        <ScoreMeter score={r.score} size="sm" animate={false} />
      </div>
    ))}
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

export default LoginPage;
