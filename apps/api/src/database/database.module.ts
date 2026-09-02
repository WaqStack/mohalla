import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service.js';
import { ENV } from '../config/env.token.js';
import { loadEnv, type Env } from '../config/env.js';
import { StructuredLogger } from '../common/logging/structured.logger.js';

/**
 * Global so that every module can inject `DatabaseService` without importing a
 * database module and thereby creating an import edge the dependency-direction
 * guard would have to special-case. Infrastructure is ambient; product modules
 * are not.
 */
@Global()
@Module({
  providers: [
    { provide: ENV, useFactory: (): Env => loadEnv() },
    {
      provide: StructuredLogger,
      useFactory: (env: Env) => new StructuredLogger('api', env.LOG_LEVEL),
      inject: [ENV],
    },
    {
      provide: DatabaseService,
      useFactory: (env: Env, logger: StructuredLogger) => new DatabaseService(env, logger),
      inject: [ENV, StructuredLogger],
    },
  ],
  exports: [ENV, StructuredLogger, DatabaseService],
})
export class DatabaseModule {}
