package org.shehersaaz.mohalla

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.shehersaaz.mohalla.core.storage.InMemorySecureStorage

/**
 * The foundation SecureStorage contract, verified on the JVM.
 *
 * This tests the CONTRACT, so the same tests apply unchanged when the encrypted
 * backend replaces the in-memory one in the auth epic.
 */
class SecureStorageTest {

    @Test
    fun `stores and retrieves a value`() {
        val s = InMemorySecureStorage()
        s.putString("session", "opaque-token")
        assertEquals("opaque-token", s.getString("session"))
    }

    @Test
    fun `remove deletes a single key`() {
        val s = InMemorySecureStorage()
        s.putString("a", "1")
        s.putString("b", "2")
        s.remove("a")
        assertNull(s.getString("a"))
        assertEquals("2", s.getString("b"))
    }

    @Test
    fun `clear empties everything`() {
        val s = InMemorySecureStorage()
        s.putString("a", "1")
        s.clear()
        assertNull(s.getString("a"))
    }
}
