package org.shehersaaz.mohalla.core.logging

import android.util.Log

/**
 * The one place `android.util.Log` is called.
 *
 * Debug logging is compiled to run only in debug builds via BuildConfig, so a
 * release build cannot accidentally emit verbose logs that might contain data.
 */
class AndroidLogger(private val debugEnabled: Boolean) : Logger {
    override fun debug(tag: String, message: String) {
        if (debugEnabled) Log.d(tag, message)
    }

    override fun info(tag: String, message: String) = Unit.also { Log.i(tag, message) }

    override fun warn(tag: String, message: String, throwable: Throwable?) {
        Log.w(tag, message, throwable)
    }

    override fun error(tag: String, message: String, throwable: Throwable?) {
        Log.e(tag, message, throwable)
    }
}
