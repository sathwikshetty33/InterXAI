import React from "react";
import Logo from "../../ui/Logo";
import Button from "../../ui/Button";
import { useProfileSetup } from "./hooks/useProfileSetup";
import type { UserResponse } from "../../services/user.service";

export interface ProfileSetupPageProps {
  userId: number;
  token: string;
  username: string;
  onComplete: (user: UserResponse) => void;
}

const ProfileSetupPage: React.FC<ProfileSetupPageProps> = ({
  userId,
  token,
  username,
  onComplete,
}) => {
  const { form, isLoading, error, handleChange, handleSubmit, handleSkip } =
    useProfileSetup(userId, token, onComplete);

  return (
    <div
      id="profile-setup-page"
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        fontFamily: "var(--font-body)",
        color: "var(--ink)",
        position: "relative",
      }}
    >
      <nav
        style={{
          borderBottom: "1px solid var(--line)",
          background: "color-mix(in srgb, var(--paper) 82%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div
          className="ix-container"
          style={{
            display: "flex",
            alignItems: "center",
            height: 64,
          }}
        >
          <Logo size={19} />
        </div>
      </nav>

      <section
        className="ix-container"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 56,
          alignItems: "center",
          minHeight: "calc(100vh - 65px)",
          padding: "48px 24px",
        }}
      >
        {/* LEFT: welcome */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <Eyebrow>Almost there</Eyebrow>
          <h1
            className="ix-reveal"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(34px, 4.5vw, 52px)",
              fontWeight: 600,
              lineHeight: 1.04,
              color: "var(--ink)",
              margin: "18px 0 14px",
              letterSpacing: "-1.6px",
            }}
          >
            Welcome,
            <br />
            <span style={{ color: "var(--signal-strong)" }}>{username}.</span>
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "var(--muted)",
              lineHeight: 1.6,
              maxWidth: 440,
              margin: "0 0 28px",
            }}
          >
            One last step — round out your profile so organizations can find
            you. Everything here is optional and editable later.
          </p>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {[
              "Add links recruiters actually check",
              "Tell your story in a short bio",
              "Skip now, complete it anytime",
            ].map((line) => (
              <li
                key={line}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 14.5,
                  color: "var(--ink-2)",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "var(--signal-tint)",
                    color: "var(--signal-strong)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <CheckIcon />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT: form card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="ix-reveal"
            style={{
              width: "100%",
              maxWidth: 480,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              padding: 32,
              boxShadow: "var(--shadow-md)",
            }}
          >
            <StepIndicator current={2} total={3} />

            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 23,
                fontWeight: 600,
                color: "var(--ink)",
                letterSpacing: "-0.6px",
                margin: "0 0 4px",
              }}
            >
              Set up your profile
            </h2>
            <p
              style={{
                fontSize: 13.5,
                color: "var(--muted)",
                margin: "0 0 22px",
              }}
            >
              All fields are optional · you can change these anytime
            </p>

            <form onSubmit={handleSubmit} noValidate>
              {error && <ErrorAlert message={error} />}

              <FormField
                id="setup-bio"
                name="bio"
                label="Short bio"
                placeholder="Tell recruiters about yourself — your focus, what you're learning…"
                value={form.bio}
                onChange={handleChange}
                disabled={isLoading}
                textarea
                icon={<PersonIcon />}
              />

              <FormField
                id="setup-github"
                name="github"
                label="GitHub"
                placeholder="https://github.com/yourhandle"
                type="url"
                value={form.github}
                onChange={handleChange}
                disabled={isLoading}
                icon={<GithubIcon />}
              />

              <FormField
                id="setup-linkedin"
                name="linkedin"
                label="LinkedIn"
                placeholder="https://linkedin.com/in/yourhandle"
                type="url"
                value={form.linkedin}
                onChange={handleChange}
                disabled={isLoading}
                icon={<LinkedInIcon />}
              />

              <FormField
                id="setup-leetcode"
                name="leetcode"
                label="LeetCode"
                placeholder="https://leetcode.com/yourhandle"
                type="url"
                value={form.leetcode}
                onChange={handleChange}
                disabled={isLoading}
                icon={<CodeIcon />}
              />

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <Button
                  type="submit"
                  variant="signal"
                  size="lg"
                  disabled={isLoading}
                  style={{ flex: 1 }}
                >
                  {isLoading ? (
                    <>
                      <Spinner /> Saving…
                    </>
                  ) : (
                    <>
                      Save and continue
                      <ArrowIcon />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  id="profile-setup-skip"
                  variant="ghost"
                  size="lg"
                  onClick={handleSkip}
                  disabled={isLoading}
                >
                  Skip
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

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

const StepIndicator: React.FC<{ current: number; total: number }> = ({
  current,
  total,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginBottom: 22,
    }}
  >
    {Array.from({ length: total }).map((_, i) => {
      const step = i + 1;
      const done = step < current;
      const active = step === current;
      return (
        <React.Fragment key={i}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: done
                ? "var(--ink)"
                : active
                  ? "var(--surface)"
                  : "var(--surface-2)",
              color: done
                ? "var(--paper)"
                : active
                  ? "var(--signal-strong)"
                  : "var(--muted-2)",
              border: active
                ? "2px solid var(--signal)"
                : done
                  ? "2px solid var(--ink)"
                  : "1px solid var(--line-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
            }}
          >
            {done ? <CheckIcon /> : step}
          </div>
          {i < total - 1 && (
            <div
              style={{
                height: 2,
                width: 26,
                background: done ? "var(--ink)" : "var(--line-strong)",
                borderRadius: 1,
              }}
            />
          )}
        </React.Fragment>
      );
    })}
    <span
      style={{
        marginLeft: 8,
        fontSize: 11.5,
        fontWeight: 700,
        color: "var(--muted)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontFamily: "var(--font-mono)",
      }}
    >
      Step {current} of {total}
    </span>
  </div>
);

