import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createOrgInterview,
  getDsaTopicCatalog,
  getInterviewApplications,
  getLeaderboard,
  getOrgInterview,
  getOrgInterviews,
  seedTestInterview,
  toggleShortlist,
  LeaderboardServiceError,
  type ApplicationResponse,
  type CreateInterviewPayload,
  type DsaTopicCatalogEntry,
  type LeaderboardEntry,
  type LeaderboardResponse,
  type OrgInterview,
  type OrgInterviewDetail,
  type SessionResult,
} from "../../services/leaderboard.service";
import MarkdownView from "../interview/components/MarkdownView";
import Logo from "../../ui/Logo";
import Button from "../../ui/Button";
import ScoreMeter from "../../ui/ScoreMeter";

export interface OrgDashboardPageProps {
  token: string;
  orgName?: string;
  /** Which view the current route maps to; interview id / tab come from the URL. */
  mode: View;
  onLogout: () => void;
}

type View = "list" | "detail" | "create";
type DetailTab = "overview" | "applications" | "leaderboard";
const DETAIL_TABS: DetailTab[] = ["overview", "applications", "leaderboard"];

const OrgDashboardPage: React.FC<OrgDashboardPageProps> = ({
  token,
  orgName,
  mode,
  onLogout,
}) => {
  const navigate = useNavigate();
  const params = useParams();
  // The route is the source of truth for the view, the open interview, and the
  // detail tab — so a refresh or a shared link restores exactly this state.
  const view = mode;
  const activeInterviewId = params.interviewId
    ? Number(params.interviewId)
    : null;
  const detailTab: DetailTab = DETAIL_TABS.includes(params.tab as DetailTab)
    ? (params.tab as DetailTab)
    : "overview";
  const [interviews, setInterviews] = useState<OrgInterview[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [isSeedingTest, setIsSeedingTest] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const displayName = orgName ?? "Admin";

  // Triggered by the Retry button (event-driven, sync setStates allowed).
  const fetchInterviews = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      setInterviews(await getOrgInterviews(token));
    } catch (err) {
      setListError(
        err instanceof LeaderboardServiceError
          ? err.message
          : "Failed to load interviews.",
      );
    } finally {
      setIsLoadingList(false);
    }
  }, [token]);

  // Initial load: keep the effect pure (no sync setState). Initial state
  // already has `isLoadingList: true`, so we only flip it via the async tail.
  useEffect(() => {
    let cancelled = false;
    getOrgInterviews(token)
      .then((data) => {
        if (!cancelled) setInterviews(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setListError(
          err instanceof LeaderboardServiceError
            ? err.message
            : "Failed to load interviews.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const liveCount = interviews.filter(isLive).length;
  const upcomingCount = interviews.filter(isUpcoming).length;
  const closedCount = interviews.filter(
    (i) => !isLive(i) && !isUpcoming(i),
  ).length;

  const openDetail = (id: number) => navigate(`/admin/interview/${id}`);
  const openCreate = () => navigate("/admin/new");
  const goList = () => navigate("/admin/dashboard");
  const openTab = (id: number, tab: DetailTab) =>
    navigate(`/admin/interview/${id}/${tab}`);

  const handleCreated = async (created: OrgInterviewDetail) => {
    await fetchInterviews();
    navigate(`/admin/interview/${created.id}`);
  };

  const handleSeedTest = async () => {
    setIsSeedingTest(true);
    setSeedError(null);
    try {
      const created = await seedTestInterview(token);
      await fetchInterviews();
      navigate(`/admin/interview/${created.id}`);
      return;
    } catch (err) {
      setSeedError(
        err instanceof LeaderboardServiceError
          ? err.message
          : "Failed to create test interview.",
      );
    } finally {
      setIsSeedingTest(false);
    }
  };

  return (
    <div
      id="org-dashboard-page"
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        fontFamily: "var(--font-body)",
        position: "relative",
      }}
    >
      <AdminHeader
        displayName={displayName}
        onHome={goList}
        onLogout={onLogout}
      />

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 24px 64px",
        }}
      >
        {view === "list" && (
          <ListView
            displayName={displayName}
            interviews={interviews}
            liveCount={liveCount}
            upcomingCount={upcomingCount}
            closedCount={closedCount}
            isLoading={isLoadingList}
            error={listError}
            seedError={seedError}
            isSeedingTest={isSeedingTest}
            onRetry={fetchInterviews}
            onOpen={openDetail}
            onCreate={openCreate}
            onSeedTest={handleSeedTest}
          />
        )}

        {view === "create" && (
          <CreateInterviewView
            token={token}
            onBack={goList}
            onCreated={handleCreated}
          />
        )}

        {view === "detail" && activeInterviewId != null && (
          <InterviewDetailView
            key={activeInterviewId}
            interviewId={activeInterviewId}
            token={token}
            tab={detailTab}
            onTabChange={(t) => openTab(activeInterviewId, t)}
            onBack={goList}
          />
        )}
      </main>
    </div>
  );
};

// ── List view ────────────────────────────────────────────────────────────────

const ListView: React.FC<{
  displayName: string;
  interviews: OrgInterview[];
  liveCount: number;
  upcomingCount: number;
  closedCount: number;
  isLoading: boolean;
  error: string | null;
  seedError: string | null;
  isSeedingTest: boolean;
  onRetry: () => void;
  onOpen: (id: number) => void;
  onCreate: () => void;
  onSeedTest: () => void;
}> = ({
  displayName,
  interviews,
  liveCount,
  upcomingCount,
  closedCount,
  isLoading,
  error,
  seedError,
  isSeedingTest,
  onRetry,
  onOpen,
  onCreate,
  onSeedTest,
}) => (
  <>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
        marginBottom: 32,
      }}
    >
      <div
        style={{
          gridColumn: "1 / -1",
          background: "var(--ink)",
          color: "var(--paper)",
          borderRadius: "var(--radius-lg)",
          padding: "26px 28px",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <Pill text="Admin console" light />
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: "-0.8px",
            marginTop: 14,
            marginBottom: 6,
          }}
        >
          Welcome back, {displayName}
        </div>
        <div
          style={{
            fontSize: 14,
            color: "color-mix(in srgb, var(--paper) 72%, transparent)",
          }}
        >
          <Mono>{liveCount}</Mono> interview{liveCount !== 1 ? "s" : ""} live
          right now · <Mono>{upcomingCount}</Mono> upcoming ·{" "}
          <Mono>{closedCount}</Mono> closed
        </div>
      </div>

      <MetricCard
        label="Live"
        value={liveCount}
        accent="var(--positive)"
        icon={<LiveIcon />}
      />
      <MetricCard
        label="Upcoming"
        value={upcomingCount}
        accent="var(--signal-strong)"
        icon={<CalendarIcon />}
      />
      <MetricCard
        label="Closed"
        value={closedCount}
        accent="var(--muted)"
        icon={<ArchiveIcon />}
      />
    </div>

    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 18,
      }}
    >
      <div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.6px",
            marginBottom: 2,
          }}
        >
          Interviews
        </h2>
        <p style={{ fontSize: 14, color: "var(--muted)" }}>
          Open an interview to view candidates and the leaderboard.
        </p>
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexDirection: "column",
          alignItems: "flex-end",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button
            id="seed-test-interview-btn"
            variant="ghost"
            onClick={onSeedTest}
            disabled={isSeedingTest}
          >
            {isSeedingTest ? "Seeding…" : "Seed test interview"}
          </Button>
          <Button
            id="create-interview-btn"
            variant="primary"
            onClick={onCreate}
          >
            <PlusIcon /> New interview
          </Button>
        </div>
        {seedError && (
          <div
            role="alert"
            style={{
              fontSize: 12,
              color: "var(--negative)",
              background: "var(--negative-tint)",
              border: "1px solid var(--negative)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 12px",
              maxWidth: 320,
              textAlign: "right",
            }}
          >
            {seedError}
          </div>
        )}
      </div>
    </div>

    {isLoading && (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px,1fr))",
          gap: 16,
        }}
      >
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )}

    {!isLoading && error && <ErrorAlert message={error} onRetry={onRetry} />}

    {!isLoading && !error && interviews.length === 0 && (
      <EmptyState
        title="No interviews yet"
        body="Create your first interview to start evaluating candidates."
        action={
          <div style={{ marginTop: 16 }}>
            <Button variant="primary" onClick={onCreate}>
              Create interview
              <ArrowIcon />
            </Button>
          </div>
        }
      />
    )}

    {!isLoading && !error && interviews.length > 0 && (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px,1fr))",
          gap: 16,
        }}
      >
        {interviews.map((iv) => (
          <InterviewCard
            key={iv.id}
            interview={iv}
            onClick={() => onOpen(iv.id)}
          />
        ))}
      </div>
    )}
  </>
);

