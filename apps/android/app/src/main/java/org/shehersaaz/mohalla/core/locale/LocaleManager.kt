package org.shehersaaz.mohalla.core.locale

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Runtime language switching.
 *
 * Holds the currently selected locale as observable state. The UI observes it
 * and re-resolves strings and layout direction when it changes, so a user can
 * switch between English and Urdu WITHOUT restarting the app - which is a real
 * RTL requirement, not a nice-to-have: a user who picks the wrong language at
 * install must be able to recover in place.
 *
 * This is the mechanism. It is wired to a visible toggle on the foundation
 * screen so the switch, and the LTR<->RTL flip it causes, can be seen.
 */
class LocaleManager(initial: AppLocale = AppLocale.ENGLISH) {
    private val _locale = MutableStateFlow(initial)
    val locale: StateFlow<AppLocale> = _locale

    fun set(locale: AppLocale) {
        _locale.value = locale
    }

    fun toggle() {
        _locale.value = if (_locale.value == AppLocale.ENGLISH) AppLocale.URDU else AppLocale.ENGLISH
    }
}
