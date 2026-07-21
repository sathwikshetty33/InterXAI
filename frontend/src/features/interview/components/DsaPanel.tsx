import React, { useState } from "react";
import MarkdownView from "./MarkdownView";
import Button from "../../../ui/Button";
import ScoreMeter from "../../../ui/ScoreMeter";
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
            background: "var(--negative-tint)",
            border:
              "1px solid color-mix(in srgb, var(--negative) 40%, transparent)",
            borderRadius: "var(--radius-sm)",
            color: "var(--negative)",
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
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            padding: 28,
            boxShadow: "var(--shadow-sm)",
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
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--muted)",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: 99,
                padding: "4px 11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              DSA round
            </span>
            {selected.attempts > 0 && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--positive)",
                  background: "var(--positive-tint)",
                  border:
                    "1px solid color-mix(in srgb, var(--positive) 30%, transparent)",
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
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-0.5px",
              marginTop: 14,
              marginBottom: 14,
            }}
          >
            {selected.problem_name}
          </h2>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              color: "var(--muted)",
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
                    fontWeight: 700,
                    color: "var(--ink)",
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
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius-sm)",
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
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--muted)",
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
                          fontFamily: "var(--font-body)",
                          color: "var(--ink)",
                          background: "var(--surface)",
                          border: "1px solid var(--line-strong)",
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
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              padding: 18,
              boxShadow: "var(--shadow-sm)",
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
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--muted)",
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
                    background: "var(--surface-2)",
                    border: "1px solid var(--line-strong)",
                    borderRadius: "var(--radius-sm)",
                    padding: "6px 10px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--ink)",
                    fontFamily: "var(--font-mono)",
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
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRun}
                  disabled={isBusy}
                >
                  <PlayIcon /> Run
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTest}
                  disabled={isBusy}
                >
                  <BeakerIcon /> Test hidden
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isBusy}
                >
                  <CheckIcon /> {selected.attempts > 0 ? "Resubmit" : "Submit"}
                </Button>
              </div>
            </div>

            <textarea
              value={editor.source}
              onChange={(e) => patchEditor({ source: e.target.value })}
              spellCheck={false}
              style={{
                flex: 1,
                minHeight: 320,
                background: "var(--ink)",
                color: "var(--paper)",
                border: "1px solid var(--ink-2)",
                borderRadius: "var(--radius)",
                padding: "14px 16px",
                fontFamily: "var(--font-mono)",
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
                  color: "var(--ink)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
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
                  color: "var(--muted-2)",
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
                  background: "var(--surface-2)",
                  border: "1px solid var(--line-strong)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12.5,
                  color: "var(--ink)",
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
              borderRadius: "var(--radius-sm)",
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              border: active ? "1px solid var(--ink)" : "1px solid var(--line)",
              background: active ? "var(--ink)" : "var(--surface)",
              color: active ? "var(--paper)" : "var(--muted)",
              boxShadow: active ? "var(--shadow-sm)" : "none",
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
              Q{i + 1}
            </span>
            <span
              style={{
                fontWeight: 500,
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
                  fontFamily: "var(--font-mono)",
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: active ? "var(--paper)" : "var(--positive)",
                  background: active
                    ? "color-mix(in srgb, var(--paper) 16%, transparent)"
                    : "var(--positive-tint)",
                  border: active
                    ? "1px solid color-mix(in srgb, var(--paper) 30%, transparent)"
                    : "1px solid color-mix(in srgb, var(--positive) 30%, transparent)",
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
    <Button
      variant="primary"
      size="sm"
      onClick={onFinishClick}
      disabled={isFinishing}
    >
      {isFinishing
        ? "Finishing…"
        : `Finish round (${submittedCount}/${questions.length} submitted)`}
    </Button>
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
      Preparing your coding problems…
    </div>
    <div style={{ fontSize: 13, color: "var(--muted)" }}>
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
      background: "var(--surface)",
      border: "1px solid var(--line)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-md)",
      textAlign: "center",
    }}
  >
    <h2
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 22,
        fontWeight: 600,
        color: "var(--ink)",
        letterSpacing: "-0.5px",
        marginBottom: 8,
      }}
    >
      No coding problems available
    </h2>
    <p
      style={{
        fontSize: 14,
        color: "var(--muted)",
        lineHeight: 1.6,
        marginBottom: 22,
      }}
    >
      There are no coding problems for this interview. Continue to the next
      round — this won't count against you.
    </p>
    {error && (
      <p style={{ fontSize: 13, color: "var(--negative)", marginBottom: 14 }}>
        {error}
      </p>
    )}
    <Button
      variant="primary"
      size="md"
      onClick={() => void onFinish()}
      disabled={isFinishing}
    >
      {isFinishing ? "Continuing…" : "Continue to next round"}
    </Button>
  </div>
);

