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

    private var mediaPlayer: MediaPlayer? = null
    private var previousAlarmVolume: Int = -1

    fun start(context: Context) {
        stop(context)

        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        previousAlarmVolume = audioManager.getStreamVolume(AudioManager.STREAM_ALARM)
        val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
        audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0)

        val uri: Uri = RingtoneManager.getActualDefaultRingtoneUri(context, RingtoneManager.TYPE_ALARM)
            ?: Settings.System.DEFAULT_ALARM_ALERT_URI

        try {
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
        } catch (e: Exception) {
            mediaPlayer = null
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
