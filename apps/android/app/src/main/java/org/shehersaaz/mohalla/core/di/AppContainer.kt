package org.shehersaaz.mohalla.core.di

import org.shehersaaz.mohalla.BuildConfig
import org.shehersaaz.mohalla.core.locale.LocaleManager
import org.shehersaaz.mohalla.core.logging.AndroidLogger
import org.shehersaaz.mohalla.core.logging.Logger
import org.shehersaaz.mohalla.core.network.HttpClient
import org.shehersaaz.mohalla.core.network.UrlConnectionHttpClient
import org.shehersaaz.mohalla.core.storage.InMemorySecureStorage
import org.shehersaaz.mohalla.core.storage.SecureStorage

/**
 * Manual dependency container.
 *
 * FOUNDATION. Deliberately NOT Hilt/Dagger. Stage 4 discourages adding heavy
 * frameworks without demonstrated need, and a foundation with a handful of
 * dependencies does not need annotation processing, a second build step, or the
 * generated-code debugging cost. Constructor injection wired by hand is the
 * lighter choice and is trivially testable - a test constructs the container
 * with fakes.
 *
 * If the dependency graph grows enough to justify it, this single file is where
 * a DI framework is introduced, and callers - which only ask the container for
 * an already-built object - do not change.
 */
class AppContainer(
    apiBaseUrl: String,
    debugEnabled: Boolean = BuildConfig.DEBUG,
) {
    val logger: Logger = AndroidLogger(debugEnabled)
    val secureStorage: SecureStorage = InMemorySecureStorage()
    val localeManager: LocaleManager = LocaleManager()
    val httpClient: HttpClient = UrlConnectionHttpClient(apiBaseUrl, logger)
}
