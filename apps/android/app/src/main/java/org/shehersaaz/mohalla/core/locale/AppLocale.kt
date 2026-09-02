package org.shehersaaz.mohalla.core.locale

/**
 * The two peer languages. Urdu is not a fallback.
 */
enum class AppLocale(val tag: String, val isRtl: Boolean) {
    ENGLISH("en", false),
    URDU("ur", true),
}
