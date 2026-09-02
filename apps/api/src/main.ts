import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { writeFileSync } from 'node:fs';
import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.js';
import { StructuredLogger } from './common/logging/structured.logger.js';
import { RequestLoggingInterceptor } from './common/logging/request-logging.interceptor.js';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter.js';

/**
 * API entry point.
 *
 * STAGE 5 FOUNDATION. Serves three health endpoints and a Socket.IO ping.
 * No product route exists.
 */
async function bootstrap(): Promise<void> {
  // Validate configuration before the framework starts, so a misconfigured
  // process fails immediately and visibly rather than under load.
  const env = loadEnv();
  const logger = new StructuredLogger('api', env.LOG_LEVEL);

  const app = await NestFactory.create(AppModule, { logger, bufferLogs: false });

  // Socket.IO transport. NestJS does not apply the IoAdapter automatically
  // merely because @nestjs/platform-socket.io is installed - it must be set
  // explicitly, or the gateway silently never mounts (both the namespace and
  // the default /socket.io path return 404). The foundation ping proved this by
  // failing until the adapter was set.
  app.useWebSocketAdapter(new IoAdapter(app));

  // ---- security headers -------------------------------------------------
  // The API serves JSON to an Android client and to the admin console; it
  // renders no HTML of its own, so a restrictive default CSP costs nothing and
  // removes a class of mistake if an error page ever does render markup.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          'default-src': ["'none'"],
          'frame-ancestors': ["'none'"],
          'base-uri': ["'none'"],
        },
      },
      // Sent only over HTTPS by the platform; harmless locally.
      hsts: { maxAge: 31_536_000, includeSubDomains: true },
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  // ---- CORS -------------------------------------------------------------
  // Explicit allow-list, never `*`. Empty list = no cross-origin browser
  // access, which is the correct default: the Android client is not a browser,
  // and the admin console is served from its own origin.
  app.enableCors({
    origin: env.CORS_ALLOWED_ORIGINS.length > 0 ? env.CORS_ALLOWED_ORIGINS : false,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
    exposedHeaders: ['X-Correlation-Id'],
    maxAge: 600,
  });

  // ---- cross-cutting ----------------------------------------------------
  app.useGlobalFilters(new AllExceptionsFilter(logger));
  app.useGlobalInterceptors(new RequestLoggingInterceptor(logger));

  // Per-argument zod validation is applied at the handler with
  // `ZodValidationPipe`. No global body pipe is registered because the
  // foundation has no request body to validate - registering one now would be
  // configuration with nothing to act on.

  // ---- OpenAPI ----------------------------------------------------------
  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Mohalla API — foundation')
      .setDescription(
        'Shehersaaz Community Platform. STAGE 5 FOUNDATION — health endpoints only. ' +
          'The approved product contract is docs/architecture/contracts/openapi-v1.yaml.',
      )
      .setVersion(env.APP_VERSION)
      .build(),
  );

  // Interactive docs in development only. In staging and production the spec is
  // still generated (and written to disk when asked) but not served, because an
  // always-on schema browser is free reconnaissance.
  if (env.NODE_ENV === 'development') {
    SwaggerModule.setup('docs', app, doc);
  }

  if (process.env.OPENAPI_OUT) {
    writeFileSync(process.env.OPENAPI_OUT, JSON.stringify(doc, null, 2), 'utf8');
    logger.log(`OpenAPI written to ${process.env.OPENAPI_OUT}`, 'bootstrap');
  }

  // ---- lifecycle --------------------------------------------------------
  // Required by the rolling-restart deployment strategy (Stage 4 section 14):
  // without it, every deploy drops in-flight requests.
  app.enableShutdownHooks();

  await app.listen(env.PORT);

  logger.log(
    JSON.stringify({
      event: 'startup',
      port: env.PORT,
      environment: env.NODE_ENV,
      version: env.APP_VERSION,
      commit: env.GIT_COMMIT,
      routes: ['GET /health', 'GET /health/live', 'GET /health/ready'],
      socketPath: env.SOCKET_IO_PATH,
      note: 'foundation only - no product route exists',
    }),
    'bootstrap',
  );
}

void bootstrap();