const InterviewCard: React.FC<{
  interview: OrgInterview;
  onClick: () => void;
}> = ({ interview, onClick }) => {
  const tone = statusTone(interview);

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: 22,
        cursor: "pointer",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16.5,
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-0.4px",
              marginBottom: 3,
              lineHeight: 1.3,
            }}
          >
            {interview.position}
          </h3>
          <div
            style={{
              fontSize: 12,
              color: "var(--muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {interview.experience} experience · #{interview.id}
          </div>
        </div>
        <BadgePill color={tone.color} bg={tone.bg} label={tone.label} />
      </div>

      <p
        style={{
          fontSize: 13,
          color: "var(--muted)",
          lineHeight: 1.55,
          marginBottom: 14,
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
          gap: 8,
          flexWrap: "wrap",
          borderTop: "1px solid var(--line)",
          paddingTop: 12,
        }}
      >
        <DateChip label="Deadline" date={interview.submission_deadline} />
        <DateChip label="Starts" date={interview.start_time} />
        <DateChip label="Ends" date={interview.end_time} />
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12.5,
          color: "var(--ink-2)",
          fontWeight: 600,
        }}
      >
        Open interview
        <ArrowIcon />
      </div>
    </div>
  );
};

// ── Detail view ──────────────────────────────────────────────────────────────

const InterviewDetailView: React.FC<{
  interviewId: number;
  token: string;
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  onBack: () => void;
}> = ({ interviewId, token, tab, onTabChange, onBack }) => {
  const [detail, setDetail] = useState<OrgInterviewDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Parent re-keys on interviewId so initial state is already fresh.
  useEffect(() => {
    let cancelled = false;
    getOrgInterview(interviewId, token)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((err) => {
        if (cancelled) return;
        setDetailError(
          err instanceof LeaderboardServiceError
            ? err.message
            : "Failed to load interview.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [interviewId, token]);

  return (
    <>
      <button onClick={onBack} style={backLinkStyle}>
        ← All interviews
      </button>

      {detailError && (
        <ErrorAlert message={detailError} onRetry={onBack} retryLabel="Back" />
      )}

      {!detail && !detailError && <SkeletonCard tall />}

      {detail && (
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
                marginBottom: 10,
              }}
            >
              <div>
                <Pill text={`Interview · #${detail.id}`} />
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 27,
                    fontWeight: 600,
                    color: "var(--ink)",
                    letterSpacing: "-0.8px",
                    marginTop: 12,
                  }}
                >
                  {detail.position}
                </h2>
                <p
                  style={{
                    fontSize: 13.5,
                    color: "var(--muted)",
                    marginTop: 4,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {detail.experience} experience · {detail.duration} min ·{" "}
                  {detail.questions.length} questions ·{" "}
                  {detail.dsa_topics.length} DSA topics
                </p>
              </div>
              <StatusBadge interview={detail} />
            </div>
            <p
              style={{
                fontSize: 14,
                color: "var(--muted)",
                lineHeight: 1.6,
                marginTop: 10,
              }}
            >
              {detail.description}
            </p>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 16,
              }}
            >
              <DateChip label="Apply by" date={detail.submission_deadline} />
              <DateChip label="Starts" date={detail.start_time} />
              <DateChip label="Ends" date={detail.end_time} />
            </div>
          </div>

          <div
            role="tablist"
            style={{
              display: "inline-flex",
              gap: 4,
              padding: 4,
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              borderRadius: 999,
              marginBottom: 18,
            }}
          >
            {(["overview", "applications", "leaderboard"] as DetailTab[]).map(
              (t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => onTabChange(t)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "var(--font-body)",
                    border: "none",
                    cursor: "pointer",
                    background: tab === t ? "var(--ink)" : "transparent",
                    color: tab === t ? "var(--paper)" : "var(--muted)",
                    transition: "all 0.18s ease",
                    textTransform: "capitalize",
                  }}
                >
                  {t}
                </button>
              ),
            )}
          </div>

          {tab === "overview" && <OverviewTab detail={detail} />}
          {tab === "applications" && (
            <ApplicationsTab
              key={`apps-${detail.id}`}
              interviewId={detail.id}
              token={token}
            />
          )}
          {tab === "leaderboard" && (
            <LeaderboardTab
              key={`lb-${detail.id}`}
              interviewId={detail.id}
              token={token}
            />
          )}
        </>
      )}
    </>
  );
};

// ── Overview tab ─────────────────────────────────────────────────────────────

const OverviewTab: React.FC<{ detail: OrgInterviewDetail }> = ({ detail }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: 18,
    }}
  >
    <Card title={`Questions · ${detail.questions.length}`}>
      {detail.questions.length === 0 ? (
        <Muted>No custom questions configured.</Muted>
      ) : (
        detail.questions.map((q, i) => (
          <div
            key={q.id}
            style={{
              marginBottom: 14,
              paddingBottom: 14,
              borderBottom:
                i < detail.questions.length - 1
                  ? "1px solid var(--line)"
                  : "none",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--muted-2)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 4,
              }}
            >
              Q{i + 1}
            </div>
            <div
              style={{
                fontSize: 14,
                color: "var(--ink)",
                fontWeight: 600,
              }}
            >
              {q.question}
            </div>
            {q.expected_answer && (
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--muted)",
                  marginTop: 4,
                  fontStyle: "italic",
                }}
              >
                Expected: {q.expected_answer}
              </div>
            )}
          </div>
        ))
      )}
    </Card>

    <Card title={`DSA topics · ${detail.dsa_topics.length}`}>
      {detail.dsa_topics.length === 0 ? (
        <Muted>No DSA topics configured.</Muted>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {detail.dsa_topics.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 14px",
              }}
            >
              <span
                style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}
              >
                {t.topic}
              </span>
              <DifficultyChip difficulty={t.difficulty} />
            </div>
          ))}
        </div>
      )}
    </Card>

    <Card title="Scoring">
      <KeyVal k="DSA weight" v={`${detail.dsa_score}%`} />
      <KeyVal k="Dev (behavioural) weight" v={`${detail.dev_score}%`} />
      <KeyVal
        k="Resume shortlist threshold"
        v={detail.resume_shortlist_score.toFixed(2)}
      />
      <KeyVal
        k="Resume Q&A round"
        v={detail.ask_questions_on_resume ? "Enabled" : "Disabled"}
      />
    </Card>

    <Card title="Schedule">
      <KeyVal k="Apply by" v={formatDateTime(detail.submission_deadline)} />
      <KeyVal k="Window opens" v={formatDateTime(detail.start_time)} />
      <KeyVal k="Window closes" v={formatDateTime(detail.end_time)} />
      <KeyVal k="Duration" v={`${detail.duration} minutes`} />
    </Card>
  </div>
);

// ── Applications tab ────────────────────────────────────────────────────────

const APPLICATIONS_GRID =
  "64px minmax(150px,1fr) 200px 130px 110px 120px 110px";

