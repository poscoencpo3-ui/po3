package com.wakeupcall.duo

import android.app.Application
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth

class WakeUpApp : Application() {

    companion object {
        const val CHANNEL_SERVICE = "service_status"
        const val CHANNEL_ALARM = "wake_alarm"
    }

    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
        ensureAnonymousSignIn()
        createNotificationChannels()
    }

    /**
     * No phone-number login is used (see FirestoreRepo doc comment for the
     * data model) - anonymous auth just gives Firestore security rules a
     * real signed-in request.auth to check, without any SMS/phone verification setup.
     */
    private fun ensureAnonymousSignIn() {
        val auth = FirebaseAuth.getInstance()
        if (auth.currentUser == null) {
            auth.signInAnonymously()
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(NotificationManager::class.java)

        val serviceChannel = NotificationChannel(
            CHANNEL_SERVICE,
            getString(R.string.channel_service_name),
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = getString(R.string.channel_service_description)
            setShowBadge(false)
        }

        val alarmChannel = NotificationChannel(
            CHANNEL_ALARM,
            getString(R.string.channel_alarm_name),
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = getString(R.string.channel_alarm_description)
            // Sound/vibration for the alarm itself are driven manually
            // (AlarmSoundPlayer + Vibrator) so they use the alarm audio
            // stream instead of the notification stream, which is what lets
            // them bypass silent/vibrate mode. The channel stays silent.
            setSound(null, null)
            enableVibration(false)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            setBypassDnd(true)
        }

        nm.createNotificationChannel(serviceChannel)
        nm.createNotificationChannel(alarmChannel)
    }
}
