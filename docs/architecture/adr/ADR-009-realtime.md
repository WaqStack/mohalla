# ADR-009 — Realtime transport: Socket.IO in the API process

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** D-07

## Context

MSG-FR-004 requires a message to reach a recipient with the app open within 3 seconds (NFR-PERF-007). EDGE-021 requires a message delivered twice by the transport to render once. EDGE-020 requires a message composed offline to be delivered exactly once. Conversations are strictly 1:1; group messaging is out of scope.

Peak target is 500 concurrent users, and not all of them are in a conversation.

## Options considered

**A — Native WebSocket.** Smallest dependency; reconnection, acknowledgement and room semantics must be hand-built — and those are exactly what MSG-FR-004 and EDGE-021 require.

**B — Socket.IO.** Reconnection with backoff, acknowledgements, rooms and transport fallback included.

**C — Managed realtime service.** Operationally trivial; recurring cost, vendor lock-in, and user message content traversing a third party — which is difficult to reconcile with PRIV-009.

**D — Polling only.** Simplest; 3-second delivery would mean aggressive polling from every client, which is worse for battery and data on Pakistani mobile networks (D-03).

## Decision

**Socket.IO, hosted in the API process.** Polling over the existing REST history endpoint is the degraded fallback.

## Why

Options A and D fail on the requirements. Option C conflicts with the privacy posture. Socket.IO provides precisely the primitives MSG-FR-004 and EDGE-021 name, and at 500 concurrent one process is sufficient.

**Option C's privacy objection is decisive**, not incidental: PRIV-009 states administrators cannot read private conversations except a reported one. Routing all message content through a third-party realtime provider would put message bodies in a system with a weaker access story than the platform's own.

## Idempotency design — the core of this ADR

1. The **client** generates a UUIDv7 `client_message_id` before sending
2. `messages` carries `UNIQUE (conversation_id, client_message_id)`
3. The server **persists before acknowledging**
4. A retry with the same id returns the original row rather than inserting
5. Ordering is by **server** timestamp so both participants see one order
6. **The polling fallback reuses the identical `client_message_id`**, so switching transports cannot duplicate a message

This satisfies EDGE-020 and EDGE-021 by construction rather than by convention.

## Division of responsibility

| REST | Realtime |
|---|---|
| Conversation list · message history · request list · conversation creation · reporting · pagination | New-message delivery · delivery acknowledgement · read receipt · unread count · connection state |

## Connection lifecycle
Authenticated at handshake with the same opaque session token (ADR-008) — **an invalid or revoked session is refused at connect and on every subsequent event**, so BR-035 applies to sockets. One room per user id supports multiple devices. Heartbeat detects dead connections; on reconnect the client requests messages since its last known server timestamp.

## Benefits
Requirement primitives included; one process; no third party sees message content; graceful degradation.

## Disadvantages
Horizontal scaling requires the Socket.IO Redis adapter — recorded as an explicit trigger (ADR-010), not pre-built. Realtime shares a process with REST, so a socket storm could affect API latency; mitigated by connection limits and monitoring.

## Security impact
Handshake authentication and per-event authorization prevent the classic WebSocket bypass where connect is checked but messages are not. **Both are required.**

## Privacy impact
Message content never leaves the platform's own infrastructure.

## Operational impact
Connection count and delivery failure are monitored metrics (§33).

## Scaling: single instance now, explicit path later

### V1 — single API/realtime instance
**No pub/sub adapter is required, and none is added.** One process owns every socket, so a room lookup is in-memory.

### Measurable triggers for horizontal realtime scaling
Any one, sustained over a rolling 7-day window — measured, not anticipated:

| Trigger | Threshold | Metric |
|---|---|---|
| Concurrent connections | **> 350 sustained peak** (70% of the 500 target, NFR-SCAL-002) | `realtime.connections.peak` |
| Event-loop lag | **> 100 ms at p95** | `process.eventloop.lag.p95` |
| Delivery latency | **> 3 s at p95** — breaches NFR-PERF-007 | `message.delivery.latency.p95` |
| Availability | A single-instance restart cannot meet 99% monthly (NFR-AVAIL-001) | Uptime report |

### What horizontal scaling requires — in order
1. **Shared pub/sub adapter** so a message published on instance A reaches a socket on instance B. This is the **first and only** introduction of Redis (ADR-010).
2. **Load-balancer WebSocket configuration** — upgrade support, and an idle timeout above the heartbeat interval.
3. **Connection-drain strategy on deploy** — stop accepting new connections, emit `connection:state = degraded`, allow clients to reconnect to a healthy instance, then terminate. Clients already reconcile by fetching messages since their last known server timestamp.
4. **Re-verify that idempotency does not move.** **Message deduplication depends on the `UNIQUE (conversation_id, client_message_id)` constraint in PostgreSQL, never on transport behaviour.** Adding an adapter must not introduce a transport-level dedup path that could diverge. This is a mandatory review item when the trigger fires.

## Revisit trigger
The four measured thresholds above.
