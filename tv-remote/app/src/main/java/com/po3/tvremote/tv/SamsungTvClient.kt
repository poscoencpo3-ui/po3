package com.po3.tvremote.tv

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import okhttp3.ConnectionSpec
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.net.ConnectException
import java.net.NoRouteToHostException
import java.net.SocketTimeoutException
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.util.Base64
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLException
import javax.net.ssl.X509TrustManager

sealed interface ConnectionState {
    data object Disconnected : ConnectionState
    data object Connecting : ConnectionState

    /** 소켓은 열렸고 TV 화면의 '허용'을 기다리는 중. */
    data object AwaitingApproval : ConnectionState
    data object Connected : ConnectionState

    /** TV에서 '거부'를 눌렀거나 기기 목록에서 차단된 상태. */
    data object Denied : ConnectionState

    /** TV의 허용 팝업이 응답 없이 닫힌 상태. */
    data object TimedOut : ConnectionState
    data class Failed(val detail: String) : ConnectionState
}

data class TvApp(val id: String, val name: String, val type: Int) {
    val launchType: String get() = if (type == 4) "NATIVE_LAUNCH" else "DEEP_LINK"
}

/**
 * 삼성 타이젠 TV(2016년 이후)의 리모컨 WebSocket API 클라이언트.
 *
 * 처음 연결하면 TV 화면에 허용 팝업이 뜨고, 허용하면 TV가 토큰을 준다.
 * 다음부터 그 토큰을 넣어 연결하면 팝업 없이 바로 연결된다.
 */
