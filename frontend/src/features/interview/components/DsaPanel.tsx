import React, { useState } from "react";
import MarkdownView from "./MarkdownView";
import {
  dsaRun,
  dsaTest,
  dsaSubmit,
  InterviewServiceError,
} from "../../../services/interview.service";
import type {
  DsaRoundQuestion,
  DsaRoundResponse,
  DsaRunResponse,
  DsaSubmitResponse,
  DsaTestResponse,
} from "../../../services/interview.service";

interface Props {
  sessionId: number;
  token: string;
  round: DsaRoundResponse | null;
  error: string | null;
  isFinishing: boolean;
  onRefreshRound: () => Promise<void>;
  onFinish: () => Promise<void>;
}

type LangOpt =
  | "python"
  | "javascript"
  | "typescript"
  | "java"
  | "c"
  | "c++"
  | "go"
  | "csharp"
  | "bash";

const LANGUAGES: { value: LangOpt; label: string; starter: string }[] = [
  {
    value: "python",
    label: "Python",
    starter: "import sys\n\ndef solve():\n    pass\n\nsolve()\n",
  },
  {
    value: "javascript",
    label: "JavaScript",
    starter:
      "process.stdin.resume();\nlet input = '';\nprocess.stdin.on('data', d => input += d);\nprocess.stdin.on('end', () => {\n  // ...\n});\n",
  },
  {
    value: "typescript",
    label: "TypeScript",
    starter: "// write your solution here\n",
  },
  {
    value: "java",
    label: "Java",
    starter:
      "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}\n",
  },
  {
    value: "c",
    label: "C",
    starter: "#include <stdio.h>\n\nint main() {\n    return 0;\n}\n",
  },
  {
    value: "c++",
    label: "C++",
    starter:
      "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n",
  },
  { value: "go", label: "Go", starter: "package main\n\nfunc main() {\n}\n" },
  {
    value: "csharp",
    label: "C#",
    starter:
      "using System;\n\nclass Program {\n    static void Main() {\n    }\n}\n",
  },
  { value: "bash", label: "Bash", starter: "#!/bin/bash\n" },
];

type ConsoleState =
  | { kind: "idle" }
  | { kind: "running"; label: string }
  | { kind: "run-result"; result: DsaRunResponse }
  | { kind: "test-result"; result: DsaTestResponse }
  | { kind: "submit-result"; result: DsaSubmitResponse }
  | { kind: "error"; message: string };

interface EditorState {
  language: LangOpt;
  source: string;
  stdin: string;
  showStdin: boolean;
  console: ConsoleState;
}

const defaultEditor = (): EditorState => ({
  language: "python",
  source: LANGUAGES.find((l) => l.value === "python")?.starter ?? "",
  stdin: "",
  showStdin: false,
  console: { kind: "idle" },
});

