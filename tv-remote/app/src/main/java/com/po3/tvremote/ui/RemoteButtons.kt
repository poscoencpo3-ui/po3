package com.po3.tvremote.ui

import android.view.HapticFeedbackConstants
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.indication
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.PressInteraction
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * 누르는 즉시 반응하는 리모컨 버튼.
 * [repeat]이면 길게 누르고 있는 동안 계속 보낸다 (음량·방향키 등).
 */
@Composable
fun RemoteButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    repeat: Boolean = false,
    shape: Shape = CircleShape,
    containerColor: Color = MaterialTheme.colorScheme.surfaceVariant,
    contentColor: Color = MaterialTheme.colorScheme.onSurfaceVariant,
    content: @Composable () -> Unit,
) {
    val view = LocalView.current
    val scope = rememberCoroutineScope()
    val currentOnClick by rememberUpdatedState(onClick)
    val interactions = remember { MutableInteractionSource() }

    Surface(
        modifier = modifier
            .clip(shape)
            .buttonSemantics(label) { currentOnClick() }
            .indication(interactions, ripple())
            .pointerInput(repeat) {
                detectTapGestures(onPress = { offset ->
                    val press = PressInteraction.Press(offset)
                    interactions.emit(press)
                    view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                    currentOnClick()
                    val repeater = if (repeat) {
                        scope.launch {
                            delay(400)
                            while (isActive) {
                                currentOnClick()
                                delay(130)
                            }
                        }
                    } else {
                        null
                    }
                    val released = tryAwaitRelease()
                    repeater?.cancel()
                    interactions.emit(if (released) PressInteraction.Release(press) else PressInteraction.Cancel(press))
                })
            },
        shape = shape,
        color = containerColor,
        contentColor = contentColor,
    ) {
        Box(contentAlignment = Alignment.Center) { content() }
    }
}

private fun Modifier.buttonSemantics(label: String, action: () -> Unit) = semantics {
    role = Role.Button
    contentDescription = label
    onClick { action(); true }
}

@Composable
fun IconRemoteButton(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 60.dp,
    iconSize: Dp = 24.dp,
    repeat: Boolean = false,
    containerColor: Color = MaterialTheme.colorScheme.surfaceVariant,
    contentColor: Color = MaterialTheme.colorScheme.onSurfaceVariant,
) {
    RemoteButton(
        label = label,
        onClick = onClick,
        modifier = modifier.size(size),
        repeat = repeat,
        containerColor = containerColor,
        contentColor = contentColor,
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(iconSize))
    }
}

/** 아이콘 버튼 아래에 작은 이름표가 붙은 버튼. */
@Composable
fun LabeledButton(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    containerColor: Color = MaterialTheme.colorScheme.surfaceVariant,
    contentColor: Color = MaterialTheme.colorScheme.onSurfaceVariant,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        IconRemoteButton(icon, label, onClick, containerColor = containerColor, contentColor = contentColor)
        Text(label, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
fun TextRemoteButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 64.dp,
) {
    RemoteButton(label = text, onClick = onClick, modifier = modifier.size(size)) {
        Text(text, style = MaterialTheme.typography.titleMedium)
    }
}
