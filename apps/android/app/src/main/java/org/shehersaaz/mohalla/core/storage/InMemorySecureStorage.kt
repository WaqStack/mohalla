package org.shehersaaz.mohalla.core.storage

/**
 * FOUNDATION / DEVELOPMENT implementation.
 *
 * Holds values in memory only. It exists so the app can be wired end to end
 * before the auth epic selects the real encrypted backend. It is deliberately
 * NOT persistent: nothing in Stage 5 needs to survive a restart, and an
 * in-memory store cannot accidentally leak a token to disk in a foundation
 * build.
 *
 * It must be replaced by an EncryptedSharedPreferences / Keystore-backed
 * implementation before any real session token is stored. That replacement is a
 * one-file change precisely because callers depend on the interface.
 */
class InMemorySecureStorage : SecureStorage {
    private val map = mutableMapOf<String, String>()

    override fun putString(key: String, value: String) {
        map[key] = value
    }

    override fun getString(key: String): String? = map[key]

    override fun remove(key: String) {
        map.remove(key)
    }

    override fun clear() {
        map.clear()
    }
}
