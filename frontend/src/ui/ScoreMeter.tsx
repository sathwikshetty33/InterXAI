import { useEffect, useState } from "react";

/** VU-meter-style segmented bar that fills to a 0–10 score. Reused everywhere
 *  a score appears, so scoring reads consistently across the app. */
interface ScoreMeterProps {
  /** 0–10; null/undefined renders an empty, pending meter. */
  score?: number | null;
  segments?: number;
  /** Show the numeric readout beside the meter. */
  showValue?: boolean;
  /** Animate the fill on mount. */
  animate?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
}

const SIZES = {
  sm: { h: 6, gap: 2, w: 10, value: 12 },
  md: { h: 10, gap: 3, w: 14, value: 15 },
  lg: { h: 16, gap: 4, w: 22, value: 30 },
} as const;

function toneFor(score: number): string {
  if (score >= 7) return "var(--positive)";
  if (score >= 4) return "var(--signal)";
  return "var(--negative)";
}

export default function ScoreMeter({
  score,
  segments = 10,
  showValue = true,
  animate = true,
  size = "md",
  label,
}: ScoreMeterProps) {
  const target = score == null ? 0 : Math.max(0, Math.min(10, score));
  const filled = Math.round((target / 10) * segments);
  const [animatedShown, setAnimatedShown] = useState(0);
  const dim = SIZES[size];
  const pending = score == null;
  const color = pending ? "var(--muted-2)" : toneFor(target);
  // Not animating → render the final fill directly (no setState in effect).
  const shown = animate ? animatedShown : filled;

  useEffect(() => {
    if (!animate) return;
    // Fill segments left-to-right; each lands ~55ms after the last.
    let timer = 0;
    let i = 0;
    const step = () => {
      i += 1;
      setAnimatedShown(i);
      if (i < filled) timer = window.setTimeout(step, 55) as unknown as number;
    };
    timer = window.setTimeout(step, 120) as unknown as number;
    return () => window.clearTimeout(timer);
  }, [filled, animate]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={pending ? undefined : Math.round(target * 10) / 10}
        aria-label={label ?? "Score out of 10"}
        style={{ display: "flex", alignItems: "flex-end", gap: dim.gap }}
      >
        {Array.from({ length: segments }).map((_, i) => {
          const on = i < shown;
          // Segments rise slightly toward the right — a meter, not a bar.
          const h = dim.h + (size === "lg" ? i * 1.2 : 0);
          return (
            <span
              key={i}
              style={{
                width: dim.w,
                height: h,
                borderRadius: 2,
                background: on ? color : "var(--line)",
                transition: "background 0.18s ease",
              }}
            />
          );
        })}
      </div>
      {showValue && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: dim.value,
            fontWeight: 700,
            color: pending ? "var(--muted-2)" : "var(--ink)",
            letterSpacing: "-0.5px",
            lineHeight: 1,
          }}
        >
          {pending ? "—" : target.toFixed(1)}
          <span
            style={{
              fontSize: dim.value * 0.5,
              color: "var(--muted-2)",
              fontWeight: 400,
            }}
          >
            /10
          </span>
        </span>
      )}
    </div>
  );
}
