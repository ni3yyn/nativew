package com.wathiq.app.widget

import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.location.Location
import android.location.LocationManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import com.wathiq.app.MainActivity
import com.wathiq.app.R
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.Calendar
import kotlin.concurrent.thread

class SpfNativeWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_START_TIMER = "com.wathiq.app.ACTION_START_TIMER"
        const val ACTION_TIMER_EXPIRED = "com.wathiq.app.ACTION_TIMER_EXPIRED"
        const val CHANNEL_ALARM = "wathiq_spf_alarm_channel"
        const val NOTIFICATION_ALARM_ID = 1001
        const val PREFS_NAME = "wathiq_widget_prefs"

        const val STATE_IDLE = "IDLE"
        const val STATE_LOADING = "LOADING"
        const val STATE_RUNNING = "RUNNING"
        const val STATE_EXPIRED = "EXPIRED"
        const val STATE_NIGHT = "NIGHT"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) updateAppWidget(context, appWidgetManager, id)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            ACTION_START_TIMER -> handleUserTapStart(context)
            ACTION_TIMER_EXPIRED -> onTimerFinished(context)
            Intent.ACTION_BOOT_COMPLETED, "android.intent.action.QUICKBOOT_POWERON" -> handlePhoneReboot(context)
        }
    }

    private fun handleUserTapStart(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString("STATE", STATE_LOADING).apply()
        refreshAllWidgets(context)

        thread {
            val coords = getNativeDeviceCoordinates(context)
            val liveUv = fetchLiveUvFromApi(coords.first, coords.second)
            val isNight = checkIsNightTime(liveUv)

            if (isNight) {
                prefs.edit().putString("STATE", STATE_NIGHT).putFloat("LAST_UV", 0.0f).putLong("WALL_CLOCK_END_TIME", 0L).apply()
            } else {
                val durationMins = getDurationMinutes(liveUv)
                val durationMillis = durationMins * 60 * 1000L
                val wallClockEnd = System.currentTimeMillis() + durationMillis

                prefs.edit()
                    .putString("STATE", STATE_RUNNING)
                    .putFloat("LAST_UV", liveUv)
                    .putLong("TOTAL_DURATION_MILLIS", durationMillis)
                    .putLong("WALL_CLOCK_END_TIME", wallClockEnd)
                    .apply()

                scheduleAlarm(context, wallClockEnd)
            }
            refreshAllWidgets(context)
        }
    }

    private fun onTimerFinished(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val uv = prefs.getFloat("LAST_UV", 0f)
        prefs.edit().putString("STATE", STATE_EXPIRED).putLong("WALL_CLOCK_END_TIME", 0L).apply()
        showExpirationNotification(context, uv)
        refreshAllWidgets(context)
    }

    private fun handlePhoneReboot(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val state = prefs.getString("STATE", STATE_IDLE)
        val end = prefs.getLong("WALL_CLOCK_END_TIME", 0L)
        val now = System.currentTimeMillis()

        if (state == STATE_RUNNING && end > now) {
            scheduleAlarm(context, end)
            refreshAllWidgets(context)
        } else if (state == STATE_RUNNING && end <= now) {
            onTimerFinished(context)
        }
    }

    private fun refreshAllWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val thisWidget = ComponentName(context, SpfNativeWidgetProvider::class.java)
        val allIds = appWidgetManager.getAppWidgetIds(thisWidget)
        for (id in allIds) updateAppWidget(context, appWidgetManager, id)
    }

    // ========================================================================
    // 🌟 THEME & UI UPDATER
    // ========================================================================
    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_spf_timer)
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        val state = prefs.getString("STATE", STATE_IDLE) ?: STATE_IDLE
        val end = prefs.getLong("WALL_CLOCK_END_TIME", 0L)
        val total = prefs.getLong("TOTAL_DURATION_MILLIS", 75 * 60 * 1000L)
        var uv = prefs.getFloat("LAST_UV", -1f)
        if (uv == -1f) uv = estimateSolarUv()
        val isNight = checkIsNightTime(uv)
        val now = System.currentTimeMillis()

        // 1. Setup Click Actions
        val clickIntent = Intent(context, SpfNativeWidgetProvider::class.java).apply { action = ACTION_START_TIMER }
        val pendingClick = PendingIntent.getBroadcast(context, 0, clickIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_action_btn, pendingClick)

        val openApp = PendingIntent.getActivity(context, 0, Intent(context, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_root_layout, openApp)

        // 2. Reset common visibility
        views.setViewVisibility(R.id.widget_chronometer, View.GONE)
        views.setViewVisibility(R.id.widget_static_hero_text, View.VISIBLE)
        views.setViewVisibility(R.id.widget_progress_bar, View.VISIBLE)

        // 3. Apply State Configurations
        when {
            state == STATE_LOADING -> {
                applyTheme(views, "#1E293B", "#FFFFFF", "#94A3B8") // Dark Slate
                views.setTextViewText(R.id.widget_uv_text, "UV --")
                views.setTextViewText(R.id.widget_static_hero_text, "⏳")
                views.setTextViewText(R.id.widget_status_text, "جاري القياس...")
                views.setProgressBar(R.id.widget_progress_bar, 100, 0, true)
            }

            state == STATE_RUNNING && end > now -> {
                applyTheme(views, "#064E3B", "#FFFFFF", "#A7F3D0") // Deep Emerald Green
                views.setTextViewText(R.id.widget_uv_text, "UV $uv")
                views.setImageViewResource(R.id.widget_uv_icon, R.drawable.ic_widget_sun)
                
                views.setViewVisibility(R.id.widget_static_hero_text, View.GONE)
                views.setViewVisibility(R.id.widget_chronometer, View.VISIBLE)
                val elapsedBase = SystemClock.elapsedRealtime() + (end - now)
                views.setChronometer(R.id.widget_chronometer, elapsedBase, "%s", true)
                
                views.setTextViewText(R.id.widget_status_text, "حماية نشطة")
                val p = if (total > 0) ((end - now).toFloat() / total * 100).toInt() else 100
                views.setProgressBar(R.id.widget_progress_bar, 100, p, false)
            }

            state == STATE_EXPIRED || (state == STATE_RUNNING && end <= now) -> {
                applyTheme(views, "#7F1D1D", "#FFFFFF", "#FECACA") // Deep Crimson Red
                views.setTextViewText(R.id.widget_uv_text, "UV $uv")
                views.setImageViewResource(R.id.widget_uv_icon, R.drawable.ic_widget_sun)
                
                views.setTextViewText(R.id.widget_static_hero_text, "00:00")
                views.setTextViewText(R.id.widget_status_text, "انتهت الحماية")
                views.setProgressBar(R.id.widget_progress_bar, 100, 0, false)
            }

            isNight -> {
                applyTheme(views, "#1E1B4B", "#FFFFFF", "#A5B4FC") // Deep Indigo
                views.setTextViewText(R.id.widget_uv_text, "UV 0.0")
                views.setImageViewResource(R.id.widget_uv_icon, R.drawable.ic_widget_moon)
                
                views.setTextViewText(R.id.widget_static_hero_text, "راحة")
                views.setTextViewText(R.id.widget_status_text, "تجدد خلايا البشرة")
                views.setViewVisibility(R.id.widget_progress_bar, View.GONE)
            }

            else -> {
                applyTheme(views, "#F1F5F9", "#0F172A", "#64748B") // Light Slate
                views.setTextViewText(R.id.widget_uv_text, "UV $uv")
                views.setImageViewResource(R.id.widget_uv_icon, R.drawable.ic_widget_sun)
                
                val duration = getDurationMinutes(uv)
                if (duration == 0) {
                    views.setTextViewText(R.id.widget_static_hero_text, "آمن")
                    views.setTextViewText(R.id.widget_status_text, "أشعة آمنة")
                    views.setViewVisibility(R.id.widget_progress_bar, View.GONE)
                } else {
                    views.setTextViewText(R.id.widget_static_hero_text, "$duration د")
                    views.setTextViewText(R.id.widget_status_text, "بانتظار البدء")
                    views.setProgressBar(R.id.widget_progress_bar, 100, 100, false)
                }
            }
        }
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun applyTheme(views: RemoteViews, bgHex: String, textMainHex: String, textSubHex: String) {
        // Change the background image tint
        views.setInt(R.id.widget_bg_image, "setColorFilter", Color.parseColor(bgHex))
        
        // Update Text Colors
        views.setTextColor(R.id.widget_chronometer, Color.parseColor(textMainHex))
        views.setTextColor(R.id.widget_static_hero_text, Color.parseColor(textMainHex))
        views.setTextColor(R.id.widget_uv_text, Color.parseColor(textMainHex))
        views.setTextColor(R.id.widget_status_text, Color.parseColor(textSubHex))
        
        // Update Icon Colors
        views.setInt(R.id.widget_uv_icon, "setColorFilter", Color.parseColor(textMainHex))
        views.setInt(R.id.widget_action_btn, "setColorFilter", Color.parseColor(textMainHex))
    }

    // ------------------------------------------------------------------------
    // Notifications & Logic 
    // ------------------------------------------------------------------------
    private fun scheduleAlarm(context: Context, triggerAtMillis: Long) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val intent = Intent(context, SpfNativeWidgetProvider::class.java).apply { action = ACTION_TIMER_EXPIRED }
        val pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
            else alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        } catch (e: Exception) { alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent) }
    }

    @SuppressLint("NotificationPermission")
    private fun showExpirationNotification(context: Context, uv: Float) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val attr = AudioAttributes.Builder().setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT).build()
            val ch = NotificationChannel(CHANNEL_ALARM, "انتهاء واقي الشمس", NotificationManager.IMPORTANCE_HIGH).apply { enableVibration(true); setSound(soundUri, attr) }
            nm.createNotificationChannel(ch)
        }
        val openApp = PendingIntent.getActivity(context, 0, Intent(context, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val restartPi = PendingIntent.getBroadcast(context, 103, Intent(context, SpfNativeWidgetProvider::class.java).apply { action = ACTION_START_TIMER }, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notif = NotificationCompat.Builder(context, CHANNEL_ALARM)
            .setSmallIcon(R.mipmap.ic_launcher).setContentTitle("☀️ انتهت مدة واقي الشمس!")
            .setContentText("تلاشت طبقة الحماية تماماً. يُرجى التجديد.")
            .setPriority(NotificationCompat.PRIORITY_HIGH).setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true).setSound(soundUri).setVibrate(longArrayOf(0, 500, 250, 500))
            .setContentIntent(openApp).addAction(0, "↻ تجديد الآن", restartPi).build()
        try { nm.notify(NOTIFICATION_ALARM_ID, notif) } catch (e: Exception) {}
    }

    @SuppressLint("MissingPermission")
    private fun getNativeDeviceCoordinates(context: Context): Pair<Double, Double> {
        try {
            val lm = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return Pair(36.75, 3.05)
            var bestLoc: Location? = null
            for (p in lm.getProviders(true)) {
                val l = lm.getLastKnownLocation(p) ?: continue
                if (bestLoc == null || l.accuracy < bestLoc.accuracy) bestLoc = l
            }
            if (bestLoc != null) return Pair(bestLoc.latitude, bestLoc.longitude)
        } catch (e: Exception) {}
        return Pair(36.7538, 3.0588)
    }

    private fun fetchLiveUvFromApi(lat: Double, lon: Double): Float {
        try {
            val conn = (URL("https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&current=uv_index").openConnection() as HttpURLConnection).apply { connectTimeout=3000; readTimeout=3000; requestMethod="GET" }
            if (conn.responseCode == 200) {
                val res = BufferedReader(InputStreamReader(conn.inputStream)).readText()
                return Math.max(0f, Math.round(JSONObject(res).getJSONObject("current").getDouble("uv_index").toFloat() * 10f) / 10f)
            }
        } catch (e: Exception) {}
        return estimateSolarUv()
    }

    private fun checkIsNightTime(uv: Float): Boolean {
        val h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY) + Calendar.getInstance().get(Calendar.MINUTE) / 60f
        return (h >= 19.5 || h < 6.5) || uv <= 0.2f
    }

    private fun estimateSolarUv(): Float {
        val c = Calendar.getInstance()
        val h = c.get(Calendar.HOUR_OF_DAY) + c.get(Calendar.MINUTE) / 60f
        if (h < 6.5 || h >= 18.5) return 0f
        val mult = if (c.get(Calendar.MONTH) in 4..8) 1.0f else 0.65f
        return Math.max(0f, Math.round((11.5f * mult * Math.pow(Math.max(0.0, Math.cos((Math.abs(h - 12.5f) / 6f) * (Math.PI / 2.0))), 1.4)).toFloat() * 10f) / 10f)
    }

    private fun getDurationMinutes(uv: Float): Int = when { uv >= 11 -> 60; uv >= 8 -> 75; uv >= 6 -> 90; uv >= 3 -> 120; else -> 0 }
}