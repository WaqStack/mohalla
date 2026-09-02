/**
 * The single error envelope every API failure uses.
 *
 * Stage 4 defines the error catalogue in
 * `docs/architecture/contracts/error-catalogue.md`. This is its wire shape.
 *
 * WHY ONE SHAPE, ENFORCED GLOBALLY
 *
 * The Android client and the admin console both need to distinguish "retry
 * this", "fix the input", and "you are not allowed" without string-matching
 * prose. A stable `code` gives them that. It also keeps localisation on the
 * client: the server sends a code, the client renders Urdu or English — which
 * is what LOCALE-FR-001 requires, since the server cannot know the reader's
 * language for every delivery path.
 */
export interface ApiErrorBody {
  /** Stable machine-readable code from the Stage 4 error catalogue. */
  code: string;
  /**
   * Developer-facing English message. NOT for display to users — clients render
   * their own localized copy from `code`.
   */
  message: string;
  /** Field-level detail for validation failures. Never contains secret values. */
  details?: ReadonlyArray<{ path: string; message: string }>;
  /** Echoed so a user-reported failure can be found in the logs. */
  correlationId: string;
  /** ISO-8601, server clock, UTC. */
  timestamp: string;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
}

/**
 * Foundation error codes.
 *
 * Deliberately minimal: these are the only failures the foundation can actually
 * produce. Product codes are added by the epic that can raise them, so this
 * enum never lists a code no code path emits.
 */
export const FoundationErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DEPENDENCY_UNAVAILABLE: 'DEPENDENCY_UNAVAILABLE',
} as const;

export type FoundationErrorCode = (typeof FoundationErrorCode)[keyof typeof FoundationErrorCode];
