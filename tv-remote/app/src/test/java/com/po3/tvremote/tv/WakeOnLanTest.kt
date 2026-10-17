package com.po3.tvremote.tv

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WakeOnLanTest {
    private val expected = byteArrayOf(0xAA.toByte(), 0xBB.toByte(), 0xCC.toByte(), 0x01, 0x02, 0x0F)

    @Test
    fun parsesCommonFormats() {
        for (text in listOf("AA:BB:CC:01:02:0F", "aa-bb-cc-01-02-0f", "aabbcc01020f", " AA:BB:CC:01:02:0F ")) {
            assertArrayEquals(text, expected, WakeOnLan.parseMac(text))
        }
    }

    @Test
    fun rejectsInvalid() {
        for (text in listOf(null, "", "AA:BB:CC:01:02", "GG:BB:CC:01:02:0F", "AA:BB:CC:01:02:0F:11")) {
            assertNull(text, WakeOnLan.parseMac(text))
        }
    }

    @Test
    fun formatsUppercaseWithColons() {
        assertEquals("AA:BB:CC:01:02:0F", WakeOnLan.format(expected))
    }

    @Test
    fun magicPacketIsSixFfThenMacSixteenTimes() {
        val packet = WakeOnLan.magicPacket(expected)
        assertEquals(102, packet.size)
        for (i in 0 until 6) assertEquals(0xFF.toByte(), packet[i])
        for (i in 0 until 16) {
            assertArrayEquals(expected, packet.copyOfRange(6 + i * 6, 12 + i * 6))
        }
    }
}
