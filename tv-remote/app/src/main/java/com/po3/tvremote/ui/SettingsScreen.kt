@file:OptIn(ExperimentalMaterial3Api::class)

package com.po3.tvremote.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.po3.tvremote.ScanState
import com.po3.tvremote.TvSettings
import com.po3.tvremote.tv.TvInfo

@Composable
fun SettingsScreen(
    settings: TvSettings,
    scan: ScanState,
    canGoBack: Boolean,
    snackbarHostState: SnackbarHostState,
    onBack: () -> Unit,
    onScan: () -> Unit,
    onSelectTv: (TvInfo) -> Unit,
    onSaveManual: (ip: String, mac: String) -> Unit,
    onForgetPairing: () -> Unit,
) {
    var ip by rememberSaveable(settings.ip) { mutableStateOf(settings.ip) }
    var mac by rememberSaveable(settings.mac) { mutableStateOf(settings.mac) }

    // 처음 실행이면 바로 TV를 찾아본다.
    LaunchedEffect(Unit) {
        if (settings.ip.isBlank()) onScan()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("TV 연결 설정") },
                navigationIcon = {
                    if (canGoBack) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "뒤로")
                        }
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
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            SectionCard("TV 자동 찾기") {
                Text(
                    "폰과 TV가 같은 Wi-Fi에 연결돼 있어야 해요. TV를 켠 상태에서 찾아주세요.",
                    style = MaterialTheme.typography.bodyMedium,
                )
                val scanning = scan == ScanState.Scanning
                Button(onClick = onScan, enabled = !scanning) {
                    if (scanning) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp,
                            color = LocalContentColor.current,
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("찾는 중…")
                    } else {
                        Icon(Icons.Filled.Search, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("TV 찾기")
                    }
                }
                when (scan) {
                    ScanState.Idle, ScanState.Scanning -> Unit
                    ScanState.NoWifi -> Text(
                        "Wi-Fi에 연결돼 있지 않아요. Wi-Fi를 켜고 다시 시도해주세요.",
                        color = MaterialTheme.colorScheme.error,
                    )
                    is ScanState.Done -> if (scan.tvs.isEmpty()) {
                        Text(
                            "TV를 찾지 못했어요. TV가 켜져 있는지 확인해주세요.\n\n" +
                                "이 폰의 IP: ${scan.phoneIp}\n" +
                                "TV의 IP(설정 → 일반 → 네트워크 → 네트워크 상태 → IP 설정)가 " +
                                "${scan.phoneIp.substringBeforeLast('.')}.으로 시작해야 연결할 수 있어요. " +
                                "다르면 TV와 폰이 서로 다른 공유기(Wi-Fi)에 연결된 거예요. " +
                                "같다면 아래에 TV IP를 직접 입력해주세요.",
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    } else {
                        scan.tvs.forEach { tv ->
                            TvRow(tv, selected = tv.ip == settings.ip, onClick = { onSelectTv(tv) })
                        }
                    }
                }
            }

            SectionCard("직접 입력") {
                OutlinedTextField(
                    value = ip,
                    onValueChange = { ip = it.trim() },
                    label = { Text("TV IP 주소") },
                    placeholder = { Text("192.168.0.20") },
                    supportingText = { Text("TV 설정 → 일반 → 네트워크 → 네트워크 상태 → IP 설정") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = mac,
                    onValueChange = { mac = it },
                    label = { Text("TV MAC 주소 (선택)") },
                    placeholder = { Text("AA:BB:CC:DD:EE:FF") },
                    supportingText = {
                        Text(
                            "폰으로 TV를 켤 때 필요해요. TV 설정 → 지원 → 이 TV 정보에서 확인할 수 있어요. " +
                                "TV가 랜선으로 연결돼 있으면 유선 MAC을 넣어주세요.",
                        )
                    },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        capitalization = KeyboardCapitalization.Characters,
                        keyboardType = KeyboardType.Ascii,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                )
                Button(onClick = { onSaveManual(ip, mac) }, modifier = Modifier.fillMaxWidth()) {
                    Text("저장하고 연결")
                }
            }

            SectionCard("TV에서 한 번만 설정해주세요") {
                Step("1", "처음 연결하면 TV 화면에 연결 요청 팝업이 떠요. TV 리모컨으로 ‘허용’을 눌러주세요.")
                Step("2", "폰으로 TV를 켜려면: 설정 → 일반 → 네트워크 → 전문가 설정 → ‘모바일로 TV 켜기’를 켜주세요.")
                Step("3", "공유기 설정에서 TV의 IP를 고정해두면 IP가 바뀌어 연결이 끊기는 일이 없어요.")
            }

            if (settings.ip.isNotBlank()) {
                OutlinedButton(onClick = onForgetPairing, modifier = Modifier.fillMaxWidth()) {
                    Text("TV에 연결 다시 요청하기")
                }
            }
        }
    }
}

@Composable
private fun SectionCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            content()
        }
    }
}

@Composable
private fun TvRow(tv: TvInfo, selected: Boolean, onClick: () -> Unit) {
    OutlinedCard(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(Icons.Filled.Tv, contentDescription = null)
            Column(Modifier.weight(1f)) {
                Text(tv.displayName, style = MaterialTheme.typography.titleSmall)
                Text(
                    listOf(tv.model, tv.ip, if (tv.wired) "랜선 연결" else "Wi-Fi 연결")
                        .filter { it.isNotBlank() }
                        .joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (selected) {
                Icon(Icons.Filled.Check, contentDescription = "선택됨", tint = MaterialTheme.colorScheme.primary)
            }
        }
    }
}

@Composable
private fun Step(number: String, text: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(
            modifier = Modifier
                .size(24.dp)
                .background(MaterialTheme.colorScheme.primary, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(number, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onPrimary)
        }
        Text(text, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
    }
}
