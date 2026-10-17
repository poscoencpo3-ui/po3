package com.po3.tvremote.tv

import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.util.Base64
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

class SamsungTvClientTest {
    private val server = MockWebServer()
    private val received = LinkedBlockingQueue<String>()
    private val tokens = LinkedBlockingQueue<String>()
    private val client = SamsungTvClient(appName = "TV 리모컨", onToken = { tokens.add(it) })

    @Before
    fun setUp() = server.start()

    @After
    fun tearDown() {
        client.disconnect()
        server.shutdown()
    }

    /** 연결되면 [firstEvents]를 차례로 보내는 가짜 TV. */
    private fun fakeTv(vararg firstEvents: String) {
        server.enqueue(MockResponse().withWebSocketUpgrade(object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                firstEvents.forEach { webSocket.send(it) }
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                received.add(text)
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                webSocket.close(1000, null)
            }
        }))
    }

    private fun connect(token: String? = null) =
        client.connect(server.hostName, token, port = server.port, secure = false)

    private fun awaitState(expected: ConnectionState) = runBlocking {
        withTimeout(5_000) { client.state.first { it == expected } }
    }

    private fun nextMessage(): JSONObject = JSONObject(received.poll(5, TimeUnit.SECONDS)!!)

    @Test
    fun firstConnectionSavesTokenAndSendsKeys() {
        fakeTv("""{"event":"ms.channel.connect","data":{"id":"x","token":"98765"}}""")
        connect()
        awaitState(ConnectionState.Connected)

        val request = server.takeRequest()
        assertEquals("/api/v2/channels/samsung.remote.control", request.requestUrl!!.encodedPath)
        val name = request.requestUrl!!.queryParameter("name")!!
        assertEquals("TV 리모컨", String(Base64.getDecoder().decode(name)))
        assertNull(request.requestUrl!!.queryParameter("token"))
        assertEquals("98765", tokens.poll(5, TimeUnit.SECONDS))

        assertEquals("ed.installedApp.get", nextMessage().getJSONObject("params").getString("event"))

        assertTrue(client.sendKey(RemoteKey.VOLUME_UP.code))
        val key = nextMessage()
        assertEquals("ms.remote.control", key.getString("method"))
        val params = key.getJSONObject("params")
        assertEquals("Click", params.getString("Cmd"))
        assertEquals("KEY_VOLUP", params.getString("DataOfCmd"))
        assertEquals("false", params.getString("Option"))
        assertEquals("SendRemoteKey", params.getString("TypeOfRemote"))
    }

    @Test
    fun savedTokenIsSentInUrl() {
        fakeTv("""{"event":"ms.channel.connect","data":{}}""")
        connect(token = "12345678")
        awaitState(ConnectionState.Connected)
        assertEquals("12345678", server.takeRequest().requestUrl!!.queryParameter("token"))
        assertNull(tokens.poll(200, TimeUnit.MILLISECONDS))
    }

    @Test
    fun deniedByTv() {
        fakeTv("""{"event":"ms.channel.unauthorized"}""")
        connect()
        awaitState(ConnectionState.Denied)
        Thread.sleep(300)
        assertEquals(ConnectionState.Denied, client.state.value)
        assertTrue(!client.sendKey(RemoteKey.HOME.code))
    }

    @Test
    fun installedAppsAreParsedAndLaunchable() {
        fakeTv(
            """{"event":"ms.channel.connect","data":{"token":"1"}}""",
            """{"event":"ed.installedApp.get","from":"host","data":{"data":[
                {"appId":"111299001912","app_type":2,"name":"YouTube"},
                {"appId":"3201907018807","app_type":4,"name":"Netflix"},
                {"appId":"","app_type":2,"name":"broken"}]}}""",
        )
        connect()
        val apps = runBlocking { withTimeout(5_000) { client.apps.first { it.isNotEmpty() } } }
        assertEquals(listOf("YouTube", "Netflix"), apps.map { it.name })

        nextMessage() // 앱 목록 요청
        assertTrue(client.launchApp(apps[1]))
        val launch = nextMessage().getJSONObject("params")
        assertEquals("ed.apps.launch", launch.getString("event"))
        assertEquals("3201907018807", launch.getJSONObject("data").getString("appId"))
        assertEquals("NATIVE_LAUNCH", launch.getJSONObject("data").getString("action_type"))
    }

    @Test
    fun unreachableTvFails() {
        val port = server.port
        server.shutdown()
        client.connect("127.0.0.1", null, port = port, secure = false)
        val state = runBlocking {
            withTimeout(10_000) { client.state.first { it is ConnectionState.Failed } }
        }
        assertTrue(state is ConnectionState.Failed)
    }

    @Test
    fun invalidHostFailsWithoutCrash() {
        client.connect("not a host", null)
        assertTrue(client.state.value is ConnectionState.Failed)
    }
}