const ApplicationsTab: React.FC<{ interviewId: number; token: string }> = ({
  interviewId,
  token,
}) => {
  const [data, setData] = useState<ApplicationResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getInterviewApplications(interviewId, token)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof LeaderboardServiceError
            ? err.message
            : "Failed to load applications.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [interviewId, token]);

  const handleToggle = async (applicationId: number) => {
    try {
      const updated = await toggleShortlist(applicationId, token);
      setData((prev) =>
        prev ? prev.map((a) => (a.id === updated.id ? updated : a)) : prev,
      );
    } catch {
      // silently ignore — the button state reverts automatically
    }
  };

  if (error) return <ErrorAlert message={error} onRetry={() => null} />;
  if (!data) return <SkeletonCard tall />;
  if (data.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        body="Candidates who apply will appear here with their resume score."
      />
    );
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-sm)",
        overflowX: "auto",
      }}
    >
      <div style={{ minWidth: 880 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: APPLICATIONS_GRID,
            gap: 10,
            padding: "12px 18px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--muted-2)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>App #</div>
          <div>Candidate</div>
          <div style={{ textAlign: "center" }}>Resume score</div>
          <div style={{ textAlign: "center" }}>Shortlisted</div>
          <div style={{ textAlign: "center" }}>Status</div>
          <div style={{ textAlign: "right" }}>Applied</div>
          <div style={{ textAlign: "center" }}>Action</div>
        </div>
        {data.map((a) => (
          <ApplicationRow key={a.id} application={a} onToggle={handleToggle} />
        ))}
      </div>
    </div>
  );
};

const ApplicationRow: React.FC<{
  application: ApplicationResponse;
  onToggle: (id: number) => Promise<void>;
}> = ({ application, onToggle }) => {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // don't toggle the detail panel when shortlisting
    setLoading(true);
    await onToggle(application.id);
    setLoading(false);
  };

  const approved = application.shortlisting_decision;
  // The resume evaluation populates feedback/score; use that to tell a
  // finished-but-not-shortlisted candidate apart from one still processing.
  const evaluated =
    Boolean(application.feedback) ||
    Boolean(application.extracted_resume) ||
    application.score > 0;

  return (
    <div style={{ borderBottom: "1px solid var(--line)" }}>
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "grid",
          gridTemplateColumns: APPLICATIONS_GRID,
          gap: 10,
          padding: "14px 18px",
          alignItems: "center",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            color: "var(--muted)",
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
          }}
        >
          <span style={{ color: "var(--muted-2)", marginRight: 4 }}>
            {expanded ? "▾" : "▸"}
          </span>
          #{application.id}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
            {application.username ?? `User #${application.user_id}`}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--muted-2)",
              marginTop: 2,
              fontFamily: "var(--font-mono)",
              maxWidth: 320,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={application.resume ?? ""}
          >
            {application.resume ?? "no resume"}
          </div>
        </div>
        <div
          style={{ display: "flex", justifyContent: "center" }}
          onClick={(e) => e.stopPropagation()}
        >
          <ScoreMeter score={application.score} size="sm" animate={false} />
        </div>
        <div style={{ textAlign: "center" }}>
          {approved ? (
            <BadgePill
              color="var(--positive)"
              bg="var(--positive-tint)"
              label="Listed"
            />
          ) : evaluated ? (
            <BadgePill
              color="var(--signal-strong)"
              bg="var(--signal-tint)"
              label="Not shortlisted"
            />
          ) : (
            <BadgePill
              color="var(--muted)"
              bg="var(--surface-2)"
              label="Pending"
            />
          )}
        </div>
        <div style={{ textAlign: "center" }}>
          <StatusPill status={application.status} />
        </div>
        <div
          style={{
            textAlign: "right",
            fontSize: 11.5,
            color: "var(--muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {formatDate(application.created_at)}
        </div>
        <div style={{ textAlign: "center" }}>
          <button
            id={`shortlist-btn-${application.id}`}
            onClick={handleClick}
            disabled={loading}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "all 0.18s ease",
              border: approved
                ? "1px solid var(--negative)"
                : "1px solid var(--ink)",
              background: approved ? "var(--negative-tint)" : "var(--ink)",
              color: approved ? "var(--negative)" : "var(--paper)",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "…" : approved ? "Reject" : "Approve"}
          </button>
        </div>
      </div>

      {expanded && (
        <div
          style={{
            padding: "4px 18px 18px",
            background: "var(--surface-2)",
          }}
        >
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
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: "var(--muted-2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 6,
                }}
              >
                Extracted resume
              </div>
              <div
                style={{
                  maxHeight: 320,
                  overflowY: "auto",
                }}
              >
                <MarkdownView source={application.extracted_resume} />
              </div>
            </div>
          )}

          {application.resume && (
            <a
              href={application.resume}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                fontSize: 12.5,
                fontWeight: 700,
                color: "var(--signal-strong)",
                textDecoration: "none",
              }}
            >
              Open resume PDF ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
};

// ── Leaderboard tab ─────────────────────────────────────────────────────────

const LEADERBOARD_GRID = "56px minmax(150px,1fr) 190px 190px 120px 32px";

const LeaderboardTab: React.FC<{ interviewId: number; token: string }> = ({
  interviewId,
  token,
}) => {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Retry handler — event-driven, so sync resets are allowed here.
  const load = useCallback(() => {
    setData(null);
    setError(null);
    getLeaderboard(interviewId, token)
      .then(setData)
      .catch((err) => {
        setError(
          err instanceof LeaderboardServiceError
            ? err.message
            : "Failed to load leaderboard.",
        );
      });
  }, [interviewId, token]);

  // Initial load: parent re-keys on interviewId, so state starts fresh and
  // the effect just kicks off the async fetch.
  useEffect(() => {
    let cancelled = false;
    getLeaderboard(interviewId, token)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof LeaderboardServiceError
            ? err.message
            : "Failed to load leaderboard.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [interviewId, token]);

  if (error) return <ErrorAlert message={error} onRetry={load} />;
  if (!data) return <SkeletonCard tall />;
  if (data.entries.length === 0) {
    return (
      <EmptyState
        title="No candidates yet"
        body="Candidates who complete sessions will appear ranked by interview score."
      />
    );
  }

  return (
    <>
      {data.entries.length >= 3 && (
        <Podium entries={data.entries.slice(0, 3)} />
      )}

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-sm)",
          overflowX: "auto",
          marginTop: data.entries.length >= 3 ? 20 : 0,
        }}
      >
        <div style={{ minWidth: 760 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: LEADERBOARD_GRID,
              gap: 10,
              padding: "12px 18px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--muted-2)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div>Rank</div>
            <div>Candidate</div>
            <div style={{ textAlign: "center" }}>Interview</div>
            <div style={{ textAlign: "center" }}>Resume</div>
            <div style={{ textAlign: "center" }}>Status</div>
            <div />
          </div>

          {data.entries.map((entry) => (
            <React.Fragment key={entry.application_id}>
              <LeaderboardRow
                entry={entry}
                expanded={expandedId === entry.application_id}
                onToggle={() =>
                  setExpandedId((p) =>
                    p === entry.application_id ? null : entry.application_id,
                  )
                }
              />
              {expandedId === entry.application_id && (
                <ExpandedEntry entry={entry} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
};

const Podium: React.FC<{ entries: LeaderboardEntry[] }> = ({ entries }) => {
  const order = [entries[1], entries[0], entries[2]];
  const heights = [78, 108, 64];
  // The winner (centre) carries the amber signal; runners-up stay ink.
  const surfaces = ["var(--ink-2)", "var(--signal)", "var(--ink-2)"];
  const readouts = ["var(--paper)", "var(--ink)", "var(--paper)"];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: 16,
        padding: "10px 0 22px",
      }}
    >
      {order.map((entry, idx) => (
        <div
          key={entry.application_id}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: surfaces[idx],
              color: readouts[idx],
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "var(--shadow-sm)",
              border: "2px solid var(--surface)",
            }}
          >
            {entry.username.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--ink)",
                maxWidth: 100,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {entry.username}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--ink)",
                letterSpacing: "-0.5px",
              }}
            >
              {entry.interview_score?.toFixed(1) ?? "—"}
            </div>
          </div>
          <div
            style={{
              width: 100,
              height: heights[idx],
              background: surfaces[idx],
              borderRadius: "10px 10px 0 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: readouts[idx],
              fontFamily: "var(--font-mono)",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            {entry.rank}
          </div>
        </div>
      ))}
    </div>
  );
};

const LeaderboardRow: React.FC<{
  entry: LeaderboardEntry;
  expanded: boolean;
  onToggle: () => void;
}> = ({ entry, expanded, onToggle }) => (
  <div
    onClick={onToggle}
    style={{
      display: "grid",
      gridTemplateColumns: LEADERBOARD_GRID,
      gap: 10,
      padding: "14px 18px",
      alignItems: "center",
      borderBottom: "1px solid var(--line)",
      cursor: "pointer",
      background: expanded ? "var(--surface-2)" : "transparent",
      transition: "background 0.15s ease",
    }}
  >
    <RankBadge rank={entry.rank} />
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
        {entry.username}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--muted-2)" }}>
        {entry.email}
      </div>
    </div>
    <div style={{ display: "flex", justifyContent: "center" }}>
      <ScoreMeter score={entry.interview_score} size="sm" animate={false} />
    </div>
    <div style={{ display: "flex", justifyContent: "center" }}>
      <ScoreMeter score={entry.resume_score} size="sm" animate={false} />
    </div>
    <div style={{ textAlign: "center" }}>
      {entry.shortlisting_decision ? (
        <BadgePill
          color="var(--positive)"
          bg="var(--positive-tint)"
          label="Listed"
        />
      ) : (
        <BadgePill color="var(--muted)" bg="var(--surface-2)" label="Pending" />
      )}
    </div>
    <div
      style={{
        color: "var(--muted-2)",
        fontSize: 14,
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.15s ease",
      }}
    >
      ▸
    </div>
  </div>
);

