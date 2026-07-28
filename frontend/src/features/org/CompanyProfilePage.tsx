import { useEffect, useState, type CSSProperties } from "react";
import Button from "../../ui/Button";
import Logo from "../../ui/Logo";
import {
  getOrganization,
  getMyOrganization,
  updateOrganization,
  deleteOrganization,
  OrgServiceError,
  type OrganizationResponse,
} from "../../services/organization.service";

interface CompanyProfilePageProps {
  token: string;
  editable: boolean;
  orgId?: number;
  onBack: () => void;
  onDeleted?: () => void;
}

interface FormState {
  description: string;
  url: string;
  email: string;
  address: string;
  linkedin: string;
  photo: string;
}

export default function CompanyProfilePage({
  token,
  editable,
  orgId,
  onBack,
  onDeleted,
}: CompanyProfilePageProps) {
  const [org, setOrg] = useState<OrganizationResponse | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>({
    description: "",
    url: "",
    email: "",
    address: "",
    linkedin: "",
    photo: "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = editable
      ? getMyOrganization(token)
      : getOrganization(orgId as number, token);
    load
      .then((o) => {
        if (cancelled) return;
        setOrg(o);
        setForm({
          description: o.description ?? "",
          url: o.url ?? "",
          email: o.email ?? "",
          address: o.address ?? "",
          linkedin: o.linkedin ?? "",
          photo: o.photo ?? "",
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof OrgServiceError ? e.message : "Failed to load company.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [editable, orgId, token]);

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  const save = async () => {
    if (!org) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateOrganization(
        org.id,
        {
          description: form.description || null,
          url: form.url || null,
          email: form.email || null,
          address: form.address || null,
          linkedin: form.linkedin || null,
          photo: form.photo || null,
        },
        token,
      );
      setOrg(updated);
      setEditing(false);
    } catch (e) {
      setError(
        e instanceof OrgServiceError ? e.message : "Failed to save company.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!org) return;
    setDeleting(true);
    try {
      await deleteOrganization(org.id, token);
      onDeleted?.();
    } catch (e) {
      setError(
        e instanceof OrgServiceError ? e.message : "Failed to delete company.",
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

        {org === undefined && !error && <div style={mutedStyle}>Loading…</div>}
        {org === null && !error && (
          <div style={mutedStyle}>This company could not be found.</div>
        )}

        {org && (
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Avatar name={org.name ?? "?"} photo={org.photo} />
              <div style={{ minWidth: 0 }}>
                <h1 style={nameStyle}>{org.name ?? `Company #${org.id}`}</h1>
                {org.url && (
                  <a
                    href={
                      org.url.startsWith("http")
                        ? org.url
                        : `https://${org.url}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    style={emailStyle}
                  >
                    {org.url}
                  </a>
                )}
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
                <Field label="About">
                  <textarea
                    value={form.description}
                    onChange={(e) => patch({ description: e.target.value })}
                    rows={4}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Website">
                  <input
                    value={form.url}
                    onChange={(e) => patch({ url: e.target.value })}
                    placeholder="https://…"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Contact email">
                  <input
                    value={form.email}
                    onChange={(e) => patch({ email: e.target.value })}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Address">
                  <input
                    value={form.address}
                    onChange={(e) => patch({ address: e.target.value })}
                    style={inputStyle}
                  />
                </Field>
                <Field label="LinkedIn">
                  <input
                    value={form.linkedin}
                    onChange={(e) => patch({ linkedin: e.target.value })}
                    placeholder="URL"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Logo URL">
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
                <ReadField label="About">
                  {org.description || <Muted>Not provided</Muted>}
                </ReadField>
                <ReadField label="Contact email">
                  {org.email || <Muted>Not provided</Muted>}
                </ReadField>
                <ReadField label="Address">
                  {org.address || <Muted>Not provided</Muted>}
                </ReadField>
                <ReadField label="LinkedIn">
                  {org.linkedin ? (
                    <a
                      href={
                        org.linkedin.startsWith("http")
                          ? org.linkedin
                          : `https://${org.linkedin}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--signal-strong)", fontWeight: 600 }}
                    >
                      {org.linkedin}
                    </a>
                  ) : (
                    <Muted>Not provided</Muted>
                  )}
                </ReadField>
              </div>
            )}

            {editable && (
              <div style={dangerRowStyle}>
                {confirmDelete ? (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontSize: 13, color: "var(--negative)" }}>
                      Delete this company permanently?
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
                    Delete company
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
  textDecoration: "none",
};
const avatarStyle: CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: "var(--radius)",
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
