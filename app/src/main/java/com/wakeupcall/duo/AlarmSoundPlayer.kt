package com.wakeupcall.duo

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.provider.Settings

/**
 * Plays the device's default alarm sound on the ALARM audio stream.
 *
 * This is the actual trick that lets the signal be heard even when the
 * phone is set to silent/vibrate: Android keeps a separate volume stream
 * (STREAM_ALARM) that ringer-mode silent/vibrate does NOT mute - it's the
 * same stream alarm-clock apps use. Playing through it (and pushing that
 * stream to max volume) is what makes this work.
 */
object AlarmSoundPlayer {

    // Never let the user pick a volume so low it defeats the whole point of the app.
    private const val MIN_VOLUME_PERCENT = 20

    private var mediaPlayer: MediaPlayer? = null
    private var previousAlarmVolume: Int = -1

    /**
     * @param soundId A bundled tone id (see FirestoreRepo.AVAILABLE_SOUND_IDS), set by
     *   whoever sent this wake signal and takes priority since it's what they intended
     *   to be heard. Null falls back to this device's own local sound preference.
     */
    fun start(context: Context, soundId: String? = null) {
        stop(context)

        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        previousAlarmVolume = audioManager.getStreamVolume(AudioManager.STREAM_ALARM)
        val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
        val percent = PrefsManager.getAlarmVolumePercent(context).coerceIn(MIN_VOLUME_PERCENT, 100)
        val targetVolume = (maxVolume * percent / 100).coerceAtLeast(1)
        audioManager.setStreamVolume(AudioManager.STREAM_ALARM, targetVolume, 0)

        val bundledUri = soundId?.let { resourceUriFor(context, it) }
        val savedUri = PrefsManager.getAlarmSoundUri(context)?.let { Uri.parse(it) }
        val defaultUri: Uri = RingtoneManager.getActualDefaultRingtoneUri(context, RingtoneManager.TYPE_ALARM)
            ?: Settings.System.DEFAULT_ALARM_ALERT_URI

        // Try the sender's chosen bundled tone first, then this device's own
        // saved pick, then whatever the device calls its default alarm sound.
        val candidates = listOfNotNull(bundledUri, savedUri, defaultUri)
        for (uri in candidates) {
            if (tryPlay(context, uri)) return
        }
    }

    private fun resourceUriFor(context: Context, soundId: String): Uri? {
        val resId = context.resources.getIdentifier(soundId, "raw", context.packageName)
        return if (resId != 0) Uri.parse("android.resource://${context.packageName}/$resId") else null
    }

    private fun tryPlay(context: Context, uri: Uri): Boolean {
        return try {
            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(context, uri)
                isLooping = true
                prepare()
                start()
            }
            true
        } catch (e: Exception) {
            mediaPlayer = null
            false
        }
    }

    fun stop(context: Context) {
        mediaPlayer?.let { player ->
            try {
                if (player.isPlaying) player.stop()
            } catch (_: IllegalStateException) {
                // Already stopped/released - nothing to do.
            }
            player.release()
        }
        mediaPlayer = null

        if (previousAlarmVolume >= 0) {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, previousAlarmVolume, 0)
            previousAlarmVolume = -1
        }
    }
}
