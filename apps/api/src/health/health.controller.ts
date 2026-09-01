import { Controller, Get, HttpCode } from '@nestjs/common';
import { HealthService } from './health.service.js';

/**
 * The only routes the foundation exposes.
 *
 * `GET /health/live`  - process liveness, no dependencies consulted
 * `GET /health/ready` - dependency readiness, 503 when a dependency is down
 *
 * PROPOSED DEFAULT (Stage 5). Stage 4 requires health checks as a deployment
 * mechanism but does not specify their paths or payloads, so this shape is a
 * Stage 5 default and is recorded as such in
 * `docs/foundation/13-observability.md`. It is changeable without affecting any
 * approved requirement.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  live() {
    return this.health.live();
  }

  @Get('ready')
  @HttpCode(200)
  async ready() {
    const result = await this.health.ready();
    if (!result.ok) {
      // 503 so an orchestrator withholds traffic rather than sending it to a
      // process whose database is unreachable.
      const err: Error & { status?: number } = new Error('dependency not ready');
      err.status = 503;
      throw Object.assign(err, { response: result, status: 503 });
    }
    return result;
  }
}
