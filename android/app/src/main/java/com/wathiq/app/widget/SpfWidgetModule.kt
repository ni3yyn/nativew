package com.wathiq.app.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SpfWidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "SpfWidgetModule"

    @ReactMethod
    fun pinWidget() {
        val context = reactApplicationContext
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val myProvider = ComponentName(context, SpfNativeWidgetProvider::class.java)
            if (appWidgetManager.isRequestPinAppWidgetSupported) {
                appWidgetManager.requestPinAppWidget(myProvider, null, null)
            }
        }
    }

    // 🌟 Instantly syncs app theme with homescreen widget
    @ReactMethod
    fun setAppTheme(themeId: String) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences("wathiq_widget_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("APP_THEME", themeId).apply()

        // Trigger immediate widget redraw
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val thisWidget = ComponentName(context, SpfNativeWidgetProvider::class.java)
        val allIds = appWidgetManager.getAppWidgetIds(thisWidget)
        val intent = Intent(context, SpfNativeWidgetProvider::class.java).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, allIds)
        }
        context.sendBroadcast(intent)
    }
}