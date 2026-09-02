import { Module } from '@nestjs/common';
import { FoundationGateway } from './foundation.gateway.js';
import { StructuredLogger } from '../common/logging/structured.logger.js';

@Module({
  providers: [
    {
      provide: FoundationGateway,
      useFactory: (logger: StructuredLogger) => new FoundationGateway(logger),
      inject: [StructuredLogger],
    },
  ],
})
export class RealtimeModule {}
