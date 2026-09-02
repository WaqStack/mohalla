package org.shehersaaz.mohalla

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.shehersaaz.mohalla.core.locale.AppLocale
import org.shehersaaz.mohalla.core.locale.LocaleManager

/**
 * Runtime language switching, verified on the JVM with no device.
 *
 * Proves the mechanism the foundation screen relies on: toggling flips between
 * the two peer languages, and Urdu carries the RTL flag that drives mirroring.
 */
class LocaleManagerTest {

    @Test
    fun `defaults to english ltr`() {
        val m = LocaleManager()
        assertEquals(AppLocale.ENGLISH, m.locale.value)
        assertFalse(m.locale.value.isRtl)
    }

    @Test
    fun `toggles english to urdu and back`() {
        val m = LocaleManager()
        m.toggle()
        assertEquals(AppLocale.URDU, m.locale.value)
        assertTrue("Urdu must be RTL", m.locale.value.isRtl)
        m.toggle()
        assertEquals(AppLocale.ENGLISH, m.locale.value)
    }

    @Test
    fun `set selects a specific locale`() {
        val m = LocaleManager()
        m.set(AppLocale.URDU)
        assertEquals(AppLocale.URDU, m.locale.value)
    }
}
