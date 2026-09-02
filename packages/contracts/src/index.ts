/**
 * Shared transport contracts.
 *
 * STAGE 5 FOUNDATION. Contains only what the foundation actually transports:
 * the error envelope, the correlation header, and the health payloads.
 *
 * Product request/response types are NOT written here by hand. They are
 * generated from `docs/architecture/contracts/openapi-v1.yaml` — the frozen
 * Stage 4 contract — when the first real endpoint exists. Hand-writing them now
 * would create a second source of truth that immediately starts drifting.
 */

export * from './errors.js';
export * from './correlation.js';
export * from './health.js';