interface FormFieldProps extends React.InputHTMLAttributes<
  HTMLInputElement | HTMLTextAreaElement
> {
  label: string;
  id: string;
  icon?: React.ReactNode;
  textarea?: boolean;
}

const FIELD_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--surface-2)",
  border: "1px solid var(--line-strong)",
  borderRadius: "var(--radius-sm)",
  padding: "11px 14px",
  fontSize: 14,
  color: "var(--ink)",
  outline: "none",
  transition: "border-color 0.16s ease, box-shadow 0.16s ease",
  fontFamily: "var(--font-body)",
};

function focusField(el: HTMLInputElement | HTMLTextAreaElement) {
  el.style.borderColor = "var(--signal)";
  el.style.boxShadow = "0 0 0 3px var(--signal-tint)";
}
function blurField(el: HTMLInputElement | HTMLTextAreaElement) {
  el.style.borderColor = "var(--line-strong)";
  el.style.boxShadow = "none";
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  icon,
  textarea,
  type = "text",
  ...props
}) => (
  <div style={{ marginBottom: 14 }}>
    <label
      htmlFor={id}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12.5,
        fontWeight: 600,
        color: "var(--muted)",
        marginBottom: 6,
      }}
    >
      <span style={{ color: "var(--muted-2)", display: "flex" }}>{icon}</span>
      {label}
      <span
        style={{
          marginLeft: "auto",
          fontSize: 11,
          color: "var(--muted-2)",
          fontWeight: 500,
        }}
      >
        optional
      </span>
    </label>
    {textarea ? (
      <textarea
        id={id}
        rows={3}
        style={{ ...FIELD_STYLE, resize: "vertical" }}
        onFocus={(e) => focusField(e.currentTarget)}
        onBlur={(e) => blurField(e.currentTarget)}
        {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
    ) : (
      <input
        id={id}
        type={type}
        style={FIELD_STYLE}
        onFocus={(e) => focusField(e.currentTarget)}
        onBlur={(e) => blurField(e.currentTarget)}
        {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
      />
    )}
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

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path
      d="M2.5 6.2l2.2 2.3L9.5 3.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
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

const PersonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M2 12.5c0-2.76 2.24-5 5-5s5 2.24 5 5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const GithubIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <path d="M7 1a6 6 0 00-1.9 11.69c.3.06.41-.13.41-.29V11.1c-1.67.36-2.02-.8-2.02-.8A1.59 1.59 0 002.8 9.4c-.53-.36.04-.35.04-.35a1.26 1.26 0 01.92.62 1.28 1.28 0 001.75.5 1.28 1.28 0 01.38-.8C4.37 9.18 2.86 8.63 2.86 6.16a2.3 2.3 0 01.6-1.6 2.12 2.12 0 01.06-1.58s.5-.16 1.63.6a5.57 5.57 0 013 0c1.13-.76 1.62-.6 1.62-.6a2.12 2.12 0 01.07 1.58 2.3 2.3 0 01.6 1.6c0 2.48-1.51 3.02-2.95 3.18a1.43 1.43 0 01.41 1.12v1.66c0 .16.1.35.41.29A6 6 0 007 1z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <rect x="1" y="4.5" width="2.5" height="8" rx="0.5" />
    <circle cx="2.25" cy="2.25" r="1.25" />
    <path d="M5 4.5h2.4v1.1h.03A2.63 2.63 0 019.8 4.3C12.04 4.3 12.5 5.77 12.5 7.7v4.8H10V8.1c0-.9-.02-2.05-1.25-2.05-1.25 0-1.44.98-1.44 1.98v4.5H5V4.5z" />
  </svg>
);

const CodeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M4.5 4L1.5 7l3 3M9.5 4l3 3-3 3M8.5 2l-3 10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default ProfileSetupPage;
