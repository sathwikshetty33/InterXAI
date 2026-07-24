import { useCallback, useEffect, useRef, useState } from "react";
import Logo from "../../../ui/Logo";
import Button from "../../../ui/Button";

const CAPTURE_W = 320;
const CAPTURE_H = 240;

const RULES = [
  "Stay alone in the frame — a second person ends the interview.",
  "Keep your face clearly visible and well lit.",
  "Your camera must stay on for the whole interview.",
];

interface CameraGateProps {
  onReady: (frame: string) => void;
  onExit: () => void;
}

export default function CameraGate({ onReady, onExit }: CameraGateProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: CAPTURE_W, height: CAPTURE_H, facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setLive(true);
      } catch {
        if (!cancelled) {
          setError(
            "We couldn't access your camera. Allow camera access in your browser, then retry.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [attempt]);

  const begin = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const canvas = document.createElement("canvas");
    canvas.width = CAPTURE_W;
    canvas.height = CAPTURE_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, CAPTURE_W, CAPTURE_H);
    onReady(canvas.toDataURL("image/jpeg", 0.6));
  }, [onReady]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        fontFamily: "var(--font-body)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid var(--line)",
          padding: "12px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Logo size={18} />
        <Button variant="ghost" size="sm" onClick={onExit}>
          Exit
        </Button>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: "100%",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            padding: "32px 32px 28px",
            textAlign: "center",
          }}
        >
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
            Camera check
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--muted)",
              lineHeight: 1.6,
              marginBottom: 20,
            }}
          >
            This interview is proctored. We'll confirm your camera works before
            you begin.
          </p>

          <div
            style={{
              width: CAPTURE_W,
              maxWidth: "100%",
              margin: "0 auto 20px",
              aspectRatio: "4 / 3",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              border: `2px solid ${error ? "var(--negative)" : live ? "var(--positive)" : "var(--line-strong)"}`,
              background: "var(--ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {error ? (
              <div
                style={{
                  padding: "20px 16px",
                  fontSize: 13,
                  color: "var(--negative)",
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)",
                }}
              />
            )}
          </div>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 24px",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {RULES.map((rule) => (
              <li
                key={rule}
                style={{
                  display: "flex",
                  gap: 9,
                  fontSize: 13,
                  color: "var(--muted)",
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{ color: "var(--signal-strong)", fontWeight: 700 }}
                >
                  •
                </span>
                {rule}
              </li>
            ))}
          </ul>

          {error ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setError(null);
                setLive(false);
                setAttempt((a) => a + 1);
              }}
            >
              Retry camera
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              disabled={!live}
              onClick={begin}
            >
              {live ? "Begin interview" : "Waiting for camera…"}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
