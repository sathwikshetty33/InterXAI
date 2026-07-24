import React from "react";
import { useInterviewSession } from "./hooks/useInterviewSession";
import TextQAPanel from "./components/TextQAPanel";
import DsaPanel from "./components/DsaPanel";
import ProctorWidget from "./components/ProctorWidget";
import Logo from "../../ui/Logo";
import Button from "../../ui/Button";
import type {
  InterviewStateResponse,
  Round,
  SessionStatus,
} from "../../services/interview.service";

export interface InterviewSessionPageProps {
  interviewId: number;
  token: string;
  onExit: () => void;
}

const InterviewSessionPage: React.FC<InterviewSessionPageProps> = ({
  interviewId,
  token,
  onExit,
}) => {
  const {
    phase,
    state,
    terminalStatus,
    error,
    isSubmitting,
    followUpIndex,
    dsaRound,
    remainingMs,
    answer,
    refreshDsaRound,
    finishDsa,
    goTerminal,
  } = useInterviewSession(interviewId, token);

  return (
    <div
      id="interview-session"
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        fontFamily: "var(--font-body)",
        position: "relative",
      }}
    >
      <SessionHeader
        round={state?.round}
        sessionId={state?.session_id}
        phase={phase}
        remainingMs={remainingMs}
        onExit={onExit}
      />

      <main style={{ position: "relative", zIndex: 5 }}>
        {phase === "loading" && <LoadingScreen />}

        {phase === "error" && (
          <ErrorScreen
            message={error ?? "Unable to start interview."}
            onExit={onExit}
          />
        )}

        {phase === "active" &&
          state &&
          (state.round === "dsa" ? (
            <DsaPanel
              sessionId={state.session_id}
              token={token}
              round={dsaRound}
              error={error}
              isFinishing={isSubmitting}
              onRefreshRound={refreshDsaRound}
              onFinish={finishDsa}
            />
          ) : (
            state.question &&
            renderRound({
              question: state.question,
              isSubmitting,
              error,
              onAnswer: answer,
              followUpIndex,
            })
          ))}

        {phase === "completed" && <CompletedScreen onExit={onExit} />}

        {phase === "terminal" && (
          <TerminalScreen status={terminalStatus} onExit={onExit} />
        )}
      </main>

      {phase === "active" && state && (
        <ProctorWidget
          sessionId={state.session_id}
          token={token}
          onTerminal={goTerminal}
        />
      )}
    </div>
  );
};

interface RenderArgs {
  question: NonNullable<InterviewStateResponse["question"]>;
  isSubmitting: boolean;
  error: string | null;
  onAnswer: (text: string) => Promise<void>;
  followUpIndex: number;
}

function renderRound({
  question,
  isSubmitting,
  error,
  onAnswer,
  followUpIndex,
}: RenderArgs) {
  if (question.type === "custom") {
    return (
      <TextQAPanel
        key={`q-${question.interaction_id}`}
        question={question}
        round="questions"
        followUpIndex={followUpIndex}
        isSubmitting={isSubmitting}
        error={error}
        onSubmit={onAnswer}
      />
    );
  }
  return (
    <TextQAPanel
      key={`r-${question.question_id}`}
      question={question}
      round="resume"
      followUpIndex={0}
      isSubmitting={isSubmitting}
      error={error}
      onSubmit={onAnswer}
    />
  );
}

// ── Header ──────────────────────────────────────────────────────────────────

const ROUND_META: Record<Round, { label: string; step: number }> = {
  questions: { label: "Questions", step: 1 },
  dsa: { label: "DSA", step: 2 },
  resume: { label: "Résumé", step: 3 },
};

