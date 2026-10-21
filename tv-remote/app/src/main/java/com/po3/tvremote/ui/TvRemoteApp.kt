package com.po3.tvremote.ui

import androidx.activity.compose.BackHandler
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.po3.tvremote.RemoteViewModel
import kotlinx.coroutines.flow.collectLatest

@Composable
fun TvRemoteApp(viewModel: RemoteViewModel = viewModel()) {
    val settings by viewModel.settings.collectAsStateWithLifecycle()
    val connection by viewModel.connection.collectAsStateWithLifecycle()
    val apps by viewModel.apps.collectAsStateWithLifecycle()
    val scan by viewModel.scan.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    var showSettings by rememberSaveable { mutableStateOf(settings.ip.isBlank()) }

    LaunchedEffect(viewModel) {
        viewModel.messages.collectLatest { snackbarHostState.showSnackbar(it) }
    }

    // 앱이 화면에 보일 때만 TV와 연결을 유지한다.
    LifecycleStartEffect(viewModel) {
        viewModel.connect()
        onStopOrDispose { viewModel.disconnect() }
    }

    BackHandler(enabled = showSettings && settings.ip.isNotBlank()) { showSettings = false }

    if (showSettings) {
        SettingsScreen(
            settings = settings,
            scan = scan,
            canGoBack = settings.ip.isNotBlank(),
            snackbarHostState = snackbarHostState,
            onBack = { showSettings = false },
            onScan = viewModel::scan,
            onSelectTv = { tv ->
                viewModel.selectTv(tv)
                showSettings = false
            },
            onSaveManual = { ip, mac ->
                if (viewModel.saveManual(ip, mac)) showSettings = false
            },
            onForgetPairing = {
                viewModel.forgetPairing()
                showSettings = false
            },
        )
    } else {
        RemoteScreen(
            tvName = settings.tvName,
            tvIp = settings.ip,
            connection = connection,
            apps = apps,
            snackbarHostState = snackbarHostState,
            onKey = viewModel::press,
            onPower = viewModel::power,
            onLaunchApp = viewModel::launchApp,
            onReconnect = viewModel::connect,
            onOpenSettings = { showSettings = true },
        )
    }
}
