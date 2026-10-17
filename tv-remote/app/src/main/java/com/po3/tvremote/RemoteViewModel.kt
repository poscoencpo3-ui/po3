package com.po3.tvremote

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.po3.tvremote.tv.ConnectionState
import com.po3.tvremote.tv.RemoteKey
import com.po3.tvremote.tv.SamsungTvClient
import com.po3.tvremote.tv.Subnet
import com.po3.tvremote.tv.TvApp
import com.po3.tvremote.tv.TvDiscovery
import com.po3.tvremote.tv.TvInfo
import com.po3.tvremote.tv.WakeOnLan
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.InetAddress

sealed interface ScanState {
    data object Idle : ScanState
    data object Scanning : ScanState
    data object NoWifi : ScanState
    data class Done(val tvs: List<TvInfo>) : ScanState
}

class RemoteViewModel(application: Application) : AndroidViewModel(application) {
    private val store = SettingsStore(application)
    private val discovery = TvDiscovery()

    private val _settings = MutableStateFlow(store.load())
    val settings: StateFlow<TvSettings> = _settings.asStateFlow()

    private val client = SamsungTvClient(appName = TV_DEVICE_NAME, onToken = ::saveToken)
    val connection: StateFlow<ConnectionState> = client.state
    val apps: StateFlow<List<TvApp>> = client.apps

    private val _scan = MutableStateFlow<ScanState>(ScanState.Idle)
    val scan: StateFlow<ScanState> = _scan.asStateFlow()

    private val _messages = MutableSharedFlow<String>(
        extraBufferCapacity = 1,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    val messages: SharedFlow<String> = _messages.asSharedFlow()

    private var wakeJob: Job? = null
    private var scanJob: Job? = null

    private val isBusy: Boolean
        get() = when (client.state.value) {
            ConnectionState.Connected, ConnectionState.Connecting, ConnectionState.AwaitingApproval -> true
            else -> false
        }

    fun connect() {
        val s = _settings.value
        if (s.ip.isBlank() || isBusy) return
        client.connect(s.ip, s.token)
    }

    fun disconnect() {
        wakeJob?.cancel()
        client.disconnect()
    }

    fun press(key: RemoteKey) {
        if (client.sendKey(key.code)) return
        remindNotConnected()
    }

    fun launchApp(app: TvApp) {
        if (client.launchApp(app)) {
            message("${app.name} 실행")
        } else {
            remindNotConnected()
        }
    }

    /** 켜져 있으면 끄고, 연결이 안 되면 Wake-on-LAN으로 켠다. */
    fun power() {
        if (client.sendKey(RemoteKey.POWER.code)) return
        val s = _settings.value
        val mac = WakeOnLan.parseMac(s.mac)
        if (mac == null) {
            message("TV를 켜려면 설정에서 MAC 주소를 입력해주세요")
            connect()
            return
        }
        if (wakeJob?.isActive == true) return
        wakeJob = viewModelScope.launch {
            message("TV를 켜는 중이에요…")
            val targets = withContext(Dispatchers.IO) { wakeTargets(s.ip) }
            repeat(WAKE_ATTEMPTS) {
                withContext(Dispatchers.IO) { runCatching { WakeOnLan.send(mac, targets) } }
                connect()
                delay(2_000)
                if (client.state.value == ConnectionState.Connected) return@launch
            }
            message("TV가 응답하지 않아요. TV의 ‘모바일로 TV 켜기’ 설정을 확인해주세요")
        }
    }

    fun scan() {
        if (scanJob?.isActive == true) return
        val network = LocalNetwork.wifiIpv4(getApplication())
        if (network == null) {
            _scan.value = ScanState.NoWifi
            return
        }
        scanJob = viewModelScope.launch {
            _scan.value = ScanState.Scanning
            val found = discovery.scan(Subnet.hosts(network.address, network.prefixLength))
            _scan.value = ScanState.Done(found)
        }
    }

    fun selectTv(tv: TvInfo) {
        val current = _settings.value
        applySettings(current.copy(ip = tv.ip, tvName = tv.displayName, mac = tv.mac ?: current.mac))
    }

    /** 직접 입력한 값을 저장한다. 형식이 틀리면 false. */
    fun saveManual(ipInput: String, macInput: String): Boolean {
        val ip = ipInput.trim()
        if (!Subnet.isIpv4(ip)) {
            message("IP 주소를 확인해주세요 (예: 192.168.0.20)")
            return false
        }
        val mac = WakeOnLan.parseMac(macInput)
        if (macInput.isNotBlank() && mac == null) {
            message("MAC 주소 형식이 올바르지 않아요 (예: AA:BB:CC:DD:EE:FF)")
            return false
        }
        val current = _settings.value
        applySettings(
            current.copy(
                ip = ip,
                mac = mac?.let(WakeOnLan::format).orEmpty(),
                tvName = if (ip == current.ip) current.tvName else "",
            ),
        )
        // TV 이름과 MAC 주소를 TV에서 직접 받아와 채운다.
        viewModelScope.launch {
            val info = discovery.fetchInfo(ip) ?: return@launch
            _settings.update { s ->
                if (s.ip != ip) s else s.copy(tvName = info.displayName, mac = s.mac.ifBlank { info.mac.orEmpty() })
            }
            store.save(_settings.value)
        }
        return true
    }

    fun forgetPairing() {
        applySettings(_settings.value.copy(token = null))
        message("TV에 연결을 다시 요청했어요. TV 화면에서 ‘허용’을 눌러주세요")
    }

    override fun onCleared() {
        client.disconnect()
    }

    private fun applySettings(updated: TvSettings) {
        _settings.value = updated
        store.save(updated)
        wakeJob?.cancel()
        client.connect(updated.ip, updated.token)
    }

    private fun saveToken(token: String) {
        _settings.update { it.copy(token = token) }
        store.save(_settings.value)
    }

    private fun remindNotConnected() {
        when (client.state.value) {
            ConnectionState.Connecting, ConnectionState.AwaitingApproval -> message("TV와 연결하는 중이에요")
            else -> {
                message("TV에 다시 연결하는 중이에요")
                connect()
            }
        }
    }

    private fun wakeTargets(tvIp: String): List<InetAddress> = buildList {
        LocalNetwork.wifiIpv4(getApplication())?.let { add(Subnet.broadcast(it.address, it.prefixLength)) }
        add(InetAddress.getByName("255.255.255.255"))
        if (Subnet.isIpv4(tvIp)) add(InetAddress.getByName(tvIp))
    }

    private fun message(text: String) {
        _messages.tryEmit(text)
    }

    private companion object {
        /** TV의 '기기 연결 관리' 목록에 표시되는 이름. */
        const val TV_DEVICE_NAME = "TV 리모컨"
        const val WAKE_ATTEMPTS = 8
    }
}
