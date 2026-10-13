package com.wakeupcall.duo

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.ListenerRegistration
import com.wakeupcall.duo.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var pairListener: ListenerRegistration? = null

    private val requestNotificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.editMyName.setText(PrefsManager.getMyName(this))

        ensureNotificationPermission()
        startWakeService()
        setupListeners()
        refreshUi()
    }

    override fun onStart() {
        super.onStart()
        attachLiveStatusListener()
    }

    override fun onStop() {
        super.onStop()
        pairListener?.remove()
        pairListener = null
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
        binding.buttonWake.setOnClickListener { onSendWake() }
        binding.buttonUnpair.setOnClickListener { onUnpair() }

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
                PrefsManager.savePairing(this, code, "A", "")
                attachLiveStatusListener()
                refreshUi()
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
                PrefsManager.savePairing(this, code, "B", partnerName)
                restartWakeServiceListener()
                attachLiveStatusListener()
                refreshUi()
                Toast.makeText(this, getString(R.string.toast_partner_connected, partnerName), Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, error ?: getString(R.string.error_create_failed), Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun onSendWake() {
        val code = PrefsManager.getPairCode(this) ?: return
        val role = PrefsManager.getMyRole(this) ?: return
        binding.buttonWake.isEnabled = false
        FirestoreRepo.sendWake(code, role) { success, nonce ->
            binding.buttonWake.isEnabled = true
            if (success) {
                PrefsManager.setLastSentNonce(this, nonce)
                binding.textWakeStatus.text = getString(R.string.status_sent_waiting)
                Toast.makeText(this, getString(R.string.toast_wake_sent), Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, getString(R.string.toast_wake_failed), Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun onUnpair() {
        PrefsManager.clearPairing(this)
        pairListener?.remove()
        pairListener = null
        restartWakeServiceListener()
        refreshUi()
    }

    private fun restartWakeServiceListener() {
        startService(
            Intent(this, WakeForegroundService::class.java).apply {
                action = WakeForegroundService.ACTION_REFRESH_PAIRING
            }
        )
    }

    private fun attachLiveStatusListener() {
        val code = PrefsManager.getPairCode(this) ?: return
        pairListener?.remove()
        pairListener = FirestoreRepo.listenPair(code) { snapshot -> handlePairSnapshot(snapshot) }
    }

    private fun handlePairSnapshot(snapshot: DocumentSnapshot?) {
        if (snapshot == null || !snapshot.exists()) return
        val role = PrefsManager.getMyRole(this) ?: return

        @Suppress("UNCHECKED_CAST")
        val deviceA = snapshot.get("deviceA") as? Map<String, Any?>
        @Suppress("UNCHECKED_CAST")
        val deviceB = snapshot.get("deviceB") as? Map<String, Any?>
        val partner = if (role == "A") deviceB else deviceA
        val partnerName = partner?.get("name") as? String
        if (!partnerName.isNullOrEmpty() && partnerName != PrefsManager.getPartnerName(this)) {
            PrefsManager.updatePartnerName(this, partnerName)
        }

        @Suppress("UNCHECKED_CAST")
        val ack = snapshot.get("ack") as? Map<String, Any?>
        val ackNonce = (ack?.get("nonce") as? Long) ?: 0L
        val lastSent = PrefsManager.getLastSentNonce(this)
        if (lastSent > 0) {
            binding.textWakeStatus.text = if (ackNonce == lastSent) {
                getString(R.string.status_confirmed)
            } else {
                getString(R.string.status_sent_waiting)
            }
        }

        refreshUi()
    }

    private fun refreshUi() {
        val code = PrefsManager.getPairCode(this)
        val partnerName = PrefsManager.getPartnerName(this)

        if (code != null && partnerName.isNotEmpty()) {
            binding.groupSetup.visibility = View.GONE
            binding.groupConnected.visibility = View.VISIBLE
            binding.textConnectedWith.text = getString(R.string.status_connected_with, partnerName)
        } else {
            binding.groupConnected.visibility = View.GONE
            binding.groupSetup.visibility = View.VISIBLE
            if (code != null) {
                binding.textGeneratedCode.text = code
                binding.textGeneratedCode.visibility = View.VISIBLE
                binding.textGeneratedCodeHint.visibility = View.VISIBLE
            } else {
                binding.textGeneratedCode.visibility = View.GONE
                binding.textGeneratedCodeHint.visibility = View.GONE
            }
        }
    }
}
