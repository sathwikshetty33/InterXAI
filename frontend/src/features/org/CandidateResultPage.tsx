import { useEffect, useState, type CSSProperties } from "react";
import {
  getLeaderboard,
  LeaderboardServiceError,
  type LeaderboardEntry,
} from "../../services/leaderboard.service";
import ScoreMeter from "../../ui/ScoreMeter";
import {
  EmptyState,
  ErrorAlert,
  Muted,
  NoteBox,
  Pill,
  RankBadge,
  RecommendationCell,
  SessionDetail,
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
 * One candidate's full interview record on its own URL (survives refresh,
 * linkable) rather than an inline leaderboard dropdown. No single-candidate
 * endpoint exists, so it fetches the whole leaderboard and picks its entry.
 */
export interface CandidateResultPageProps {
  interviewId: number;
  applicationId: number;
  token: string;
  onBack: () => void;
}

export default function CandidateResultPage({
  interviewId,
  applicationId,
  token,
  onBack,
}: CandidateResultPageProps) {
  const [entry, setEntry] = useState<LeaderboardEntry | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setEntry(undefined);
    setError(null);
    getLeaderboard(interviewId, token)
      .then((data) => {
        setEntry(
          data.entries.find((e) => e.application_id === applicationId) ?? null,
        );
      })
      .catch((err) => {
        setError(
          err instanceof LeaderboardServiceError
            ? err.message
            : "Failed to load the leaderboard.",
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    getLeaderboard(interviewId, token)
      .then((data) => {
        if (cancelled) return;
        setEntry(
          data.entries.find((e) => e.application_id === applicationId) ?? null,
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof LeaderboardServiceError
            ? err.message
            : "Failed to load the leaderboard.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [interviewId, applicationId, token]);

  return (
    <>
      <button onClick={onBack} style={backLinkStyle}>
        ← Leaderboard
      </button>

      {error && <ErrorAlert message={error} onRetry={load} />}

      {entry === undefined && !error && <SkeletonCard tall />}

      {entry === null && !error && (
        <EmptyState
          title="Candidate not found"
          body="This candidate isn't on the leaderboard for this interview."
        />
      )}

      {entry && (
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
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <RankBadge rank={entry.rank} />
                <div>
                  <Pill text={`Candidate · #${entry.application_id}`} />
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
                    {entry.username}
                  </h2>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--muted-2)",
                      fontFamily: "var(--font-mono)",
                      margin: 0,
                    }}
                  >
                    {entry.email}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <StatusPill
                  status={
                    entry.sessions[entry.sessions.length - 1]?.status ??
                    (entry.shortlisting_decision
                      ? "not_started"
                      : "pending_review")
                  }
                />
                <RecommendationCell
                  recommendation={
                    entry.sessions[entry.sessions.length - 1]?.recommendation
                  }
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 32,
                marginTop: 22,
                paddingTop: 18,
                borderTop: "1px solid var(--line)",
                flexWrap: "wrap",
              }}
            >
              <ScoreLabel
                label="Interview score"
                score={entry.interview_score}
              />
              <ScoreLabel label="Resume score" score={entry.resume_score} />
            </div>
          </div>

          {entry.application_feedback && (
            <NoteBox
              label="Resume feedback"
              body={entry.application_feedback}
            />
          )}

          {entry.sessions.length === 0 ? (
            <Muted>No sessions completed.</Muted>
          ) : (
            entry.sessions.map((session, i) => (
              <SessionDetail key={session.id} session={session} index={i + 1} />
            ))
          )}
        </>
      )}
    </>
  );
}

function ScoreLabel({ label, score }: { label: string; score: number | null }) {
  return (
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
        {label}
      </div>
      <ScoreMeter score={score} />
    </div>
  );
}
