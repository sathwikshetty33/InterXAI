/** Wordmark: three rising bars (the score-meter signature in miniature). */
export default function Logo({
  size = 18,
  onDark = false,
}: {
  size?: number;
  onDark?: boolean;
}) {
  const ink = onDark ? "var(--paper)" : "var(--ink)";
  const bar = size * 1.15;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "flex-end",
          gap: 2.5,
          height: bar,
        }}
      >
        <span
          style={{
            width: 4,
            height: bar * 0.5,
            borderRadius: 1.5,
            background: ink,
          }}
        />
        <span
          style={{
            width: 4,
            height: bar * 0.75,
            borderRadius: 1.5,
            background: ink,
          }}
        />
        <span
          style={{
            width: 4,
            height: bar,
            borderRadius: 1.5,
            background: "var(--signal)",
          }}
        />
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: size,
          letterSpacing: "-0.6px",
          color: ink,
        }}
      >
        Inter<span style={{ color: "var(--signal-strong)" }}>XAI</span>
      </span>
    </span>
  );
}
