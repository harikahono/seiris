/**
 * Parse Laravel validation error response into Record<string, string>.
 * Catches axios error responses with `errors` key.
 *
 * Usage:
 *   const errs = parseErrors(err);
 *   toast.error(errs.description ?? "Gagal");
 */
export function parseErrors(err: unknown): Record<string, string> {
  if (
    err &&
    typeof err === "object" &&
    "response" in err &&
    err.response &&
    typeof err.response === "object" &&
    "data" in err.response &&
    err.response.data &&
    typeof err.response.data === "object" &&
    "errors" in (err.response.data as Record<string, unknown>)
  ) {
    const errors = (err.response.data as Record<string, unknown>).errors;
    if (errors && typeof errors === "object") {
      const result: Record<string, string> = {};
      for (const [field, messages] of Object.entries(errors)) {
        if (Array.isArray(messages) && messages.length > 0) {
          result[field] = messages[0] as string;
        }
      }
      return result;
    }
  }
  return {};
}
