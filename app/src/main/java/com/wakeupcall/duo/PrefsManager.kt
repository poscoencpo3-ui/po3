package com.wakeupcall.duo

import android.content.Context
import android.content.SharedPreferences
import java.util.UUID

/** One side of a pairing, as stored locally on this device. */
data class Pairing(val code: String, val role: String, val partnerName: String)

object PrefsManager {
    private const val PREFS_NAME = "wakeupcall_prefs"
    private const val KEY_DEVICE_ID = "device_id"
    private const val KEY_MY_NAME = "my_name"
    private const val KEY_PAIR_CODES = "pair_codes"
    private const val KEY_ROLE_PREFIX = "role_"
    private const val KEY_PARTNER_PREFIX = "partner_"
    private const val KEY_LAST_HANDLED_NONCE_PREFIX = "last_handled_nonce_"
    private const val KEY_LAST_SENT_NONCE_PREFIX = "last_sent_nonce_"
    private const val KEY_ALARM_SOUND_URI = "alarm_sound_uri"
    private const val KEY_ALARM_VOLUME_PERCENT = "alarm_volume_percent"
    const val DEFAULT_ALARM_VOLUME_PERCENT = 100

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

    /** All connections this device currently holds (e.g. one to a spouse, one to a child). */
    fun getPairings(context: Context): List<Pairing> {
        val p = prefs(context)
        val codes = p.getStringSet(KEY_PAIR_CODES, emptySet()) ?: emptySet()
        return codes.mapNotNull { code ->
            val role = p.getString(KEY_ROLE_PREFIX + code, null) ?: return@mapNotNull null
            val partnerName = p.getString(KEY_PARTNER_PREFIX + code, "") ?: ""
            Pairing(code, role, partnerName)
        }.sortedBy { it.code }
    }

    fun hasAnyPairing(context: Context): Boolean =
        (prefs(context).getStringSet(KEY_PAIR_CODES, emptySet()) ?: emptySet()).isNotEmpty()

    fun addPairing(context: Context, code: String, role: String, partnerName: String) {
        val p = prefs(context)
        val codes = (p.getStringSet(KEY_PAIR_CODES, emptySet()) ?: emptySet()).toMutableSet()
        codes.add(code)
        p.edit()
            .putStringSet(KEY_PAIR_CODES, codes)
            .putString(KEY_ROLE_PREFIX + code, role)
            .putString(KEY_PARTNER_PREFIX + code, partnerName)
            .apply()
    }

    fun updatePartnerName(context: Context, code: String, partnerName: String) {
        prefs(context).edit().putString(KEY_PARTNER_PREFIX + code, partnerName).apply()
    }

    fun removePairing(context: Context, code: String) {
        val p = prefs(context)
        val codes = (p.getStringSet(KEY_PAIR_CODES, emptySet()) ?: emptySet()).toMutableSet()
        codes.remove(code)
        p.edit()
            .putStringSet(KEY_PAIR_CODES, codes)
            .remove(KEY_ROLE_PREFIX + code)
            .remove(KEY_PARTNER_PREFIX + code)
            .remove(KEY_LAST_SENT_NONCE_PREFIX + code)
            .remove(KEY_LAST_HANDLED_NONCE_PREFIX + code)
            .apply()
    }

    fun getLastHandledNonce(context: Context, code: String): Long =
        prefs(context).getLong(KEY_LAST_HANDLED_NONCE_PREFIX + code, 0L)

    fun setLastHandledNonce(context: Context, code: String, nonce: Long) {
        prefs(context).edit().putLong(KEY_LAST_HANDLED_NONCE_PREFIX + code, nonce).apply()
    }

    fun getLastSentNonce(context: Context, code: String): Long =
        prefs(context).getLong(KEY_LAST_SENT_NONCE_PREFIX + code, 0L)

    fun setLastSentNonce(context: Context, code: String, nonce: Long) {
        prefs(context).edit().putLong(KEY_LAST_SENT_NONCE_PREFIX + code, nonce).apply()
    }

    /** Null means "use the device's default alarm sound". Applies to every incoming pairing. */
    fun getAlarmSoundUri(context: Context): String? = prefs(context).getString(KEY_ALARM_SOUND_URI, null)

    fun setAlarmSoundUri(context: Context, uri: String?) {
        prefs(context).edit().putString(KEY_ALARM_SOUND_URI, uri).apply()
    }

    fun getAlarmVolumePercent(context: Context): Int =
        prefs(context).getInt(KEY_ALARM_VOLUME_PERCENT, DEFAULT_ALARM_VOLUME_PERCENT)

    fun setAlarmVolumePercent(context: Context, percent: Int) {
        prefs(context).edit().putInt(KEY_ALARM_VOLUME_PERCENT, percent).apply()
    }
}
