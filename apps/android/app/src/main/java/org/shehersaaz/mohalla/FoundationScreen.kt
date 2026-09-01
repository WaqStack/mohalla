package org.shehersaaz.mohalla

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp

/**
 * The foundation screen.
 *
 * RTL RULES APPLIED HERE, AND WHY THEY MATTER
 *
 * Every horizontal measurement uses direction-agnostic APIs:
 *
 *   - `Modifier.padding(horizontal = ...)`, never `padding(start = 16.dp)` with
 *     a hardcoded matching `end`
 *   - `Alignment.Start` / `Alignment.End`, never `Alignment.Left` / `Right`
 *   - `TextAlign.Start`, never `TextAlign.Left`
 *
 * Compose resolves Start and End from the ambient LayoutDirection, which
 * Android derives from the locale because the manifest declares
 * `android:supportsRtl="true"`. Switching the device or app language to Urdu
 * mirrors this screen with no direction-specific code.
 *
 * The screen displays the resolved direction so RTL verification is a thing a
 * tester can SEE, rather than something asserted in a document.
 */
@Composable
fun FoundationScreen() {
    val layoutDirection = LocalLayoutDirection.current
    val locales = LocalConfiguration.current.locales
    val localeTag = if (locales.isEmpty) "unknown" else locales[0].toLanguageTag()

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
                text = stringResource(R.string.foundation_title),
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.foundation_subtitle),
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
                        text = stringResource(R.string.foundation_body),
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
                        text = stringResource(R.string.foundation_locale_label) + ": " + localeTag,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = stringResource(R.string.foundation_direction_label) + ": " +
                            if (layoutDirection == LayoutDirection.Rtl) "RTL" else "LTR",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
        }
    }
}
