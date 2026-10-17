package com.po3.tvremote.tv

import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress

/** 꺼진(대기 상태) TV를 깨우는 매직 패킷. */
object WakeOnLan {
    private val separators = Regex("[:\\-.\\s]")

    /** "AA:BB:CC:DD:EE:FF", "aa-bb-cc-dd-ee-ff", "AABBCCDDEEFF" 모두 허용. */
    fun parseMac(text: String?): ByteArray? {
        val hex = text?.replace(separators, "") ?: return null
        if (hex.length != 12 || !hex.all { it in '0'..'9' || it.lowercaseChar() in 'a'..'f' }) return null
        return ByteArray(6) { i -> hex.substring(i * 2, i * 2 + 2).toInt(16).toByte() }
    }

    fun format(mac: ByteArray): String = mac.joinToString(":") { "%02X".format(it.toInt() and 0xFF) }

    /** FF×6 뒤에 MAC 주소 16번 = 102바이트. */
    fun magicPacket(mac: ByteArray): ByteArray {
        require(mac.size == 6) { "MAC 주소는 6바이트여야 합니다" }
        return ByteArray(6) { 0xFF.toByte() } + ByteArray(16 * 6) { mac[it % 6] }
    }

    fun send(mac: ByteArray, targets: Collection<InetAddress>, ports: List<Int> = listOf(9, 7)) {
        val packet = magicPacket(mac)
        DatagramSocket().use { socket ->
            socket.broadcast = true
            for (target in targets) {
                for (port in ports) {
                    runCatching { socket.send(DatagramPacket(packet, packet.size, target, port)) }
                }
            }
        }
    }
}
