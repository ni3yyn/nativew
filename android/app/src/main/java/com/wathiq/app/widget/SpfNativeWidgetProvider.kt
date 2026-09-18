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
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.wathiq.app.MainActivity
import com.wathiq.app.R
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.Calendar
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

class SpfNativeWidgetProvider : AppWidgetProvider() {

    companion object {
        const val TAG = "WathiqWidget"
        const val ACTION_START_TIMER = "com.wathiq.app.ACTION_START_TIMER"
        const val ACTION_STOP_TIMER = "com.wathiq.app.ACTION_STOP_TIMER"
        const val ACTION_TIMER_EXPIRED = "com.wathiq.app.ACTION_TIMER_EXPIRED"

        const val CHANNEL_LIVE_TIMER = "wathiq_live_timer_channel"
        const val CHANNEL_ALARM = "wathiq_spf_alarm_channel_v3"

        const val NOTIFICATION_LIVE_ID = 1002
        const val NOTIFICATION_ALARM_ID = 1001

        const val PREFS_NAME = "wathiq_widget_prefs"

        const val STATE_IDLE = "IDLE"
        const val STATE_LOADING = "LOADING"
        const val STATE_RUNNING = "RUNNING"
        const val STATE_EXPIRED = "EXPIRED"
        const val STATE_NIGHT = "NIGHT"
    }