export default function DsaPanel({
  sessionId,
  token,
  round,
  error,
  isFinishing,
  onRefreshRound,
  onFinish,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editors, setEditors] = useState<Record<number, EditorState>>({});
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const questions = round?.questions ?? [];

  if (
    round === null ||
    (round.status === "preparing" && questions.length === 0)
  ) {
    return <PreparingScreen />;
  }

  if (questions.length === 0) {
    // Assignment finished with nothing to serve — let the candidate move on.
    return (
      <EmptyRoundScreen
        isFinishing={isFinishing}
        error={error}
        onFinish={onFinish}
      />
    );
  }

  const selected =
    questions.find((q) => q.interaction_id === selectedId) ?? questions[0];
  const editor = editors[selected.interaction_id] ?? defaultEditor();

  const patchEditor = (patch: Partial<EditorState>) => {
    setEditors((prev) => ({
      ...prev,
      [selected.interaction_id]: {
        ...(prev[selected.interaction_id] ?? defaultEditor()),
        ...patch,
      },
    }));
  };

  const handleLanguageChange = (next: LangOpt) => {
    const currentStarter =
      LANGUAGES.find((l) => l.value === editor.language)?.starter ?? "";
    const nextStarter = LANGUAGES.find((l) => l.value === next)?.starter ?? "";
    const keepCode =
      editor.source.trim() !== currentStarter.trim() &&
      editor.source.trim() !== "";
    patchEditor({
      language: next,
      source: keepCode ? editor.source : nextStarter,
    });
  };

  const isBusy = editor.console.kind === "running";

  const handleRun = async () => {
    patchEditor({ console: { kind: "running", label: "Running…" } });
    try {
      const res = await dsaRun(
        sessionId,
        {
          interaction_id: selected.interaction_id,
          source_code: editor.source,
          language: editor.language,
          stdin: editor.stdin,
        },
        token,
      );
      patchEditor({ console: { kind: "run-result", result: res } });
    } catch (e) {
      patchEditor({
        console: {
          kind: "error",
          message:
            e instanceof InterviewServiceError ? e.message : "Network error.",
        },
      });
    }
  };

  const handleTest = async () => {
    patchEditor({
      console: { kind: "running", label: "Running hidden test cases…" },
    });
    try {
      const res = await dsaTest(
        sessionId,
        {
          interaction_id: selected.interaction_id,
          source_code: editor.source,
          language: editor.language,
        },
        token,
      );
      patchEditor({ console: { kind: "test-result", result: res } });
    } catch (e) {
      patchEditor({
        console: {
          kind: "error",
          message:
            e instanceof InterviewServiceError ? e.message : "Network error.",
        },
      });
    }
  };

  const handleSubmit = async () => {
    patchEditor({
      console: { kind: "running", label: "Grading your submission…" },
    });
    try {
      const res = await dsaSubmit(
        sessionId,
        {
          interaction_id: selected.interaction_id,
          source_code: editor.source,
          language: editor.language,
        },
        token,
      );
      patchEditor({ console: { kind: "submit-result", result: res } });
      // Refresh the round overview so the tab badges show the new state.
      void onRefreshRound();
    } catch (e) {
      patchEditor({
        console: {
          kind: "error",
          message:
            e instanceof InterviewServiceError ? e.message : "Network error.",
        },
      });
    }
  };

  const applySampleStdin = (i: number) => {
    const sample = selected.sample_test_cases?.[i];
    if (sample) {
      patchEditor({ stdin: sample.stdin, showStdin: true });
    }
  };

  const submittedCount = questions.filter((q) => q.attempts > 0).length;

  return (
    <div
      style={{
        maxWidth: 1500,
        margin: "0 auto",
        padding: "16px 32px 60px",
      }}
    >
      <QuestionTabs
        questions={questions}
        selectedId={selected.interaction_id}
        onSelect={setSelectedId}
        submittedCount={submittedCount}
        isFinishing={isFinishing}
        onFinishClick={() => setShowFinishConfirm(true)}
      />

      {error && (
        <div
          style={{
            margin: "10px 0 0",
            padding: "10px 16px",
            background: "rgba(254,226,226,0.8)",
            border: "1px solid rgba(252,165,165,0.7)",
            borderRadius: 12,
            color: "#b91c1c",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.15fr)",
          gap: 18,
          marginTop: 14,
          minHeight: "calc(100vh - 190px)",
        }}
      >
        {/* LEFT: problem statement */}
        <section
          style={{
            background: "rgba(255,255,255,0.78)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.95)",
            borderRadius: 22,
            padding: 28,
            boxShadow: "0 18px 40px -12px rgba(15,23,42,0.1)",
            overflow: "auto",
            maxHeight: "calc(100vh - 190px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#1d4ed8",
                background: "rgba(219,234,254,0.7)",
                border: "1px solid rgba(96,165,250,0.4)",
                borderRadius: 99,
                padding: "4px 11px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Coding round
            </span>
            {selected.attempts > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#047857",
                  background: "rgba(209,250,229,0.7)",
                  border: "1px solid rgba(110,231,183,0.5)",
                  borderRadius: 99,
                  padding: "4px 11px",
                }}
              >
                Submitted · {selected.passed_cases ?? 0}/
                {selected.total_cases ?? 0} cases ·{" "}
                {selected.attempts === 1
                  ? "1 attempt"
                  : `${selected.attempts} attempts`}
              </span>
            )}
          </div>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.5px",
              marginTop: 12,
              marginBottom: 14,
            }}
          >
            {selected.problem_name}
          </h2>
          <div
            style={{
              fontSize: 11.5,
              color: "#64748b",
              fontWeight: 600,
              marginBottom: 18,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <ClockIcon /> {(selected.time_limit_ms / 1000).toFixed(1)}s per
              case
            </span>
          </div>

          <MarkdownView source={selected.description} />

          {selected.sample_test_cases &&
            selected.sample_test_cases.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#0f172a",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 12,
                  }}
                >
                  Sample test cases
                </div>
                {selected.sample_test_cases.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: 14,
                      background: "rgba(248,250,252,0.6)",
                      border: "1px solid rgba(226,232,240,0.7)",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#475569",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Case {i + 1}
                      </span>
                      <button
                        onClick={() => applySampleStdin(i)}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#2563eb",
                          background: "rgba(219,234,254,0.6)",
                          border: "1px solid rgba(147,197,253,0.5)",
                          borderRadius: 99,
                          padding: "3px 10px",
                          cursor: "pointer",
                        }}
                      >
                        Use as input
                      </button>
                    </div>
                    <CodeBlock label="stdin" body={c.stdin} />
                    <div style={{ height: 6 }} />
                    <CodeBlock label="expected" body={c.expected_stdout} />
                  </div>
                ))}
              </div>
            )}
        </section>

        {/* RIGHT: editor + console */}
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.78)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.95)",
              borderRadius: 22,
              padding: 18,
              boxShadow: "0 18px 40px -12px rgba(15,23,42,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              flex: 1,
              minHeight: 380,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Editor
                </span>
                <select
                  value={editor.language}
                  onChange={(e) =>
                    handleLanguageChange(e.target.value as LangOpt)
                  }
                  disabled={isBusy}
                  style={{
                    background: "rgba(255,255,255,0.95)",
                    border: "1px solid rgba(203,213,225,0.7)",
                    borderRadius: 8,
                    padding: "5px 10px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "#0f172a",
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <EditorBtn onClick={handleRun} disabled={isBusy} kind="ghost">
                  <PlayIcon /> Run
                </EditorBtn>
                <EditorBtn onClick={handleTest} disabled={isBusy} kind="ghost">
                  <BeakerIcon /> Test Hidden
                </EditorBtn>
                <EditorBtn
                  onClick={handleSubmit}
                  disabled={isBusy}
                  kind="primary"
                >
                  <CheckIcon /> {selected.attempts > 0 ? "Resubmit" : "Submit"}
                </EditorBtn>
              </div>
            </div>

            <textarea
              value={editor.source}
              onChange={(e) => patchEditor({ source: e.target.value })}
              spellCheck={false}
              style={{
                flex: 1,
                minHeight: 320,
                background: "#0f172a",
                color: "#e2e8f0",
                border: "1px solid rgba(15,23,42,0.6)",
                borderRadius: 14,
                padding: "14px 16px",
                fontFamily:
                  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
                fontSize: 13,
                lineHeight: 1.6,
                outline: "none",
                resize: "vertical",
                tabSize: 4,
              }}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const t = e.currentTarget;
                  const s = t.selectionStart;
                  const next =
                    editor.source.slice(0, s) + "    " + editor.source.slice(s);
                  patchEditor({ source: next });
                  requestAnimationFrame(() => {
                    t.selectionStart = t.selectionEnd = s + 4;
                  });
                }
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <button
                onClick={() => patchEditor({ showStdin: !editor.showStdin })}
                style={{
                  fontSize: 12,
                  color: "#2563eb",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {editor.showStdin ? "▾" : "▸"} Custom stdin
              </button>
              <span
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  fontWeight: 500,
                }}
              >
                Resubmissions allowed · your last submission counts
              </span>
            </div>

            {editor.showStdin && (
              <textarea
                value={editor.stdin}
                onChange={(e) => patchEditor({ stdin: e.target.value })}
                placeholder="Enter custom stdin for the Run button…"
                rows={3}
                style={{
                  background: "rgba(15,23,42,0.05)",
                  border: "1px solid rgba(203,213,225,0.7)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
                  fontSize: 12.5,
                  color: "#0f172a",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            )}
          </div>

          <Console state={editor.console} />
        </section>
      </div>

      {showFinishConfirm && (
        <FinishConfirmModal
          submittedCount={submittedCount}
          totalCount={questions.length}
          isFinishing={isFinishing}
          onCancel={() => setShowFinishConfirm(false)}
          onConfirm={() => {
            setShowFinishConfirm(false);
            void onFinish();
          }}
        />
      )}
    </div>
  );
}

// ── Round-level screens & tabs ──────────────────────────────────────────────

const QuestionTabs: React.FC<{
  questions: DsaRoundQuestion[];
  selectedId: number;
  onSelect: (id: number) => void;
  submittedCount: number;
  isFinishing: boolean;
  onFinishClick: () => void;
}> = ({
  questions,
  selectedId,
  onSelect,
  submittedCount,
  isFinishing,
  onFinishClick,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
    }}
  >
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {questions.map((q, i) => {
        const active = q.interaction_id === selectedId;
        const done = q.attempts > 0;
        return (
          <button
            key={q.interaction_id}
            onClick={() => onSelect(q.interaction_id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 12,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              border: active
                ? "1px solid rgba(59,130,246,0.6)"
                : "1px solid rgba(255,255,255,0.95)",
              background: active
                ? "linear-gradient(135deg,rgba(59,130,246,0.16),rgba(29,78,216,0.16))"
                : "rgba(255,255,255,0.7)",
              color: active ? "#1e3a8a" : "#475569",
              boxShadow: active ? "0 6px 18px rgba(59,130,246,0.18)" : "none",
            }}
          >
            <span>Q{i + 1}</span>
            <span
              style={{
                fontWeight: 600,
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {q.problem_name}
            </span>
            {done && (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: "#047857",
                  background: "rgba(209,250,229,0.85)",
                  border: "1px solid rgba(110,231,183,0.5)",
                  borderRadius: 99,
                  padding: "2px 8px",
                }}
              >
                {q.passed_cases ?? 0}/{q.total_cases ?? 0}
              </span>
            )}
          </button>
        );
      })}
    </div>
    <button
      onClick={onFinishClick}
      disabled={isFinishing}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        background: "linear-gradient(135deg,#059669,#047857)",
        color: "#fff",
        border: "none",
        borderRadius: 99,
        padding: "9px 20px",
        fontSize: 13,
        fontWeight: 700,
        cursor: isFinishing ? "not-allowed" : "pointer",
        opacity: isFinishing ? 0.6 : 1,
        boxShadow: "0 8px 22px rgba(5,150,105,0.35)",
      }}
    >
      {isFinishing
        ? "Finishing…"
        : `Finish round (${submittedCount}/${questions.length} submitted)`}
    </button>
  </div>
);

