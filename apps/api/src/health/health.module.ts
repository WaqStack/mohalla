import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';
import { DatabaseService } from '../database/database.service.js';
import { ENV } from '../config/env.token.js';
import type { Env } from '../config/env.js';

@Module({
  controllers: [HealthController],
  providers: [
    {
      provide: HealthService,
      useFactory: (db: DatabaseService, env: Env) => new HealthService(db, env),
      inject: [DatabaseService, ENV],
    },
  ],
})
export class HealthModule {}
