import { useEffect, useState, type CSSProperties } from "react";
import Button from "../../ui/Button";
import Logo from "../../ui/Logo";
import {
  getUserById,
  updateUserProfile,
  deleteAccount,
  UserServiceError,
  type UserResponse,
} from "../../services/user.service";

interface CandidateProfilePageProps {
  userId: number;
  token: string;
  editable: boolean;
  onBack: () => void;
  onSaved?: (user: UserResponse) => void;
  onDeleted?: () => void;
}

interface FormState {
  bio: string;
  github: string;
  leetcode: string;
  linkedin: string;
  photo: string;
}

const linkFor = (kind: "github" | "leetcode" | "linkedin", value: string) => {
  if (value.startsWith("http")) return value;
  const base = {
    github: "https://github.com/",
    leetcode: "https://leetcode.com/u/",
    linkedin: "https://linkedin.com/in/",
  }[kind];
  return base + value.replace(/^@/, "");
};

export default function CandidateProfilePage({
  userId,
  token,
  editable,
  onBack,
  onSaved,
  onDeleted,
}: CandidateProfilePageProps) {
  const [user, setUser] = useState<UserResponse | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>({
    bio: "",
    github: "",
    leetcode: "",
    linkedin: "",
    photo: "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getUserById(userId, token)
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        const p = u.profile;
        setForm({
          bio: p?.bio ?? "",
          github: p?.github ?? "",
          leetcode: p?.leetcode ?? "",
          linkedin: p?.linkedin ?? "",
          photo: p?.photo ?? "",
        });
        const empty = !(
          p?.bio ||
          p?.github ||
          p?.leetcode ||
          p?.linkedin ||
          p?.photo
        );
        if (editable && empty) setEditing(true);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof UserServiceError ? e.message : "Failed to load profile.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [userId, token, editable]);

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateUserProfile(
        userId,
        {
          profile: {
            bio: form.bio || null,
            github: form.github || null,
            leetcode: form.leetcode || null,
            linkedin: form.linkedin || null,
            photo: form.photo || null,
          },
        },
        token,
      );
      setUser(updated);
      setEditing(false);
      onSaved?.(updated);
    } catch (e) {
      setError(
        e instanceof UserServiceError ? e.message : "Failed to save profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteAccount(userId, token);
      onDeleted?.();
    } catch (e) {
      setError(
        e instanceof UserServiceError ? e.message : "Failed to delete account.",
      );
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <Logo size={18} />
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px" }}>
        {error && <div style={errorStyle}>{error}</div>}

        {user === undefined && !error && <div style={mutedStyle}>Loading…</div>}
        {user === null && !error && (
          <div style={mutedStyle}>This profile could not be found.</div>
        )}

        {user && (
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Avatar name={user.username} photo={user.profile?.photo} />
              <div style={{ minWidth: 0 }}>
                <h1 style={nameStyle}>{user.username}</h1>
                <div style={emailStyle}>{user.email}</div>
              </div>
              {editable && !editing && (
                <div style={{ marginLeft: "auto" }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    Edit profile
                  </Button>
                </div>
              )}
            </div>

            {editing ? (
              <div style={{ marginTop: 24, display: "grid", gap: 14 }}>
                <Field label="Bio">
                  <textarea
                    value={form.bio}
                    onChange={(e) => patch({ bio: e.target.value })}
                    rows={4}
                    style={inputStyle}
                  />
                </Field>
                <Field label="GitHub">
                  <input
                    value={form.github}
                    onChange={(e) => patch({ github: e.target.value })}
                    placeholder="username or URL"
                    style={inputStyle}
                  />
                </Field>
                <Field label="LeetCode">
                  <input
                    value={form.leetcode}
                    onChange={(e) => patch({ leetcode: e.target.value })}
                    placeholder="username or URL"
                    style={inputStyle}
                  />
                </Field>
                <Field label="LinkedIn">
                  <input
                    value={form.linkedin}
                    onChange={(e) => patch({ linkedin: e.target.value })}
                    placeholder="username or URL"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Photo URL">
                  <input
                    value={form.photo}
                    onChange={(e) => patch({ photo: e.target.value })}
                    placeholder="https://…"
                    style={inputStyle}
                  />
                </Field>
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={save}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 22, display: "grid", gap: 16 }}>
                <ReadField label="Bio">
                  {user.profile?.bio || <Muted>Not provided</Muted>}
                </ReadField>
                <LinkRow
                  label="GitHub"
                  kind="github"
                  value={user.profile?.github}
                />
                <LinkRow
                  label="LeetCode"
                  kind="leetcode"
                  value={user.profile?.leetcode}
                />
                <LinkRow
                  label="LinkedIn"
                  kind="linkedin"
                  value={user.profile?.linkedin}
                />
              </div>
            )}

            {editable && (
              <div style={dangerRowStyle}>
                {confirmDelete ? (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontSize: 13, color: "var(--negative)" }}>
                      Delete your account permanently?
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={remove}
                      disabled={deleting}
                    >
                      {deleting ? "Deleting…" : "Yes, delete"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button
                    style={dangerLinkStyle}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete account
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const Avatar = ({ name, photo }: { name: string; photo?: string | null }) =>
  photo ? (
    <img src={photo} alt={name} style={avatarStyle} />
  ) : (
    <div style={{ ...avatarStyle, ...avatarFallbackStyle }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label style={{ display: "grid", gap: 6 }}>
    <span style={fieldLabelStyle}>{label}</span>
    {children}
  </label>
);

const ReadField = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <div style={fieldLabelStyle}>{label}</div>
    <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.6 }}>
      {children}
    </div>
  </div>
);

const LinkRow = ({
  label,
  kind,
  value,
}: {
  label: string;
  kind: "github" | "leetcode" | "linkedin";
  value: string | null | undefined;
}) => (
  <ReadField label={label}>
    {value ? (
      <a
        href={linkFor(kind, value)}
        target="_blank"
        rel="noreferrer"
        style={{ color: "var(--signal-strong)", fontWeight: 600 }}
      >
        {value}
      </a>
    ) : (
      <Muted>Not provided</Muted>
    )}
  </ReadField>
);

const Muted = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: "var(--muted-2)" }}>{children}</span>
);

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "var(--paper)",
  fontFamily: "var(--font-body)",
};
const headerStyle: CSSProperties = {
  borderBottom: "1px solid var(--line)",
  padding: "12px 32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};
const cardStyle: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-md)",
  padding: 28,
};
const nameStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 24,
  fontWeight: 600,
  color: "var(--ink)",
  letterSpacing: "-0.6px",
  margin: 0,
};
const emailStyle: CSSProperties = {
  fontSize: 13,
  color: "var(--muted-2)",
  fontFamily: "var(--font-mono)",
};
const avatarStyle: CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: "50%",
  objectFit: "cover",
  flexShrink: 0,
};
const avatarFallbackStyle: CSSProperties = {
  background: "var(--signal-tint)",
  color: "var(--signal-strong)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-mono)",
  fontWeight: 700,
  fontSize: 20,
};
const fieldLabelStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  fontWeight: 700,
  color: "var(--muted-2)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 4,
};
const inputStyle: CSSProperties = {
  width: "100%",
  background: "var(--surface-2)",
  border: "1px solid var(--line-strong)",
  borderRadius: "var(--radius-sm)",
  padding: "9px 12px",
  fontSize: 14,
  fontFamily: "var(--font-body)",
  color: "var(--ink)",
  outline: "none",
  resize: "vertical",
  boxSizing: "border-box",
};
const errorStyle: CSSProperties = {
  marginBottom: 16,
  padding: "10px 14px",
  background: "var(--negative-tint)",
  border: "1px solid color-mix(in srgb, var(--negative) 40%, transparent)",
  borderRadius: "var(--radius-sm)",
  color: "var(--negative)",
  fontSize: 13,
  fontWeight: 600,
};
const mutedStyle: CSSProperties = {
  color: "var(--muted)",
  fontSize: 14,
  textAlign: "center",
  padding: "40px 0",
};
const dangerRowStyle: CSSProperties = {
  marginTop: 24,
  paddingTop: 18,
  borderTop: "1px solid var(--line)",
};
const dangerLinkStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--negative)",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "var(--font-body)",
  cursor: "pointer",
  padding: 0,
};
