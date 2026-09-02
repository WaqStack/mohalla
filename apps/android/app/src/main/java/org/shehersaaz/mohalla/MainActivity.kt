package org.shehersaaz.mohalla

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import org.shehersaaz.mohalla.core.config.BuildEnvironment
import org.shehersaaz.mohalla.core.di.AppContainer

/**
 * STAGE 5 FOUNDATION.
 *
 * The only activity. It builds the manual dependency container once and renders
 * a single screen whose purpose is to prove the build works, the layout mirrors,
 * and the language can be switched at runtime. There is no navigation, no
 * authentication and no product screen.
 */
class MainActivity : ComponentActivity() {

    private lateinit var container: AppContainer

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        container = AppContainer(apiBaseUrl = BuildEnvironment.apiBaseUrl)

        setContent {
            val locale by container.localeManager.locale.collectAsState()
            MohallaTheme {
                FoundationScreen(
                    locale = locale,
                    onToggleLocale = { container.localeManager.toggle() },
                )
            }
        }
    }
}
