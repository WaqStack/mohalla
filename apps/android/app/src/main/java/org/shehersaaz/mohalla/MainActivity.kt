package org.shehersaaz.mohalla

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge

/**
 * STAGE 5 FOUNDATION.
 *
 * The only activity in the project. It renders a single screen whose purpose is
 * to prove the build works and the layout mirrors. There is no navigation, no
 * network call, no authentication and no product screen.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            MohallaTheme {
                FoundationScreen()
            }
        }
    }
}
