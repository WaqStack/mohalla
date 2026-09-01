import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.js';

/**
 * API entry point.
 *
 * STAGE 5 FOUNDATION. Serves two health endpoints and nothing else.
 */
async function bootstrap(): Promise<void> {
  // Validate configuration before the framework starts, so a misconfigured
  // process fails immediately and visibly.
  const env = loadEnv();

  const app = await NestFactory.create(AppModule, {
    logger:
      env.LOG_LEVEL === 'debug' ? ['log', 'debug', 'warn', 'error'] : ['log', 'warn', 'error'],
  });

  app.enableShutdownHooks();
  await app.listen(env.PORT);

  console.log(
    `[api] foundation listening on :${env.PORT} (${env.NODE_ENV}) - health endpoints only`,
  );
}

void bootstrap();
