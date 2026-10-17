package com.po3.tvremote.tv

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

class TvInfoTest {
    private val sample = """
        {"device":{"FrameTVSupport":"false","OS":"Tizen","PowerState":"on","TokenAuthSupport":"true",
        "ip":"192.168.0.20","modelName":"KU75UT8000FXKR","name":"[TV] Samsung 8 Series (75)",
        "networkType":"wireless","type":"Samsung SmartTV","wifiMac":"a4:30:7a:12:34:56"},
        "name":"[TV] Samsung 8 Series (75)","type":"Samsung SmartTV","version":"2.0.25"}
    """.trimIndent()

    @Test
    fun parsesSamsungTv() {
        val info = TvInfo.parse("192.168.0.20", sample)!!
        assertEquals("192.168.0.20", info.ip)
        assertEquals("Samsung 8 Series (75)", info.displayName)
        assertEquals("KU75UT8000FXKR", info.model)
        assertEquals("A4:30:7A:12:34:56", info.mac)
        assertFalse(info.wired)
    }

    @Test
    fun ignoresOtherDevicesAndGarbage() {
        assertNull(TvInfo.parse("1.2.3.4", """{"device":{"type":"Chromecast"}}"""))
        assertNull(TvInfo.parse("1.2.3.4", "<html>router</html>"))
        assertNull(TvInfo.parse("1.2.3.4", """{"name":"no device"}"""))
    }
}