const SessionHeader: React.FC<{
  round: Round | undefined;
  sessionId: number | undefined;
  phase: string;
  remainingMs: number | null;
  onExit: () => void;
}> = ({ round, sessionId, phase, remainingMs, onExit }) => (
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
        maxWidth: 1500,
        margin: "0 auto",
        padding: "12px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Logo size={18} />
        {sessionId !== undefined && (
          <span
            style={{
              fontSize: 11,
              color: "var(--muted-2)",
              fontWeight: 500,
              fontFamily: "var(--font-mono)",
            }}
          >
            session #{sessionId}
          </span>
        )}
      </div>

      <RoundStepper round={round} />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {phase === "active" && remainingMs !== null && (
          <CountdownChip remainingMs={remainingMs} />
        )}
        <LiveDot phase={phase} />
        <Button variant="ghost" size="sm" onClick={onExit}>
          Exit
        </Button>
      </div>
    </div>
  </header>
);

const RoundStepper: React.FC<{ round: Round | undefined }> = ({ round }) => {
  const order: Round[] = ["questions", "dsa", "resume"];
  const activeStep = round ? ROUND_META[round].step : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {order.map((r, i) => {
        const step = ROUND_META[r].step;
        const done = step < activeStep;
        const active = step === activeStep;
        return (
          <React.Fragment key={r}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "5px 12px",
                borderRadius: 99,
                background: active
                  ? "var(--signal-tint)"
                  : done
                    ? "var(--surface)"
                    : "transparent",
                border: active
                  ? "1px solid color-mix(in srgb, var(--signal) 35%, transparent)"
                  : done
                    ? "1px solid var(--line)"
                    : "1px solid var(--line)",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: active
                    ? "var(--signal)"
                    : done
                      ? "var(--ink)"
                      : "transparent",
                  border:
                    active || done ? "none" : "1.5px solid var(--line-strong)",
                  color: active ? "var(--ink)" : "var(--paper)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {done ? "✓" : step}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: active
                    ? "var(--signal-strong)"
                    : done
                      ? "var(--ink)"
                      : "var(--muted-2)",
                  letterSpacing: "0.02em",
                }}
              >
                {ROUND_META[r].label}
              </span>
            </div>
            {i < order.length - 1 && (
              <div
                style={{
                  width: 14,
                  height: 2,
                  background: done ? "var(--ink)" : "var(--line-strong)",
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

const CountdownChip: React.FC<{ remainingMs: number }> = ({ remainingMs }) => {
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  // Turn urgent under two minutes; the last thirty seconds pulse.
  const urgent = remainingMs <= 2 * 60 * 1000;
  const critical = remainingMs <= 30 * 1000;
  const color = urgent ? "var(--negative)" : "var(--ink)";
  const bg = urgent ? "var(--negative-tint)" : "var(--surface-2)";
  const border = urgent
    ? "color-mix(in srgb, var(--negative) 35%, transparent)"
    : "var(--line)";
  return (
    <div
      title="Time remaining"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "5px 12px",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 99,
      }}
    >
      <ClockGlyph color={color} />
      <span
        className={critical ? "ix-live-dot" : undefined}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontWeight: 700,
          color,
          letterSpacing: "0.02em",
        }}
      >
        {mm}:{ss}
      </span>
    </div>
  );
};

const ClockGlyph: React.FC<{ color: string }> = ({ color }) => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5.6" stroke={color} strokeWidth="1.4" />
    <path
      d="M7 4v3.2l2.2 1.3"
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LiveDot: React.FC<{ phase: string }> = ({ phase }) => {
  if (phase !== "active") return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 12px",
        background: "var(--signal-tint)",
        border: "1px solid color-mix(in srgb, var(--signal) 35%, transparent)",
        borderRadius: 99,
      }}
    >
      <span
        className="ix-live-dot"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--signal)",
          display: "inline-block",
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--signal-strong)",
          fontWeight: 700,
          letterSpacing: "0.08em",
        }}
      >
        LIVE
      </span>
    </div>
  );
};

// ── Screens ─────────────────────────────────────────────────────────────────

const LoadingScreen = () => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "80px 32px",
      gap: 14,
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        border: "3px solid var(--line)",
        borderTopColor: "var(--signal)",
        animation: "spin 0.9s linear infinite",
      }}
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 17,
        fontWeight: 600,
        color: "var(--ink)",
        letterSpacing: "-0.5px",
      }}
    >
      Starting your interview…
    </div>
    <div style={{ fontSize: 13, color: "var(--muted)" }}>
      Setting up your questions and code workspace.
    </div>
  </div>
);

