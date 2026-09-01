# ADR-003 — Backend framework: NestJS

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** D-15, NFR-MAIN-001/002

## Context

Fifteen product modules must be implemented as a modular monolith by two developers making heavy but supervised use of AI coding agents. NFR-MAIN-001 requires modules that can change without cascading; NFR-MAIN-002 requires each business rule to live in exactly one place.

The dominant constraint is **boundary enforcement**. An AI agent pointed at the messaging module must not be able to reach into moderation.

## Requirements

All 124 FRs · NFR-MAIN-001/002/003 · SEC-009/010/011 · MSG-FR-004 (realtime gateway)

## Options considered

**A — NestJS (TypeScript).** Module system with explicit imports and dependency injection. Built-in WebSocket gateway. Shares TypeScript with admin and contracts.

**B — FastAPI (Python).** Fast to write, excellent Pydantic validation. Module structure is convention only. Realtime less mature. Third language.

**C — ASP.NET Core.** Strong typing and structure. Third language; heaviest for this team.

## Decision

**NestJS.**

## Why

Its module system *is* the boundary enforcement this architecture needs. Fifteen product modules become fifteen NestJS modules with declared imports, and a module that has not imported another literally cannot inject its services. That converts an architectural rule into a compile-time constraint — which is exactly what makes AI agents safe to point at one feature.

FastAPI would rely on developer discipline for the same guarantee. With two developers and agent-generated code, discipline is the wrong enforcement mechanism.

Sharing TypeScript with the admin and the contracts package also recovers part of the single-language benefit that the mobile decision (ADR-001) gave up.

## Benefits
Compile-time module boundaries; conventional structure that AI agents reproduce reliably; Socket.IO gateway in-process; shared types with admin; DTO validation at the transport edge.

## Disadvantages
Node is weaker for CPU-bound work — none is required in V1; image work happens on-device (MEDIA-FR-001) and in the storage tier. DI adds ceremony. Decorator-heavy style needs conventions to stay readable.

## Security impact
Positive. Guards and interceptors give one place for authentication, object-level authorization (SEC-011), rate limiting (SEC-005), audit emission (SEC-022) and error sanitisation (SEC-018) — applied globally rather than per-controller.

## Privacy impact
Serializer interceptors let public projections be declared once, so a phone number cannot leak into a response by accident (PRIV-003).

## Operational impact
One process for API and realtime; a second process, same codebase, for workers.

## Cost impact
None.

## Revisit trigger
A module needs a runtime Node cannot serve.
