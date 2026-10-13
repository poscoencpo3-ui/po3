package com.wakeupcall.duo

import android.content.Context
import android.content.SharedPreferences
import java.util.UUID

object PrefsManager {
    private const val PREFS_NAME = "wakeupcall_prefs"
    private const val KEY_DEVICE_ID = "device_id"
    private const val KEY_MY_NAME = "my_name"
    private const val KEY_PAIR_CODE = "pair_code"
    private const val KEY_MY_ROLE = "my_role"
    private const val KEY_PARTNER_NAME = "partner_name"
    private const val KEY_LAST_HANDLED_NONCE_PREFIX = "last_handled_nonce_"
    private const val KEY_LAST_SENT_NONCE = "last_sent_nonce"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getDeviceId(context: Context): String {
        val p = prefs(context)
        var id = p.getString(KEY_DEVICE_ID, null)
        if (id == null) {
            id = UUID.randomUUID().toString()
            p.edit().putString(KEY_DEVICE_ID, id).apply()
        }
        return id
    }

    fun getMyName(context: Context): String = prefs(context).getString(KEY_MY_NAME, "") ?: ""

    fun setMyName(context: Context, name: String) {
        prefs(context).edit().putString(KEY_MY_NAME, name).apply()
    }

    fun getPairCode(context: Context): String? = prefs(context).getString(KEY_PAIR_CODE, null)

    fun getMyRole(context: Context): String? = prefs(context).getString(KEY_MY_ROLE, null)

    fun getPartnerName(context: Context): String = prefs(context).getString(KEY_PARTNER_NAME, "") ?: ""

    fun savePairing(context: Context, code: String, role: String, partnerName: String) {
        prefs(context).edit()
            .putString(KEY_PAIR_CODE, code)
            .putString(KEY_MY_ROLE, role)
            .putString(KEY_PARTNER_NAME, partnerName)
            .apply()
    }

    fun updatePartnerName(context: Context, partnerName: String) {
        prefs(context).edit().putString(KEY_PARTNER_NAME, partnerName).apply()
    }

    fun clearPairing(context: Context) {
        prefs(context).edit()
            .remove(KEY_PAIR_CODE)
            .remove(KEY_MY_ROLE)
            .remove(KEY_PARTNER_NAME)
            .apply()
    }

    fun getLastHandledNonce(context: Context, code: String): Long =
        prefs(context).getLong(KEY_LAST_HANDLED_NONCE_PREFIX + code, 0L)

    fun setLastHandledNonce(context: Context, code: String, nonce: Long) {
        prefs(context).edit().putLong(KEY_LAST_HANDLED_NONCE_PREFIX + code, nonce).apply()
    }

    fun getLastSentNonce(context: Context): Long = prefs(context).getLong(KEY_LAST_SENT_NONCE, 0L)

    fun setLastSentNonce(context: Context, nonce: Long) {
        prefs(context).edit().putLong(KEY_LAST_SENT_NONCE, nonce).apply()
    }
}
