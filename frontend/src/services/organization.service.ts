/**
 * organization.service.ts
 * API calls for organization endpoints.
 * Mirrors app/schemas/organization.py and app/routers/organization.py
 */

import { extractErrorDetail } from "./apiError";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/** The MCP server endpoint (mounted on the API). */
export const MCP_SERVER_URL = `${BASE_URL}/mcp`;

export interface McpTokenResponse {
  token: string;
}

// ── Types (mirrors backend schemas) ─────────────────────────────────────────

export interface OrgSignupRequest {
  username: string;
  password: string;
  email: string;
}

export interface OrganizationResponse {
  id: number;
  account_id: number;
  name: string | null;
  address: string | null;
  email: string | null;
  url: string | null;
  linkedin: string | null;
  photo: string | null;
  description: string | null;
}

export interface OrganizationUpdate {
  address?: string | null;
  email?: string | null;
  url?: string | null;
  linkedin?: string | null;
  photo?: string | null;
  description?: string | null;
}

export interface OrgSignupResponse {
  organization: OrganizationResponse;
  access_token: string;
}

// ── Shared error class ───────────────────────────────────────────────────────

export class OrgServiceError extends Error {
  public readonly statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "OrgServiceError";
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new OrgServiceError(
      response.status,
      extractErrorDetail(data, "Request failed. Please try again."),
    );
  }
  return response.json() as Promise<T>;
}

// ── Endpoints ────────────────────────────────────────────────────────────────

/** POST /organizations/signup */
export async function signupOrganization(
  payload: OrgSignupRequest,
): Promise<OrgSignupResponse> {
  const response = await fetch(`${BASE_URL}/organizations/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<OrgSignupResponse>(response);
}

/**
 * Organization login re-uses the user login endpoint.
 * POST /users/login → returns a JWT that encodes the org account.
 */
export async function loginOrganization(credentials: {
  username: string;
  password: string;
}): Promise<{ token: string }> {
  const response = await fetch(`${BASE_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const data = await handleResponse<{ token: string; user: unknown }>(response);
  return { token: data.token };
}

/** GET /organizations/:id — any authenticated user (e.g. a candidate) may view. */
export async function getOrganization(
  orgId: number,
  token: string,
): Promise<OrganizationResponse> {
  const response = await fetch(`${BASE_URL}/organizations/${orgId}`, {
    headers: authHeaders(token),
  });
  return handleResponse<OrganizationResponse>(response);
}

/** GET /organizations/me — the caller's own organization. */
export async function getMyOrganization(
  token: string,
): Promise<OrganizationResponse> {
  const response = await fetch(`${BASE_URL}/organizations/me`, {
    headers: authHeaders(token),
  });
  return handleResponse<OrganizationResponse>(response);
}

/** PUT /organizations/:id */
export async function updateOrganization(
  orgId: number,
  data: OrganizationUpdate,
  token: string,
): Promise<OrganizationResponse> {
  const response = await fetch(`${BASE_URL}/organizations/${orgId}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<OrganizationResponse>(response);
}

/** DELETE /organizations/:id */
export async function deleteOrganization(
  orgId: number,
  token: string,
): Promise<void> {
  const response = await fetch(`${BASE_URL}/organizations/${orgId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new OrgServiceError(
      response.status,
      extractErrorDetail(data, "Failed to delete organization."),
    );
  }
}

/** POST /organizations/mcp-token — mint a bearer token for MCP/agent use. */
export async function generateMcpToken(
  token: string,
): Promise<McpTokenResponse> {
  const response = await fetch(`${BASE_URL}/organizations/mcp-token`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return handleResponse<McpTokenResponse>(response);
}