const ExpandedEntry: React.FC<{ entry: LeaderboardEntry }> = ({ entry }) => (
  <div
    style={{
      background: "var(--surface-2)",
      borderBottom: "1px solid var(--line)",
      padding: "16px 22px 22px",
    }}
  >
    {entry.application_feedback && (
      <NoteBox label="Resume feedback" body={entry.application_feedback} />
    )}
    {entry.sessions.length === 0 ? (
      <Muted>No sessions completed.</Muted>
    ) : (
      entry.sessions.map((session, i) => (
        <SessionDetail key={session.id} session={session} index={i + 1} />
      ))
    )}
  </div>
);

const SessionDetail: React.FC<{ session: SessionResult; index: number }> = ({
  session,
  index,
}) => (
  <div
    style={{
      background: "var(--surface)",
      border: "1px solid var(--line)",
      borderRadius: "var(--radius)",
      padding: 18,
      marginTop: 10,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--ink)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Session {index} · #{session.id}
        </span>
        <StatusPill status={session.status} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ScoreMeter score={session.score} size="sm" animate={false} />
        <span
          style={{
            fontSize: 11,
            color: "var(--muted-2)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {formatDate(session.start_time)}
          {session.end_time ? ` → ${formatDate(session.end_time)}` : ""}
        </span>
      </div>
    </div>

    {session.recommendation && (
      <NoteBox label="Recommendation" body={session.recommendation} />
    )}
    {session.strengths && (
      <NoteBox label="Strengths" body={session.strengths} />
    )}
    {session.feedback && (
      <NoteBox label="Overall feedback" body={session.feedback} />
    )}

    <RoundBlock title="Behavioural questions">
      {session.questions_round.length === 0 ? (
        <Muted>No behavioural answers.</Muted>
      ) : (
        session.questions_round.map((q) => (
          <div
            key={q.id}
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--line)",
              background: "var(--surface)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ink)",
                }}
              >
                {q.question ?? "(question deleted)"}
              </div>
              <ScoreMeter score={q.score} size="sm" animate={false} />
            </div>
            {q.feedback && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  marginBottom: 8,
                  fontStyle: "italic",
                }}
              >
                {q.feedback}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {q.follow_ups.map((t) => (
                <div key={t.id}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--muted-2)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 2,
                    }}
                  >
                    AI asked
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {t.question}
                  </div>
                  {t.answer && (
                    <>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--muted-2)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginTop: 6,
                          marginBottom: 2,
                        }}
                      >
                        Candidate
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: "var(--ink)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {t.answer}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </RoundBlock>

    <RoundBlock title="Coding">
      {session.dsa_round.length === 0 ? (
        <Muted>No coding submissions.</Muted>
      ) : (
        session.dsa_round.map((dsa) => (
          <div
            key={dsa.id}
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--line)",
              background: "var(--surface)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--ink)",
                  }}
                >
                  {dsa.problem_name ?? "(problem)"}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--muted-2)",
                    marginTop: 2,
                  }}
                >
                  {dsa.topic ?? "?"} ·{" "}
                  {dsa.difficulty ? (
                    <DifficultyChip difficulty={dsa.difficulty} inline />
                  ) : (
                    "?"
                  )}{" "}
                  · {dsa.language ?? "—"}
                </div>
              </div>
              <ScoreMeter score={dsa.score} size="sm" animate={false} />
            </div>
            {dsa.code && (
              <pre
                style={{
                  background: "var(--ink)",
                  color: "var(--paper)",
                  fontSize: 11.5,
                  padding: 10,
                  borderRadius: "var(--radius-sm)",
                  overflow: "auto",
                  maxHeight: 220,
                  fontFamily: "var(--font-mono)",
                  margin: 0,
                }}
              >
                {dsa.code}
              </pre>
            )}
          </div>
        ))
      )}
    </RoundBlock>

    <RoundBlock title="Resume Q&A">
      {session.resume_round.length === 0 ? (
        <Muted>No resume conversations.</Muted>
      ) : (
        session.resume_round.map((conv) => (
          <div
            key={conv.id}
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--line)",
              background: "var(--surface)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span
                style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}
              >
                Conversation #{conv.id}
              </span>
              <ScoreMeter score={conv.score} size="sm" animate={false} />
            </div>
            {conv.feedback && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  marginBottom: 8,
                  fontStyle: "italic",
                }}
              >
                {conv.feedback}
              </div>
            )}
            {conv.questions.map((qq) => (
              <div key={qq.id} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "var(--ink)",
                  }}
                >
                  Q: {qq.question}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--muted)",
                    whiteSpace: "pre-wrap",
                    marginTop: 2,
                  }}
                >
                  A: {qq.answer ?? "(no answer)"}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </RoundBlock>
  </div>
);

// ── Create interview wizard (3 steps) ───────────────────────────────────────

interface CreateFormState {
  position: string;
  description: string;
  experience: string;
  submission_deadline: string;
  start_time: string;
  end_time: string;
  duration: number;
  dsa_score: number;
  dev_score: number;
  resume_shortlist_score: number;
  ask_questions_on_resume: boolean;
  questions: { question: string; expected_answer: string }[];
  dsa_topics: { topic: string; difficulty: string }[];
}

type WizardStep = 1 | 2 | 3;

const STEP_META: Record<
  WizardStep,
  { title: string; subtitle: string; pill: string }
> = {
  1: {
    title: "Basic details",
    subtitle: "Position, schedule, duration, and scoring weights.",
    pill: "Step 1 of 3",
  },
  2: {
    title: "Behavioural questions",
    subtitle:
      "The questions the AI interviewer will ask each candidate in the first round.",
    pill: "Step 2 of 3",
  },
  3: {
    title: "Coding round",
    subtitle:
      "Pick topics and difficulty from our validated question bank — each candidate is assigned one problem per topic.",
    pill: "Step 3 of 3",
  },
};

