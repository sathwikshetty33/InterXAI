import { createContext, useContext } from "react";
import type { UserResponse } from "../services/user.service";

/**
 * Shared auth types + context object + hook, kept separate from the provider
 * component so the provider file only exports a component (React Fast Refresh).
 *
 * Two independent sessions coexist (matching the backend): a candidate session
 * keyed on localStorage "token", and an organisation session keyed on
 * "org_token".
 */
export interface AuthContextValue {
  /** True only during the initial candidate-token hydration on mount. */
  loading: boolean;
  user: UserResponse | null;
  token: string | null;
  orgToken: string | null;
  orgName: string | null;
  setCandidateSession: (token: string, user: UserResponse) => void;
  updateUser: (user: UserResponse) => void;
  setOrgSession: (token: string, name?: string | null) => void;
  logoutCandidate: () => void;
  logoutOrg: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
