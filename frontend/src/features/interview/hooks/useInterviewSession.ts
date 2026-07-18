import { useCallback, useEffect, useRef, useState } from "react";
import {
  startInterview,
  submitAnswer,
  sendHeartbeat,
  getDsaRound,
  dsaFinish,
  InterviewServiceError,
} from "../../../services/interview.service";
import type {
  DsaRoundResponse,
  InterviewStateResponse,
  SessionStatus,
} from "../../../services/interview.service";

export type InterviewPhase =
  | "loading"
  | "active"
  | "completed"
  | "terminal"
  | "error";

export interface UseInterviewSessionReturn {
  phase: InterviewPhase;
  state: InterviewStateResponse | null;
  terminalStatus: SessionStatus | null;
  error: string | null;
  isSubmitting: boolean;
  followUpIndex: number;
  dsaRound: DsaRoundResponse | null;
  answer: (text: string) => Promise<void>;
  refreshDsaRound: () => Promise<void>;
  finishDsa: () => Promise<void>;
  applyState: (next: InterviewStateResponse) => void;
}

const HEARTBEAT_MS = 5000;
// Poll cadence while the DSA round reports status="preparing" — each poll
// also makes the backend re-dispatch the assignment task, so this self-heals.
const DSA_PREPARING_POLL_MS = 2500;

export function useInterviewSession(
  interviewId: number,
  token: string,
): UseInterviewSessionReturn {
  const [phase, setPhase] = useState<InterviewPhase>("loading");
  const [state, setState] = useState<InterviewStateResponse | null>(null);
  const [terminalStatus, setTerminalStatus] = useState<SessionStatus | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [followUpIndex, setFollowUpIndex] = useState(0);
  const [dsaRound, setDsaRound] = useState<DsaRoundResponse | null>(null);

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const goTerminal = useCallback(
    (status: SessionStatus) => {
      stoppedRef.current = true;
      stopHeartbeat();
      setTerminalStatus(status);
      setPhase(status === "completed" ? "completed" : "terminal");
    },
    [stopHeartbeat],
  );

  const startHeartbeat = useCallback(
    (sessionId: number) => {
      stopHeartbeat();
      heartbeatRef.current = setInterval(async () => {
        if (stoppedRef.current) return;
        try {
          const res = await sendHeartbeat(sessionId, token);
          if (res.status !== "ongoing") {
            goTerminal(res.status);
          }
        } catch {
          // transient network error — ignore, next tick will try again
        }
      }, HEARTBEAT_MS);
    },
    [token, stopHeartbeat, goTerminal],
  );

  const applyState = useCallback(
    (next: InterviewStateResponse) => {
      setState((prev) => {
        // Follow-up tracking: same custom interaction_id ⇒ follow-up (+1).
        // Different id or different round ⇒ reset to 0.
        const prevQ = prev?.question;
        const nextQ = next.question;
        if (
          prevQ?.type === "custom" &&
          nextQ?.type === "custom" &&
          prevQ.interaction_id === nextQ.interaction_id
        ) {
          setFollowUpIndex((i) => Math.min(i + 1, 3));
        } else {
          setFollowUpIndex(0);
        }
        return next;
      });
      if (next.round !== "dsa") {
        setDsaRound(null);
      }
      if (next.completed) {
        stoppedRef.current = true;
        stopHeartbeat();
        setPhase("completed");
      } else {
        setPhase("active");
      }
    },
    [stopHeartbeat],
  );

  useEffect(() => {
    stoppedRef.current = false;
    let cancelled = false;

    (async () => {
      try {
        const initial = await startInterview(interviewId, token);
        if (cancelled) return;
        setState(initial);
        if (initial.completed) {
          setPhase("completed");
        } else {
          setPhase("active");
          startHeartbeat(initial.session_id);
        }
      } catch (e) {
        if (cancelled) return;
        const msg =
          e instanceof InterviewServiceError
            ? e.message
            : "Unable to start interview. Please try again.";
        setError(msg);
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
      stoppedRef.current = true;
      stopHeartbeat();
    };
  }, [interviewId, token, startHeartbeat, stopHeartbeat]);

  // DSA round overview: fetch when the session enters the DSA round, and
  // keep polling while the backend reports "preparing".
  const sessionId = state?.session_id;
  const inDsaRound = phase === "active" && state?.round === "dsa";

  const refreshDsaRound = useCallback(async () => {
    if (!inDsaRound || sessionId === undefined) return;
    try {
      const round = await getDsaRound(sessionId, token);
      setDsaRound(round);
    } catch (e) {
      if (e instanceof InterviewServiceError && e.statusCode === 403) {
        goTerminal("disqualified");
      }
      // other errors: keep the last snapshot; the next poll/refresh retries
    }
  }, [inDsaRound, sessionId, token, goTerminal]);

  useEffect(() => {
    if (!inDsaRound || sessionId === undefined) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const round = await getDsaRound(sessionId, token);
        if (cancelled) return;
        setDsaRound(round);
        if (round.status === "preparing") {
          timer = setTimeout(tick, DSA_PREPARING_POLL_MS);
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof InterviewServiceError && e.statusCode === 403) {
          goTerminal("disqualified");
          return;
        }
        timer = setTimeout(tick, DSA_PREPARING_POLL_MS);
      }
    };
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [inDsaRound, sessionId, token, goTerminal]);

  const answer = useCallback(
    async (text: string) => {
      if (!state || isSubmitting) return;
      setIsSubmitting(true);
      setError(null);
      try {
        const next = await submitAnswer(state.session_id, text, token);
        applyState(next);
      } catch (e) {
        if (e instanceof InterviewServiceError) {
          if (e.statusCode === 403) {
            goTerminal("disqualified");
          } else {
            setError(e.message);
          }
        } else {
          setError("Network error. Please try again.");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [state, isSubmitting, token, applyState, goTerminal],
  );

  // Leave the DSA round. Idempotent server-side, so a retry is safe.
  const finishDsa = useCallback(async () => {
    if (!state || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const next = await dsaFinish(state.session_id, token);
      applyState(next);
    } catch (e) {
      if (e instanceof InterviewServiceError) {
        if (e.statusCode === 403) {
          goTerminal("disqualified");
        } else {
          setError(e.message);
        }
      } else {
        setError("Network error. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [state, isSubmitting, token, applyState, goTerminal]);

  return {
    phase,
    state,
    terminalStatus,
    error,
    isSubmitting,
    followUpIndex,
    dsaRound,
    answer,
    refreshDsaRound,
    finishDsa,
    applyState,
  };
}