    data class WidgetPalette(
        val bgDrawableRes: Int, // 🌟 NEW: The specific XML file for this theme
        val isGradient: Boolean,
        val bgHex: String,
        val textPrimaryHex: String,
        val textSecondaryHex: String,
        val buttonBgHex: String,
        val buttonTextHex: String
    )

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) updateAppWidget(context, appWidgetManager, id)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        val action = intent.action
        if (action == ACTION_START_TIMER || action == ACTION_STOP_TIMER || action == ACTION_TIMER_EXPIRED || action == Intent.ACTION_BOOT_COMPLETED || action == "android.intent.action.QUICKBOOT_POWERON") {
            val pendingResult = goAsync()

            thread {
                try {
                    when (action) {
                        ACTION_START_TIMER -> handleUserTapStart(context)
                        ACTION_STOP_TIMER -> handleStopTimer(context)
                        ACTION_TIMER_EXPIRED -> onTimerFinished(context)
                        Intent.ACTION_BOOT_COMPLETED, "android.intent.action.QUICKBOOT_POWERON" -> handlePhoneReboot(context)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error in widget background thread", e)
                } finally {
                    pendingResult?.finish()
                }
            }
        }
    }

    // ========================================================================
    // 🌟 1. TIMER START / RETRY (ALWAYS QUERIES FRESH GPS & SATELLITE API)
    // ========================================================================
    private fun handleUserTapStart(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        // 🌟 1. Dismiss old notifications immediately so they don't stick around
        cancelExpirationNotification(context)
        cancelOngoingNotification(context)

        // 2. Show loading state on widget
        prefs.edit().putString("STATE", STATE_LOADING).apply()
        refreshAllWidgets(context)

        val startTimestamp = SystemClock.elapsedRealtime()

        // 3. Fetch coordinates, city and UV
        val coords = getNativeDeviceCoordinates(context)
        val cityName = getCityNameFromCoordinates(context, coords.first, coords.second)
        val liveUv = fetchLiveUvFromApi(coords.first, coords.second)
        val isNight = checkIsNightTime(liveUv)
        val durationMins = getDurationMinutes(liveUv) // 🌟 Checked early

        // Ensure minimum 600ms loading duration for smooth UX
        val elapsed = SystemClock.elapsedRealtime() - startTimestamp
        if (elapsed < 600) {
            try { Thread.sleep(600 - elapsed) } catch (_: Exception) {}
        }

        if (isNight) {
            prefs.edit()
                .putString("STATE", STATE_NIGHT)
                .putFloat("LAST_UV", 0.0f)
                .putString("LAST_CITY", cityName)
                .putLong("WALL_CLOCK_END_TIME", 0L)
                .apply()
        } else if (durationMins <= 0) {
            // 🌟 FIX: UV is safe (< 3.0) — do NOT schedule a 0ms alarm!
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            val pi = PendingIntent.getBroadcast(context, 0, Intent(context, SpfNativeWidgetProvider::class.java).apply { action = ACTION_TIMER_EXPIRED }, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            alarmManager?.cancel(pi)

            prefs.edit()
                .putString("STATE", STATE_IDLE)
                .putFloat("LAST_UV", liveUv)
                .putString("LAST_CITY", cityName)
                .putLong("WALL_CLOCK_END_TIME", 0L)
                .apply()
        } else {
            // 🌟 UV is dangerous (>= 3.0) — start real countdown
            val durationMillis = durationMins * 60 * 1000L
            val wallClockEnd = System.currentTimeMillis() + durationMillis

            prefs.edit()
                .putString("STATE", STATE_RUNNING)
                .putFloat("LAST_UV", liveUv)
                .putString("LAST_CITY", cityName)
                .putLong("TOTAL_DURATION_MILLIS", durationMillis)
                .putLong("WALL_CLOCK_END_TIME", wallClockEnd)
                .apply()

            scheduleAlarm(context, wallClockEnd)
            showOngoingLiveTimerNotification(context, wallClockEnd, liveUv)
        }

        refreshAllWidgets(context)
    }

    private fun handleStopTimer(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        val pi = PendingIntent.getBroadcast(
            context, 0, Intent(context, SpfNativeWidgetProvider::class.java).apply { action = ACTION_TIMER_EXPIRED },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager?.cancel(pi)

        cancelOngoingNotification(context)

        prefs.edit().putString("STATE", STATE_IDLE).putLong("WALL_CLOCK_END_TIME", 0L).apply()
        refreshAllWidgets(context)
    }

    private fun onTimerFinished(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val uv = prefs.getFloat("LAST_UV", estimateSolarUv())

        cancelOngoingNotification(context)

        prefs.edit()
            .putString("STATE", STATE_EXPIRED)
            .putLong("WALL_CLOCK_END_TIME", 0L)
            .apply()

        showExpirationNotification(context, uv)
        refreshAllWidgets(context)
    }

    private fun handlePhoneReboot(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val state = prefs.getString("STATE", STATE_IDLE)
        val wallClockEndTime = prefs.getLong("WALL_CLOCK_END_TIME", 0L)
        val uv = prefs.getFloat("LAST_UV", estimateSolarUv())
        val now = System.currentTimeMillis()

        if (state == STATE_RUNNING && wallClockEndTime > now) {
            scheduleAlarm(context, wallClockEndTime)
            showOngoingLiveTimerNotification(context, wallClockEndTime, uv)
            refreshAllWidgets(context)
        } else if (state == STATE_RUNNING && wallClockEndTime <= now) {
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
    // 🌟 2. NOTIFICATIONS
    // ========================================================================
    @SuppressLint("NotificationPermission")
    private fun showOngoingLiveTimerNotification(context: Context, wallClockEndTime: Long, uv: Float) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val rlm = "\u200F"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val liveChannel = NotificationChannel(
                CHANNEL_LIVE_TIMER,
                "عداد الحماية المباشر",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "عرض العداد التنازلي الحي على شاشة القفل"
                setShowBadge(false)
                enableVibration(false)
                setSound(null, null)
            }
            notificationManager.createNotificationChannel(liveChannel)
        }

        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val contentPendingIntent = PendingIntent.getActivity(
            context, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val restartIntent = Intent(context, SpfNativeWidgetProvider::class.java).apply { action = ACTION_START_TIMER }
        val restartPi = PendingIntent.getBroadcast(
            context, 101, restartIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(context, SpfNativeWidgetProvider::class.java).apply { action = ACTION_STOP_TIMER }
        val stopPi = PendingIntent.getBroadcast(
            context, 102, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val iconRes = try { R.drawable.notification_icon } catch (e: Exception) { R.mipmap.ic_launcher }

        val notification = NotificationCompat.Builder(context, CHANNEL_LIVE_TIMER)
            .setSmallIcon(iconRes)
            .setContentTitle("${rlm}مؤقت وثيق")
            .setContentText("${rlm}طبقة واقي الشمس فعالة (UV ~$uv)")
            .setSubText("${rlm} أستغفر الله")
            .setWhen(wallClockEndTime)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setColor(Color.parseColor("#3D9275"))
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setContentIntent(contentPendingIntent)
            .addAction(R.drawable.ic_widget_refresh, "${rlm}↻ تجديد", restartPi)
            .addAction(R.drawable.ic_widget_refresh, "${rlm}✕ إلغاء", stopPi)
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("${rlm}طبقة واقي الشمس فعالة الآن لحماية بشرتك (مستوى الأشعة الحالي UV ~$uv).\nالوقت بالأعلى يوضح المدة المتبقية حتى التجديد.")
            )
            .build()

        try {
            notificationManager.notify(NOTIFICATION_LIVE_ID, notification)
        } catch (e: SecurityException) {}
    }

    private fun cancelOngoingNotification(context: Context) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(NOTIFICATION_LIVE_ID)
    }

    private fun cancelExpirationNotification(context: Context) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(NOTIFICATION_ALARM_ID)
    }

    @SuppressLint("NotificationPermission")
    private fun showExpirationNotification(context: Context, uv: Float) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val rlm = "\u200F"

        // 🌟 Load custom sound from res/raw/wathiq_sound.mp3 (falls back to default if file missing)
        val customSoundResId = context.resources.getIdentifier("wathiq_sound", "raw", context.packageName)
        val soundUri = if (customSoundResId != 0) {
            android.net.Uri.parse("android.resource://${context.packageName}/raw/wathiq_sound")
        } else {
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        }

        // 🌟 Bumping channel to v3 forces Android to register the new custom sound on update!
        val alarmChannelId = CHANNEL_ALARM

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .build()

            val alarmChannel = NotificationChannel(
                alarmChannelId,
                "تنبيهات انتهاء واقي الشمس",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "إشعار صوتي عند انتهاء الحماية"
                enableLights(true)
                lightColor = Color.RED
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 250, 500)
                setSound(soundUri, audioAttributes)
            }
            notificationManager.createNotificationChannel(alarmChannel)
        }

        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val contentPendingIntent = PendingIntent.getActivity(
            context, 301, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val restartIntent = Intent(context, SpfNativeWidgetProvider::class.java).apply { 
            action = ACTION_START_TIMER 
            flags = Intent.FLAG_RECEIVER_FOREGROUND
        }
        val restartPi = PendingIntent.getBroadcast(
            context, 103, restartIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val iconRes = try { R.drawable.notification_icon } catch (e: Exception) { R.mipmap.ic_launcher }

        val notification = NotificationCompat.Builder(context, alarmChannelId)
            .setSmallIcon(iconRes)
            .setContentTitle("${rlm}☀️ انتهت فعالية واقي الشمس!")
            .setContentText("${rlm}تلاشت طبقة الحماية تماماً (UV ~$uv). ضعي الواقي مجددا الآن.")
            .setStyle(NotificationCompat.BigTextStyle().bigText("${rlm}تلاشت طبقة الحماية تماماً (مستوى الأشعة الآن UV ~$uv). يُرجى إعادة وضع واقي الشمس فوراً لتجنب التصبغات وحروق الشمس."))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setSound(soundUri)
            .setVibrate(longArrayOf(0, 500, 250, 500))
            .setContentIntent(contentPendingIntent)
            .addAction(R.drawable.ic_widget_refresh, "${rlm}↻ تجديد الآن", restartPi)
            .build()

        try {
            notificationManager.notify(NOTIFICATION_ALARM_ID, notification)
        } catch (e: SecurityException) {}
    }

    private fun scheduleAlarm(context: Context, triggerAtMillis: Long) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val intent = Intent(context, SpfNativeWidgetProvider::class.java).apply { action = ACTION_TIMER_EXPIRED }
        val pendingIntent = PendingIntent.getBroadcast(
            context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
            }
        } catch (e: Exception) {
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        }
    }

    // ========================================================================
    // 🌟 3. DYNAMIC THEME RESOLVER (1-TO-1 APP SYNC)
    // ========================================================================
    private fun getPaletteForAppTheme(themeId: String): WidgetPalette {
        return when (themeId) {
            "original" -> WidgetPalette(
                bgDrawableRes = R.drawable.widget_bg_gradient_original,
                isGradient = true,
                bgHex = "#1A2D27",
                textPrimaryHex = "#F1F3F2",
                textSecondaryHex = "#A8B8B3",
                buttonBgHex = "#5A9C84",
                buttonTextHex = "#1A2D27"
            )
            "baby_pink" -> WidgetPalette(
                bgDrawableRes = R.drawable.widget_bg_gradient_pink,
                isGradient = true,
                bgHex = "#FFE6EE",
                textPrimaryHex = "#4a172b",
                textSecondaryHex = "#71344C",
                buttonBgHex = "#E65A8A",
                buttonTextHex = "#FFFFFF"
            )
            "clinical_blue" -> WidgetPalette(
                bgDrawableRes = R.drawable.widget_bg_gradient_blue,
                isGradient = true,
                bgHex = "#15202E",
                textPrimaryHex = "#F0F6FC",
                textSecondaryHex = "#94A3B8",
                buttonBgHex = "#6099C8",
                buttonTextHex = "#0B111A"
            )
            else -> WidgetPalette( // Light Theme
                bgDrawableRes = R.drawable.widget_bg_gradient_light,
                isGradient = true,
                bgHex = "#F5FAF5",
                textPrimaryHex = "#18352D",
                textSecondaryHex = "#4A6B5F",
                buttonBgHex = "#3D9275",
                buttonTextHex = "#F0F5F0"
            )
        }
    }

    // ========================================================================
    // 🌟 4. WIDGET UI RENDERING
    // ========================================================================
    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_spf_timer)
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        val state = prefs.getString("STATE", STATE_IDLE) ?: STATE_IDLE
        val appTheme = prefs.getString("APP_THEME", "light") ?: "light"
        val palette = getPaletteForAppTheme(appTheme)

        val end = prefs.getLong("WALL_CLOCK_END_TIME", 0L)
        val total = prefs.getLong("TOTAL_DURATION_MILLIS", 75 * 60 * 1000L)
        val city = prefs.getString("LAST_CITY", "وثيق") ?: "وثيق"
        var uv = prefs.getFloat("LAST_UV", -1f)
        if (uv == -1f) uv = estimateSolarUv()
        val isNight = checkIsNightTime(uv)
        val now = System.currentTimeMillis()

        // Foreground Priority Button Click
        val clickIntent = Intent(context, SpfNativeWidgetProvider::class.java).apply {
            action = ACTION_START_TIMER
            flags = Intent.FLAG_RECEIVER_FOREGROUND
        }
        val pendingClick = PendingIntent.getBroadcast(
            context, 201, clickIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_action_btn, pendingClick)

        // Click Body ➔ Open App
        val openApp = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root_layout, openApp)

        views.setTextViewText(R.id.widget_city_text, city)

        // Reset visibility defaults
        views.setViewVisibility(R.id.widget_chronometer, View.GONE)
        views.setViewVisibility(R.id.widget_static_hero_text, View.VISIBLE)
        views.setViewVisibility(R.id.widget_progress_bar, View.GONE)

        when {
            state == STATE_LOADING -> {
                applyPalette(views, palette, isAlert = false)
                views.setTextViewText(R.id.widget_uv_text, "UV --")
                views.setTextViewText(R.id.widget_static_hero_text, "...")
                views.setTextViewText(R.id.widget_status_text, "جار تحديد الأشعة")
                views.setTextViewText(R.id.widget_btn_text, "جار التحديد...")
            }

            state == STATE_RUNNING && end > now -> {
                applyPalette(views, palette, isAlert = false)
                views.setTextViewText(R.id.widget_uv_text, "UV $uv")
                views.setImageViewResource(R.id.widget_uv_icon, R.drawable.ic_widget_sun)

                views.setViewVisibility(R.id.widget_static_hero_text, View.GONE)
                views.setViewVisibility(R.id.widget_chronometer, View.VISIBLE)
                val elapsedBase = SystemClock.elapsedRealtime() + (end - now)
                views.setChronometer(R.id.widget_chronometer, elapsedBase, "%s", true)

                views.setTextViewText(R.id.widget_status_text, "صلّ على رسول اللّه")

                views.setViewVisibility(R.id.widget_progress_bar, View.VISIBLE)
                val p = if (total > 0) ((end - now).toFloat() / total * 100).toInt() else 100
                views.setProgressBar(R.id.widget_progress_bar, 100, p, false)

                views.setTextViewText(R.id.widget_btn_text, "إعادة المؤقت ↻")
            }

            state == STATE_EXPIRED || (state == STATE_RUNNING && end <= now) -> {
                val expiredPalette = WidgetPalette(
                    bgDrawableRes = 0,
                    isGradient = false,
                    bgHex = "#7F1D1D",
                    textPrimaryHex = "#FFFFFF",
                    textSecondaryHex = "#FECACA",
                    buttonBgHex = "#DC2626",
                    buttonTextHex = "#FFFFFF"
                )
                applyPalette(views, expiredPalette, isAlert = true)
                views.setTextViewText(R.id.widget_uv_text, "UV $uv")
                views.setImageViewResource(R.id.widget_uv_icon, R.drawable.ic_widget_sun)

                views.setTextViewText(R.id.widget_static_hero_text, "00:00")
                views.setTextViewText(R.id.widget_status_text, "انتهت الفعالية")
                views.setTextViewText(R.id.widget_btn_text, "تجديد الآن ↻")
            }

            isNight -> {
                val nightPalette = WidgetPalette(
                    bgDrawableRes = 0,
                    isGradient = false,
                    bgHex = "#1E1B4B",
                    textPrimaryHex = "#FFFFFF",
                    textSecondaryHex = "#A5B4FC",
                    buttonBgHex = "#4338CA",
                    buttonTextHex = "#FFFFFF"
                )
                applyPalette(views, nightPalette, isAlert = true)
                views.setTextViewText(R.id.widget_uv_text, "UV 0.0")
                views.setImageViewResource(R.id.widget_uv_icon, R.drawable.ic_widget_moon)

                views.setTextViewText(R.id.widget_static_hero_text, "راحة")
                views.setTextViewText(R.id.widget_status_text, "تصبحين على خير")
                views.setTextViewText(R.id.widget_btn_text, "صلّ على رسول اللّه 🌙")
            }

            else -> {
                applyPalette(views, palette, isAlert = false)
                views.setTextViewText(R.id.widget_uv_text, "UV $uv")
                views.setImageViewResource(R.id.widget_uv_icon, R.drawable.ic_widget_sun)

                val duration = getDurationMinutes(uv)
                if (duration == 0) {
                    views.setTextViewText(R.id.widget_static_hero_text, "آمن")
                    views.setTextViewText(R.id.widget_status_text, "أشعة آمنة")
                    views.setTextViewText(R.id.widget_btn_text, "صلّ على رسول اللّه 🌙")
                } else {
                    views.setTextViewText(R.id.widget_static_hero_text, "$duration د")
                    views.setTextViewText(R.id.widget_status_text, "بانتظار البدء")
                    views.setTextViewText(R.id.widget_btn_text, "بدء المؤقت")
                }
            }
        }
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun applyPalette(views: RemoteViews, palette: WidgetPalette, isAlert: Boolean) {
        if (palette.isGradient && !isAlert) {
            // 🌟 Load the specific gradient XML for this theme
            views.setImageViewResource(R.id.widget_bg_image, palette.bgDrawableRes)
            views.setInt(R.id.widget_bg_image, "setColorFilter", 0) // Clear tint
        } else {
            // Solid fallback for Alerts (Red/Indigo)
            views.setImageViewResource(R.id.widget_bg_image, R.drawable.widget_base_shape)
            views.setInt(R.id.widget_bg_image, "setColorFilter", Color.parseColor(palette.bgHex))
        }

        views.setTextColor(R.id.widget_chronometer, Color.parseColor(palette.textPrimaryHex))
        views.setTextColor(R.id.widget_static_hero_text, Color.parseColor(palette.textPrimaryHex))
        views.setTextColor(R.id.widget_uv_text, Color.parseColor(palette.textPrimaryHex))
        views.setTextColor(R.id.widget_city_text, Color.parseColor(palette.textPrimaryHex))
        views.setTextColor(R.id.widget_status_text, Color.parseColor(palette.textSecondaryHex))

        views.setInt(R.id.widget_uv_icon, "setColorFilter", Color.parseColor(palette.textPrimaryHex))

        views.setInt(R.id.widget_btn_bg_image, "setColorFilter", Color.parseColor(palette.buttonBgHex))
        views.setTextColor(R.id.widget_btn_text, Color.parseColor(palette.buttonTextHex))
    }

    // ========================================================================
    // 🌟 5. INDOORS & OUTDOORS HIGH-ACCURACY LOCATION ENGINE
    // ========================================================================
    @SuppressLint("MissingPermission")
    private fun getNativeDeviceCoordinates(context: Context): Pair<Double, Double> {
        val defaultAlgiers = Pair(36.7538, 3.0588)
        try {
            val lm = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return defaultAlgiers

            val isGpsEnabled = lm.isProviderEnabled(LocationManager.GPS_PROVIDER)
            val isNetworkEnabled = lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)

            if (!isGpsEnabled && !isNetworkEnabled) return defaultAlgiers

            // Check cached location first
            var bestLoc: Location? = null
            for (p in lm.getProviders(true)) {
                val l = lm.getLastKnownLocation(p) ?: continue
                if (bestLoc == null || l.accuracy < bestLoc.accuracy) bestLoc = l
            }

            // Fresh fix: Prioritize FUSED/NETWORK providers so it works instantly INDOORS
            if (bestLoc == null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                try {
                    val cancellationSignal = android.os.CancellationSignal()
                    var freshLoc: Location? = null
                    
                    val provider = when {
                        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && lm.isProviderEnabled(LocationManager.FUSED_PROVIDER) -> LocationManager.FUSED_PROVIDER
                        isNetworkEnabled -> LocationManager.NETWORK_PROVIDER
                        isGpsEnabled -> LocationManager.GPS_PROVIDER
                        else -> null
                    }

                    if (provider != null) {
                        val latch = CountDownLatch(1)
                        lm.getCurrentLocation(provider, cancellationSignal, ContextCompat.getMainExecutor(context)) { loc ->
                            freshLoc = loc
                            latch.countDown()
                        }
                        latch.await(3500, TimeUnit.MILLISECONDS)
                        if (freshLoc != null) bestLoc = freshLoc
                    }
                } catch (_: Exception) {}
            }

            if (bestLoc != null) return Pair(bestLoc.latitude, bestLoc.longitude)
        } catch (e: Exception) {}

        return defaultAlgiers
    }

    private fun getCityNameFromCoordinates(context: Context, lat: Double, lon: Double): String {
        try {
            val geocoder = Geocoder(context, Locale("ar"))
            @Suppress("DEPRECATION")
            val addresses = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                geocoder.getFromLocation(lat, lon, 1)
            } else {
                geocoder.getFromLocation(lat, lon, 1)
            }

            if (!addresses.isNullOrEmpty()) {
                val addr = addresses[0]
                val name = addr.locality ?: addr.subAdminArea ?: addr.adminArea ?: addr.featureName
                if (!name.isNullOrBlank()) return name
            }
        } catch (e: Exception) {}

        // Fallback: BigDataCloud
        try {
            val url = URL(String.format(Locale.US, "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=%.4f&longitude=%.4f&localityLanguage=ar", lat, lon))
            val conn = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 3000
                readTimeout = 3000
                setRequestProperty("User-Agent", "WathiqApp/2.0")
                requestMethod = "GET"
            }
            if (conn.responseCode == 200) {
                val res = BufferedReader(InputStreamReader(conn.inputStream)).readText()
                val json = JSONObject(res)
                val city = json.optString("city").ifEmpty { json.optString("locality") }.ifEmpty { json.optString("principalSubdivision") }
                if (city.isNotBlank()) return city
            }
        } catch (e: Exception) {}

        // Fallback: OpenStreetMap
        try {
            val url = URL(String.format(Locale.US, "https://nominatim.openstreetmap.org/reverse?lat=%.4f&lon=%.4f&format=json&accept-language=ar", lat, lon))
            val conn = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 3000
                readTimeout = 3000
                setRequestProperty("User-Agent", "WathiqWidget/1.0")
                requestMethod = "GET"
            }
            if (conn.responseCode == 200) {
                val res = BufferedReader(InputStreamReader(conn.inputStream)).readText()
                val json = JSONObject(res)
                val addr = json.optJSONObject("address")
                if (addr != null) {
                    val name = addr.optString("city").ifEmpty { addr.optString("town") }.ifEmpty { addr.optString("municipality") }.ifEmpty { addr.optString("state") }
                    if (name.isNotBlank()) return name
                }
            }
        } catch (e: Exception) {}

        return "موقعي"
    }

    // 🌟 DUAL PROTOCOL: Connects on 4G (Djezzy/Mobilis) with 5000ms timeout & clock-glitch bypass
    private fun fetchLiveUvFromApi(lat: Double, lon: Double): Float {
        val protocols = listOf("https", "http")

        for (proto in protocols) {
            val apiUrl = String.format(
                Locale.US,
                "$proto://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f&current=uv_index&timezone=auto",
                lat, lon
            )
            Log.d(TAG, "Querying Satellite UV API ($proto): $apiUrl")

            try {
                val conn = (URL(apiUrl).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 5000 // Extended for mobile 4G latency
                    readTimeout = 5000
                    setRequestProperty("User-Agent", "WathiqApp/2.0 (Android; com.wathiq.app)")
                    setRequestProperty("Accept", "application/json")
                    requestMethod = "GET"
                }

                val statusCode = conn.responseCode
                Log.d(TAG, "API Status ($proto): $statusCode")

                if (statusCode == 200) {
                    val res = BufferedReader(InputStreamReader(conn.inputStream)).readText()
                    val uv = JSONObject(res).getJSONObject("current").getDouble("uv_index").toFloat()
                    val finalUv = Math.max(0f, Math.round(uv * 10f) / 10f)
                    Log.d(TAG, "Successfully parsed satellite UV: $finalUv")
                    return finalUv
                }
            } catch (e: Exception) {
                Log.w(TAG, "API attempt with $proto failed: ${e.message}")
            }
        }

        val fallback = estimateSolarUv()
        Log.d(TAG, "Using fallback solar math UV: $fallback")
        return fallback
    }

    private fun checkIsNightTime(uv: Float): Boolean {
        val h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY) + Calendar.getInstance().get(Calendar.MINUTE) / 60f
        return (h >= 19.5 || h < 6.5) || uv <= 0.2f
    }

    // Realistic Mediterranean Seasonal Solar Math for Algeria
    private fun estimateSolarUv(): Float {
        val c = Calendar.getInstance()
        val h = c.get(Calendar.HOUR_OF_DAY) + c.get(Calendar.MINUTE) / 60f
        if (h < 6.5 || h >= 18.5) return 0f

        val month = c.get(Calendar.MONTH)
        val seasonMultiplier = when (month) {
            5, 6, 7 -> 1.0f 
            4, 8 -> 0.72f   
            3, 9 -> 0.52f   
            2, 10 -> 0.38f  
            else -> 0.25f   
        }

        val solarNoon = 12.5f
        val hoursFromNoon = Math.abs(h - solarNoon)
        val solarFactor = Math.max(0.0, Math.cos((hoursFromNoon / 6f) * (Math.PI / 2.0))).toFloat()

        val maxEstimatedUv = 10.5f * seasonMultiplier
        val estimatedUv = (maxEstimatedUv * Math.pow(solarFactor.toDouble(), 1.4)).toFloat()

        return Math.max(0f, Math.round(estimatedUv * 10f) / 10f)
    }

    private fun getDurationMinutes(uv: Float): Int = when { 
        uv >= 11 -> 60 
        uv >= 8 -> 75 
        uv >= 6 -> 90 
        uv >= 3 -> 120 
        else -> 0 
    }
}