package org.shehersaaz.mohalla

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import java.util.Locale
import org.shehersaaz.mohalla.core.locale.AppLocale

/**
 * The foundation screen.
 *
 * RUNTIME LANGUAGE SWITCHING + RTL, IN ONE PLACE.
 *
 * The selected AppLocale drives two things at once, with no restart:
 *
 *   1. Layout direction. `LocalLayoutDirection` is provided as Rtl for Urdu, so
 *      every logical alignment in this tree mirrors instantly.
 *   2. Strings. A configuration-scoped Context resolves `strings.xml` in the
 *      chosen language, so the SAME composable renders English or Urdu text
 *      from the SAME resource keys.
 *
 * Every horizontal measurement uses direction-agnostic APIs
 * (`padding(horizontal = ...)`, `Alignment.Start`), so mirroring is automatic.
 * The 48dp button meets the touch-target floor.
 */
@Composable
fun FoundationScreen(
    locale: AppLocale,
    onToggleLocale: () -> Unit,
) {
    val baseContext = LocalContext.current
    // LocalConfiguration is configuration-aware; reading the configuration off
    // the raw context is not, and Android lint flags it. This composable must
    // recompose when the configuration changes, which is the whole point of a
    // live language switch, so the aware source is used deliberately.
    val baseConfiguration = LocalConfiguration.current

    // A Context whose configuration carries the selected locale, so
    // getString() resolves values/ vs values-ur/ at runtime.
    val localizedContext = remember(locale, baseConfiguration) {
        val config = android.content.res.Configuration(baseConfiguration)
        config.setLocale(Locale(locale.tag))
        baseContext.createConfigurationContext(config)
    }

    fun s(id: Int): String = localizedContext.getString(id)

    val direction = if (locale.isRtl) LayoutDirection.Rtl else LayoutDirection.Ltr

    CompositionLocalProvider(LocalLayoutDirection provides direction) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 24.dp, vertical = 32.dp),
                horizontalAlignment = Alignment.Start,
                verticalArrangement = Arrangement.Top,
            ) {
                Text(
                    text = s(R.string.foundation_title),
                    style = MaterialTheme.typography.headlineSmall,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = s(R.string.foundation_subtitle),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                Spacer(Modifier.height(24.dp))

                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(PaddingValues(16.dp)),
                        horizontalAlignment = Alignment.Start,
                    ) {
                        Text(
                            text = s(R.string.foundation_body),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                }

                Spacer(Modifier.height(16.dp))

                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(PaddingValues(16.dp)),
                        horizontalAlignment = Alignment.Start,
                    ) {
                        Text(
                            text = s(R.string.foundation_locale_label) + ": " + locale.tag,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = s(R.string.foundation_direction_label) + ": " +
                                if (direction == LayoutDirection.Rtl) "RTL" else "LTR",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }

                Spacer(Modifier.height(24.dp))

                Button(
                    onClick = onToggleLocale,
                    modifier = Modifier.heightIn(min = 48.dp),
                ) {
                    Text(
                        text = if (locale == AppLocale.ENGLISH) "اردو" else "English",
                    )
                }
            }
        }
    }
}
