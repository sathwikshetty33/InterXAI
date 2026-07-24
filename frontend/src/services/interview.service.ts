import { extractErrorDetail } from "./apiError";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export class InterviewServiceError extends Error {
  public readonly statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "InterviewServiceError";
  }
}

export type Round = "questions" | "dsa" | "resume";

export type SessionStatus =
  | "scheduled"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "cheated"
  | "disqualified";

// The envelope's question is only ever custom/resume — the DSA round is not
// question-at-a-time: `question` is null while round === "dsa" and the round
// is driven via getDsaRound / dsaRun / dsaTest / dsaSubmit / dsaFinish.
export type QuestionPayload =
  | { type: "custom"; interaction_id: number; question: string }
  | { type: "resume"; question_id: number; question: string };

export interface InterviewStateResponse {
  session_id: number;
  round: Round;
  completed: boolean;
  question: QuestionPayload | null;
  // Naive-UTC ISO timestamp the interview must finish by (null for sessions
  // created before the feature).
  deadline: string | null;
}

export interface HeartbeatResponse {
  status: SessionStatus;
  // Naive-UTC ISO timestamp the interview must finish by, or null for sessions
  // that predate the feature. Resent on every heartbeat so the client resyncs.
  deadline: string | null;
}

export interface FrameResponse {
  status: SessionStatus;
  // The violation this frame tripped ("multiple_faces" | "no_face" | ...), or
  // null when it's clean.
  violation: string | null;
  violation_count: number;
  threshold: number;
  deadline: string | null;
}

export interface DsaCaseStatus {
  case: number;
  status: "passed" | "failed" | "error";
}

export interface DsaRoundQuestion {
  interaction_id: number;
  problem_name: string;
  description: string;
  sample_test_cases: Array<{
    stdin: string;
    expected_stdout: string;
  }> | null;
  time_limit_ms: number;
  attempts: number;
  score: number | null;
  passed_cases: number | null;
  total_cases: number | null;
}

// status "preparing": questions are still being assigned — poll again.
// status "ready" with an empty list: nothing is coming; finish the round.
export interface DsaRoundResponse {
  session_id: number;
  status: "preparing" | "ready";
  questions: DsaRoundQuestion[];
}

export interface DsaRunRequest {
  interaction_id: number;
  source_code: string;
  language: string;
  stdin?: string;
}

export interface DsaRunResponse {
  stdout: string;
  stderr: string;
  exit_code: number;
}

export interface DsaTestRequest {
  interaction_id: number;
  source_code: string;
  language: string;
}

export interface DsaTestResponse {
  case_results: DsaCaseStatus[];
  passed: number;
  total: number;
}

export interface DsaSubmitRequest {
  interaction_id: number;
  source_code: string;
  language: string;
}

// recorded=false: this run's result was NOT stored (the round was left
// mid-grade, or a newer submission superseded it).
export interface DsaSubmitResponse {
  case_results: DsaCaseStatus[];
  passed: number;
  total: number;
  score: number;
  attempts: number;
  recorded: boolean;
}

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new InterviewServiceError(
      res.status,
      extractErrorDetail(data, "Request failed."),
    );
  }
  return res.json() as Promise<T>;
}

export async function startInterview(
  interviewId: number,
  token: string,
): Promise<InterviewStateResponse> {
  const res = await fetch(`${BASE_URL}/interviews/${interviewId}/start`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return handle<InterviewStateResponse>(res);
}

export async function sendHeartbeat(
  sessionId: number,
  token: string,
): Promise<HeartbeatResponse> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/heartbeat`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return handle<HeartbeatResponse>(res);
}

export async function sendFrame(
  sessionId: number,
  frame: string,
  token: string,
): Promise<FrameResponse> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/frame`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ frame }),
  });
  return handle<FrameResponse>(res);
}

export async function submitAnswer(
  sessionId: number,
  answer: string,
  token: string,
): Promise<InterviewStateResponse> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/answer`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ answer }),
  });
  return handle<InterviewStateResponse>(res);
}

export async function getDsaRound(
  sessionId: number,
  token: string,
): Promise<DsaRoundResponse> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/dsa`, {
    method: "GET",
    headers: authHeaders(token),
  });
  return handle<DsaRoundResponse>(res);
}

export async function dsaFinish(
  sessionId: number,
  token: string,
): Promise<InterviewStateResponse> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/dsa/finish`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return handle<InterviewStateResponse>(res);
}

export async function dsaRun(
  sessionId: number,
  payload: DsaRunRequest,
  token: string,
): Promise<DsaRunResponse> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/dsa/run`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handle<DsaRunResponse>(res);
}

export async function dsaTest(
  sessionId: number,
  payload: DsaTestRequest,
  token: string,
): Promise<DsaTestResponse> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/dsa/test`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handle<DsaTestResponse>(res);
}

export async function dsaSubmit(
  sessionId: number,
  payload: DsaSubmitRequest,
  token: string,
): Promise<DsaSubmitResponse> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/dsa/submit`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handle<DsaSubmitResponse>(res);
}
