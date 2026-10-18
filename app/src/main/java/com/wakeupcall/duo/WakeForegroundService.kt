package com.wakeupcall.duo

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.ListenerRegistration

/**
 * Keeps a live Firestore listener on the paired "pairs/{code}" document for
 * as long as the app is paired, so a wake signal from the partner device is
 * noticed immediately - even if MainActivity isn't open. Runs as a
 * long-lived foreground service (with a small persistent notification)
 * because Android will otherwise kill a background process's network
 * connection.
 */
class WakeForegroundService : Service() {

    private val listeners = mutableMapOf<String, ListenerRegistration>()

    companion object {
        const val ACTION_REFRESH_PAIRING = "com.wakeupcall.duo.action.REFRESH_PAIRING"
        private const val NOTIF_ID_SERVICE = 1001
        const val NOTIF_ID_ALARM = 1002
    }

    override fun onCreate() {
        super.onCreate()
        startAsForeground()
        reconcileListeners()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_REFRESH_PAIRING) {
            reconcileListeners()
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        listeners.values.forEach { it.remove() }
        listeners.clear()
        super.onDestroy()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        // If the user swipes the app away from recents, restart ourselves so
        // the partner's wake signal is still caught.
        ContextCompat.startForegroundService(this, Intent(this, WakeForegroundService::class.java))
    }

    private fun startAsForeground() {
        val notification: Notification = NotificationCompat.Builder(this, WakeUpApp.CHANNEL_SERVICE)
            .setContentTitle(getString(R.string.service_notification_title))
            .setContentText(getString(R.string.service_notification_text))
            .setSmallIcon(R.drawable.ic_notification)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        ServiceCompat.startForeground(
            this,
            NOTIF_ID_SERVICE,
            notification,
            ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
        )
    }

    /** Adds a listener for every currently-paired code and drops any for codes no longer paired. */
    private fun reconcileListeners() {
        val currentCodes = PrefsManager.getPairings(this).map { it.code }.toSet()

        val stale = listeners.keys.filterNot { it in currentCodes }
        stale.forEach { code -> listeners.remove(code)?.remove() }

        val missing = currentCodes.filterNot { listeners.containsKey(it) }
        missing.forEach { code ->
            listeners[code] = FirestoreRepo.listenPair(code) { snapshot ->
                handleSnapshot(code, snapshot)
            }
        }
    }

    private fun handleSnapshot(code: String, snapshot: DocumentSnapshot?) {
        if (snapshot == null || !snapshot.exists()) return
        val myRole = PrefsManager.getPairings(this).find { it.code == code }?.role ?: return

        @Suppress("UNCHECKED_CAST")
        val wake = snapshot.get("wake") as? Map<String, Any?> ?: return
        val from = wake["from"] as? String ?: return
        val nonce = wake["nonce"] as? Long ?: return
        if (from == myRole) return

        val lastHandled = PrefsManager.getLastHandledNonce(this, code)
        if (nonce <= lastHandled) return
        PrefsManager.setLastHandledNonce(this, code, nonce)

        @Suppress("UNCHECKED_CAST")
        val deviceA = snapshot.get("deviceA") as? Map<String, Any?>
        @Suppress("UNCHECKED_CAST")
        val deviceB = snapshot.get("deviceB") as? Map<String, Any?>
        val sender = if (from == "A") deviceA else deviceB
        val senderName = (sender?.get("name") as? String).takeUnless { it.isNullOrEmpty() }
            ?: getString(R.string.default_partner_name)
        val message = wake["message"] as? String ?: ""
        val soundId = snapshot.get("soundId") as? String

        triggerAlarm(code, nonce, senderName, message, soundId)
    }

    private fun triggerAlarm(code: String, nonce: Long, senderName: String, message: String, soundId: String?) {
        val fullScreenIntent = Intent(this, AlarmActivity::class.java).apply {
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_NO_USER_ACTION
            )
            putExtra(AlarmActivity.EXTRA_CODE, code)
            putExtra(AlarmActivity.EXTRA_NONCE, nonce)
            putExtra(AlarmActivity.EXTRA_SENDER_NAME, senderName)
            putExtra(AlarmActivity.EXTRA_MESSAGE, message)
            putExtra(AlarmActivity.EXTRA_SOUND_ID, soundId)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            nonce.toInt(),
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // setFullScreenIntent is the documented, officially-exempted way to
        // launch an activity from the background on modern Android - this is
        // exactly how incoming-call and alarm-clock apps do it. The system
        // shows it full-screen when the device is locked/asleep (our target
        // scenario), or as a heads-up banner if the phone is actively in use.
        val notification = NotificationCompat.Builder(this, WakeUpApp.CHANNEL_ALARM)
            .setContentTitle(getString(R.string.alarm_notification_title, senderName))
            .setContentText(getString(R.string.alarm_notification_text))
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(pendingIntent, true)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)
            .build()

        ContextCompat.getSystemService(this, NotificationManager::class.java)
            ?.notify(NOTIF_ID_ALARM, notification)
    }
}
