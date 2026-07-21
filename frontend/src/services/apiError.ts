/**
 * Turns a FastAPI error body's `detail` into a human-readable string. The app's
 * own errors send `detail` as a string, but 422 validation errors send an array
 * of {loc, msg, type} — which stringifies to "[object Object]" if passed to
 * `new Error()` directly, hence this normaliser.
 */
export function extractErrorDetail(data: unknown, fallback: string): string {
  const detail = (data as { detail?: unknown } | null)?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          const msg = String((item as { msg: unknown }).msg);
          // Pydantic prefixes model-level validator errors with "Value
          // error, " — drop it, it reads as an internal implementation detail.
          return msg.replace(/^Value error,\s*/, "");
        }
        return null;
      })
      .filter((m): m is string => Boolean(m));
    if (messages.length > 0) return messages.join("; ");
  }

  return fallback;
}