// ── Console ─────────────────────────────────────────────────────────────────

const Console: React.FC<{ state: ConsoleState }> = ({ state }) => (
  <div
    style={{
      background: "var(--ink)",
      color: "var(--paper)",
      borderRadius: "var(--radius)",
      padding: 18,
      minHeight: 160,
      boxShadow: "var(--shadow-md)",
      fontFamily: "var(--font-mono)",
      fontSize: 12.5,
      maxHeight: 280,
      overflow: "auto",
    }}
  >
    <div
      style={{
        fontSize: 11,
        color: "var(--muted-2)",
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
      <div style={{ color: "var(--muted-2)", fontStyle: "italic" }}>
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
          color: "var(--signal)",
        }}
      >
        <Spinner />
        {state.label}
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div style={{ color: "var(--negative-tint)" }}>✘ {state.message}</div>
    );
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
                color: "var(--muted-2)",
                fontSize: 10.5,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 4,
              }}
            >
              stdout
            </div>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                color: "var(--paper)",
                background: "color-mix(in srgb, var(--paper) 6%, transparent)",
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
                color: "var(--negative-tint)",
                fontSize: 10.5,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 4,
              }}
            >
              stderr
            </div>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                color: "var(--negative-tint)",
                background:
                  "color-mix(in srgb, var(--negative) 20%, transparent)",
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
        <div style={{ marginBottom: 10, color: "var(--muted-2)" }}>
          <strong
            style={{ color: "var(--paper)", fontFamily: "var(--font-mono)" }}
          >
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <span style={{ color: "var(--muted-2)" }}>
            <strong
              style={{ color: "var(--paper)", fontFamily: "var(--font-mono)" }}
            >
              {r.passed} / {r.total}
            </strong>{" "}
            cases passed · attempt{" "}
            <strong
              style={{ color: "var(--paper)", fontFamily: "var(--font-mono)" }}
            >
              {r.attempts}
            </strong>
          </span>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <span
              style={{
                fontSize: 10.5,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--muted-2)",
              }}
            >
              Score
            </span>
            <ScoreMeter score={r.score} size="sm" showValue={false} />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                color: "var(--paper)",
              }}
            >
              {r.score.toFixed(1)}
              <span style={{ color: "var(--muted-2)", fontWeight: 400 }}>
                /10
              </span>
            </span>
          </span>
        </div>
        {!r.recorded && (
          <div
            style={{
              marginBottom: 10,
              padding: "8px 10px",
              background: "color-mix(in srgb, var(--signal) 18%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--signal) 45%, transparent)",
              borderRadius: 8,
              color: "var(--signal-tint)",
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
        <div style={{ color: "var(--muted-2)", fontSize: 11.5 }}>
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
      ? "var(--positive)"
      : status === "failed"
        ? "var(--signal)"
        : "var(--negative)";
  const label = status === "passed" ? "✓" : status === "failed" ? "✗" : "⚠";
  return (
    <div
      title={`Case ${idx}: ${status}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: `color-mix(in srgb, ${color} 22%, transparent)`,
        color: "var(--paper)",
        border: `1px solid color-mix(in srgb, ${color} 55%, transparent)`,
        borderRadius: 99,
        padding: "4px 10px",
        fontFamily: "var(--font-mono)",
        fontSize: 11.5,
        fontWeight: 700,
      }}
    >
      <span style={{ color }}>{label}</span>
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
        color: "var(--muted-2)",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {label}
    </span>
    <span
      style={{
        color: tone === "ok" ? "var(--positive-tint)" : "var(--negative-tint)",
        fontFamily: "var(--font-mono)",
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
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        color: "var(--muted)",
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
        background: "var(--ink)",
        color: "var(--paper)",
        padding: "8px 10px",
        borderRadius: 8,
        fontSize: 11.5,
        fontFamily: "var(--font-mono)",
        margin: 0,
      }}
    >
      {body}
    </pre>
  </div>
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
      background: "color-mix(in srgb, var(--ink) 55%, transparent)",
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
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        padding: 28,
        maxWidth: 440,
        width: "92%",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "var(--radius-sm)",
          background: "var(--signal-tint)",
          color: "var(--signal-strong)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
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
          fontFamily: "var(--font-display)",
          fontSize: 20,
          fontWeight: 600,
          color: "var(--ink)",
          letterSpacing: "-0.5px",
          marginBottom: 6,
        }}
      >
        Finish coding round?
      </h3>
      <p
        style={{
          fontSize: 13.5,
          color: "var(--muted)",
          lineHeight: 1.6,
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
        <Button variant="ghost" size="md" onClick={onCancel}>
          Keep working
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onConfirm}
          disabled={isFinishing}
        >
          Finish round
        </Button>
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