const CreateInterviewView: React.FC<{
  token: string;
  onBack: () => void;
  onCreated: (created: OrgInterviewDetail) => void;
}> = ({ token, onBack, onCreated }) => {
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<CreateFormState>({
    position: "",
    description: "",
    experience: "Mid",
    submission_deadline: toLocalInput(addDays(new Date(), 7)),
    start_time: toLocalInput(addDays(new Date(), 8)),
    end_time: toLocalInput(addDays(new Date(), 14)),
    duration: 60,
    dsa_score: 50,
    dev_score: 50,
    resume_shortlist_score: 0,
    ask_questions_on_resume: false,
    questions: [{ question: "", expected_answer: "" }],
    dsa_topics: [{ topic: "", difficulty: "" }],
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Offer only real bank topics, so a topic can't be typed that resolves to
  // zero questions (see getDsaTopicCatalog).
  const [catalog, setCatalog] = useState<DsaTopicCatalogEntry[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const fetchCatalog = useCallback(() => {
    return getDsaTopicCatalog(token)
      .then((entries) => {
        setCatalog(entries);
        if (entries.length === 0) return;
        // Fill in any still-blank topic row (the initial row, before the
        // catalog loaded) with the first available topic/difficulty.
        setForm((f) => ({
          ...f,
          dsa_topics: f.dsa_topics.map((t) =>
            t.topic === ""
              ? {
                  topic: entries[0].topic,
                  difficulty: entries[0].difficulties[0],
                }
              : t,
          ),
        }));
      })
      .catch((err) => {
        setCatalogError(
          err instanceof LeaderboardServiceError
            ? err.message
            : "Failed to load DSA topics.",
        );
      })
      .finally(() => setCatalogLoading(false));
  }, [token]);

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  // Retry button handler: resets loading/error state, then re-fetches.
  const retryCatalog = () => {
    setCatalogLoading(true);
    setCatalogError(null);
    void fetchCatalog();
  };

  const set = <K extends keyof CreateFormState>(k: K, v: CreateFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setQ = (i: number, patch: Partial<CreateFormState["questions"][0]>) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, idx) =>
        idx === i ? { ...q, ...patch } : q,
      ),
    }));
  const addQ = () =>
    setForm((f) => ({
      ...f,
      questions: [...f.questions, { question: "", expected_answer: "" }],
    }));
  const rmQ = (i: number) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.filter((_, idx) => idx !== i),
    }));

  const setT = (i: number, patch: Partial<CreateFormState["dsa_topics"][0]>) =>
    setForm((f) => ({
      ...f,
      dsa_topics: f.dsa_topics.map((t, idx) =>
        idx === i ? { ...t, ...patch } : t,
      ),
    }));
  const addT = () =>
    setForm((f) => ({
      ...f,
      dsa_topics: [
        ...f.dsa_topics,
        catalog[0]
          ? { topic: catalog[0].topic, difficulty: catalog[0].difficulties[0] }
          : { topic: "", difficulty: "" },
      ],
    }));
  const rmT = (i: number) =>
    setForm((f) => ({
      ...f,
      dsa_topics: f.dsa_topics.filter((_, idx) => idx !== i),
    }));

  const totalScore = form.dsa_score + form.dev_score;
  const valid = useMemo(() => {
    if (!form.position.trim() || !form.description.trim()) return false;
    if (totalScore !== 100) return false;
    if (
      form.questions.length === 0 ||
      form.questions.some((q) => !q.question.trim())
    )
      return false;
    if (
      form.dsa_topics.length === 0 ||
      form.dsa_topics.some((t) => !t.topic.trim())
    )
      return false;
    return true;
  }, [form, totalScore]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateInterviewPayload = {
        position: form.position.trim(),
        description: form.description.trim(),
        experience: form.experience.trim(),
        submission_deadline: toIso(form.submission_deadline),
        start_time: toIso(form.start_time),
        end_time: toIso(form.end_time),
        duration: form.duration,
        dsa_score: form.dsa_score,
        dev_score: form.dev_score,
        resume_shortlist_score: form.resume_shortlist_score,
        ask_questions_on_resume: form.ask_questions_on_resume,
        questions: form.questions.map((q) => ({
          question: q.question.trim(),
          expected_answer: q.expected_answer.trim(),
        })),
        dsa_topics: form.dsa_topics.map((t) => ({
          topic: t.topic.trim(),
          difficulty: t.difficulty,
        })),
      };
      const created = await createOrgInterview(payload, token);
      onCreated(created);
    } catch (err) {
      setError(
        err instanceof LeaderboardServiceError
          ? err.message
          : "Failed to create interview.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Per-step validation. Step 1 = basics; Step 2 = behavioural questions;
  // Step 3 = DSA topics. Only valid steps allow you to advance.
  const step1Valid =
    form.position.trim().length > 0 &&
    form.description.trim().length > 0 &&
    totalScore === 100 &&
    form.duration > 0;
  const step2Valid =
    form.questions.length > 0 &&
    form.questions.every((q) => q.question.trim().length > 0);
  const step3Valid =
    form.dsa_topics.length > 0 &&
    form.dsa_topics.every((t) => t.topic.trim().length > 0);

  const canAdvance =
    (step === 1 && step1Valid) ||
    (step === 2 && step2Valid) ||
    (step === 3 && step3Valid && valid);

  const goNext = () => setStep((s) => (s < 3 ? ((s + 1) as WizardStep) : s));
  const goPrev = () => setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s));

  return (
    <>
      <button onClick={onBack} style={backLinkStyle}>
        ← Cancel
      </button>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          padding: 26,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <WizardStepper
          step={step}
          step1Valid={step1Valid}
          step2Valid={step2Valid}
        />

        <div style={{ marginTop: 22 }}>
          <Pill text={STEP_META[step].pill} />
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-0.6px",
              marginTop: 12,
              marginBottom: 4,
            }}
          >
            {STEP_META[step].title}
          </h3>
          <p style={{ fontSize: 13.5, color: "var(--muted)" }}>
            {STEP_META[step].subtitle}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step !== 3) goNext();
            else void submit(e);
          }}
          style={{ marginTop: 22 }}
        >
          {error && (
            <div
              role="alert"
              style={{
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
              {error}
            </div>
          )}

          {step === 1 && (
            <Step1Basics
              form={form}
              set={set}
              totalScore={totalScore}
              onScoreChange={(dsa) => {
                set("dsa_score", dsa);
                set("dev_score", 100 - dsa);
              }}
            />
          )}
          {step === 2 && (
            <Step2Questions
              questions={form.questions}
              setQ={setQ}
              addQ={addQ}
              rmQ={rmQ}
            />
          )}
          {step === 3 && (
            <Step3Topics
              topics={form.dsa_topics}
              setT={setT}
              addT={addT}
              rmT={rmT}
              catalog={catalog}
              catalogLoading={catalogLoading}
              catalogError={catalogError}
              onRetryCatalog={retryCatalog}
            />
          )}

          <div
            style={{
              marginTop: 24,
              paddingTop: 18,
              borderTop: "1px solid var(--line)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={step === 1 ? onBack : goPrev}
            >
              {step === 1 ? "Cancel" : "← Back"}
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={!canAdvance || submitting}
            >
              {step === 3
                ? submitting
                  ? "Creating…"
                  : "Create interview"
                : "Next →"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

// ── Wizard pieces ───────────────────────────────────────────────────────────

const WizardStepper: React.FC<{
  step: WizardStep;
  step1Valid: boolean;
  step2Valid: boolean;
}> = ({ step, step1Valid, step2Valid }) => {
  const labels = ["Basics", "Questions", "Coding"];
  const states: ("done" | "active" | "todo")[] = [
    step === 1 ? "active" : step1Valid ? "done" : "todo",
    step === 2 ? "active" : step > 2 && step2Valid ? "done" : "todo",
    step === 3 ? "active" : "todo",
  ];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {labels.map((label, i) => {
        const state = states[i];
        const circleBg =
          state === "done"
            ? "var(--positive)"
            : state === "active"
              ? "var(--ink)"
              : "transparent";
        return (
          <React.Fragment key={label}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "6px 14px",
                borderRadius: 999,
                background:
                  state === "active" ? "var(--surface-2)" : "transparent",
                border:
                  state === "active"
                    ? "1px solid var(--line-strong)"
                    : "1px solid var(--line)",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: circleBg,
                  border:
                    state === "todo"
                      ? "1.5px solid var(--line-strong)"
                      : "none",
                  color: "var(--paper)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {state === "done" ? (
                  "✓"
                ) : (
                  <span
                    style={{
                      color:
                        state === "active" ? "var(--paper)" : "var(--muted-2)",
                    }}
                  >
                    {i + 1}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color:
                    state === "active" || state === "done"
                      ? "var(--ink)"
                      : "var(--muted-2)",
                  letterSpacing: "0.02em",
                }}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div
                style={{
                  width: 18,
                  height: 2,
                  background:
                    state === "done" ? "var(--positive)" : "var(--line-strong)",
                  borderRadius: 1,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const Step1Basics: React.FC<{
  form: CreateFormState;
  set: <K extends keyof CreateFormState>(k: K, v: CreateFormState[K]) => void;
  totalScore: number;
  onScoreChange: (dsa: number) => void;
}> = ({ form, set, totalScore, onScoreChange }) => (
  <>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Field
        label="Position"
        value={form.position}
        onChange={(v) => set("position", v)}
        placeholder="Senior Backend Engineer"
      />
      <Field
        label="Experience level"
        value={form.experience}
        onChange={(v) => set("experience", v)}
        placeholder="Mid / Senior / Staff"
        maxLength={50}
      />
    </div>
    <FieldArea
      label="Description"
      value={form.description}
      onChange={(v) => set("description", v)}
      placeholder="What the role is, what you're looking for, anything candidates need to know."
    />

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 14,
      }}
    >
      <Field
        label="Apply by"
        type="datetime-local"
        value={form.submission_deadline}
        onChange={(v) => set("submission_deadline", v)}
      />
      <Field
        label="Start time"
        type="datetime-local"
        value={form.start_time}
        onChange={(v) => set("start_time", v)}
      />
      <Field
        label="End time"
        type="datetime-local"
        value={form.end_time}
        onChange={(v) => set("end_time", v)}
      />
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 14,
        marginTop: 6,
      }}
    >
      <Field
        label="Duration (min)"
        type="number"
        value={String(form.duration)}
        onChange={(v) => set("duration", parseInt(v) || 0)}
      />
      <Field
        label="Resume shortlist threshold (0–10)"
        type="number"
        step="0.1"
        min={0}
        max={10}
        value={String(form.resume_shortlist_score)}
        onChange={(v) =>
          set(
            "resume_shortlist_score",
            Math.min(10, Math.max(0, parseFloat(v) || 0)),
          )
        }
      />
    </div>

    <WeightSlider
      dsa={form.dsa_score}
      dev={form.dev_score}
      onChange={onScoreChange}
    />
    {totalScore !== 100 && (
      <div
        style={{
          fontSize: 12,
          color: "var(--signal-strong)",
          marginTop: 4,
          fontWeight: 600,
        }}
      >
        DSA + Dev weights must total 100 (currently {totalScore}).
      </div>
    )}

    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        marginTop: 18,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--muted)",
      }}
    >
      <input
        type="checkbox"
        checked={form.ask_questions_on_resume}
        onChange={(e) => set("ask_questions_on_resume", e.target.checked)}
        style={{ width: 16, height: 16, accentColor: "var(--ink)" }}
      />
      Include a resume Q&A round
    </label>
  </>
);

const Step2Questions: React.FC<{
  questions: CreateFormState["questions"];
  setQ: (i: number, patch: Partial<CreateFormState["questions"][0]>) => void;
  addQ: () => void;
  rmQ: (i: number) => void;
}> = ({ questions, setQ, addQ, rmQ }) => (
  <>
    <InfoBox
      title="How this round works"
      body="Each candidate is asked these questions in order during the interview. The AI may ask up to 3 follow-ups per question if an answer is unclear, then grades the response against the expected answer you provide here."
    />
    {questions.map((q, i) => (
      <div
        key={i}
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          padding: 14,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Q{i + 1}
          </span>
          {questions.length > 1 && <RemoveBtn onClick={() => rmQ(i)} />}
        </div>
        <FieldArea
          label="Question"
          value={q.question}
          onChange={(v) => setQ(i, { question: v })}
          rows={2}
        />
        <FieldArea
          label="Expected answer (for AI grading)"
          value={q.expected_answer}
          onChange={(v) => setQ(i, { expected_answer: v })}
          rows={2}
        />
      </div>
    ))}
    <AddBtn onClick={addQ}>+ Add question</AddBtn>
  </>
);

const Step3Topics: React.FC<{
  topics: CreateFormState["dsa_topics"];
  setT: (i: number, patch: Partial<CreateFormState["dsa_topics"][0]>) => void;
  addT: () => void;
  rmT: (i: number) => void;
  catalog: DsaTopicCatalogEntry[];
  catalogLoading: boolean;
  catalogError: string | null;
  onRetryCatalog: () => void;
}> = ({
  topics,
  setT,
  addT,
  rmT,
  catalog,
  catalogLoading,
  catalogError,
  onRetryCatalog,
}) => {
  if (catalogLoading) {
    return (
      <>
        <AiGeneratesPanel topicCount={topics.length} />
        <Muted>Loading available topics…</Muted>
      </>
    );
  }

  if (catalogError) {
    return (
      <>
        <AiGeneratesPanel topicCount={topics.length} />
        <ErrorAlert message={catalogError} onRetry={onRetryCatalog} />
      </>
    );
  }

  if (catalog.length === 0) {
    return (
      <>
        <AiGeneratesPanel topicCount={topics.length} />
        <Muted>
          No topics are available in the question bank yet. Add questions to the
          bank before configuring a coding round.
        </Muted>
      </>
    );
  }

  return (
    <>
      <AiGeneratesPanel topicCount={topics.length} />
      {topics.map((t, i) => {
        const entry = catalog.find((c) => c.topic === t.topic);
        return (
          <div
            key={i}
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              padding: 14,
              marginBottom: 10,
              display: "grid",
              gridTemplateColumns: "1fr 200px 40px",
              gap: 10,
              alignItems: "end",
            }}
          >
            <TopicPicker
              label={`Topic ${i + 1}`}
              value={t.topic}
              options={catalog.map((c) => c.topic)}
              onChange={(topic) => {
                const next = catalog.find((c) => c.topic === topic);
                setT(i, {
                  topic,
                  difficulty: next?.difficulties[0] ?? t.difficulty,
                });
              }}
            />
            <DifficultyPicker
              value={t.difficulty}
              onChange={(v) => setT(i, { difficulty: v })}
              available={entry?.difficulties}
            />
            {topics.length > 1 ? <RemoveBtn onClick={() => rmT(i)} /> : <div />}
          </div>
        );
      })}
      <AddBtn onClick={addT}>+ Add another topic</AddBtn>
    </>
  );
};

const TopicPicker: React.FC<{
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}> = ({ label, value, options, onChange }) => (
  <label style={{ display: "block" }}>
    <span
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--muted)",
        marginBottom: 5,
      }}
    >
      {label}
    </span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "10px 12px",
        fontSize: 14,
        fontFamily: "var(--font-body)",
        color: "var(--ink)",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </label>
);

