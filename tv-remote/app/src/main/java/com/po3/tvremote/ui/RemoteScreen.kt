@file:OptIn(ExperimentalMaterial3Api::class)

package com.po3.tvremote.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.automirrored.filled.VolumeOff
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Dialpad
import androidx.compose.material.icons.filled.FastForward
import androidx.compose.material.icons.filled.FastRewind
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.PowerSettingsNew
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SettingsInputHdmi
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.po3.tvremote.tv.ConnectionState
import com.po3.tvremote.tv.RemoteKey
import com.po3.tvremote.tv.TvApp

@Composable
fun RemoteScreen(
    tvName: String,
    connection: ConnectionState,
    apps: List<TvApp>,
    snackbarHostState: SnackbarHostState,
    onKey: (RemoteKey) -> Unit,
    onPower: () -> Unit,
    onLaunchApp: (TvApp) -> Unit,
    onReconnect: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    var showNumbers by rememberSaveable { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(tvName.ifBlank { "삼성 TV" }, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        ConnectionLabel(connection)
                    }
                },
                actions = {
                    IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Filled.Settings, contentDescription = "연결 설정")
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            ConnectionBanner(connection, onReconnect)

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                LabeledButton(
                    Icons.Filled.PowerSettingsNew, "전원", onPower,
                    containerColor = PowerRed, contentColor = Color.White,
                )
                LabeledButton(Icons.Filled.SettingsInputHdmi, "입력", { onKey(RemoteKey.SOURCE) })
                LabeledButton(Icons.Filled.Menu, "메뉴", { onKey(RemoteKey.MENU) })
                LabeledButton(
                    Icons.Filled.Dialpad, "숫자", { showNumbers = !showNumbers },
                    containerColor = if (showNumbers) {
                        MaterialTheme.colorScheme.primaryContainer
                    } else {
                        MaterialTheme.colorScheme.surfaceVariant
                    },
                )
            }

            AnimatedVisibility(visible = showNumbers) { NumberPad(onKey) }

            DirectionPad(onKey)

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                LabeledButton(Icons.AutoMirrored.Filled.ArrowBack, "뒤로", { onKey(RemoteKey.BACK) })
                LabeledButton(Icons.Filled.Home, "홈", { onKey(RemoteKey.HOME) })
            }

            VolumeAndChannel(onKey)

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                IconRemoteButton(Icons.Filled.FastRewind, "되감기", { onKey(RemoteKey.REWIND) }, size = 52.dp)
                IconRemoteButton(Icons.Filled.PlayArrow, "재생", { onKey(RemoteKey.PLAY) }, size = 52.dp)
                IconRemoteButton(Icons.Filled.Pause, "일시정지", { onKey(RemoteKey.PAUSE) }, size = 52.dp)
                IconRemoteButton(Icons.Filled.FastForward, "빨리감기", { onKey(RemoteKey.FAST_FORWARD) }, size = 52.dp)
            }

            if (apps.isNotEmpty()) AppShortcuts(apps, onLaunchApp)
        }
    }
}

@Composable
private fun ConnectionLabel(state: ConnectionState) {
    val (text, color) = when (state) {
        ConnectionState.Connected -> "연결됨" to ConnectedGreen
        ConnectionState.Connecting, ConnectionState.AwaitingApproval -> "연결 중…" to PendingAmber
        ConnectionState.Disconnected -> "연결 안 됨" to MaterialTheme.colorScheme.outline
        ConnectionState.Denied, ConnectionState.TimedOut, is ConnectionState.Failed -> "연결 실패" to PowerRed
    }
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(Modifier.size(8.dp).background(color, CircleShape))
        Text(text, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private data class Banner(
    val text: String,
    val detail: String? = null,
    val retry: Boolean = true,
    val progress: Boolean = false,
)

private fun bannerFor(state: ConnectionState): Banner? = when (state) {
    ConnectionState.Connected -> null
    ConnectionState.Connecting -> Banner("TV에 연결하는 중…", retry = false, progress = true)
    ConnectionState.AwaitingApproval -> Banner(
        "TV 화면에 연결 요청 팝업이 뜨면 TV 리모컨으로 ‘허용’을 눌러주세요.",
        retry = false,
        progress = true,
    )
    ConnectionState.Disconnected -> Banner("TV와 연결되어 있지 않아요.")
    ConnectionState.Denied -> Banner(
        "TV가 이 폰의 연결을 거부했어요.",
        "TV 설정 → 일반 → 외부 기기 관리 → 기기 연결 관리 → 기기 목록에서 ‘TV 리모컨’을 허용으로 바꾼 뒤 다시 연결해주세요.",
    )
    ConnectionState.TimedOut -> Banner(
        "TV에서 ‘허용’을 누르지 않아 시간이 지났어요.",
        "다시 연결을 누르고 TV 화면의 팝업에서 ‘허용’을 선택해주세요.",
    )
    is ConnectionState.Failed -> Banner(
        "TV에 연결할 수 없어요.",
        "TV가 켜져 있고 폰과 같은 Wi-Fi에 연결돼 있는지 확인해주세요. " +
            "TV가 꺼져 있다면 전원 버튼을 눌러보세요. (${state.detail})",
    )
}

@Composable
private fun ConnectionBanner(state: ConnectionState, onReconnect: () -> Unit) {
    val banner = bannerFor(state) ?: return
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                if (banner.progress) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                Text(banner.text, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
            }
            banner.detail?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
            if (banner.retry) {
                Button(onClick = onReconnect) { Text("다시 연결") }
            }
        }
    }
}

