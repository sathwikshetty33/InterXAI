import React, { useState } from "react";
import Logo from "../../ui/Logo";
import Button from "../../ui/Button";
import { useOrgLogin } from "./hooks/useOrgLogin";
import { useOrgSignup } from "./hooks/useOrgSignup";
import type { OrgSignupResponse } from "../../services/organization.service";

type Tab = "login" | "signup";

export interface OrgAuthPageProps {
  onLoginSuccess?: (token: string) => void;
  onSignupSuccess?: (data: OrgSignupResponse) => void;
  onBack?: () => void;
}

const ORG_BENEFITS = [
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 12l3-3 4 4 8-8M21 4v8h-8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Screen 10x faster",
    desc: "Run async AI interviews at scale — no scheduler, no recruiter time.",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 7L9 18l-5-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Standardised scoring",
    desc: "Identical evaluation rubric for every candidate, every role.",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "SOC 2 ready",
    desc: "Enterprise-grade security and audit logs out of the box.",
  },
];

const OrgAuthPage: React.FC<OrgAuthPageProps> = ({
  onLoginSuccess,
  onSignupSuccess,
  onBack,
}) => {
  const [tab, setTab] = useState<Tab>("signup");
  const loginHook = useOrgLogin(onLoginSuccess);
  const signupHook = useOrgSignup(onSignupSuccess);

  return (
    <div
      id="org-auth-page"
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        fontFamily: "var(--font-body)",
        position: "relative",
      }}
    >
      <TopNav onBack={onBack} />

      <section
        className="ix-container ix-hero-grid"
        style={{
          padding: "24px 24px 56px",
          alignItems: "center",
          minHeight: "calc(100vh - 88px)",
        }}
      >
        {/* LEFT: hiring-focused marketing */}
        <div>
          <Eyebrow>Admin portal</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(38px, 5vw, 56px)",
              fontWeight: 600,
              lineHeight: 1.04,
              color: "var(--ink)",
              margin: "16px 0 16px",
              letterSpacing: "-1.6px",
            }}
          >
            Hire the best.
            <br />
            <span
              style={{
                color: "var(--signal-strong)",
                fontStyle: "italic",
                fontWeight: 500,
              }}
            >
              Skip the noise.
            </span>
          </h1>
          <p
            style={{
              fontSize: 16.5,
              color: "var(--muted)",
              lineHeight: 1.6,
              marginBottom: 32,
              maxWidth: 460,
            }}
          >
            Sign in to build interviews, review candidates, and read the ranked
            leaderboard once sessions complete.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginBottom: 34,
              maxWidth: 460,
            }}
          >
            {ORG_BENEFITS.map((b) => (
              <div
                key={b.title}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "14px 16px",
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    flexShrink: 0,
                    borderRadius: "var(--radius-sm)",
                    background: "var(--surface-2)",
                    color: "var(--ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--line)",
                  }}
                >
                  {b.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--ink)",
                      marginBottom: 2,
                    }}
                  >
                    {b.title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    {b.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <TrustedRow />
        </div>

        {/* RIGHT: auth card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 460,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              padding: 32,
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              role="tablist"
              aria-label="Auth mode"
              style={{
                display: "flex",
                gap: 4,
                padding: 4,
                background: "var(--surface-2)",
                borderRadius: 999,
                border: "1px solid var(--line)",
                marginBottom: 22,
              }}
            >
              {(["signup", "login"] as Tab[]).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  id={`org-tab-${t}`}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "var(--font-body)",
                    border: "none",
                    cursor: "pointer",
                    background: tab === t ? "var(--ink)" : "transparent",
                    color: tab === t ? "var(--paper)" : "var(--muted)",
                    transition: "all 0.18s ease",
                  }}
                >
                  {t === "signup" ? "Create admin" : "Sign in"}
                </button>
              ))}
            </div>

            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 23,
                fontWeight: 600,
                color: "var(--ink)",
                letterSpacing: "-0.6px",
                marginBottom: 4,
              }}
            >
              {tab === "signup" ? "Register your company" : "Welcome back"}
            </h2>
            <p
              style={{
                fontSize: 13.5,
                color: "var(--muted)",
                marginBottom: 22,
              }}
            >
              {tab === "signup"
                ? "Free for the first 5 candidates · No credit card"
                : "Sign in to manage your hiring pipeline"}
            </p>

            {tab === "signup" ? (
              <OrgSignupInline
                hook={signupHook}
                onLoginClick={() => setTab("login")}
              />
            ) : (
              <OrgLoginInline
                hook={loginHook}
                onSignupClick={() => setTab("signup")}
              />
            )}
          </div>

          <p
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "var(--muted-2)",
              marginTop: 16,
              maxWidth: 380,
              lineHeight: 1.5,
            }}
          >
            By continuing you agree to our{" "}
            <a href="#terms" style={linkStyle}>
              Terms
            </a>{" "}
            and{" "}
            <a href="#privacy" style={linkStyle}>
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
};

interface OrgSignupInlineProps {
  hook: ReturnType<typeof useOrgSignup>;
  onLoginClick: () => void;
}

const OrgSignupInline: React.FC<OrgSignupInlineProps> = ({
  hook,
  onLoginClick,
}) => (
  <form id="org-signup-form" onSubmit={hook.handleSubmit} noValidate>
    {hook.error && <ErrorAlert message={hook.error} />}

    <LightInput
      id="org-signup-username"
      name="username"
      label="Admin username"
      type="text"
      placeholder="acme_corp"
      autoComplete="username"
      value={hook.form.username}
      onChange={hook.handleChange}
      disabled={hook.isLoading}
      icon={<BuildingIcon />}
      required
    />
    <LightInput
      id="org-signup-email"
      name="email"
      label="Work email"
      type="email"
      placeholder="hr@acme.com"
      autoComplete="email"
      value={hook.form.email}
      onChange={hook.handleChange}
      disabled={hook.isLoading}
      icon={<MailIcon />}
      required
    />
    <LightInput
      id="org-signup-password"
      name="password"
      label="Password"
      type="password"
      placeholder="Min. 8 characters"
      autoComplete="new-password"
      value={hook.form.password}
      onChange={hook.handleChange}
      disabled={hook.isLoading}
      icon={<LockIcon />}
      required
    />
    <LightInput
      id="org-signup-confirm-password"
      name="confirmPassword"
      label="Confirm password"
      type="password"
      placeholder="Re-enter password"
      autoComplete="new-password"
      value={hook.form.confirmPassword}
      onChange={hook.handleChange}
      disabled={hook.isLoading}
      icon={<LockIcon />}
      required
    />

    <div style={{ marginTop: 8 }}>
      <SubmitButton disabled={hook.isLoading}>
        {hook.isLoading ? (
          <>
            <Spinner /> Creating account…
          </>
        ) : (
          <>
            Create admin account
            <ArrowIcon />
          </>
        )}
      </SubmitButton>
    </div>

    <p
      style={{
        textAlign: "center",
        fontSize: 13.5,
        color: "var(--muted)",
        marginTop: 18,
        paddingTop: 18,
        borderTop: "1px solid var(--line)",
      }}
    >
      Already have an account?{" "}
      <button type="button" onClick={onLoginClick} style={inlineLinkBtn}>
        Sign in
      </button>
    </p>
  </form>
);

interface OrgLoginInlineProps {
  hook: ReturnType<typeof useOrgLogin>;
  onSignupClick: () => void;
}

const OrgLoginInline: React.FC<OrgLoginInlineProps> = ({
  hook,
  onSignupClick,
}) => (
  <form id="org-login-form" onSubmit={hook.handleSubmit} noValidate>
    {hook.error && <ErrorAlert message={hook.error} />}

    <LightInput
      id="org-login-username"
      name="username"
      label="Username"
      type="text"
      placeholder="org_username"
      autoComplete="username"
      value={hook.form.username}
      onChange={hook.handleChange}
      disabled={hook.isLoading}
      icon={<BuildingIcon />}
      required
    />
    <LightInput
      id="org-login-password"
      name="password"
      label="Password"
      type="password"
      placeholder="••••••••"
      autoComplete="current-password"
      value={hook.form.password}
      onChange={hook.handleChange}
      disabled={hook.isLoading}
      icon={<LockIcon />}
      required
    />

    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: 8,
        marginTop: -6,
      }}
    >
      <a href="#forgot" style={{ ...linkStyle, fontSize: 12, fontWeight: 600 }}>
        Forgot password?
      </a>
    </div>

    <SubmitButton disabled={hook.isLoading}>
      {hook.isLoading ? (
        <>
          <Spinner /> Signing in…
        </>
      ) : (
        <>
          Sign in
          <ArrowIcon />
        </>
      )}
    </SubmitButton>

    <p
      style={{
        textAlign: "center",
        fontSize: 13.5,
        color: "var(--muted)",
        marginTop: 18,
        paddingTop: 18,
        borderTop: "1px solid var(--line)",
      }}
    >
      Don't have an account?{" "}
      <button type="button" onClick={onSignupClick} style={inlineLinkBtn}>
        Register an admin account
      </button>
    </p>
  </form>
);

const TopNav: React.FC<{ onBack?: () => void }> = ({ onBack }) => (
  <nav
    className="ix-container"
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: 64,
    }}
  >
    <button
      onClick={onBack}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0,
        display: "flex",
        alignItems: "center",
      }}
    >
      <Logo size={19} />
    </button>
    {onBack && (
      <Button variant="ghost" size="sm" onClick={onBack}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M9 3L5 7l4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to home
      </Button>
    )}
  </nav>
);

const Eyebrow: React.FC<{ children: string }> = ({ children }) => (
  <span
    style={{
      display: "inline-block",
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--signal-strong)",
    }}
  >
    {children}
  </span>
);

const TrustedRow = () => (
  <div>
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 700,
        color: "var(--muted-2)",
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        marginBottom: 12,
      }}
    >
      Trusted by hiring teams at
    </div>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        opacity: 0.7,
        flexWrap: "wrap",
        color: "var(--muted)",
      }}
    >
      <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.5px" }}>
        Google
      </span>
      <span style={{ fontSize: 16, fontWeight: 700 }}>Microsoft</span>
      <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-1px" }}>
        amazon
      </span>
      <span style={{ fontSize: 16, fontWeight: 700 }}>Meta</span>
      <span style={{ fontSize: 16, fontWeight: 700 }}>Stripe</span>
    </div>
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
      border: "1px solid var(--negative)",
      color: "var(--negative)",
      fontSize: 13,
      fontWeight: 500,
      marginBottom: 14,
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

interface LightInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  icon?: React.ReactNode;
}

const LightInput: React.FC<LightInputProps> = ({
  label,
  id,
  type = "text",
  icon,
  ...props
}) => {
  const [revealed, setRevealed] = React.useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (revealed ? "text" : "password") : type;

  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--muted)",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {icon && (
          <div
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted-2)",
              display: "flex",
              pointerEvents: "none",
            }}
          >
            {icon}
          </div>
        )}
        <input
          id={id}
          type={inputType}
          style={{
            width: "100%",
            background: "var(--surface)",
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--radius-sm)",
            padding: "11px 14px",
            paddingLeft: icon ? 38 : 14,
            paddingRight: isPassword ? 40 : 14,
            fontSize: 14,
            color: "var(--ink)",
            outline: "none",
            fontFamily: "var(--font-body)",
            transition: "border-color 0.18s ease, box-shadow 0.18s ease",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--signal)";
            e.currentTarget.style.boxShadow = "0 0 0 3px var(--signal-tint)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--line-strong)";
            e.currentTarget.style.boxShadow = "none";
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

const SubmitButton: React.FC<{
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ disabled, children }) => (
  <Button
    type="submit"
    variant="primary"
    size="lg"
    disabled={disabled}
    style={{ width: "100%", marginTop: 8 }}
  >
    {children}
  </Button>
);

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M2 7h10M8 3l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.7"
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

const BuildingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h.01M9 13h.01M9 17h.01"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path
      d="M4 4h16c1.1 0 2 .9 2 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 6l-10 7L2 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect
      x="3"
      y="11"
      width="18"
      height="11"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M7 11V7a5 5 0 0110 0v4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const linkStyle: React.CSSProperties = {
  color: "var(--signal-strong)",
  textDecoration: "none",
  fontWeight: 600,
};

const inlineLinkBtn: React.CSSProperties = {
  color: "var(--signal-strong)",
  background: "transparent",
  border: "none",
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
  fontFamily: "var(--font-body)",
  fontSize: "inherit",
};

export default OrgAuthPage;
