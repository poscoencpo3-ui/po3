package com.wakeupcall.duo

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.Button
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.ListenerRegistration
import com.wakeupcall.duo.databinding.ActivityMainBinding
import com.wakeupcall.duo.databinding.ItemConnectionBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    /** One live Firestore listener per pairing, only while this screen is visible. */
    private val uiListeners = mutableMapOf<String, ListenerRegistration>()

    /** Latest "ack.nonce" seen per pairing code, used to render each row's sent/confirmed status. */
    private val ackNonces = mutableMapOf<String, Long>()

    /** Latest "soundId" seen per pairing code (which bundled tone wakes that connection). */
    private val soundIds = mutableMapOf<String, String>()

    /** In-progress message text per pairing, kept here so it survives rebuildConnectionsList(). */
    private val draftMessages = mutableMapOf<String, String>()

    private val previewHandler = Handler(Looper.getMainLooper())
    private var previewRunnable: Runnable? = null
    private var isPreviewPlaying = false

    private val requestNotificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    private val ringtonePickerLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            if (result.resultCode == RESULT_OK) {
                val uri: Uri? = if (Build.VERSION.SDK_INT >= 33) {
                    result.data?.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI, Uri::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    result.data?.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
                }
                PrefsManager.setAlarmSoundUri(this, uri?.toString())
                updateCurrentSoundLabel()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.editMyName.setText(PrefsManager.getMyName(this))

        ensureNotificationPermission()
        startWakeService()
        setupListeners()
        setupSoundSettings()
        rebuildConnectionsList()
    }

    override fun onStart() {
        super.onStart()
        attachAllLiveListeners()
        refreshFullScreenIntentStatus()
    }

    override fun onStop() {
        super.onStop()
        detachAllLiveListeners()
        cancelPreview()
    }

    private fun ensureNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                this, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    private fun startWakeService() {
        ContextCompat.startForegroundService(this, Intent(this, WakeForegroundService::class.java))
    }

    private fun setupListeners() {
        binding.buttonCreateCode.setOnClickListener { onCreateCode() }
        binding.buttonJoinCode.setOnClickListener { onJoinCode() }

        binding.buttonBatteryOptimization.setOnClickListener {
            startActivity(
                Intent(
                    Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    Uri.parse("package:$packageName")
                )
            )
        }
        binding.buttonDndAccess.setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS))
        }

        if (Build.VERSION.SDK_INT >= 34) {
            binding.buttonFullScreenIntent.visibility = View.VISIBLE
            binding.buttonFullScreenIntent.setOnClickListener {
                val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
                intent.data = Uri.parse("package:$packageName")
                startActivity(intent)
            }
        } else {
            binding.buttonFullScreenIntent.visibility = View.GONE
        }

        binding.buttonPickSound.setOnClickListener { openRingtonePicker() }
        binding.buttonPreviewSound.setOnClickListener { previewSound() }
    }

    /** Shown only on Android 14+, where this permission can default to off for sideloaded apps. */
    private fun refreshFullScreenIntentStatus() {
        if (Build.VERSION.SDK_INT >= 34) {
            val allowed = NotificationManagerCompat.from(this).canUseFullScreenIntent()
            binding.textFullScreenStatus.visibility = View.VISIBLE
            binding.textFullScreenStatus.text = getString(
                if (allowed) R.string.status_fullscreen_allowed else R.string.status_fullscreen_blocked
            )
        } else {
            binding.textFullScreenStatus.visibility = View.GONE
        }
    }

    private fun setupSoundSettings() {
        updateCurrentSoundLabel()

        val percent = PrefsManager.getAlarmVolumePercent(this)
        binding.seekBarVolume.progress = percent
        binding.textVolumeLabel.text = getString(R.string.label_volume, percent)
        binding.seekBarVolume.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar, progress: Int, fromUser: Boolean) {
                binding.textVolumeLabel.text = getString(R.string.label_volume, progress)
                if (fromUser) {
                    PrefsManager.setAlarmVolumePercent(this@MainActivity, progress)
                }
            }

            override fun onStartTrackingTouch(seekBar: SeekBar) {}
            override fun onStopTrackingTouch(seekBar: SeekBar) {}
        })
    }

    private fun updateCurrentSoundLabel() {
        val savedUri = PrefsManager.getAlarmSoundUri(this)?.let { Uri.parse(it) }
        val uri = savedUri ?: RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM)
        val name = uri?.let { RingtoneManager.getRingtone(this, it)?.getTitle(this) }
            ?: getString(R.string.default_sound_name)
        binding.textCurrentSound.text = getString(R.string.text_current_sound, name)
    }

    private fun openRingtonePicker() {
        val currentUri = PrefsManager.getAlarmSoundUri(this)?.let { Uri.parse(it) }
            ?: RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM)
        val intent = Intent(RingtoneManager.ACTION_RINGTONE_PICKER).apply {
            putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM)
            putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
            putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)
            putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, currentUri)
        }
        ringtonePickerLauncher.launch(intent)
    }

    private fun previewSound() {
        cancelPreview()
        AlarmSoundPlayer.start(this)
        isPreviewPlaying = true
        val runnable = Runnable { cancelPreview() }
        previewRunnable = runnable
        previewHandler.postDelayed(runnable, 4000L)
    }

    /**
     * Only stops playback if OUR preview is what's currently playing. A real
     * incoming wake alarm (AlarmActivity) uses the same AlarmSoundPlayer, and
     * this must never silence that - e.g. if MainActivity happens to be open
     * and gets covered/stopped right as a real wake signal arrives.
     */
    private fun cancelPreview() {
        previewRunnable?.let { previewHandler.removeCallbacks(it) }
        previewRunnable = null
        if (isPreviewPlaying) {
            AlarmSoundPlayer.stop(this)
            isPreviewPlaying = false
        }
    }

    private fun onCreateCode() {
        val name = binding.editMyName.text.toString().trim()
        if (name.isEmpty()) {
            binding.editMyName.error = getString(R.string.error_name_required)
            return
        }
        PrefsManager.setMyName(this, name)
        binding.buttonCreateCode.isEnabled = false
        val deviceId = PrefsManager.getDeviceId(this)
        FirestoreRepo.createPair(deviceId, name) { code, error ->
            binding.buttonCreateCode.isEnabled = true
            if (code != null) {
                PrefsManager.addPairing(this, code, "A", "")
                restartWakeServiceListener()
                attachAllLiveListeners()
                rebuildConnectionsList()
            } else {
                Toast.makeText(this, error ?: getString(R.string.error_create_failed), Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun onJoinCode() {
        val name = binding.editMyName.text.toString().trim()
        val code = binding.editJoinCode.text.toString().trim()
        if (name.isEmpty()) {
            binding.editMyName.error = getString(R.string.error_name_required)
            return
        }
        if (code.length != 6) {
            binding.editJoinCode.error = getString(R.string.error_code_length)
            return
        }
        PrefsManager.setMyName(this, name)
        binding.buttonJoinCode.isEnabled = false
        val deviceId = PrefsManager.getDeviceId(this)
        FirestoreRepo.joinPair(code, deviceId, name) { partnerName, error ->
            binding.buttonJoinCode.isEnabled = true
            if (partnerName != null) {
                PrefsManager.addPairing(this, code, "B", partnerName)
                binding.editJoinCode.setText("")
                restartWakeServiceListener()
                attachAllLiveListeners()
                rebuildConnectionsList()
                Toast.makeText(this, getString(R.string.toast_partner_connected, partnerName), Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, error ?: getString(R.string.error_create_failed), Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun sendWakeTo(pairing: Pairing, statusView: TextView, button: Button) {
        button.isEnabled = false
        val message = draftMessages[pairing.code].orEmpty()
        FirestoreRepo.sendWake(pairing.code, pairing.role, message) { success, nonce ->
            button.isEnabled = true
            if (success) {
                PrefsManager.setLastSentNonce(this, pairing.code, nonce)
                statusView.text = getString(R.string.status_sent_waiting)
                Toast.makeText(this, getString(R.string.toast_wake_sent), Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, getString(R.string.toast_wake_failed), Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun soundLabelFor(soundId: String?): String = when (soundId) {
        "tone_1" -> getString(R.string.tone_1_name)
        "tone_2" -> getString(R.string.tone_2_name)
        "tone_3" -> getString(R.string.tone_3_name)
        "tone_4" -> getString(R.string.tone_4_name)
        else -> getString(R.string.tone_1_name)
    }

    private fun showSoundPickerDialog(pairing: Pairing) {
        val ids = FirestoreRepo.AVAILABLE_SOUND_IDS
        val labels = ids.map { soundLabelFor(it) }.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.dialog_title_pick_sound))
            .setItems(labels) { _, which ->
                val soundId = ids[which]
                soundIds[pairing.code] = soundId
                FirestoreRepo.setSoundId(pairing.code, soundId)
                rebuildConnectionsList()
            }
            .show()
    }

    private fun onUnpairOne(code: String) {
        PrefsManager.removePairing(this, code)
        ackNonces.remove(code)
        soundIds.remove(code)
        draftMessages.remove(code)
        uiListeners.remove(code)?.remove()
        restartWakeServiceListener()
        rebuildConnectionsList()
    }

    private fun restartWakeServiceListener() {
        startService(
            Intent(this, WakeForegroundService::class.java).apply {
                action = WakeForegroundService.ACTION_REFRESH_PAIRING
            }
        )
    }

    private fun attachAllLiveListeners() {
        detachAllLiveListeners()
        PrefsManager.getPairings(this).forEach { pairing ->
            uiListeners[pairing.code] = FirestoreRepo.listenPair(pairing.code) { snapshot ->
                handlePairSnapshot(pairing.code, snapshot)
            }
        }
    }

    private fun detachAllLiveListeners() {
        uiListeners.values.forEach { it.remove() }
        uiListeners.clear()
    }

    private fun handlePairSnapshot(code: String, snapshot: DocumentSnapshot?) {
        if (snapshot == null || !snapshot.exists()) return
        val pairing = PrefsManager.getPairings(this).find { it.code == code } ?: return

        @Suppress("UNCHECKED_CAST")
        val deviceA = snapshot.get("deviceA") as? Map<String, Any?>
        @Suppress("UNCHECKED_CAST")
        val deviceB = snapshot.get("deviceB") as? Map<String, Any?>
        val partner = if (pairing.role == "A") deviceB else deviceA
        val partnerName = partner?.get("name") as? String
        if (!partnerName.isNullOrEmpty() && partnerName != pairing.partnerName) {
            PrefsManager.updatePartnerName(this, code, partnerName)
        }

        @Suppress("UNCHECKED_CAST")
        val ack = snapshot.get("ack") as? Map<String, Any?>
        ackNonces[code] = (ack?.get("nonce") as? Long) ?: 0L

        (snapshot.get("soundId") as? String)?.let { soundIds[code] = it }

        rebuildConnectionsList()
    }

    private fun rebuildConnectionsList() {
        binding.connectionsContainer.removeAllViews()
        PrefsManager.getPairings(this).forEach { pairing ->
            val row = ItemConnectionBinding.inflate(layoutInflater, binding.connectionsContainer, false)

            if (pairing.partnerName.isNotEmpty()) {
                row.textConnectionName.text = getString(R.string.status_connected_with, pairing.partnerName)
                row.textConnectionCode.visibility = View.GONE

                row.editConnectionMessage.visibility = View.VISIBLE
                row.editConnectionMessage.setText(draftMessages[pairing.code].orEmpty())
                row.editConnectionMessage.addTextChangedListener(object : TextWatcher {
                    override fun afterTextChanged(s: Editable?) {
                        draftMessages[pairing.code] = s?.toString().orEmpty()
                    }
                    override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                    override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                })

                row.buttonConnectionWake.visibility = View.VISIBLE
                row.buttonConnectionWake.setOnClickListener {
                    sendWakeTo(pairing, row.textConnectionStatus, row.buttonConnectionWake)
                }

                val lastSent = PrefsManager.getLastSentNonce(this, pairing.code)
                val ackNonce = ackNonces[pairing.code] ?: 0L
                row.textConnectionStatus.text = when {
                    lastSent == 0L -> ""
                    ackNonce == lastSent -> getString(R.string.status_confirmed)
                    else -> getString(R.string.status_sent_waiting)
                }

                row.rowSoundControl.visibility = View.VISIBLE
                row.textConnectionSound.text = getString(
                    R.string.text_connection_sound,
                    soundLabelFor(soundIds[pairing.code])
                )
                row.buttonChangeSound.setOnClickListener { showSoundPickerDialog(pairing) }
            } else {
                row.textConnectionName.text = getString(R.string.status_connected_waiting)
                row.textConnectionCode.visibility = View.VISIBLE
                row.textConnectionCode.text = pairing.code
                row.editConnectionMessage.visibility = View.GONE
                row.buttonConnectionWake.visibility = View.GONE
                row.textConnectionStatus.text = getString(R.string.hint_waiting_partner)
                row.rowSoundControl.visibility = View.GONE
            }

            row.buttonConnectionUnpair.setOnClickListener { onUnpairOne(pairing.code) }
            binding.connectionsContainer.addView(row.root)
        }
    }
}
