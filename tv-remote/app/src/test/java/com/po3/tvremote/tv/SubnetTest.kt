package com.po3.tvremote.tv

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.Inet4Address
import java.net.InetAddress

class SubnetTest {
    private fun ip(text: String) = InetAddress.getByName(text) as Inet4Address

    @Test
    fun hostsInSlash24ExcludeSelfNetworkAndBroadcast() {
        val hosts = Subnet.hosts(ip("192.168.0.37"), 24)
        assertEquals(253, hosts.size)
        assertEquals("192.168.0.1", hosts.first())
        assertEquals("192.168.0.254", hosts.last())
        assertFalse("192.168.0.37" in hosts)
    }

    @Test
    fun wideNetworksOnlyScanOwnSlash24() {
        val hosts = Subnet.hosts(ip("10.0.5.9"), 16)
        assertEquals(253, hosts.size)
        assertTrue(hosts.all { it.startsWith("10.0.5.") })
    }

    @Test
    fun broadcastAddress() {
        assertEquals(ip("192.168.0.255"), Subnet.broadcast(ip("192.168.0.37"), 24))
        assertEquals(ip("10.0.255.255"), Subnet.broadcast(ip("10.0.5.9"), 16))
    }

    @Test
    fun ipv4Validation() {
        for (ok in listOf("192.168.0.20", "10.0.0.1", "0.0.0.0", "255.255.255.255")) assertTrue(ok, Subnet.isIpv4(ok))
        for (bad in listOf("", "192.168.0", "192.168.0.256", "192.168.0.20 ", "a.b.c.d", "01.2.3.4")) {
            assertFalse(bad, Subnet.isIpv4(bad))
        }
    }
}
