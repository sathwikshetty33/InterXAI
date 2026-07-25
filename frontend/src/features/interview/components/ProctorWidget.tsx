import { useCallback, useEffect, useRef, useState } from "react";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import { sendFrame } from "../../../services/interview.service";
import type { SessionStatus } from "../../../services/interview.service";

const CAPTURE_W = 320;
const CAPTURE_H = 240;

// Client-side face detection cadence (instant, local).
const DETECT_MS = 800;
// When the local detector flags a violation, verify with the server at most
// this often — one flag shouldn't spam the /frame endpoint.
const FLAG_POST_THROTTLE_MS = 4000;
// Even with a clean local read, still beat the server this often (liveness +
// tamper spot-check — the server can't trust a client that stopped flagging).
const LIVENESS_MS = 12000;
// Fallback when the local model fails to load: plain periodic server beat.
const FALLBACK_FRAME_MS = 6000;

// Same BlazeFace model the server uses; WASM version must match the installed
// @mediapipe/tasks-vision (0.10.35).
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

const VIOLATION_COPY: Record<string, string> = {
  multiple_faces: "More than one person detected",
  no_face: "Your face isn't visible",
  camera_lost: "Camera feed lost",
};

interface ProctorWidgetProps {
  sessionId: number;
  token: string;
  onTerminal: (status: SessionStatus) => void;
}

