import { useEffect, useState, type CSSProperties } from "react";
import {
  getInterviewApplications,
  toggleShortlist,
  LeaderboardServiceError,
  type ApplicationResponse,
} from "../../services/leaderboard.service";
import MarkdownView from "../interview/components/MarkdownView";
import ScoreMeter from "../../ui/ScoreMeter";
import Button from "../../ui/Button";
import {
  BadgePill,
  EmptyState,
  ErrorAlert,
  Muted,
  NoteBox,
  Pill,
  SkeletonCard,
  StatusPill,
} from "./OrgDashboardPage";

const backLinkStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: "none",
  color: "var(--muted)",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "var(--font-body)",
  cursor: "pointer",
  marginBottom: 14,
  padding: 0,
};

/**
 * One candidate's resume evaluation on its own URL (survives refresh,
 * linkable) rather than an inline applications-row dropdown. No single-
 * application endpoint exists, so it fetches the whole list and picks one.
 */
export interface ApplicationDetailPageProps {
  interviewId: number;
  applicationId: number;
  token: string;
  onBack: () => void;
}

export default function ApplicationDetailPage({
  interviewId,
  applicationId,
  token,
  onBack,
}: ApplicationDetailPageProps) {
  const [application, setApplication] = useState<
    ApplicationResponse | null | undefined
  >(undefined);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = () => {
    setApplication(undefined);
    setError(null);
    getInterviewApplications(interviewId, token)
      .then((list) => {
        setApplication(list.find((a) => a.id === applicationId) ?? null);
      })
      .catch((err) => {
        setError(
          err instanceof LeaderboardServiceError
            ? err.message
            : "Failed to load the application.",
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    getInterviewApplications(interviewId, token)
      .then((list) => {
        if (cancelled) return;
        setApplication(list.find((a) => a.id === applicationId) ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof LeaderboardServiceError
            ? err.message
            : "Failed to load the application.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [interviewId, applicationId, token]);

  const handleToggle = async () => {
    if (!application) return;
    setToggling(true);
    try {
      const updated = await toggleShortlist(application.id, token);
      setApplication(updated);
    } catch {
      // silently ignore — the button state reverts automatically
    } finally {
      setToggling(false);
    }
  };

  return (
    <>
      <button onClick={onBack} style={backLinkStyle}>
        ← Applications
      </button>

      {error && <ErrorAlert message={error} onRetry={load} />}

      {application === undefined && !error && <SkeletonCard tall />}

      {application === null && !error && (
        <EmptyState
          title="Application not found"
          body="This application no longer exists for this interview."
        />
      )}

      {application && (
        <>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              padding: 26,
              marginBottom: 18,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div>
                <Pill text={`Application · #${application.id}`} />
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    fontWeight: 600,
                    color: "var(--ink)",
                    letterSpacing: "-0.6px",
                    marginTop: 10,
                    marginBottom: 2,
                  }}
                >
                  {application.username ?? `User #${application.user_id}`}
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--muted-2)",
                    fontFamily: "var(--font-mono)",
                    margin: 0,
                  }}
                >
                  {application.email ?? ""}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <StatusPill status={application.status} />
                {application.shortlisting_decision ? (
                  <BadgePill
                    color="var(--positive)"
                    bg="var(--positive-tint)"
                    label="Listed"
                  />
                ) : (
                  <BadgePill
                    color="var(--muted)"
                    bg="var(--surface-2)"
                    label="Pending"
                  />
                )}
                <Button
                  variant={
                    application.shortlisting_decision ? "ghost" : "primary"
                  }
                  size="sm"
                  disabled={toggling}
                  onClick={handleToggle}
                >
                  {toggling
                    ? "…"
                    : application.shortlisting_decision
                      ? "Reject"
                      : "Approve"}
                </Button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 32,
                marginTop: 22,
                paddingTop: 18,
                borderTop: "1px solid var(--line)",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: "var(--muted-2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 8,
                  }}
                >
                  Resume score
                </div>
                <ScoreMeter score={application.score} />
              </div>
              {application.resume && (
                <a
                  href={application.resume}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--signal-strong)",
                    textDecoration: "none",
                  }}
                >
                  Open resume PDF ↗
                </a>
              )}
            </div>
          </div>

          {application.feedback ? (
            <NoteBox label="AI resume feedback" body={application.feedback} />
          ) : (
            <Muted>
              No evaluation yet — the resume may still be processing.
            </Muted>
          )}

          {application.extracted_resume && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow-sm)",
                padding: 18,
                marginTop: 10,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--ink)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 10,
                }}
              >
                Extracted resume
              </div>
              <MarkdownView source={application.extracted_resume} />
            </div>
          )}
        </>
      )}
    </>
  );
}
