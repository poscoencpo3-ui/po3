package com.po3.tvremote

import android.content.Context
import androidx.core.content.edit

data class TvSettings(
    val ip: String = "",
    val mac: String = "",
    val token: String? = null,
    val tvName: String = "",
)

class SettingsStore(context: Context) {
    private val prefs = context.getSharedPreferences("tv_remote", Context.MODE_PRIVATE)

    fun load() = TvSettings(
        ip = prefs.getString(KEY_IP, null).orEmpty(),
        mac = prefs.getString(KEY_MAC, null).orEmpty(),
        token = prefs.getString(KEY_TOKEN, null),
        tvName = prefs.getString(KEY_NAME, null).orEmpty(),
    )

    fun save(settings: TvSettings) = prefs.edit {
        putString(KEY_IP, settings.ip)
        putString(KEY_MAC, settings.mac)
        putString(KEY_TOKEN, settings.token)
        putString(KEY_NAME, settings.tvName)
    }

    private companion object {
        const val KEY_IP = "ip"
        const val KEY_MAC = "mac"
        const val KEY_TOKEN = "token"
        const val KEY_NAME = "tv_name"
    }
}
