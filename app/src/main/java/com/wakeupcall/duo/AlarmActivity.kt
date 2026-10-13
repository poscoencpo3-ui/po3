package com.wakeupcall.duo

import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.WindowManager
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.wakeupcall.duo.databinding.ActivityAlarmBinding

/**
 * Full-screen "ringing" UI, launched via the full-screen-intent notification
 * from WakeForegroundService. Shows over the lock screen and keeps
 * ringing/vibrating until the user taps the stop button (or the safety
 * auto-stop timeout fires).
 */
class AlarmActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_CODE = "extra_code"
        const val EXTRA_NONCE = "extra_nonce"
        const val EXTRA_SENDER_NAME = "extra_sender_name"
        private const val AUTO_STOP_DELAY_MS = 3 * 60 * 1000L
    }

    private lateinit var binding: ActivityAlarmBinding
    private val handler = Handler(Looper.getMainLooper())
    private var autoStopRunnable: Runnable? = null
    private var code: String? = null
    private var nonce: Long = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setupWindowFlags()

        binding = ActivityAlarmBinding.inflate(layoutInflater)
        setContentView(binding.root)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // Ignored on purpose: only the stop button should dismiss the alarm.
            }
        })

        code = intent.getStringExtra(EXTRA_CODE)
        nonce = intent.getLongExtra(EXTRA_NONCE, 0L)
        val senderName = intent.getStringExtra(EXTRA_SENDER_NAME)
            ?: getString(R.string.default_partner_name)

        binding.textAlarmMessage.text = getString(R.string.alarm_message, senderName)
        binding.buttonStopAlarm.setOnClickListener { stopAndFinish() }

        AlarmSoundPlayer.start(this)
        startVibration()
        scheduleAutoStop()
    }

    private fun setupWindowFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun startVibration() {
        val pattern = longArrayOf(0, 800, 500)
        val effect = VibrationEffect.createWaveform(pattern, 0)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(VibratorManager::class.java)
            vibratorManager.defaultVibrator.vibrate(effect)
        } else {
            @Suppress("DEPRECATION")
            val vibrator = getSystemService(Vibrator::class.java)
            vibrator.vibrate(effect)
        }
    }

    private fun stopVibration() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            getSystemService(VibratorManager::class.java).defaultVibrator.cancel()
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Vibrator::class.java).cancel()
        }
    }

    private fun scheduleAutoStop() {
        val runnable = Runnable { stopAndFinish() }
        autoStopRunnable = runnable
        handler.postDelayed(runnable, AUTO_STOP_DELAY_MS)
    }

    private fun stopAndFinish() {
        autoStopRunnable?.let { handler.removeCallbacks(it) }
        AlarmSoundPlayer.stop(this)
        stopVibration()
        ContextCompat.getSystemService(this, NotificationManager::class.java)
            ?.cancel(WakeForegroundService.NOTIF_ID_ALARM)

        val c = code
        if (c != null && nonce > 0) {
            FirestoreRepo.sendAck(c, nonce)
        }
        finish()
    }

    override fun onDestroy() {
        autoStopRunnable?.let { handler.removeCallbacks(it) }
        AlarmSoundPlayer.stop(this)
        stopVibration()
        super.onDestroy()
    }
}
