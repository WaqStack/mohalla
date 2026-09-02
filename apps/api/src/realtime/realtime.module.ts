import { Module } from '@nestjs/common';
import { FoundationGateway } from './foundation.gateway.js';

/**
 * Registers the Socket.IO foundation gateway.
 *
 * FoundationGateway is a PLAIN CLASS PROVIDER, not a useFactory one. NestJS
 * discovers gateways by inspecting each provider's class metatype for the
 * @WebSocketGateway metadata; a useFactory provider has no metatype, so a
 * factory-registered gateway is silently never mounted (its namespace and the
 * default /socket.io path both 404). The foundation ping proved this by failing
 * until the registration was changed to a class provider.
 *
 * Its StructuredLogger dependency is injected by type - DatabaseModule is
 * @Global and exports StructuredLogger, and emitDecoratorMetadata is enabled.
 */
@Module({
  providers: [FoundationGateway],
})
export class RealtimeModule {}