@Composable
private fun DirectionPad(onKey: (RemoteKey) -> Unit) {
    Box(
        modifier = Modifier
            .size(240.dp)
            .background(MaterialTheme.colorScheme.surfaceVariant, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        val arrows = listOf(
            Triple(Icons.Filled.KeyboardArrowUp, "위", RemoteKey.UP) to Alignment.TopCenter,
            Triple(Icons.Filled.KeyboardArrowDown, "아래", RemoteKey.DOWN) to Alignment.BottomCenter,
            Triple(Icons.AutoMirrored.Filled.KeyboardArrowLeft, "왼쪽", RemoteKey.LEFT) to Alignment.CenterStart,
            Triple(Icons.AutoMirrored.Filled.KeyboardArrowRight, "오른쪽", RemoteKey.RIGHT) to Alignment.CenterEnd,
        )
        for ((arrow, alignment) in arrows) {
            val (icon, label, key) = arrow
            IconRemoteButton(
                icon, label, { onKey(key) },
                modifier = Modifier.align(alignment),
                size = 76.dp,
                iconSize = 36.dp,
                repeat = true,
                containerColor = Color.Transparent,
            )
        }
        RemoteButton(
            label = "확인",
            onClick = { onKey(RemoteKey.ENTER) },
            modifier = Modifier.size(92.dp),
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
        ) {
            Text("OK", style = MaterialTheme.typography.titleLarge)
        }
    }
}

@Composable
private fun VolumeAndChannel(onKey: (RemoteKey) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Rocker(
            label = "음량",
            upIcon = Icons.Filled.Add, upLabel = "음량 올리기", onUp = { onKey(RemoteKey.VOLUME_UP) },
            downIcon = Icons.Filled.Remove, downLabel = "음량 내리기", onDown = { onKey(RemoteKey.VOLUME_DOWN) },
        )
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            LabeledButton(Icons.AutoMirrored.Filled.VolumeOff, "음소거", { onKey(RemoteKey.MUTE) })
            LabeledButton(Icons.AutoMirrored.Filled.List, "채널목록", { onKey(RemoteKey.CHANNEL_LIST) })
        }
        Rocker(
            label = "채널",
            upIcon = Icons.Filled.KeyboardArrowUp, upLabel = "채널 올리기", onUp = { onKey(RemoteKey.CHANNEL_UP) },
            downIcon = Icons.Filled.KeyboardArrowDown, downLabel = "채널 내리기", onDown = { onKey(RemoteKey.CHANNEL_DOWN) },
        )
    }
}

@Composable
private fun Rocker(
    label: String,
    upIcon: ImageVector,
    upLabel: String,
    onUp: () -> Unit,
    downIcon: ImageVector,
    downLabel: String,
    onDown: () -> Unit,
) {
    Column(
        modifier = Modifier
            .width(80.dp)
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(40.dp)),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        IconRemoteButton(
            upIcon, upLabel, onUp,
            size = 80.dp, iconSize = 32.dp, repeat = true, containerColor = Color.Transparent,
        )
        Text(label, style = MaterialTheme.typography.labelLarge)
        IconRemoteButton(
            downIcon, downLabel, onDown,
            size = 80.dp, iconSize = 32.dp, repeat = true, containerColor = Color.Transparent,
        )
    }
}

@Composable
private fun NumberPad(onKey: (RemoteKey) -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        for (row in listOf(listOf(1, 2, 3), listOf(4, 5, 6), listOf(7, 8, 9))) {
            Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                for (n in row) TextRemoteButton("$n", { onKey(RemoteKey.digit(n)) })
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
            TextRemoteButton("이전", { onKey(RemoteKey.PREVIOUS_CHANNEL) })
            TextRemoteButton("0", { onKey(RemoteKey.NUM_0) })
            TextRemoteButton("확인", { onKey(RemoteKey.ENTER) })
        }
    }
}

@Composable
private fun AppShortcuts(apps: List<TvApp>, onLaunch: (TvApp) -> Unit) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("앱 바로가기", style = MaterialTheme.typography.titleSmall)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(apps) { app ->
                AssistChip(onClick = { onLaunch(app) }, label = { Text(app.name) })
            }
        }
    }
}
