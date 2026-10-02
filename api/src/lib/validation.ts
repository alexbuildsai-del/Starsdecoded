import type { ZodError } from "zod";

export const VALIDATION_LINE = "Some of the details aren't valid. Check them and try again.";

/**
 * The 400 body for a body that fails its contract schema. `message` is the one plain line a form may print; zod's own
 * text is a JSON array of issues, so the issues ride in `issues` for whoever debugs the call and nothing prints them.
 */
export function validationFailure(error: ZodError) {
  return {
    error: "validation_error" as const,
    message: VALIDATION_LINE,
    issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
  };
}
