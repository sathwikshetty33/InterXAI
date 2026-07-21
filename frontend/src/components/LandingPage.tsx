import type { CSSProperties, JSX } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../ui/Logo";
import Button from "../ui/Button";
import ScoreMeter from "../ui/ScoreMeter";

export interface LandingPageProps {
  onLoginClick?: () => void;
}

const ROUNDS = [
  {
    n: "01",
    name: "Questions",
    detail:
      "Your custom questions, asked conversationally. The interviewer follows up when an answer leaves something open — the way a good human panel would.",
  },
  {
    n: "02",
    name: "DSA",
    detail:
      "A coding problem in a live sandbox. Run against samples, test against hidden cases, resubmit until you're happy. Every attempt is on the record.",
  },
  {
    n: "03",
    name: "Résumé",
    detail:
      "Questions grounded in the résumé the candidate actually submitted — so claims get examined, not taken on faith.",
  },
];

export default function LandingPage({
  onLoginClick,
}: LandingPageProps): JSX.Element {
  const navigate = useNavigate();
  const goCandidate = onLoginClick ?? (() => navigate("/login"));

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "color-mix(in srgb, var(--paper) 82%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          className="ix-container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
          }}
        >
          <Logo size={19} />
          <div className="ix-nav-links">
            <a href="#how" style={navLink}>
              How it works
            </a>
            <a href="#organizations" style={navLink}>
              For organizations
            </a>
            <button onClick={() => navigate("/admin")} style={navLink}>
              Admin
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button variant="quiet" size="sm" onClick={goCandidate}>
              Sign in
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate("/signup")}
            >
              Get started
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <header className="ix-container" style={{ padding: "72px 24px 40px" }}>
        <div className="ix-hero-grid">
          <div>
            <Eyebrow>AI-conducted technical interviews</Eyebrow>
            <h1
              className="ix-reveal"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(40px, 6vw, 68px)",
                lineHeight: 1.02,
                letterSpacing: "-2px",
                margin: "18px 0 0",
                color: "var(--ink)",
              }}
            >
              Interviews,
              <br />
              measured{" "}
              <span
                style={{
                  color: "var(--signal-strong)",
                  fontStyle: "italic",
                  fontWeight: 500,
                }}
              >
                fairly.
              </span>
            </h1>
            <p
              className="ix-reveal"
              style={{
                animationDelay: "0.08s",
                fontSize: 18,
                lineHeight: 1.6,
                color: "var(--muted)",
                maxWidth: 480,
                margin: "22px 0 0",
              }}
            >
              InterXAI runs the whole interview — questions, live coding, and
              résumé follow-ups — then scores every answer on the same rubric.
              Candidates get a real shot. Teams get a ranked, defensible signal.
            </p>
            <div
              className="ix-reveal"
              style={{
                animationDelay: "0.16s",
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                margin: "32px 0 0",
              }}
            >
              <Button variant="signal" size="lg" onClick={goCandidate}>
                Take an interview
                <Arrow />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => navigate("/admin")}
              >
                I'm hiring
              </Button>
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--muted-2)",
                margin: "20px 0 0",
                fontFamily: "var(--font-mono)",
              }}
            >
              3 rounds · scored 0–10 · no scheduling
            </p>
          </div>

          <SessionShowcase />
        </div>
      </header>

      {/* ── How it works ────────────────────────────────────── */}
      <section
        id="how"
        className="ix-container"
        style={{ padding: "56px 24px" }}
      >
        <SectionHead
          kicker="The flow"
          title="Three rounds. One rubric."
          sub="An interview is a sequence, so we treat it like one — each round builds a fuller picture before a single score is committed."
        />
        <div className="ix-steps" style={{ marginTop: 34 }}>
          {ROUNDS.map((r) => (
            <article
              key={r.n}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                padding: 24,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--signal-strong)",
                }}
              >
                {r.n}
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: 21,
                  letterSpacing: "-0.5px",
                  margin: "10px 0 8px",
                }}
              >
                {r.name}
              </h3>
              <p
                style={{
                  fontSize: 14.5,
                  lineHeight: 1.6,
                  color: "var(--muted)",
                  margin: 0,
                }}
              >
                {r.detail}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── For organizations ───────────────────────────────── */}
      <section
        id="organizations"
        style={{
          background: "var(--ink)",
          color: "var(--paper)",
          marginTop: 24,
        }}
      >
        <div className="ix-container" style={{ padding: "72px 24px" }}>
          <div className="ix-org-grid">
            <div>
              <Eyebrow onDark>For organizations</Eyebrow>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: "clamp(30px, 4vw, 44px)",
                  letterSpacing: "-1.2px",
                  lineHeight: 1.08,
                  margin: "16px 0 16px",
                }}
              >
                Every candidate, ranked on the same evidence.
              </h2>
              <p
                style={{
                  fontSize: 16.5,
                  lineHeight: 1.6,
                  color: "color-mix(in srgb, var(--paper) 72%, transparent)",
                  maxWidth: 440,
                  margin: "0 0 28px",
                }}
              >
                Build the interview once. Résumés are screened on upload,
                shortlisted candidates interview on their own time, and you get
                a leaderboard backed by full transcripts and per-round scores.
              </p>
              <Button
                variant="signal"
                size="lg"
                onClick={() => navigate("/admin")}
              >
                Open the admin console
                <Arrow />
              </Button>
            </div>
            <LeaderboardShowcase />
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="ix-container" style={{ padding: "34px 24px" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Logo size={16} />
          <span style={{ fontSize: 13, color: "var(--muted-2)" }}>
            AI-conducted interviews, scored fairly.
          </span>
        </div>
      </footer>
    </div>
  );
}