// ── Step 1 helpers ──────────────────────────────────────────────────────────

const WeightSlider: React.FC<{
  dsa: number;
  dev: number;
  onChange: (dsa: number) => void;
}> = ({ dsa, dev, onChange }) => {
  const pct = Math.max(0, Math.min(100, dsa));
  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--muted)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Round weighting
        </span>
        <span style={{ fontSize: 11.5, color: "var(--muted-2)" }}>
          Must total 100
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <WeightChip
          label="Coding (DSA)"
          value={pct}
          accent="var(--signal-strong)"
        />
        <WeightChip label="Behavioural (Dev)" value={dev} accent="var(--ink)" />
      </div>

      <div style={{ position: "relative", padding: "10px 4px 4px" }}>
        <div
          style={{
            position: "absolute",
            top: 18,
            left: 4,
            right: 4,
            height: 8,
            borderRadius: 999,
            background: `linear-gradient(to right, var(--signal) 0%, var(--signal) ${pct}%, var(--ink) ${pct}%, var(--ink) 100%)`,
          }}
        />
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={pct}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          aria-label="DSA versus Dev weight"
          style={{
            position: "relative",
            width: "100%",
            height: 28,
            appearance: "none",
            WebkitAppearance: "none",
            background: "transparent",
            cursor: "pointer",
            zIndex: 1,
          }}
        />
        <style>{`
          input[type=range][aria-label="DSA versus Dev weight"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: var(--surface);
            border: 3px solid var(--ink);
            box-shadow: var(--shadow-sm);
            cursor: grab;
            margin-top: -7px;
          }
          input[type=range][aria-label="DSA versus Dev weight"]::-moz-range-thumb {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: var(--surface);
            border: 3px solid var(--ink);
            box-shadow: var(--shadow-sm);
            cursor: grab;
          }
          input[type=range][aria-label="DSA versus Dev weight"]::-webkit-slider-runnable-track,
          input[type=range][aria-label="DSA versus Dev weight"]::-moz-range-track {
            height: 8px;
            background: transparent;
            border-radius: 99px;
          }
        `}</style>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          color: "var(--muted-2)",
          padding: "0 4px",
          marginTop: -4,
          letterSpacing: "0.04em",
          fontWeight: 600,
        }}
      >
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  );
};

