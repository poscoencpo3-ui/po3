package com.wakeupcall.duo

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/**
 * Restarts the listener service after a reboot, so a wake signal still
 * works even if neither phone has opened the app since it was turned back on.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED && PrefsManager.getPairCode(context) != null) {
            ContextCompat.startForegroundService(
                context,
                Intent(context, WakeForegroundService::class.java)
            )
        }
    }
}
