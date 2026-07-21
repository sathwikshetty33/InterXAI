import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { fetchCurrentUser } from "../services/auth.service";
import type { UserResponse } from "../services/user.service";
import { AuthContext } from "./context";

/**
 * Single source of truth for the signed-in session. Hydration on reload
 * resolves who the user is but never navigates — the URL owns WHERE the user
 * is, so a refresh re-renders the current route. The one exception is an OIDC
 * return (JWT in the URL hash at "/"), which does navigate.
 */
interface OidcHash {
  token: string | null;
  error: string | null;
}

/** Read a Google OIDC return (`#oidc_token=…` / `#oidc_error=…`) from the URL. */
function parseOidcHash(): OidcHash | null {
  const hash = window.location.hash;
  if (!hash.includes("oidc_token") && !hash.includes("oidc_error")) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return { token: params.get("oidc_token"), error: params.get("oidc_error") };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  // Start in the loading state only when there is a token to exchange/restore,
  // so the "nothing to do" path needs no synchronous setState in the effect.
  const [loading, setLoading] = useState<boolean>(() => {
    const oidc = parseOidcHash();
    if (oidc) return Boolean(oidc.token);
    return Boolean(localStorage.getItem("token"));
  });
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token"),
  );
  const [orgToken, setOrgToken] = useState<string | null>(() =>
    localStorage.getItem("org_token"),
  );
  const [orgName, setOrgName] = useState<string | null>(() =>
    localStorage.getItem("org_name"),
  );

  const setCandidateSession = useCallback((t: string, u: UserResponse) => {
    localStorage.setItem("token", t);
    setToken(t);
    setUser(u);
  }, []);

  const updateUser = useCallback((u: UserResponse) => setUser(u), []);

  const setOrgSession = useCallback((t: string, name?: string | null) => {
    localStorage.setItem("org_token", t);
    setOrgToken(t);
    if (name) {
      localStorage.setItem("org_name", name);
      setOrgName(name);
    }
  }, []);

  const logoutCandidate = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  const logoutOrg = useCallback(() => {
    localStorage.removeItem("org_token");
    localStorage.removeItem("org_name");
    // OIDC org logins also leave a candidate "token"; clear it so a reload
    // can't silently restore the session.
    localStorage.removeItem("token");
    setOrgToken(null);
    setOrgName(null);
  }, []);

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const oidc = parseOidcHash();
    if (oidc) {
      // Consume the OIDC return, then strip the hash so a later refresh is a
      // normal reload rather than re-triggering the exchange.
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      if (oidc.error || !oidc.token) {
        navigate("/login", { replace: true });
        return;
      }
      const oidcToken = oidc.token;
      localStorage.setItem("token", oidcToken);
      fetchCurrentUser(oidcToken)
        .then((u) => {
          if (u.is_organization) {
            setOrgSession(oidcToken, u.username);
            navigate("/admin/dashboard", { replace: true });
          } else {
            setCandidateSession(oidcToken, u);
            // First-time OIDC users have no profile yet — set it up once;
            // returning users skip straight past.
            const hasProfile = Boolean(u.profile?.bio || u.profile?.github);
            navigate(hasProfile ? "/dashboard" : "/profile", { replace: true });
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
          navigate("/login", { replace: true });
        })
        .finally(() => setLoading(false));
      return;
    }

    // Normal reload: resolve the stored candidate token WITHOUT navigating.
    const stored = localStorage.getItem("token");
    if (!stored) return; // loading already initialised to false
    fetchCurrentUser(stored)
      .then((u) => {
        setUser(u);
        setToken(stored);
      })
      .catch(() => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [navigate, setCandidateSession, setOrgSession]);

  return (
    <AuthContext.Provider
      value={{
        loading,
        user,
        token,
        orgToken,
        orgName,
        setCandidateSession,
        updateUser,
        setOrgSession,
        logoutCandidate,
        logoutOrg,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
