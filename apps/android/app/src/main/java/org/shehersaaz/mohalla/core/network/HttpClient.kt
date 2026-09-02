package org.shehersaaz.mohalla.core.network

/**
 * HTTP client abstraction.
 *
 * FOUNDATION. The seam between the app and whatever HTTP library is chosen
 * (OkHttp/Retrofit, Ktor). It is defined now, with a base URL and a health
 * call, so that:
 *
 *   - the base URL comes from configuration, never hardcoded per call site
 *   - a correlation id is attached in ONE place (see the implementation),
 *     matching the API's x-correlation-id contract
 *   - product API calls, when written, add methods here and cannot bypass the
 *     correlation/error handling
 *
 * No product endpoint is defined. `checkHealth` is the only call, mirroring the
 * API foundation, which exposes only health.
 */
interface HttpClient {
    val baseUrl: String

    /** GET {baseUrl}/health/live. Returns true on a 2xx. */
    suspend fun checkHealthLive(): Boolean
}
