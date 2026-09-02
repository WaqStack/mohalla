package org.shehersaaz.mohalla.core.storage

/**
 * Secure storage abstraction.
 *
 * FOUNDATION. The interface the app will use to hold the opaque session token
 * (ADR: opaque server-backed sessions, not JWT). It is an interface from day one
 * so that the storage backend - EncryptedSharedPreferences, the Android Keystore,
 * DataStore - can be chosen and hardened in the auth epic WITHOUT changing a
 * single caller.
 *
 * No session logic lives here. Storing and clearing a token is not
 * authentication; it is a key-value operation. Registration, login and session
 * refresh are AUTH-FR business logic and are not implemented in Stage 5.
 */
interface SecureStorage {
    fun putString(key: String, value: String)
    fun getString(key: String): String?
    fun remove(key: String)
    fun clear()
}
