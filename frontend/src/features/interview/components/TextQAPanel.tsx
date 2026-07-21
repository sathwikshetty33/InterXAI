import React, { useEffect, useRef, useState } from "react";
import type { QuestionPayload } from "../../../services/interview.service";
import Button from "../../../ui/Button";

interface Props {
  question: Extract<QuestionPayload, { type: "custom" | "resume" }>;
  round: "questions" | "resume";
  followUpIndex: number; // 1, 2, 3 for follow-ups; 0 for fresh question
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (answer: string) => void;
}

export default function TextQAPanel({
  question,
  round,
  followUpIndex,
  isSubmitting,
  error,
  onSubmit,
}: Props) {
  // Parent remounts this component (via React key) on question change,
  // so initial state is fresh each time — no setState-in-effect needed.
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const canSubmit = text.trim().length > 0 && !isSubmitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(text.trim());
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
      e.preventDefault();
      onSubmit(text.trim());
    }
  };

  return (
    <div
      style={{
        maxWidth: 920,
        margin: "0 auto",
        padding: "32px 32px 60px",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          padding: 36,
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
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
            {round === "resume" ? "Résumé" : "Questions"}
          </span>
          {followUpIndex > 0 && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--signal-strong)",
                background: "var(--signal-tint)",
                border:
                  "1px solid color-mix(in srgb, var(--signal) 35%, transparent)",
                borderRadius: 99,
                padding: "4px 11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Follow-up {followUpIndex} of 3
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
            lineHeight: 1.35,
            marginBottom: 22,
          }}
        >
          {question.question}
        </h2>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="qa-answer"
            style={{
              display: "block",
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--muted)",
              marginBottom: 6,
            }}
          >
            Your answer
          </label>
          <textarea
            id="qa-answer"
            ref={textareaRef}
            rows={9}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            disabled={isSubmitting}
            placeholder="Type your answer here. Be specific — examples and structure help."
            style={{
              width: "100%",
              background: "var(--surface-2)",
              border: "1px solid var(--line-strong)",
              borderRadius: "var(--radius)",
              padding: "14px 16px",
              fontSize: 14.5,
              lineHeight: 1.6,
              color: "var(--ink)",
              outline: "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
              fontFamily: "var(--font-body)",
              resize: "vertical",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--signal)";
              e.currentTarget.style.boxShadow = "0 0 0 3px var(--signal-tint)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--line-strong)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 12,
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                background: "var(--negative-tint)",
                border:
                  "1px solid color-mix(in srgb, var(--negative) 40%, transparent)",
                color: "var(--negative)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 18,
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "var(--muted-2)",
                fontWeight: 500,
              }}
            >
              Press{" "}
              <kbd
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line-strong)",
                  borderRadius: 5,
                  padding: "1px 6px",
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                }}
              >
                ⌘
              </kbd>{" "}
              +{" "}
              <kbd
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line-strong)",
                  borderRadius: 5,
                  padding: "1px 6px",
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                }}
              >
                Enter
              </kbd>{" "}
              to submit
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <>
                  <Spinner /> Submitting…
                </>
              ) : (
                <>
                  Submit answer
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2 7h10M8 3l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
