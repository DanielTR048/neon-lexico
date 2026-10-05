package com.neonlexico.game

import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.platform.LocalDensity

@Composable
fun rememberGridCursor(key: String?, layout: Any): BringIntoViewRequester {
    val requester=remember { BringIntoViewRequester() }
    val keyboard=WindowInsets.ime.getBottom(LocalDensity.current)
    LaunchedEffect(key,layout,keyboard) {
        if(key!=null) { withFrameNanos { };requester.bringIntoView() }
    }
    return requester
}
