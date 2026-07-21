import { type ReactNode } from "react";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import LandingPage from "./components/LandingPage";
import LoginPage from "./features/auth/LoginPage";
import SignupPage from "./features/auth/SignupPage";
import OrgAuthPage from "./features/org/OrgAuthPage";
import OrgDashboardPage from "./features/org/OrgDashboardPage";
import ProfileSetupPage from "./features/user/ProfileSetupPage";
import DashboardPage from "./features/user/DashboardPage";
import InterviewSessionPage from "./features/interview/InterviewSessionPage";
import { useAuth } from "./auth/context";
import type { TokenResponse } from "./services/auth.service";
import type { OrgSignupResponse } from "./services/organization.service";
import type { UserResponse } from "./services/user.service";

function FullLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-slate-900">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

// ── Route guards ─────────────────────────────────────────────────────────────

/** Gate candidate routes: wait for hydration, then require a candidate session. */
function RequireCandidate({ children }: { children: ReactNode }) {
  const { loading, token, user } = useAuth();
  if (loading) return <FullLoader label="Restoring your session…" />;
  if (!token || !user || user.is_organization) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

/** Gate org routes on the presence of an org token (validated by the API). */
function RequireOrg({ children }: { children: ReactNode }) {
  const { orgToken } = useAuth();
  if (!orgToken) return <Navigate to="/admin/auth" replace />;
  return <>{children}</>;
}

// ── Candidate route wrappers (adapt callback-style pages to the router) ───────

function LandingRoute() {
  const navigate = useNavigate();
  return <LandingPage onLoginClick={() => navigate("/login")} />;
}

function LoginRoute() {
  const navigate = useNavigate();
  const { loading, token, user, setCandidateSession, setOrgSession } =
    useAuth();
  if (!loading && token && user && !user.is_organization) {
    return <Navigate to="/dashboard" replace />;
  }
  const onLoginSuccess = (data: TokenResponse) => {
    if (data.user.is_organization) {
      setOrgSession(data.token, data.user.username);
      navigate("/admin/dashboard", { replace: true });
      return;
    }
    setCandidateSession(data.token, data.user);
    navigate("/dashboard", { replace: true });
  };
  return (
    <LoginPage
      onLoginSuccess={onLoginSuccess}
      onSignupClick={() => navigate("/signup")}
      onBack={() => navigate("/")}
    />
  );
}

function SignupRoute() {
  const navigate = useNavigate();
  const { setCandidateSession } = useAuth();
  const onSignupSuccess = (data: TokenResponse) => {
    setCandidateSession(data.token, data.user);
    // New accounts set up their profile once, right after signup.
    navigate("/profile", { replace: true });
  };
  return (
    <SignupPage
      onSignupSuccess={onSignupSuccess}
      onLoginClick={() => navigate("/login")}
      onBack={() => navigate("/")}
    />
  );
}

function ProfileRoute() {
  const navigate = useNavigate();
  const { token, user, updateUser } = useAuth();
  // Guarded by RequireCandidate, so token/user are present here.
  return (
    <ProfileSetupPage
      userId={user!.id}
      token={token!}
      username={user!.username}
      onComplete={(updated: UserResponse) => {
        updateUser(updated);
        navigate("/dashboard", { replace: true });
      }}
    />
  );
}

function DashboardRoute() {
  const navigate = useNavigate();
  const { token, user, logoutCandidate } = useAuth();
  return (
    <DashboardPage
      user={user!}
      token={token!}
      onLogout={() => {
        logoutCandidate();
        navigate("/", { replace: true });
      }}
      onAttemptInterview={(interviewId: number) =>
        navigate(`/interview/${interviewId}`)
      }
    />
  );
}

function InterviewRoute() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { interviewId } = useParams();
  const id = Number(interviewId);
  if (!Number.isFinite(id)) return <Navigate to="/dashboard" replace />;
  return (
    <InterviewSessionPage
      interviewId={id}
      token={token!}
      onExit={() => navigate("/dashboard")}
    />
  );
}

// ── Org route wrappers ────────────────────────────────────────────────────────

function OrgAuthRoute() {
  const navigate = useNavigate();
  const { orgToken, setOrgSession } = useAuth();
  if (orgToken) return <Navigate to="/admin/dashboard" replace />;
  return (
    <OrgAuthPage
      onLoginSuccess={(token: string) => {
        setOrgSession(token);
        navigate("/admin/dashboard", { replace: true });
      }}
      onSignupSuccess={(data: OrgSignupResponse) => {
        setOrgSession(
          data.access_token,
          data.organization?.id ? `Org #${data.organization.id}` : null,
        );
        navigate("/admin/dashboard", { replace: true });
      }}
      onBack={() => navigate("/")}
    />
  );
}

/** /admin → dashboard when signed in, otherwise the org sign-in screen. */
function OrgIndexRoute() {
  const { orgToken } = useAuth();
  return (
    <Navigate to={orgToken ? "/admin/dashboard" : "/admin/auth"} replace />
  );
}

function OrgDashboardRoute({ mode }: { mode: "list" | "create" | "detail" }) {
  const navigate = useNavigate();
  const { orgToken, orgName, logoutOrg } = useAuth();
  return (
    <OrgDashboardPage
      token={orgToken!}
      orgName={orgName ?? undefined}
      mode={mode}
      onLogout={() => {
        logoutOrg();
        navigate("/admin/auth", { replace: true });
      }}
    />
  );
}

// ── Route table ───────────────────────────────────────────────────────────────

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/signup" element={<SignupRoute />} />

      <Route
        path="/profile"
        element={
          <RequireCandidate>
            <ProfileRoute />
          </RequireCandidate>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireCandidate>
            <DashboardRoute />
          </RequireCandidate>
        }
      />
      <Route
        path="/interview/:interviewId"
        element={
          <RequireCandidate>
            <InterviewRoute />
          </RequireCandidate>
        }
      />

      {/* Org (hidden admin entry). Nested paths keep the URL in sync with the
          dashboard's view so a refresh restores exactly where you were. */}
      <Route path="/admin" element={<Outlet />}>
        <Route index element={<OrgIndexRoute />} />
        <Route path="auth" element={<OrgAuthRoute />} />
        <Route
          path="dashboard"
          element={
            <RequireOrg>
              <OrgDashboardRoute mode="list" />
            </RequireOrg>
          }
        />
        <Route
          path="new"
          element={
            <RequireOrg>
              <OrgDashboardRoute mode="create" />
            </RequireOrg>
          }
        />
        <Route
          path="interview/:interviewId"
          element={
            <RequireOrg>
              <OrgDashboardRoute mode="detail" />
            </RequireOrg>
          }
        />
        <Route
          path="interview/:interviewId/:tab"
          element={
            <RequireOrg>
              <OrgDashboardRoute mode="detail" />
            </RequireOrg>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
