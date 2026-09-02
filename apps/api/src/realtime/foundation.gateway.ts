import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { StructuredLogger } from '../common/logging/structured.logger.js';

/**
 * Socket.IO FOUNDATION GATEWAY.
 *
 * Handles exactly two events: `foundation:ping` -> `foundation:pong`.
 *
 * It exists to prove the realtime transport is wired - handshake, namespace,
 * path, CORS and the event round trip - before any product event depends on it.
 * ADR-009 keeps Socket.IO in-process precisely so this is one process to verify
 * rather than a separate service.
 *
 * There is NO message event, NO typing indicator, NO presence, NO room join.
 * Those are MSG-FR business logic and are not implemented in Stage 5.
 *
 * Connections are NOT authenticated. That is correct for a foundation with no
 * session mechanism yet, and it is the reason the gateway carries no product
 * data at all: an unauthenticated socket that can only echo a ping cannot leak
 * anything. Authentication arrives with the session epic, before any real event
 * is added.
 */
@WebSocketGateway({
  path: process.env.SOCKET_IO_PATH ?? '/realtime',
  // Sockets from a browser need an allow-list; the Android client is unaffected.
  cors: {
    origin: (process.env.CORS_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
})
export class FoundationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly logger: StructuredLogger) {}

  handleConnection(client: Socket): void {
    this.logger.debug(JSON.stringify({ event: 'socket_connected', id: client.id }), 'realtime');
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(JSON.stringify({ event: 'socket_disconnected', id: client.id }), 'realtime');
  }

  @SubscribeMessage('foundation:ping')
  handlePing(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: Socket,
  ): { event: string; data: Record<string, unknown> } {
    const nonce =
      typeof body === 'object' && body !== null && 'nonce' in body
        ? String((body as { nonce: unknown }).nonce)
        : null;

    this.logger.debug(JSON.stringify({ event: 'foundation_ping', id: client.id }), 'realtime');

    return {
      event: 'foundation:pong',
      data: { nonce, serverTime: new Date().toISOString() },
    };
  }
}