const WeightChip: React.FC<{
  label: string;
  value: number;
  accent: string;
}> = ({ label, value, accent }) => (
  <div
    style={{
      flex: 1,
      padding: "10px 14px",
      borderRadius: "var(--radius)",
      background: "var(--surface-2)",
      border: "1px solid var(--line)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    }}
  >
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: accent,
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 18,
        fontWeight: 700,
        color: "var(--ink)",
        letterSpacing: "-0.4px",
      }}
    >
      {value}%
    </span>
  </div>
);

// ── Step 3 helpers ──────────────────────────────────────────────────────────

const AiGeneratesPanel: React.FC<{ topicCount: number }> = ({ topicCount }) => (
  <div
    style={{
      marginBottom: 16,
      padding: "18px 20px",
      borderRadius: "var(--radius)",
      background: "var(--surface-2)",
      border: "1px solid var(--line)",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
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
          border:
            "1px solid color-mix(in srgb, var(--signal) 35%, transparent)",
        }}
      >
        <SparkleIcon />
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--ink)",
            letterSpacing: "-0.2px",
            marginBottom: 4,
          }}
        >
          Questions come from a validated bank
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: "var(--muted)",
            lineHeight: 1.55,
          }}
        >
          Pick <strong>topics</strong> and <strong>difficulty</strong> below.
          Every problem in the bank has passed its own hidden test cases before
          being served, and we assign the least-used match per topic so problems
          rotate fairly across candidates.
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--signal-strong)",
          background: "var(--signal-tint)",
          border:
            "1px solid color-mix(in srgb, var(--signal) 35%, transparent)",
          borderRadius: 999,
          padding: "5px 12px",
          whiteSpace: "nowrap",
          alignSelf: "center",
        }}
      >
        {topicCount} topic{topicCount === 1 ? "" : "s"}
      </div>
    </div>
  </div>
);

const DifficultyPicker: React.FC<{
  value: string;
  onChange: (v: string) => void;
  /** When set, only these difficulties have a bank question for the chosen
   * topic — the rest render disabled instead of silently accepting a
   * selection that would resolve to zero questions. */
  available?: string[];
}> = ({ value, onChange, available }) => {
  const opts: { value: string; label: string; color: string }[] = [
    { value: "easy", label: "Easy", color: "var(--positive)" },
    { value: "medium", label: "Medium", color: "var(--signal-strong)" },
    { value: "hard", label: "Hard", color: "var(--negative)" },
  ];
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--muted)",
          marginBottom: 5,
        }}
      >
        Difficulty
      </div>
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: 3,
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        {opts.map((o) => {
          const active = o.value === value;
          const disabled = available ? !available.includes(o.value) : false;
          return (
            <button
              key={o.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(o.value)}
              title={
                disabled
                  ? "No question available at this difficulty"
                  : undefined
              }
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "var(--font-body)",
                cursor: disabled ? "not-allowed" : "pointer",
                border: "none",
                background: active ? o.color : "transparent",
                color: active ? "var(--paper)" : "var(--muted)",
                opacity: disabled ? 0.35 : 1,
                transition: "all 0.15s ease",
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Shared step UI ──────────────────────────────────────────────────────────

const InfoBox: React.FC<{ title: string; body: string }> = ({
  title,
  body,
}) => (
  <div
    style={{
      marginBottom: 16,
      padding: "14px 18px",
      borderRadius: "var(--radius)",
      background: "var(--surface-2)",
      border: "1px solid var(--line)",
    }}
  >
    <div
      style={{
        fontSize: 12.5,
        fontWeight: 700,
        color: "var(--ink)",
        marginBottom: 4,
      }}
    >
      {title}
    </div>
    <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>
      {body}
    </div>
  </div>
);

const SparkleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0l2.4 7.6L22 10l-7.6 2.4L12 20l-2.4-7.6L2 10l7.6-2.4z" />
    <circle cx="19" cy="4" r="1.5" />
    <circle cx="4" cy="18" r="1" />
  </svg>
);

// ── Header ───────────────────────────────────────────────────────────────────

const AdminHeader: React.FC<{
  displayName: string;
  onHome: () => void;
  onLogout: () => void;
}> = ({ displayName, onHome, onLogout }) => (
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
        maxWidth: 1200,
        margin: "0 auto",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <button
        onClick={onHome}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <Logo size={18} />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--muted-2)",
          }}
        >
          Admin
        </span>
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "4px 14px 4px 4px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 999,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--ink)",
              color: "var(--paper)",
              fontFamily: "var(--font-display)",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--ink)",
            }}
          >
            {displayName}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          Sign out
        </Button>
      </div>
    </div>
  </header>
);

// ── Shared utilities ────────────────────────────────────────────────────────

function isLive(i: OrgInterview) {
  const now = Date.now();
  return (
    new Date(i.start_time).getTime() <= now &&
    now <= new Date(i.end_time).getTime()
  );
}
function isUpcoming(i: OrgInterview) {
  return new Date(i.start_time).getTime() > Date.now();
}
function statusTone(i: OrgInterview): {
  label: string;
  color: string;
  bg: string;
} {
  if (isLive(i))
    return {
      label: "Live",
      color: "var(--positive)",
      bg: "var(--positive-tint)",
    };
  if (isUpcoming(i))
    return {
      label: "Upcoming",
      color: "var(--signal-strong)",
      bg: "var(--signal-tint)",
    };
  return { label: "Closed", color: "var(--muted)", bg: "var(--surface-2)" };
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
function toIso(local: string) {
  return new Date(local).toISOString();
}

function tint(color: string, pct: number) {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

// ── Small UI pieces ─────────────────────────────────────────────────────────

const Mono: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
    {children}
  </span>
);

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div
    style={{
      background: "var(--surface)",
      border: "1px solid var(--line)",
      borderRadius: "var(--radius)",
      padding: 22,
      boxShadow: "var(--shadow-sm)",
    }}
  >
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 14,
        fontWeight: 600,
        color: "var(--ink)",
        marginBottom: 14,
        letterSpacing: "-0.2px",
      }}
    >
      {title}
    </div>
    {children}
  </div>
);

const KeyVal: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      padding: "8px 0",
      borderBottom: "1px solid var(--line)",
      fontSize: 13,
    }}
  >
    <span style={{ color: "var(--muted)" }}>{k}</span>
    <span
      style={{
        color: "var(--ink)",
        fontWeight: 700,
        fontFamily: "var(--font-mono)",
      }}
    >
      {v}
    </span>
  </div>
);

const AddBtn: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      background: "var(--surface-2)",
      border: "1px dashed var(--line-strong)",
      color: "var(--ink)",
      borderRadius: "var(--radius-sm)",
      padding: "8px 16px",
      fontSize: 12.5,
      fontWeight: 700,
      fontFamily: "var(--font-body)",
      cursor: "pointer",
    }}
  >
    {children}
  </button>
);

const RemoveBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Remove"
    style={{
      width: 30,
      height: 30,
      borderRadius: "50%",
      background: "var(--negative-tint)",
      border: "1px solid var(--negative)",
      color: "var(--negative)",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 1,
    }}
  >
    ×
  </button>
);

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  step?: string;
  min?: number;
  max?: number;
  maxLength?: number;
}> = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  step,
  min,
  max,
  maxLength,
}) => (
  <label style={{ display: "block", marginTop: 6 }}>
    <span
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--muted)",
        marginBottom: 5,
      }}
    >
      {label}
    </span>
    <input
      type={type}
      step={step}
      min={min}
      max={max}
      maxLength={maxLength}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        background: "var(--surface)",
        border: "1px solid var(--line-strong)",
        borderRadius: "var(--radius-sm)",
        padding: "9px 12px",
        fontSize: 13.5,
        color: "var(--ink)",
        outline: "none",
        fontFamily: "var(--font-body)",
      }}
    />
  </label>
);

const FieldArea: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}> = ({ label, value, onChange, placeholder, rows = 3 }) => (
  <label style={{ display: "block", marginTop: 10 }}>
    <span
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--muted)",
        marginBottom: 5,
      }}
    >
      {label}
    </span>
    <textarea
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        background: "var(--surface)",
        border: "1px solid var(--line-strong)",
        borderRadius: "var(--radius-sm)",
        padding: "10px 12px",
        fontSize: 13.5,
        color: "var(--ink)",
        outline: "none",
        fontFamily: "var(--font-body)",
        resize: "vertical",
        lineHeight: 1.5,
      }}
    />
  </label>
);

