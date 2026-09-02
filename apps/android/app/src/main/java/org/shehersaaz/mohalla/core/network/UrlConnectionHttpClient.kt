package org.shehersaaz.mohalla.core.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.shehersaaz.mohalla.core.logging.Logger
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

/**
 * FOUNDATION implementation using the JDK's HttpURLConnection.
 *
 * Deliberately dependency-free: it proves the Android -> API health leg without
 * committing the project to a specific HTTP library before the networking epic
 * evaluates one. It attaches an x-correlation-id, matching the API contract, so
 * a request from a device can be found in the API logs.
 *
 * It is NOT the production client. It has no connection pooling, no retry, no
 * TLS pinning - those are decisions for the networking epic. Replacing it is a
 * one-file change because callers depend on the HttpClient interface.
 */
class UrlConnectionHttpClient(
    override val baseUrl: String,
    private val logger: Logger,
) : HttpClient {

    override suspend fun checkHealthLive(): Boolean = withContext(Dispatchers.IO) {
        val correlationId = UUID.randomUUID().toString()
        val url = URL("${'$'}{baseUrl.trimEnd('/')}/health/live")
        val connection = url.openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "GET"
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("x-correlation-id", correlationId)
            connection.connectTimeout = 5_000
            connection.readTimeout = 5_000
            val code = connection.responseCode
            logger.debug("HttpClient", "health/live -> ${'$'}code (corr=${'$'}correlationId)")
            code in 200..299
        } catch (e: Exception) {
            logger.warn("HttpClient", "health/live failed (corr=${'$'}correlationId)", e)
            false
        } finally {
            connection.disconnect()
        }
    }
}