const ErrorScreen: React.FC<{ message: string; onExit: () => void }> = ({
  message,
  onExit,
}) => (
  <div
    style={{
      maxWidth: 520,
      margin: "60px auto",
      padding: "36px 32px",
      background: "var(--surface)",
      border: "1px solid var(--line)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-md)",
      textAlign: "center",
    }}
  >
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: "var(--radius)",
        background: "var(--negative-tint)",
        color: "var(--negative)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 16px",
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 8v5M12 16h.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
    <h2
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 24,
        fontWeight: 600,
        color: "var(--ink)",
        letterSpacing: "-0.6px",
        marginBottom: 8,
      }}
    >
      Could not start interview
    </h2>
    <p
      style={{
        fontSize: 14,
        color: "var(--muted)",
        lineHeight: 1.6,
        marginBottom: 24,
      }}
    >
      {message}
    </p>
    <Button variant="primary" size="md" onClick={onExit}>
      Back to dashboard
    </Button>
  </div>
);

const CompletedScreen: React.FC<{ onExit: () => void }> = ({ onExit }) => (
  <div
    style={{
      maxWidth: 560,
      margin: "60px auto",
      padding: "48px 40px",
      background: "var(--surface)",
      border: "1px solid var(--line)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-lg)",
      textAlign: "center",
    }}
  >
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: "var(--radius-lg)",
        background: "var(--positive-tint)",
        color: "var(--positive)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 20px",
      }}
    >
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12l5 5L20 7"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
    <h2
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 30,
        fontWeight: 600,
        color: "var(--ink)",
        letterSpacing: "-1px",
        marginBottom: 12,
      }}
    >
      Interview submitted
    </h2>
    <p
      style={{
        fontSize: 15,
        color: "var(--muted)",
        lineHeight: 1.6,
        maxWidth: 420,
        margin: "0 auto 28px",
      }}
    >
      Thanks for taking the time. Our team will review your responses and reach
      out shortly. You'll get a notification once the result is ready.
    </p>
    <Button variant="primary" size="lg" onClick={onExit}>
      Back to dashboard
    </Button>
  </div>
);

const TERMINAL_COPY: Partial<
  Record<SessionStatus, { title: string; body: string; tone: "warn" | "bad" }>
> = {
  disqualified: {
    title: "Interview ended",
    body: "Your session was disqualified due to extended inactivity. If you believe this was a mistake, please reach out to the hiring team.",
    tone: "bad",
  },
  cancelled: {
    title: "Interview cancelled",
    body: "This interview session was cancelled. Please contact the hiring team for next steps.",
    tone: "warn",
  },
  cheated: {
    title: "Interview ended",
    body: "Your session was flagged and ended early. Please contact the hiring team if you have any questions.",
    tone: "bad",
  },
};

const TerminalScreen: React.FC<{
  status: SessionStatus | null;
  onExit: () => void;
}> = ({ status, onExit }) => {
  const copy = (status && TERMINAL_COPY[status]) ?? {
    title: "Interview ended",
    body: "Your session has ended.",
    tone: "warn" as const,
  };
  const accent =
    copy.tone === "bad" ? "var(--negative)" : "var(--signal-strong)";
  const iconBg =
    copy.tone === "bad" ? "var(--negative-tint)" : "var(--signal-tint)";
  return (
    <div
      style={{
        maxWidth: 560,
        margin: "60px auto",
        padding: "48px 40px",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "var(--radius-lg)",
          background: iconBg,
          color: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.7 3.86a2 2 0 00-3.4 0z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 26,
          fontWeight: 600,
          color: "var(--ink)",
          letterSpacing: "-0.8px",
          marginBottom: 10,
        }}
      >
        {copy.title}
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "var(--muted)",
          lineHeight: 1.6,
          marginBottom: 28,
        }}
      >
        {copy.body}
      </p>
      <Button variant="primary" size="lg" onClick={onExit}>
        Back to dashboard
      </Button>
    </div>
  );
};

export default InterviewSessionPage;