class SamsungTvClient(
    private val appName: String,
    private val onToken: (String) -> Unit = {},
    private val http: OkHttpClient = localTvHttpClient(),
) {
    private val _state = MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)
    val state: StateFlow<ConnectionState> = _state.asStateFlow()

    private val _apps = MutableStateFlow<List<TvApp>>(emptyList())
    val apps: StateFlow<List<TvApp>> = _apps.asStateFlow()

    @Volatile private var socket: WebSocket? = null
    @Volatile private var activeListener: Listener? = null

    fun connect(host: String, token: String?, port: Int = 8002, secure: Boolean = true) {
        disconnect()
        val url = try {
            HttpUrl.Builder()
                .scheme(if (secure) "https" else "http")
                .host(host)
                .port(port)
                .addPathSegments("api/v2/channels/samsung.remote.control")
                .addQueryParameter("name", Base64.getEncoder().encodeToString(appName.toByteArray()))
                .apply { if (!token.isNullOrBlank()) addQueryParameter("token", token) }
                .build()
        } catch (e: IllegalArgumentException) {
            _state.value = ConnectionState.Failed("잘못된 주소: $host")
            return
        }
        val listener = Listener()
        activeListener = listener
        _state.value = ConnectionState.Connecting
        socket = http.newWebSocket(Request.Builder().url(url).build(), listener)
    }

    fun disconnect() {
        activeListener = null
        socket?.close(NORMAL_CLOSURE, null)
        socket = null
        _apps.value = emptyList()
        _state.value = ConnectionState.Disconnected
    }

    /** 연결돼 있으면 키를 보내고 true, 아니면 false. */
    fun sendKey(key: String, command: String = "Click"): Boolean {
        if (_state.value != ConnectionState.Connected) return false
        val params = JSONObject()
            .put("Cmd", command)
            .put("DataOfCmd", key)
            .put("Option", "false")
            .put("TypeOfRemote", "SendRemoteKey")
        return send(JSONObject().put("method", "ms.remote.control").put("params", params))
    }

    fun launchApp(app: TvApp): Boolean {
        if (_state.value != ConnectionState.Connected) return false
        val data = JSONObject()
            .put("action_type", app.launchType)
            .put("appId", app.id)
            .put("metaTag", "")
        val params = JSONObject().put("event", "ed.apps.launch").put("to", "host").put("data", data)
        return send(JSONObject().put("method", "ms.channel.emit").put("params", params))
    }

    private fun send(message: JSONObject): Boolean = socket?.send(message.toString()) ?: false

    private fun handleMessage(webSocket: WebSocket, text: String) {
        val message = runCatching { JSONObject(text) }.getOrNull() ?: return
        when (message.optString("event")) {
            "ms.channel.connect" -> {
                message.optJSONObject("data")?.optString("token")
                    ?.takeIf { it.isNotBlank() }
                    ?.let(onToken)
                _state.value = ConnectionState.Connected
                webSocket.send(INSTALLED_APPS_REQUEST)
            }
            "ms.channel.unauthorized" -> {
                _state.value = ConnectionState.Denied
                webSocket.close(NORMAL_CLOSURE, null)
            }
            "ms.channel.timeOut" -> {
                _state.value = ConnectionState.TimedOut
                webSocket.close(NORMAL_CLOSURE, null)
            }
            "ed.installedApp.get" -> _apps.value = parseInstalledApps(message)
        }
    }

    private fun isTerminal(state: ConnectionState) =
        state == ConnectionState.Denied || state == ConnectionState.TimedOut

    private inner class Listener : WebSocketListener() {
        override fun onOpen(webSocket: WebSocket, response: Response) {
            if (this !== activeListener) return
            _state.value = ConnectionState.AwaitingApproval
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            if (this !== activeListener) return
            handleMessage(webSocket, text)
        }

        override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
            webSocket.close(NORMAL_CLOSURE, null)
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            if (this !== activeListener) return
            socket = null
            _apps.value = emptyList()
            if (!isTerminal(_state.value)) _state.value = ConnectionState.Disconnected
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            if (this !== activeListener) return
            socket = null
            _apps.value = emptyList()
            if (!isTerminal(_state.value)) _state.value = ConnectionState.Failed(describe(t))
        }
    }

    companion object {
        private const val NORMAL_CLOSURE = 1000
        private const val INSTALLED_APPS_REQUEST =
            """{"method":"ms.channel.emit","params":{"event":"ed.installedApp.get","to":"host"}}"""

        private fun describe(t: Throwable): String = when (t) {
            is SocketTimeoutException -> "응답 시간 초과"
            is ConnectException, is NoRouteToHostException -> "TV에 접속할 수 없음"
            is SSLException -> "보안 연결 실패 (${t.message})"
            else -> t.message ?: t.javaClass.simpleName
        }
    }
}

internal fun parseInstalledApps(message: JSONObject): List<TvApp> {
    val list = message.optJSONObject("data")?.optJSONArray("data") ?: return emptyList()
    return (0 until list.length()).mapNotNull { i ->
        val app = list.optJSONObject(i) ?: return@mapNotNull null
        val id = app.optString("appId")
        val name = app.optString("name")
        if (id.isBlank() || name.isBlank()) null else TvApp(id, name, app.optInt("app_type", 2))
    }
}

/**
 * TV 접속 전용 HTTP 클라이언트.
 *
 * 삼성 TV는 자체 서명 인증서를 쓰기 때문에 일반적인 인증서 검증이 실패한다.
 * 이 클라이언트는 집 안 네트워크의 TV에만 쓰므로 검증을 생략한다.
 */
fun localTvHttpClient(): OkHttpClient {
    val trustAll = object : X509TrustManager {
        override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) = Unit
        override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) = Unit
        override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
    }
    val sslContext = SSLContext.getInstance("TLS").apply { init(null, arrayOf(trustAll), SecureRandom()) }
    return OkHttpClient.Builder()
        .sslSocketFactory(sslContext.socketFactory, trustAll)
        .hostnameVerifier { _, _ -> true }
        .connectionSpecs(listOf(ConnectionSpec.MODERN_TLS, ConnectionSpec.COMPATIBLE_TLS, ConnectionSpec.CLEARTEXT))
        .connectTimeout(4, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()
}
