package com.po3.tvremote

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import java.net.Inet4Address

data class LocalIpv4(val address: Inet4Address, val prefixLength: Int)

object LocalNetwork {
    /** 폰이 연결된 Wi-Fi(또는 유선)의 IPv4 주소. 모바일 데이터만 켜져 있으면 null. */
    fun wifiIpv4(context: Context): LocalIpv4? {
        val cm = context.getSystemService(ConnectivityManager::class.java) ?: return null
        @Suppress("DEPRECATION")
        val networks = (listOfNotNull(cm.activeNetwork) + cm.allNetworks).distinct()
        for (network in networks) {
            val caps = cm.getNetworkCapabilities(network) ?: continue
            if (!caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) &&
                !caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
            ) continue
            val link = cm.getLinkProperties(network) ?: continue
            val address = link.linkAddresses.firstOrNull { it.address is Inet4Address } ?: continue
            return LocalIpv4(address.address as Inet4Address, address.prefixLength)
        }
        return null
    }
}