// ── The hero signature: a live, scored interview turn ───────────────────────

function SessionShowcase() {
  return (
    <div
      className="ix-reveal"
      style={{
        animationDelay: "0.12s",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        overflow: "hidden",
      }}
    >
      {/* window bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 18px",
          borderBottom: "1px solid var(--line)",
          background: "var(--surface-2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
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
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "var(--muted)",
            }}
          >
            LIVE SESSION
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["Questions", "DSA", "Résumé"].map((r, i) => (
            <span
              key={r}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 9px",
                borderRadius: 99,
                background: i === 0 ? "var(--signal-tint)" : "transparent",
                color: i === 0 ? "var(--signal-strong)" : "var(--muted-2)",
                border:
                  i === 0
                    ? "1px solid color-mix(in srgb, var(--signal) 35%, transparent)"
                    : "1px solid var(--line)",
              }}
            >
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* transcript */}
      <div
        style={{
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <Turn
          who="Interviewer"
          text="Walk me through how you'd keep the DSA submissions idempotent under a retry."
        />
        <Turn
          who="Candidate"
          text="I'd key each submission on its interaction id and let the last submitted one win, so a retried request just re-grades the same question…"
          candidate
        />
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--signal-strong)",
            fontFamily: "var(--font-mono)",
            paddingLeft: 2,
          }}
        >
          ↳ follow-up generated
        </div>

        {/* evaluation */}
        <div
          style={{
            marginTop: 4,
            paddingTop: 16,
            borderTop: "1px dashed var(--line-strong)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "var(--muted-2)",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Evaluation
            </div>
            <ScoreMeter score={8.4} size="lg" />
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "6px 12px",
              borderRadius: 99,
              background: "var(--positive-tint)",
              color: "var(--positive)",
              alignSelf: "flex-end",
            }}
          >
            Recommend · Hire
          </span>
        </div>
      </div>
    </div>
  );
}

function Turn({
  who,
  text,
  candidate = false,
}: {
  who: string;
  text: string;
  candidate?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: candidate ? "var(--ink)" : "var(--muted-2)",
          letterSpacing: "0.02em",
        }}
      >
        {who}
      </span>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.55,
          color: candidate ? "var(--ink-2)" : "var(--muted)",
          background: candidate ? "var(--surface-2)" : "transparent",
          border: candidate ? "1px solid var(--line)" : "none",
          borderRadius: 10,
          padding: candidate ? "10px 12px" : "0 2px",
        }}
      >
        {text}
      </p>
    </div>
  );
}

// ── Org section signature: a compact leaderboard ────────────────────────────

const BOARD = [
  { rank: 1, name: "A. Okafor", score: 9.1 },
  { rank: 2, name: "R. Mehta", score: 8.4 },
  { rank: 3, name: "L. Nguyen", score: 7.2 },
  { rank: 4, name: "J. Silva", score: 5.6 },
];

function LeaderboardShowcase() {
  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "var(--shadow-lg)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 15,
            color: "var(--ink)",
          }}
        >
          Senior Backend · Leaderboard
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--muted-2)",
          }}
        >
          24 candidates
        </span>
      </div>
      <div>
        {BOARD.map((c) => (
          <div
            key={c.rank}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "13px 20px",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                fontWeight: 700,
                color: c.rank === 1 ? "var(--signal-strong)" : "var(--muted-2)",
                width: 20,
              }}
            >
              {c.rank}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              {c.name}
            </span>
            <ScoreMeter score={c.score} size="sm" animate={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Small shared bits ────────────────────────────────────────────────────────

function Eyebrow({
  children,
  onDark = false,
}: {
  children: string;
  onDark?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: onDark ? "var(--signal)" : "var(--signal-strong)",
      }}
    >
      {children}
    </span>
  );
}

function SectionHead({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub: string;
}) {
  return (
    <div style={{ maxWidth: 620 }}>
      <Eyebrow>{kicker}</Eyebrow>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: "clamp(28px, 4vw, 40px)",
          letterSpacing: "-1.2px",
          lineHeight: 1.1,
          margin: "14px 0 12px",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.6,
          color: "var(--muted)",
          margin: 0,
        }}
      >
        {sub}
      </p>
    </div>
  );
}

const navLink: CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: "var(--muted)",
  textDecoration: "none",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: "var(--font-body)",
  padding: 0,
};

function Arrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 12 12" fill="none">
      <path
        d="M1 6h10M7 2l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