const BadgePill: React.FC<{
  color: string;
  bg: string;
  label: string;
}> = ({ color, bg, label }) => (
  <span
    style={{
      display: "inline-block",
      fontSize: 11,
      fontWeight: 700,
      color,
      background: bg,
      border: `1px solid ${tint(color, 45)}`,
      borderRadius: 999,
      padding: "3px 10px",
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </span>
);

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { c: string; bg: string }> = {
    ongoing: { c: "var(--signal-strong)", bg: "var(--signal-tint)" },
    completed: { c: "var(--positive)", bg: "var(--positive-tint)" },
    scheduled: { c: "var(--ink-2)", bg: "var(--surface-2)" },
    cancelled: { c: "var(--muted)", bg: "var(--surface-2)" },
    cheated: { c: "var(--negative)", bg: "var(--negative-tint)" },
    disqualified: { c: "var(--negative)", bg: "var(--negative-tint)" },
    applied: { c: "var(--ink-2)", bg: "var(--surface-2)" },
    approved: { c: "var(--positive)", bg: "var(--positive-tint)" },
    rejected: { c: "var(--negative)", bg: "var(--negative-tint)" },
  };
  const t = map[status] ?? { c: "var(--muted)", bg: "var(--surface-2)" };
  return <BadgePill color={t.c} bg={t.bg} label={status} />;
};

const DifficultyChip: React.FC<{ difficulty: string; inline?: boolean }> = ({
  difficulty,
  inline,
}) => {
  const norm = difficulty.toLowerCase();
  const c =
    norm === "easy"
      ? "var(--positive)"
      : norm === "medium"
        ? "var(--signal-strong)"
        : "var(--negative)";
  return (
    <span
      style={{
        display: inline ? "inline-block" : undefined,
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        fontWeight: 700,
        color: c,
        background: tint(c, 12),
        border: `1px solid ${tint(c, 45)}`,
        borderRadius: 6,
        padding: "1px 6px",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {difficulty}
    </span>
  );
};

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  const top = rank <= 3;
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background:
          rank === 1
            ? "var(--signal)"
            : top
              ? "var(--ink-2)"
              : "var(--surface-2)",
        color:
          rank === 1 ? "var(--ink)" : top ? "var(--paper)" : "var(--muted)",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: top ? "none" : "1px solid var(--line)",
      }}
    >
      {rank}
    </div>
  );
};

const RoundBlock: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div style={{ marginTop: 14 }}>
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 700,
        color: "var(--ink)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 8,
      }}
    >
      {title}
    </div>
    {children}
  </div>
);

const NoteBox: React.FC<{ label: string; body: string }> = ({
  label,
  body,
}) => (
  <div
    style={{
      background: "var(--surface-2)",
      border: "1px solid var(--line)",
      borderRadius: "var(--radius-sm)",
      padding: "10px 14px",
      marginBottom: 10,
    }}
  >
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        fontWeight: 700,
        color: "var(--muted-2)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    <div
      style={{ fontSize: 13, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}
    >
      {body}
    </div>
  </div>
);

const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 13, color: "var(--muted-2)", fontStyle: "italic" }}>
    {children}
  </div>
);

const StatusBadge: React.FC<{ interview: OrgInterviewDetail }> = ({
  interview,
}) => {
  const tone = statusTone(interview);
  return <BadgePill color={tone.color} bg={tone.bg} label={tone.label} />;
};

const MetricCard: React.FC<{
  label: string;
  value: number;
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
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "var(--radius-sm)",
        background: tint(accent, 12),
        color: accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
        border: `1px solid ${tint(accent, 30)}`,
      }}
    >
      {icon}
    </div>
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 28,
        fontWeight: 700,
        color: "var(--ink)",
        letterSpacing: "-0.8px",
        lineHeight: 1,
        marginBottom: 4,
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>
      {label}
    </div>
  </div>
);

const DateChip: React.FC<{ label: string; date: string }> = ({
  label,
  date,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--font-mono)",
      fontSize: 11.5,
      color: "var(--muted)",
      background: "var(--surface-2)",
      border: "1px solid var(--line)",
      borderRadius: 999,
      padding: "3px 10px",
      fontWeight: 600,
    }}
  >
    <span
      style={{
        color: "var(--muted-2)",
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </span>
    {formatDate(date)}
  </div>
);

const Pill: React.FC<{ text: string; light?: boolean }> = ({ text, light }) => (
  <span
    style={{
      display: "inline-block",
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      fontWeight: 700,
      color: light ? "var(--paper)" : "var(--signal-strong)",
      background: light
        ? "color-mix(in srgb, var(--paper) 14%, transparent)"
        : "var(--signal-tint)",
      border: `1px solid ${
        light
          ? "color-mix(in srgb, var(--paper) 30%, transparent)"
          : "color-mix(in srgb, var(--signal) 35%, transparent)"
      }`,
      borderRadius: 999,
      padding: "5px 12px",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
    }}
  >
    {text}
  </span>
);

const ErrorAlert: React.FC<{
  message: string;
  onRetry: () => void;
  retryLabel?: string;
}> = ({ message, onRetry, retryLabel = "Retry" }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "16px 20px",
      background: "var(--negative-tint)",
      border: "1px solid var(--negative)",
      borderRadius: "var(--radius)",
      marginBottom: 20,
    }}
  >
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle
        cx="10"
        cy="10"
        r="8.5"
        stroke="var(--negative)"
        strokeWidth="1.5"
      />
      <path
        d="M10 6v4.5M10 13.5h.01"
        stroke="var(--negative)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 700,
          color: "var(--negative)",
        }}
      >
        {message}
      </div>
    </div>
    <Button variant="primary" size="sm" onClick={onRetry}>
      {retryLabel}
    </Button>
  </div>
);

const EmptyState: React.FC<{
  title: string;
  body: string;
  action?: React.ReactNode;
}> = ({ title, body, action }) => (
  <div
    style={{
      textAlign: "center",
      padding: "60px 24px",
      color: "var(--muted)",
      background: "var(--surface)",
      border: "1px dashed var(--line-strong)",
      borderRadius: "var(--radius-lg)",
    }}
  >
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 18,
        fontWeight: 600,
        color: "var(--ink)",
        marginBottom: 6,
        letterSpacing: "-0.3px",
      }}
    >
      {title}
    </div>
    <div style={{ fontSize: 13.5, maxWidth: 380, margin: "0 auto" }}>
      {body}
    </div>
    {action}
  </div>
);

const SkeletonCard: React.FC<{ tall?: boolean }> = ({ tall }) => (
  <div
    style={{
      background: "var(--surface)",
      border: "1px solid var(--line)",
      borderRadius: "var(--radius)",
      padding: 22,
      animation: "skel-pulse 1.4s ease-in-out infinite",
      minHeight: tall ? 240 : undefined,
    }}
  >
    <style>{`@keyframes skel-pulse { 0%,100%{opacity:1} 50%{opacity:0.55} }`}</style>
    <div
      style={{
        height: 18,
        background: "var(--surface-2)",
        borderRadius: 8,
        marginBottom: 10,
        width: "70%",
      }}
    />
    <div
      style={{
        height: 12,
        background: "var(--surface-2)",
        borderRadius: 6,
        marginBottom: 8,
        width: "45%",
      }}
    />
    <div
      style={{
        height: 36,
        background: "var(--surface-2)",
        borderRadius: 8,
      }}
    />
  </div>
);

const backLinkStyle: React.CSSProperties = {
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

// ── Icons ────────────────────────────────────────────────────────────────────

const LiveIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="4" fill="currentColor" />
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const CalendarIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect
      x="3"
      y="4"
      width="18"
      height="18"
      rx="3"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M16 2v4M8 2v4M3 10h18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
const ArchiveIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path
      d="M21 8H3M5 8v11a2 2 0 002 2h10a2 2 0 002-2V8M3 5a2 2 0 012-2h14a2 2 0 012 2v3H3V5zM10 13h4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const PlusIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 5v14M5 12h14"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
);
const ArrowIcon: React.FC = () => (
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

export default OrgDashboardPage;
