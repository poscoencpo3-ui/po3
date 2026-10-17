package com.po3.tvremote.tv

import java.net.Inet4Address
import java.net.InetAddress
import java.nio.ByteBuffer

object Subnet {
    private val ipv4 = Regex("""^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$""")

    fun isIpv4(text: String): Boolean = ipv4.matches(text)

    /**
     * 같은 대역에서 TV를 찾아볼 주소 목록(내 주소 제외).
     * 대역이 /24보다 넓으면 내 주소가 속한 /24만 훑는다.
     */
    fun hosts(address: Inet4Address, prefixLength: Int): List<String> {
        val prefix = prefixLength.coerceIn(24, 30)
        val ip = address.toInt()
        val mask = -1 shl (32 - prefix)
        val network = ip and mask
        val broadcast = network or mask.inv()
        return ((network + 1) until broadcast).filter { it != ip }.map(::format)
    }

    fun broadcast(address: Inet4Address, prefixLength: Int): InetAddress {
        val mask = if (prefixLength <= 0) 0 else -1 shl (32 - prefixLength.coerceAtMost(32))
        val value = address.toInt() or mask.inv()
        return InetAddress.getByAddress(ByteBuffer.allocate(4).putInt(value).array())
    }

    private fun Inet4Address.toInt(): Int = ByteBuffer.wrap(address).int

    private fun format(value: Int): String =
        "${value ushr 24 and 0xFF}.${value ushr 16 and 0xFF}.${value ushr 8 and 0xFF}.${value and 0xFF}"
}
