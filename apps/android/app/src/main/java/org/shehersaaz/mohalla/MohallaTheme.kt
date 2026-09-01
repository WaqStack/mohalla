package org.shehersaaz.mohalla

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * Foundation theme.
 *
 * Colours are the approved Mohalla palette values carried over from the Stage 3
 * prototype. The full token set lives in `packages/tokens`, generated from
 * `docs/prototype.html`; this is the subset the foundation screen needs, and it
 * is replaced by a generated Kotlin token source in the design-system epic
 * rather than being hand-extended here.
 */
private val BrandPrimary = Color(0xFF145A73)
private val TextPrimary = Color(0xFF1C2530)
private val TextSecondary = Color(0xFF566573)
private val BackgroundPrimary = Color(0xFFF6F4EF)
private val SurfacePrimary = Color(0xFFFFFFFF)

private val LightColors = lightColorScheme(
    primary = BrandPrimary,
    onPrimary = Color.White,
    background = BackgroundPrimary,
    onBackground = TextPrimary,
    surface = SurfacePrimary,
    onSurface = TextPrimary,
    onSurfaceVariant = TextSecondary,
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF7FB8CC),
    onPrimary = Color(0xFF00323F),
    background = Color(0xFF0D1A1F),
    onBackground = Color(0xFFEEF4F6),
    surface = Color(0xFF12242B),
    onSurface = Color(0xFFEEF4F6),
)

@Composable
fun MohallaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content,
    )
}
