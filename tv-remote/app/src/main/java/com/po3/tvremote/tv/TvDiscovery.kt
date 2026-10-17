package com.po3.tvremote.tv

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** `http://<ip>:8001/api/v2/` 가 돌려주는 TV 정보. */
data class TvInfo(
    val ip: String,
    val name: String,
    val model: String,
    val mac: String?,
    val wired: Boolean,
) {
    /** "[TV] Samsung 8 Series (75)" → "Samsung 8 Series (75)" */
    val displayName: String get() = name.removePrefix("[TV]").trim().ifEmpty { "삼성 TV" }

    companion object {
        fun parse(ip: String, json: String): TvInfo? {
            val root = runCatching { JSONObject(json) }.getOrNull() ?: return null
            val device = root.optJSONObject("device") ?: return null
            val type = device.optString("type").ifEmpty { root.optString("type") }
            if (!type.contains("Samsung", ignoreCase = true)) return null
            return TvInfo(
                ip = ip,
                name = device.optString("name").ifEmpty { root.optString("name") },
                model = device.optString("modelName"),
                mac = WakeOnLan.parseMac(device.optString("wifiMac"))?.let(WakeOnLan::format),
                wired = device.optString("networkType") == "wired",
            )
        }
    }
}

class TvDiscovery(
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(700, TimeUnit.MILLISECONDS)
        .readTimeout(2, TimeUnit.SECONDS)
        .build(),
) {
    suspend fun fetchInfo(host: String, port: Int = 8001): TvInfo? = withContext(Dispatchers.IO) {
        val request = Request.Builder().url("http://$host:$port/api/v2/").build()
        runCatching {
            http.newCall(request).execute().use { response ->
                val body = response.body?.string()
                if (!response.isSuccessful || body == null) null else TvInfo.parse(host, body)
            }
        }.getOrNull()
    }

    /** 주어진 주소들에 동시에 물어보고 삼성 TV만 골라 돌려준다. */
    suspend fun scan(hosts: List<String>, parallelism: Int = 48): List<TvInfo> = coroutineScope {
        val gate = Semaphore(parallelism)
        hosts.map { host -> async { gate.withPermit { fetchInfo(host) } } }
            .awaitAll()
            .filterNotNull()
    }
}
