/**
 * Correlation identifier.
 *
 * Every request carries one. It is echoed on the response, included in every
 * log line for that request, and is the column `audit_log.correlation_id` that
 * Stage 4 already defines — so a moderator action, the log lines that produced
 * it and the audit row can be tied together after the fact.
 *
 * If the client supplies one it is honoured, which is what lets an Android
 * client's own trace and the server's logs be joined. Otherwise the server
 * generates one.
 */
export const CORRELATION_HEADER = 'x-correlation-id';

/** A correlation id must be a UUID. Anything else is rejected and replaced. */
export const CORRELATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidCorrelationId(value: unknown): value is string {
  return typeof value === 'string' && CORRELATION_ID_PATTERN.test(value);
}
