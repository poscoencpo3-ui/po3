package com.po3.tvremote.ui

import android.os.Build
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

val PowerRed = Color(0xFFE5484D)
val ConnectedGreen = Color(0xFF3DD68C)
val PendingAmber = Color(0xFFF5B83D)

private val FallbackColors = darkColorScheme(
    primary = Color(0xFF8AB4F8),
    onPrimary = Color(0xFF0B1E3A),
    background = Color(0xFF121316),
    surface = Color(0xFF121316),
    surfaceVariant = Color(0xFF2A2C31),
    onSurfaceVariant = Color(0xFFE2E3E8),
)

/** 리모컨은 어두운 화면이 보기 편해서 항상 다크 테마를 쓴다. */
@Composable
fun TvRemoteTheme(content: @Composable () -> Unit) {
    val colors = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        dynamicDarkColorScheme(LocalContext.current)
    } else {
        FallbackColors
    }
    MaterialTheme(colorScheme = colors, content = content)
}
