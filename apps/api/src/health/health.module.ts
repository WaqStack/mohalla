import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';
import { loadEnv } from '../config/env.js';

@Module({
  controllers: [HealthController],
  providers: [
    {
      provide: Pool,
      useFactory: () => {
        const env = loadEnv();
        return new Pool({
          connectionString: env.DATABASE_URL,
          max: env.DATABASE_POOL_MAX,
        });
      },
    },
    HealthService,
  ],
})
export class HealthModule {}