export default function ProctorWidget({
  sessionId,
  token,
  onTerminal,
}: ProctorWidgetProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<FaceDetector | null>(null);
  const busyRef = useRef(false);
  const stoppedRef = useRef(false);
  const lastPostRef = useRef(0);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [detectorReady, setDetectorReady] = useState(false);
  const [count, setCount] = useState(0);
  const [threshold, setThreshold] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);

  // Acquire the camera once; release its tracks on unmount.
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
        setReady(true);
      } catch {
        if (!cancelled) {
          setCameraError(
            "Camera access is required. Enable your camera and reload the page.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Load the in-browser face detector (best-effort). If the WASM/model can't
  // load, we stay in fallback mode: the server still checks every posted frame.
  useEffect(() => {
    let cancelled = false;
    let created: FaceDetector | null = null;
    (async () => {
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        for (const delegate of ["GPU", "CPU"] as const) {
          try {
            created = await FaceDetector.createFromOptions(fileset, {
              baseOptions: { modelAssetPath: MODEL_URL, delegate },
              runningMode: "VIDEO",
              minDetectionConfidence: 0.5,
            });
            break;
          } catch {
            created = null;
          }
        }
        if (cancelled) {
          created?.close();
          return;
        }
        if (created) {
          detectorRef.current = created;
          setDetectorReady(true);
        }
      } catch {
        // FilesetResolver failed (offline / CDN blocked) — fallback mode.
      }
    })();
    return () => {
      cancelled = true;
      detectorRef.current?.close();
      detectorRef.current = null;
    };
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = CAPTURE_W;
      canvas.height = CAPTURE_H;
      canvasRef.current = canvas;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, CAPTURE_W, CAPTURE_H);
    return canvas.toDataURL("image/jpeg", 0.6);
  }, []);

  // Capture the current frame, POST it, and let the server's authoritative
  // verdict drive the count / escalation. Skips if a send is already in flight.
  const postFrame = useCallback(async () => {
    if (stoppedRef.current || busyRef.current) return;
    const frame = captureFrame();
    if (!frame) return;
    busyRef.current = true;
    lastPostRef.current = performance.now();
    try {
      const res = await sendFrame(sessionId, frame, token);
      setThreshold(res.threshold);
      setCount(res.violation_count);
      // Authoritative: this clears an optimistic local warning it disagrees with.
      setWarning(
        res.violation
          ? (VIOLATION_COPY[res.violation] ?? "Proctoring violation")
          : null,
      );
      if (res.status !== "ongoing") {
        stoppedRef.current = true;
        onTerminal(res.status);
      }
    } catch {
      // transient network error — the next beat retries
    } finally {
      busyRef.current = false;
    }
  }, [captureFrame, sessionId, token, onTerminal]);

  // Detection / beat loop. With a local detector: watch continuously, warn
  // instantly, and only post on a flag (throttled) or a liveness interval.
  // Without one: plain periodic server beat.
  useEffect(() => {
    if (!ready || cameraError) return;
    stoppedRef.current = false;

    if (detectorReady) {
      const tick = () => {
        if (stoppedRef.current) return;
        const detector = detectorRef.current;
        const video = videoRef.current;
        if (!detector || !video || video.readyState < 2) return;
        let faces: number;
        try {
          faces = detector.detectForVideo(video, performance.now()).detections
            .length;
        } catch {
          return;
        }
        // Instant optimistic warning (the server may later clear it).
        setWarning(
          faces === 1
            ? null
            : faces === 0
              ? VIOLATION_COPY.no_face
              : VIOLATION_COPY.multiple_faces,
        );
        const elapsed = performance.now() - lastPostRef.current;
        if (
          (faces !== 1 && elapsed > FLAG_POST_THROTTLE_MS) ||
          elapsed > LIVENESS_MS
        ) {
          void postFrame();
        }
      };
      const primer = window.setTimeout(() => void postFrame(), 1200);
      const interval = window.setInterval(tick, DETECT_MS);
      return () => {
        window.clearTimeout(primer);
        window.clearInterval(interval);
      };
    }

    const primer = window.setTimeout(() => void postFrame(), 1500);
    const interval = window.setInterval(
      () => void postFrame(),
      FALLBACK_FRAME_MS,
    );
    return () => {
      window.clearTimeout(primer);
      window.clearInterval(interval);
    };
  }, [ready, cameraError, detectorReady, postFrame]);

  const alarm = Boolean(cameraError) || Boolean(warning);
  const accent = alarm ? "var(--negative)" : "var(--positive)";

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 60,
        width: 208,
      }}
    >
      {warning && (
        <div
          role="alert"
          style={{
            marginBottom: 10,
            background: "var(--negative-tint)",
            border:
              "1px solid color-mix(in srgb, var(--negative) 45%, transparent)",
            borderRadius: "var(--radius)",
            padding: "10px 12px",
            boxShadow: "var(--shadow-md)",
            display: "flex",
            gap: 9,
            alignItems: "flex-start",
          }}
        >
          <WarnGlyph />
          <div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: "var(--negative)",
                lineHeight: 1.3,
              }}
            >
              {warning}
            </div>
            {threshold > 0 && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  marginTop: 2,
                  fontFamily: "var(--font-mono)",
                }}
              >
                warning {Math.min(count, threshold)} of {threshold}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          background: "var(--surface)",
          border: `2px solid ${accent}`,
          borderRadius: "var(--radius)",
          overflow: "hidden",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "6px 10px",
            background: "var(--surface-2)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span
              className={alarm ? undefined : "ix-live-dot"}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: accent,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "var(--muted-2)",
              }}
            >
              PROCTORED
            </span>
          </div>
          {count > 0 && threshold > 0 && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--negative)",
                background: "var(--negative-tint)",
                borderRadius: 99,
                padding: "1px 7px",
              }}
            >
              {Math.min(count, threshold)}/{threshold}
            </span>
          )}
        </div>

        {cameraError ? (
          <div
            style={{
              padding: "16px 12px",
              fontSize: 12,
              color: "var(--negative)",
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            {cameraError}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              aspectRatio: "4 / 3",
              objectFit: "cover",
              display: "block",
              background: "var(--ink)",
              transform: "scaleX(-1)",
            }}
          />
        )}
      </div>
    </div>
  );
}

const WarnGlyph = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    style={{ flexShrink: 0, marginTop: 1 }}
  >
    <path
      d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.7 3.86a2 2 0 00-3.4 0z"
      stroke="var(--negative)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
