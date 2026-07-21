import React, { useMemo, useState } from "react";
import Logo from "../../ui/Logo";
import Button from "../../ui/Button";
import { useDashboard } from "./hooks/useDashboard";
import type {
  InterviewBasic,
  AppliedInterview,
  UserResponse,
} from "../../services/user.service";

export interface DashboardPageProps {
  user: UserResponse;
  token: string;
  onLogout: () => void;
  onAttemptInterview?: (interviewId: number) => void;
}

type Tab = "available" | "applied";

const STATUS_STYLES: Record<
  string,
  { bg: string; color: string; dot: string }
> = {
  pending: {
    bg: "var(--signal-tint)",
    color: "var(--signal-strong)",
    dot: "var(--signal)",
  },
  approved: {
    bg: "var(--positive-tint)",
    color: "var(--positive)",
    dot: "var(--positive)",
  },
  rejected: {
    bg: "var(--negative-tint)",
    color: "var(--negative)",
    dot: "var(--negative)",
  },
  completed: {
    bg: "var(--surface-2)",
    color: "var(--muted)",
    dot: "var(--muted-2)",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeRemaining(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { label: "Deadline passed", urgent: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return { label: `${days}d remaining`, urgent: days <= 2 };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return { label: `${hours}h remaining`, urgent: true };
}

const CARD_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: 16,
};

const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  token,
  onLogout,
  onAttemptInterview,
}) => {
  const [tab, setTab] = useState<Tab>("available");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [applyingToId, setApplyingToId] = useState<number | null>(null);
  const { available, applied, isLoading, error, refetch } = useDashboard(token);

  const displayName = user.username;
  const initials = displayName.slice(0, 2).toUpperCase();

  const filteredAvailable = useMemo(
    () =>
      available.filter((i) =>
        i.position.toLowerCase().includes(query.toLowerCase()),
      ),
    [available, query],
  );
  const filteredApplied = useMemo(
    () =>
      applied.filter((i) =>
        i.position.toLowerCase().includes(query.toLowerCase()),
      ),
    [applied, query],
  );

  const selectedInterview = useMemo(() => {
    if (selectedId == null) return null;
    return (
      available.find((i) => i.id === selectedId) ??
      applied.find((i) => i.id === selectedId) ??
      null
    );
  }, [selectedId, available, applied]);

  return (
    <div
      id="dashboard-page"
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        color: "var(--ink)",
        fontFamily: "var(--font-body)",
        position: "relative",
      }}
    >
      {/* Sticky top nav */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "color-mix(in srgb, var(--paper) 82%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            maxWidth: 1300,
            margin: "0 auto",
            padding: "12px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <Logo size={19} />

          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search interviews…"
          />

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--surface)",
                border: "1px solid var(--line-strong)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                color: "var(--muted)",
              }}
              aria-label="Notifications"
            >
              <BellIcon />
              <span
                style={{
                  position: "absolute",
                  top: 7,
                  right: 9,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--signal)",
                  border: "1.5px solid var(--paper)",
                }}
              />
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "4px 12px 4px 4px",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 99,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "var(--ink)",
                  color: "var(--paper)",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {initials}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "var(--ink)",
                    lineHeight: 1.2,
                  }}
                >
                  {displayName}
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    color: "var(--muted)",
                    lineHeight: 1.2,
                  }}
                >
                  {user.email}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              id="dashboard-logout"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 1300,
          margin: "0 auto",
          padding: "32px 32px 60px",
          display: "grid",
          gridTemplateColumns: selectedInterview ? "1fr 380px" : "1fr",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        <div>
          {/* Hero stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
              gap: 16,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                borderRadius: "var(--radius-lg)",
                padding: "24px 26px",
                boxShadow: "var(--shadow-md)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--signal)",
                }}
              >
                Today's focus
              </span>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  fontWeight: 600,
                  letterSpacing: "-0.6px",
                  margin: "12px 0 6px",
                }}
              >
                Welcome back, {displayName}
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  color: "color-mix(in srgb, var(--paper) 72%, transparent)",
                  lineHeight: 1.55,
                }}
              >
                You have {available.length} new interviews and{" "}
                {applied.filter((a) => a.status === "pending").length} awaiting
                review.
              </div>
            </div>

            <MetricCard
              label="Available"
              value={available.length}
              accent="var(--signal-strong)"
              icon={<BriefcaseIcon />}
            />
            <MetricCard
              label="Applied"
              value={applied.length}
              accent="var(--ink)"
              icon={<ClipboardIcon />}
            />
            <MetricCard
              label="Avg. score"
              value="82%"
              accent="var(--positive)"
              icon={<TrendIcon />}
            />
          </div>

          {/* Profile reminder */}
          {!user.profile?.bio && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 18px",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                marginBottom: 22,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-sm)",
                  background: "var(--signal-tint)",
                  color: "var(--signal-strong)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <InfoIcon />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "var(--ink)",
                  }}
                >
                  Your profile is incomplete
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--muted)",
                    marginTop: 2,
                  }}
                >
                  Add your bio and links so organizations can find you.
                </div>
              </div>
              <Button variant="primary" size="sm">
                Complete profile
                <ArrowIcon />
              </Button>
            </div>
          )}

          {/* Tab toggle */}
          <div
            role="tablist"
            style={{
              display: "inline-flex",
              padding: 4,
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              borderRadius: 99,
              marginBottom: 20,
            }}
          >
            {(["available", "applied"] as Tab[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                id={`tab-${t}`}
                onClick={() => setTab(t)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 99,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  border: "none",
                  cursor: "pointer",
                  background: tab === t ? "var(--ink)" : "transparent",
                  color: tab === t ? "var(--paper)" : "var(--muted)",
                  transition: "background 0.16s ease, color 0.16s ease",
                }}
              >
                {t === "available"
                  ? `Available · ${available.length}`
                  : `Applied · ${applied.length}`}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ marginBottom: 18 }}>
              <ErrorAlert message={error} />
              <button
                onClick={refetch}
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "var(--signal-strong)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Try again →
              </button>
            </div>
          )}

          {isLoading && (
            <div style={CARD_GRID}>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {!isLoading && !error && (
            <>
              {tab === "available" &&
                (filteredAvailable.length === 0 ? (
                  <EmptyState
                    icon={<BriefcaseIcon size={28} />}
                    title={
                      query
                        ? "No matches found"
                        : "No interviews available right now"
                    }
                    description={
                      query
                        ? `Try a different search term.`
                        : "Check back soon — new positions are added regularly."
                    }
                  />
                ) : (
                  <div style={CARD_GRID}>
                    {filteredAvailable.map((iv) => (
                      <AvailableCard
                        key={iv.id}
                        interview={iv}
                        selected={selectedId === iv.id}
                        onSelect={() =>
                          setSelectedId((p) => (p === iv.id ? null : iv.id))
                        }
                        onApply={() => setApplyingToId(iv.id)}
                      />
                    ))}
                  </div>
                ))}

              {tab === "applied" &&
                (filteredApplied.length === 0 ? (
                  <EmptyState
                    icon={<ClipboardIcon size={28} />}
                    title={
                      query
                        ? "No matches found"
                        : "You haven't applied to anything yet"
                    }
                    description={
                      query
                        ? "Try a different search term."
                        : "Browse available interviews and submit your first application."
                    }
                  />
                ) : (
                  <div style={CARD_GRID}>
                    {filteredApplied.map((iv) => (
                      <AppliedCard
                        key={iv.id}
                        interview={iv}
                        selected={selectedId === iv.id}
                        onSelect={() =>
                          setSelectedId((p) => (p === iv.id ? null : iv.id))
                        }
                        onAttempt={() => onAttemptInterview?.(iv.id)}
                      />
                    ))}
                  </div>
                ))}
            </>
          )}
        </div>

        {/* Detail panel */}
        {selectedInterview && (
          <aside
            style={{
              position: "sticky",
              top: 88,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              padding: 24,
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <Tag text={`Interview · #${selectedInterview.id}`} />
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  color: "var(--muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="Close details"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 2l8 8M10 2l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 21,
                fontWeight: 600,
                color: "var(--ink)",
                letterSpacing: "-0.6px",
                margin: "0 0 6px",
              }}
            >
              {selectedInterview.position}
            </h3>
            <p
              style={{
                fontSize: 12.5,
                color: "var(--muted)",
                fontWeight: 500,
                margin: "0 0 18px",
              }}
            >
              {selectedInterview.experience} experience
            </p>
            <div
              style={{
                fontSize: 13,
                color: "var(--ink-2)",
                lineHeight: 1.65,
                background: "var(--surface-2)",
                padding: 14,
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--line)",
                marginBottom: 18,
              }}
            >
              {selectedInterview.description}
            </div>

            <DetailRow
              icon={<CalendarIcon />}
              label="Interview window"
              value={`${formatDate(selectedInterview.start_time)} → ${formatDate(selectedInterview.end_time)}`}
            />
            <DetailRow
              icon={<ClockIcon />}
              label="Submission deadline"
              value={formatDate(selectedInterview.submission_deadline)}
            />
            {"status" in selectedInterview && (
              <DetailRow
                icon={<TrendIcon />}
                label="Status"
                value={
                  <StatusBadge
                    status={(selectedInterview as AppliedInterview).status}
                  />
                }
              />
            )}

            {/* Detail panel action button */}
            {"status" in selectedInterview ? (
              // Applied interview — only show Attempt if approved by org
              (selectedInterview as AppliedInterview).status === "approved" ? (
                <Button
                  id="detail-attempt-btn"
                  variant="signal"
                  size="lg"
                  onClick={() => onAttemptInterview?.(selectedInterview.id)}
                  style={{ marginTop: 18, width: "100%" }}
                >
                  Attempt interview
                  <ArrowIcon />
                </Button>
              ) : (
                <div
                  style={{
                    marginTop: 18,
                    width: "100%",
                    background: "var(--surface-2)",
                    border: "1px solid var(--line)",
                    borderRadius: 99,
                    padding: "12px 22px",
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "var(--muted)",
                    textAlign: "center",
                  }}
                >
                  Waiting for org approval
                </div>
              )
            ) : (
              // Available interview — show Apply
              <Button
                id="detail-apply-btn"
                variant="primary"
                size="lg"
                onClick={() => setApplyingToId(selectedInterview.id)}
                style={{ marginTop: 18, width: "100%" }}
              >
                Apply now
                <ArrowIcon />
              </Button>
            )}
          </aside>
        )}
      </main>

      {/* Apply Modal */}
      {applyingToId !== null && (
        <ApplyModal
          interviewId={applyingToId}
          token={token}
          interviewTitle={
            available.find((i) => i.id === applyingToId)?.position ??
            "Interview"
          }
          onClose={() => setApplyingToId(null)}
          onSuccess={() => {
            setApplyingToId(null);
            setSelectedId(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};

// ── Apply Modal ───────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ApplyModal: React.FC<{
  interviewId: number;
  interviewTitle: string;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ interviewId, interviewTitle, token, onClose, onSuccess }) => {
  const [file, setFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [succeeded, setSucceeded] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("File must be under 5 MB.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select your resume PDF.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("resume", file);
      const res = await fetch(`${BASE_URL}/applications/${interviewId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.detail ?? "Application failed. Please try again.",
        );
      }
      setSucceeded(true);
      setTimeout(onSuccess, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "color-mix(in srgb, var(--ink) 42%, transparent)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          zIndex: 200,
        }}
      />
      {/* Modal */}
      <div
        id="apply-modal"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          zIndex: 201,
          width: "min(480px, 94vw)",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          padding: 32,
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {succeeded ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--positive-tint)",
                color: "var(--positive)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <CheckIcon size={26} />
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 21,
                fontWeight: 600,
                color: "var(--ink)",
                letterSpacing: "-0.5px",
                marginBottom: 6,
              }}
            >
              Application submitted
            </div>
            <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
              You'll be notified once the organization reviews your resume.
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "var(--signal-strong)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Apply · {interviewTitle}
                </div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 21,
                    fontWeight: 600,
                    color: "var(--ink)",
                    letterSpacing: "-0.5px",
                    margin: 0,
                  }}
                >
                  Upload your resume
                </h2>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  color: "var(--muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="Close"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 2l8 8M10 2l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <form id="apply-form" onSubmit={handleSubmit} noValidate>
              {error && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    background: "var(--negative-tint)",
                    border: "1px solid var(--negative)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 13,
                    color: "var(--negative)",
                    fontWeight: 500,
                    marginBottom: 16,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle
                      cx="8"
                      cy="8"
                      r="7"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                    <path
                      d="M8 5v3.5M8 11h.01"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  {error}
                </div>
              )}

              {/* Drop zone */}
              <label
                id="resume-upload-label"
                htmlFor="resume-file-input"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "32px 20px",
                  border: `2px dashed ${file ? "var(--signal)" : "var(--line-strong)"}`,
                  borderRadius: "var(--radius)",
                  background: file ? "var(--signal-tint)" : "var(--surface-2)",
                  cursor: "pointer",
                  transition: "border-color 0.18s ease, background 0.18s ease",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "var(--radius-sm)",
                    background: file ? "var(--surface)" : "var(--surface)",
                    border: "1px solid var(--line)",
                    color: file ? "var(--signal-strong)" : "var(--muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {file ? <DocIcon /> : <UploadIcon />}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--ink)",
                      marginBottom: 3,
                    }}
                  >
                    {file ? file.name : "Click to upload your resume"}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted-2)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {file
                      ? `${(file.size / 1024).toFixed(0)} KB · PDF`
                      : "PDF only · max 5 MB"}
                  </div>
                </div>
                <input
                  id="resume-file-input"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>

              <div style={{ display: "flex", gap: 10 }}>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={onClose}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  id="apply-submit-btn"
                  type="submit"
                  variant="signal"
                  size="md"
                  disabled={isSubmitting || !file}
                  style={{ flex: 2 }}
                >
                  {isSubmitting ? "Submitting…" : "Submit application"}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  );
};

// ── Cards ─────────────────────────────────────────────────────────────────────

const cardStyle = (selected: boolean): React.CSSProperties => ({
  textAlign: "left",
  background: "var(--surface)",
  border: selected ? "1.5px solid var(--signal)" : "1px solid var(--line)",
  borderRadius: "var(--radius)",
  padding: 22,
  cursor: "pointer",
  transition:
    "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease",
  boxShadow: selected ? "var(--shadow-md)" : "var(--shadow-sm)",
  transform: selected ? "translateY(-2px)" : "translateY(0)",
});

const cardFooterMeta: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11.5,
  color: "var(--muted)",
  fontWeight: 500,
  fontFamily: "var(--font-mono)",
};

const AvailableCard: React.FC<{
  interview: InterviewBasic;
  selected: boolean;
  onSelect: () => void;
  onApply: () => void;
}> = ({ interview, selected, onSelect, onApply }) => {
  const t = timeRemaining(interview.submission_deadline);
  return (
    <div onClick={onSelect} style={cardStyle(selected)}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-0.4px",
              margin: "0 0 4px",
              lineHeight: 1.3,
            }}
          >
            {interview.position}
          </h3>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
            {interview.experience} experience
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            color: t.urgent ? "var(--signal-strong)" : "var(--muted)",
            background: t.urgent ? "var(--signal-tint)" : "var(--surface-2)",
            border: `1px solid ${t.urgent ? "var(--signal)" : "var(--line)"}`,
            borderRadius: 99,
            padding: "4px 10px",
            flexShrink: 0,
          }}
        >
          {t.label}
        </span>
      </div>
      <p
        style={{
          fontSize: 13,
          color: "var(--ink-2)",
          lineHeight: 1.55,
          margin: "0 0 16px",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {interview.description}
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 14,
          borderTop: "1px solid var(--line)",
        }}
      >
        <div style={cardFooterMeta}>
          <CalendarIcon />
          {formatDate(interview.start_time)}
        </div>
        <Button
          id={`apply-btn-${interview.id}`}
          variant="primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onApply();
          }}
        >
          Apply
          <ArrowIcon />
        </Button>
      </div>
    </div>
  );
};

const AppliedCard: React.FC<{
  interview: AppliedInterview;
  selected: boolean;
  onSelect: () => void;
  onAttempt: () => void;
}> = ({ interview, selected, onSelect, onAttempt }) => (
  <div onClick={onSelect} style={cardStyle(selected)}>
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.4px",
            margin: "0 0 4px",
            lineHeight: 1.3,
          }}
        >
          {interview.position}
        </h3>
        <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
          {interview.experience} experience
        </div>
      </div>
      <StatusBadge status={interview.status} />
    </div>
    <p
      style={{
        fontSize: 13,
        color: "var(--ink-2)",
        lineHeight: 1.55,
        margin: "0 0 16px",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}
    >
      {interview.description}
    </p>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 14,
        borderTop: "1px solid var(--line)",
        gap: 10,
      }}
    >
      <div style={cardFooterMeta}>
        <ClockIcon /> Deadline: {formatDate(interview.submission_deadline)}
      </div>
      {interview.status === "approved" && (
        <Button
          variant="signal"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onAttempt();
          }}
        >
          Attempt
          <ArrowIcon />
        </Button>
      )}
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = STATUS_STYLES[status] ?? {
    bg: "var(--surface-2)",
    color: "var(--muted)",
    dot: "var(--muted-2)",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        color: s.color,
        background: s.bg,
        border: "1px solid var(--line)",
        borderRadius: 99,
        padding: "4px 10px",
        textTransform: "capitalize",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: s.dot,
        }}
      />
      {status}
    </span>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const MetricCard: React.FC<{
  label: string;
  value: number | string;
  accent: string;
  icon: React.ReactNode;
}> = ({ label, value, accent, icon }) => (
  <div
    style={{
      background: "var(--surface)",
      border: "1px solid var(--line)",
      borderRadius: "var(--radius)",
      padding: "20px 22px",
      boxShadow: "var(--shadow-sm)",
      display: "flex",
      alignItems: "center",
      gap: 14,
    }}
  >
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: "var(--radius-sm)",
        background: `color-mix(in srgb, ${accent} 12%, transparent)`,
        color: accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 24,
          fontWeight: 700,
          color: "var(--ink)",
          letterSpacing: "-1px",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--muted)",
          fontWeight: 600,
          marginTop: 5,
        }}
      >
        {label}
      </div>
    </div>
  </div>
);

const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}> = ({ icon, label, value }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 0",
      borderBottom: "1px solid var(--line)",
    }}
  >
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: "var(--surface-2)",
        color: "var(--muted)",
        border: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: 10.5,
          color: "var(--muted-2)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontFamily: "var(--font-mono)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--ink)",
          fontWeight: 600,
          marginTop: 3,
        }}
      >
        {value}
      </div>
    </div>
  </div>
);

const SearchBar: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}> = ({ value, onChange, placeholder }) => (
  <div
    style={{
      flex: 1,
      maxWidth: 420,
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "9px 16px",
      background: "var(--surface)",
      border: "1px solid var(--line-strong)",
      borderRadius: 99,
    }}
  >
    <SearchIcon />
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        flex: 1,
        background: "transparent",
        border: "none",
        outline: "none",
        fontSize: 13.5,
        color: "var(--ink)",
        fontFamily: "var(--font-body)",
      }}
    />
    {value && (
      <button
        onClick={() => onChange("")}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--muted-2)",
          cursor: "pointer",
          padding: 0,
          display: "flex",
        }}
        aria-label="Clear search"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3 3l8 8M11 3l-8 8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    )}
  </div>
);

const Tag: React.FC<{ text: string }> = ({ text }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      fontWeight: 700,
      color: "var(--signal-strong)",
      background: "var(--signal-tint)",
      border: "1px solid color-mix(in srgb, var(--signal) 35%, transparent)",
      borderRadius: 99,
      padding: "4px 12px",
      letterSpacing: "0.02em",
    }}
  >
    {text}
  </span>
);

const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 20px",
      textAlign: "center",
      gap: 12,
      background: "var(--surface)",
      border: "1px dashed var(--line-strong)",
      borderRadius: "var(--radius)",
    }}
  >
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: "var(--radius)",
        background: "var(--surface-2)",
        color: "var(--muted)",
        border: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon}
    </div>
    <h3
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 17,
        fontWeight: 600,
        color: "var(--ink)",
        letterSpacing: "-0.4px",
        margin: 0,
      }}
    >
      {title}
    </h3>
    <p
      style={{ fontSize: 13, color: "var(--muted)", maxWidth: 340, margin: 0 }}
    >
      {description}
    </p>
  </div>
);

const SkeletonCard = () => (
  <div
    style={{
      background: "var(--surface)",
      border: "1px solid var(--line)",
      borderRadius: "var(--radius)",
      padding: 22,
      boxShadow: "var(--shadow-sm)",
      animation: "skeleton-pulse 1.5s ease-in-out infinite",
    }}
  >
    <style>{`
      @keyframes skeleton-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.55; }
      }
    `}</style>
    <div
      style={{
        height: 14,
        background: "var(--line)",
        borderRadius: 6,
        width: "70%",
        marginBottom: 10,
      }}
    />
    <div
      style={{
        height: 10,
        background: "var(--line)",
        borderRadius: 6,
        width: "45%",
        marginBottom: 18,
      }}
    />
    <div
      style={{
        height: 10,
        background: "var(--surface-2)",
        borderRadius: 6,
        width: "100%",
        marginBottom: 6,
      }}
    />
    <div
      style={{
        height: 10,
        background: "var(--surface-2)",
        borderRadius: 6,
        width: "82%",
      }}
    />
  </div>
);

const ErrorAlert: React.FC<{ message: string }> = ({ message }) => (
  <div
    role="alert"
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      padding: "12px 16px",
      borderRadius: "var(--radius-sm)",
      background: "var(--negative-tint)",
      border: "1px solid var(--negative)",
      color: "var(--negative)",
      fontSize: 13,
      fontWeight: 500,
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

// ── Icons ─────────────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle
      cx="6.5"
      cy="6.5"
      r="4.5"
      stroke="var(--muted-2)"
      strokeWidth="1.5"
    />
    <path
      d="M10.5 10.5L14 14"
      stroke="var(--muted-2)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect
      x="1"
      y="2"
      width="10"
      height="9"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <path
      d="M1 5h10M4 1v2M8 1v2"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M6 3v3l2 1"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M3 6a5 5 0 0110 0v4l1.5 2H1.5L3 10V6zM6 14a2 2 0 004 0"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M10 8.5v5M10 6.5h.01"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const BriefcaseIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect
      x="2"
      y="7"
      width="20"
      height="14"
      rx="2.5"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <path
      d="M8 7V5a3 3 0 016 0v2M2 13h20"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const ClipboardIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect
      x="4"
      y="4"
      width="16"
      height="18"
      rx="2.5"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <path
      d="M9 4a3 3 0 016 0M8 11h8M8 15h5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const TrendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 17l6-6 4 4 8-8M14 7h7v7"
      stroke="currentColor"
      strokeWidth="1.8"
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

const CheckIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M5 12.5l4.5 4.5L19 6.5"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UploadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15v3a2 2 0 002 2h10a2 2 0 002-2v-3"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DocIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M6 3h8l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M13 3v5h5M8 13h8M8 16.5h5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default DashboardPage;