const PreparingScreen = () => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "90px 32px",
      gap: 14,
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        border: "3px solid rgba(59,130,246,0.2)",
        borderTopColor: "#2563eb",
        animation: "spin 0.9s linear infinite",
      }}
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <div
      style={{
        fontSize: 15,
        fontWeight: 700,
        color: "#0f172a",
        letterSpacing: "-0.3px",
      }}
    >
      Preparing your coding problems…
    </div>
    <div style={{ fontSize: 13, color: "#64748b" }}>
      This usually takes a few seconds. The round will start automatically.
    </div>
  </div>
);

const EmptyRoundScreen: React.FC<{
  isFinishing: boolean;
  error: string | null;
  onFinish: () => Promise<void>;
}> = ({ isFinishing, error, onFinish }) => (
  <div
    style={{
      maxWidth: 520,
      margin: "60px auto",
      padding: "36px 32px",
      background: "rgba(255,255,255,0.8)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      border: "1px solid rgba(255,255,255,0.95)",
      borderRadius: 28,
      boxShadow: "0 25px 50px -12px rgba(15,23,42,0.18)",
      textAlign: "center",
    }}
  >
    <h2
      style={{
        fontSize: 21,
        fontWeight: 800,
        color: "#0f172a",
        letterSpacing: "-0.5px",
        marginBottom: 8,
      }}
    >
      No coding problems available
    </h2>
    <p
      style={{
        fontSize: 14,
        color: "#475569",
        lineHeight: 1.55,
        marginBottom: 22,
      }}
    >
      There are no coding problems for this interview. Continue to the next
      round — this won't count against you.
    </p>
    {error && (
      <p style={{ fontSize: 13, color: "#b91c1c", marginBottom: 14 }}>
        {error}
      </p>
    )}
    <button
      onClick={() => void onFinish()}
      disabled={isFinishing}
      style={{
        background: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
        color: "#fff",
        border: "none",
        borderRadius: 99,
        padding: "11px 26px",
        fontSize: 13.5,
        fontWeight: 700,
        cursor: isFinishing ? "not-allowed" : "pointer",
        opacity: isFinishing ? 0.6 : 1,
        boxShadow: "0 8px 22px rgba(59,130,246,0.4)",
      }}
    >
      {isFinishing ? "Continuing…" : "Continue to next round"}
    </button>
  </div>
);

