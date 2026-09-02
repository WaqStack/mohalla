package org.shehersaaz.mohalla.core.logging

/**
 * Logging abstraction.
 *
 * FOUNDATION. An interface, not a product feature, so that no part of the app
 * calls `android.util.Log` directly. Two reasons that matter for THIS app:
 *
 *   1. Privacy. Stage 4 forbids personal data - phone, email, DOB - in logs.
 *      A single choke point is where that rule can later be enforced (redaction,
 *      allow-lists) instead of auditing every call site.
 *   2. Testability. Domain code that logs through this interface can be unit
 *      tested on the JVM without the Android logging framework.
 */
interface Logger {
    fun debug(tag: String, message: String)
    fun info(tag: String, message: String)
    fun warn(tag: String, message: String, throwable: Throwable? = null)
    fun error(tag: String, message: String, throwable: Throwable? = null)
}
