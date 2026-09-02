package org.shehersaaz.mohalla.core.config

import org.shehersaaz.mohalla.BuildConfig

/**
 * Typed access to build configuration.
 *
 * The API base URL is a BuildConfig field (see app/build.gradle.kts), so it is
 * baked per build type rather than hardcoded in source. A device build points
 * at a real host; a local debug build points at the loopback alias that reaches
 * the developer machine from the emulator.
 */
object BuildEnvironment {
    val apiBaseUrl: String get() = BuildConfig.API_BASE_URL
    val isDebug: Boolean get() = BuildConfig.DEBUG
}