// ── Console ─────────────────────────────────────────────────────────────────

const Console: React.FC<{ state: ConsoleState }> = ({ state }) => (
  <div
    style={{
      background: "rgba(15,23,42,0.92)",
      color: "#e2e8f0",
      borderRadius: 18,
      padding: 18,
      minHeight: 160,
      boxShadow: "0 18px 40px -12px rgba(15,23,42,0.25)",
      fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
      fontSize: 12.5,
      maxHeight: 280,
      overflow: "auto",
    }}
  >
    <div
      style={{
        fontSize: 11,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontWeight: 700,
        marginBottom: 10,
      }}
    >
      Console
    </div>
    <ConsoleBody state={state} />
  </div>
);

const ConsoleBody: React.FC<{ state: ConsoleState }> = ({ state }) => {
  if (state.kind === "idle") {
    return (
      <div style={{ color: "#64748b", fontStyle: "italic" }}>
        Output will appear here after you run, test, or submit your code.
      </div>
    );
  }
  if (state.kind === "running") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "#bfdbfe",
        }}
      >
        <Spinner />
        {state.label}
      </div>
    );
  }
  if (state.kind === "error") {
    return <div style={{ color: "#fca5a5" }}>✘ {state.message}</div>;
  }
  if (state.kind === "run-result") {
    const r = state.result;
    return (
      <div>
        <Line
          label="exit"
          value={String(r.exit_code)}
          tone={r.exit_code === 0 ? "ok" : "bad"}
        />
        {r.stdout && (
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                color: "#94a3b8",
                fontSize: 10.5,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              stdout
            </div>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                color: "#e2e8f0",
                background: "rgba(255,255,255,0.04)",
                padding: 8,
                borderRadius: 8,
              }}
            >
              {r.stdout}
            </pre>
          </div>
        )}
        {r.stderr && (
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                color: "#fca5a5",
                fontSize: 10.5,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              stderr
            </div>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                color: "#fecaca",
                background: "rgba(248,113,113,0.08)",
                padding: 8,
                borderRadius: 8,
              }}
            >
              {r.stderr}
            </pre>
          </div>
        )}
      </div>
    );
  }
  if (state.kind === "test-result") {
    return (
      <div>
        <div style={{ marginBottom: 10, color: "#cbd5e1" }}>
          <strong style={{ color: "#fff" }}>
            {state.result.passed} / {state.result.total}
          </strong>{" "}
          hidden cases passed
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {state.result.case_results.map((c) => (
            <CaseDot key={c.case} idx={c.case} status={c.status} />
          ))}
        </div>
      </div>
    );
  }
  if (state.kind === "submit-result") {
    const r = state.result;
    return (
      <div>
        <div style={{ marginBottom: 10, color: "#cbd5e1" }}>
          <strong style={{ color: "#fff" }}>
            {r.passed} / {r.total}
          </strong>{" "}
          cases passed · score{" "}
          <strong style={{ color: "#a7f3d0" }}>{r.score.toFixed(1)}</strong> ·
          attempt <strong style={{ color: "#fff" }}>{r.attempts}</strong>
        </div>
        {!r.recorded && (
          <div
            style={{
              marginBottom: 10,
              padding: "8px 10px",
              background: "rgba(251,191,36,0.12)",
              border: "1px solid rgba(251,191,36,0.4)",
              borderRadius: 8,
              color: "#fde68a",
            }}
          >
            ⚠ This result was not recorded — the round ended or a newer
            submission superseded it.
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 10,
          }}
        >
          {r.case_results.map((c) => (
            <CaseDot key={c.case} idx={c.case} status={c.status} />
          ))}
        </div>
        <div style={{ color: "#94a3b8", fontSize: 11.5 }}>
          You can resubmit until you finish the round — your last submission
          counts.
        </div>
      </div>
    );
  }
  return null;
};

const CaseDot: React.FC<{
  idx: number;
  status: "passed" | "failed" | "error";
}> = ({ idx, status }) => {
  const color =
    status === "passed"
      ? "#10b981"
      : status === "failed"
        ? "#f59e0b"
        : "#ef4444";
  const label = status === "passed" ? "✓" : status === "failed" ? "✗" : "⚠";
  return (
    <div
      title={`Case ${idx}: ${status}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: `${color}22`,
        color,
        border: `1px solid ${color}55`,
        borderRadius: 99,
        padding: "4px 10px",
        fontSize: 11.5,
        fontWeight: 700,
      }}
    >
      <span>{label}</span>
      Case {idx}
    </div>
  );
};

const Line: React.FC<{
  label: string;
  value: string;
  tone: "ok" | "bad";
}> = ({ label, value, tone }) => (
  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
    <span
      style={{
        color: "#94a3b8",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {label}
    </span>
    <span
      style={{
        color: tone === "ok" ? "#a7f3d0" : "#fecaca",
        fontWeight: 700,
      }}
    >
      {value}
    </span>
  </div>
);

const CodeBlock: React.FC<{ label: string; body: string }> = ({
  label,
  body,
}) => (
  <div>
    <div
      style={{
        fontSize: 10.5,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        fontWeight: 700,
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    <pre
      style={{
        whiteSpace: "pre-wrap",
        background: "rgba(15,23,42,0.92)",
        color: "#e2e8f0",
        padding: "8px 10px",
        borderRadius: 8,
        fontSize: 11.5,
        fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
        margin: 0,
      }}
    >
      {body}
    </pre>
  </div>
);

const EditorBtn: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  kind: "primary" | "ghost";
  children: React.ReactNode;
}> = ({ onClick, disabled, kind, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "8px 14px",
      borderRadius: 10,
      fontSize: 12.5,
      fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1,
      border: kind === "primary" ? "none" : "1px solid rgba(203,213,225,0.8)",
      background:
        kind === "primary"
          ? "linear-gradient(135deg,#3b82f6,#1d4ed8)"
          : "rgba(255,255,255,0.85)",
      color: kind === "primary" ? "#fff" : "#475569",
      boxShadow:
        kind === "primary" ? "0 6px 18px rgba(59,130,246,0.4)" : "none",
      transition: "all 0.15s",
    }}
  >
    {children}
  </button>
);

const FinishConfirmModal: React.FC<{
  submittedCount: number;
  totalCount: number;
  isFinishing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ submittedCount, totalCount, isFinishing, onCancel, onConfirm }) => (
  <div
    role="dialog"
    aria-modal="true"
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,0.55)",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
    }}
  >
    <div
      style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.95)",
        borderRadius: 22,
        padding: 28,
        maxWidth: 440,
        width: "92%",
        boxShadow: "0 35px 60px -15px rgba(15,23,42,0.3)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "linear-gradient(145deg,#fef3c7,#fde68a)",
          color: "#b45309",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.7 3.86a2 2 0 00-3.4 0z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h3
        style={{
          fontSize: 19,
          fontWeight: 800,
          color: "#0f172a",
          letterSpacing: "-0.4px",
          marginBottom: 6,
        }}
      >
        Finish coding round?
      </h3>
      <p
        style={{
          fontSize: 13.5,
          color: "#64748b",
          lineHeight: 1.55,
          marginBottom: 22,
        }}
      >
        You've submitted {submittedCount} of {totalCount} problem
        {totalCount === 1 ? "" : "s"}. Once you finish, you can't come back to
        this round or resubmit.
        {submittedCount < totalCount &&
          " Unsubmitted problems will score zero."}
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            background: "rgba(241,245,249,0.9)",
            border: "1px solid rgba(203,213,225,0.7)",
            borderRadius: 99,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 600,
            color: "#475569",
            cursor: "pointer",
          }}
        >
          Keep working
        </button>
        <button
          onClick={onConfirm}
          disabled={isFinishing}
          style={{
            background: "linear-gradient(135deg,#059669,#047857)",
            color: "#fff",
            border: "none",
            borderRadius: 99,
            padding: "10px 22px",
            fontSize: 13,
            fontWeight: 700,
            cursor: isFinishing ? "not-allowed" : "pointer",
            opacity: isFinishing ? 0.6 : 1,
            boxShadow: "0 6px 18px rgba(5,150,105,0.35)",
          }}
        >
          Finish round
        </button>
      </div>
    </div>
  </div>
);

const Spinner = () => (
  <svg
    width="14"
    height="14"
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

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M6 3v3l2 1"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

const PlayIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
    <path d="M3 2l7 4-7 4z" />
  </svg>
);

const BeakerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path
      d="M9 3h6M10 3v6L5 19c-1 2 0 3 2 3h10c2 0 3-1 2-3L14 9V3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path
      d="M5 12l5 5L20 7"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
