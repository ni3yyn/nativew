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
import android.content.res.ColorStateList
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
        const val ACTION_STOP_TIMER = "com.wathiq.app.ACTION_STOP_TIMER"
        const val ACTION_TIMER_EXPIRED = "com.wathiq.app.ACTION_TIMER_EXPIRED"

        const val CHANNEL_LIVE_TIMER = "wathiq_live_timer_channel"
        const val CHANNEL_ALARM = "wathiq_spf_alarm_channel"

        const val NOTIFICATION_LIVE_ID = 1002
        const val NOTIFICATION_ALARM_ID = 1001

        const val PREFS_NAME = "wathiq_widget_prefs"

        const val STATE_IDLE = "IDLE"
        const val STATE_LOADING = "LOADING"
        const val STATE_RUNNING = "RUNNING"
        const val STATE_EXPIRED = "EXPIRED"
        const val STATE_NIGHT = "NIGHT"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        when (intent.action) {
            ACTION_START_TIMER -> handleUserTapStart(context)
            ACTION_STOP_TIMER -> handleStopTimer(context)
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
                cancelOngoingNotification(context)
                prefs.edit()
                    .putString("STATE", STATE_NIGHT)
                    .putFloat("LAST_UV", 0.0f)
                    .putLong("WALL_CLOCK_END_TIME", 0L)
                    .apply()
            } else {
                val durationMinutes = getDurationMinutes(liveUv)
                val durationMillis = durationMinutes * 60 * 1000L
                val wallClockEndTime = System.currentTimeMillis() + durationMillis

                prefs.edit()
                    .putString("STATE", STATE_RUNNING)
                    .putFloat("LAST_UV", liveUv)
                    .putLong("TOTAL_DURATION_MILLIS", durationMillis)
                    .putLong("WALL_CLOCK_END_TIME", wallClockEndTime)
                    .apply()

                scheduleAlarm(context, wallClockEndTime)
                showOngoingLiveTimerNotification(context, wallClockEndTime, liveUv)
            }

            refreshAllWidgets(context)
        }
    }

    private fun handleStopTimer(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        val intent = Intent(context, SpfNativeWidgetProvider::class.java).apply { action = ACTION_TIMER_EXPIRED }
        val pi = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        alarmManager?.cancel(pi)

        cancelOngoingNotification(context)

        prefs.edit()
            .putString("STATE", STATE_IDLE)
            .putLong("WALL_CLOCK_END_TIME", 0L)
            .apply()

        refreshAllWidgets(context)
    }

    @SuppressLint("NotificationPermission")
    private fun showOngoingLiveTimerNotification(context: Context, wallClockEndTime: Long, uv: Float) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

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
            .setContentTitle("☀️ مؤقت وثيق • حماية نشطة")
            .setContentText("تنتهي طبقة الحماية (UV ~$uv) بعد:")
            .setWhen(wallClockEndTime)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setColor(Color.parseColor("#3D9275"))
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setContentIntent(contentPendingIntent)
            .addAction(R.drawable.btn_bg, "↻ تجديد المؤقت", restartPi)
            .addAction(R.drawable.btn_bg, "✕ إلغاء", stopPi)
            .build()

        try {
            notificationManager.notify(NOTIFICATION_LIVE_ID, notification)
        } catch (e: SecurityException) {}
    }

    private fun cancelOngoingNotification(context: Context) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(NOTIFICATION_LIVE_ID)
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

    @SuppressLint("NotificationPermission")
    private fun showExpirationNotification(context: Context, uv: Float) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .build()

            val alarmChannel = NotificationChannel(
                CHANNEL_ALARM,
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
            context, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val restartIntent = Intent(context, SpfNativeWidgetProvider::class.java).apply { action = ACTION_START_TIMER }
        val restartPi = PendingIntent.getBroadcast(
            context, 103, restartIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val iconRes = try { R.drawable.notification_icon } catch (e: Exception) { R.mipmap.ic_launcher }

        val notification = NotificationCompat.Builder(context, CHANNEL_ALARM)
            .setSmallIcon(iconRes)
            .setContentTitle("☀️ انتهت مدة واقي الشمس!")
            .setContentText("تلاشت طبقة الحماية (مستوى الأشعة الآن UV ~$uv). يُرجى إعادة التطبيق لحماية بشرتك.")
            .setStyle(NotificationCompat.BigTextStyle().bigText("تلاشت طبقة الحماية تماماً (UV ~$uv). يُرجى إعادة وضع واقي الشمس فوراً."))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setSound(soundUri)
            .setVibrate(longArrayOf(0, 500, 250, 500))
            .setContentIntent(contentPendingIntent)
            .addAction(R.drawable.btn_bg, "↻ تجديد الآن", restartPi)
            .build()

        try {
            notificationManager.notify(NOTIFICATION_ALARM_ID, notification)
        } catch (e: SecurityException) {}
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

    @SuppressLint("MissingPermission")
    private fun getNativeDeviceCoordinates(context: Context): Pair<Double, Double> {
        val defaultAlgiers = Pair(36.7538, 3.0588)
        try {
            val lm = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return defaultAlgiers
            val providers = lm.getProviders(true)
            var bestLocation: Location? = null
            for (provider in providers) {
                val l = lm.getLastKnownLocation(provider) ?: continue
                if (bestLocation == null || l.accuracy < bestLocation.accuracy) bestLocation = l
            }
            if (bestLocation != null) return Pair(bestLocation.latitude, bestLocation.longitude)
        } catch (e: Exception) {}
        return defaultAlgiers
    }

    private fun fetchLiveUvFromApi(lat: Double, lon: Double): Float {
        val apiUrl = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&current=uv_index"
        try {
            val conn = (URL(apiUrl).openConnection() as HttpURLConnection).apply {
                connectTimeout = 3000
                readTimeout = 3000
                requestMethod = "GET"
            }
            if (conn.responseCode == 200) {
                val reader = BufferedReader(InputStreamReader(conn.inputStream))
                val response = reader.readText()
                reader.close()
                val uv = JSONObject(response).getJSONObject("current").getDouble("uv_index").toFloat()
                return Math.max(0.0f, Math.round(uv * 10f) / 10f)
            }
        } catch (e: Exception) {}
        return estimateSolarUv()
    }

    private fun refreshAllWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val thisWidget = ComponentName(context, SpfNativeWidgetProvider::class.java)
        val allIds = appWidgetManager.getAppWidgetIds(thisWidget)
        for (id in allIds) {
            updateAppWidget(context, appWidgetManager, id)
        }
    }

    // 🌟 HELPER: Safe progress bar tinting for RemoteViews
    private fun setProgressBarTint(views: RemoteViews, colorInt: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            views.setColorStateList(
                R.id.widget_progress_active,
                "setProgressTintList",
                ColorStateList.valueOf(colorInt)
            )
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_spf_timer)
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        val state = prefs.getString("STATE", STATE_IDLE) ?: STATE_IDLE
        val wallClockEndTime = prefs.getLong("WALL_CLOCK_END_TIME", 0L)
        val totalDuration = prefs.getLong("TOTAL_DURATION_MILLIS", 75 * 60 * 1000L)
        var uv = prefs.getFloat("LAST_UV", -1f)
        if (uv == -1f) uv = estimateSolarUv()

        val isNight = checkIsNightTime(uv)
        val colorHex = if (isNight) "#818CF8" else getUvColor(uv)
        val colorInt = Color.parseColor(colorHex)
        val now = System.currentTimeMillis()

        val clickIntent = Intent(context, SpfNativeWidgetProvider::class.java).apply { action = ACTION_START_TIMER }
        val pendingClick = PendingIntent.getBroadcast(
            context, 0, clickIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_action_btn, pendingClick)

        if (isNight) {
            views.setTextViewText(R.id.widget_uv_text, "UV 0.0 🌙")
            views.setTextColor(R.id.widget_uv_text, Color.parseColor("#818CF8"))
        } else {
            views.setTextViewText(R.id.widget_uv_text, "UV ~$uv ☀️")
            views.setTextColor(R.id.widget_uv_text, colorInt)
        }

        when {
            state == STATE_LOADING -> {
                views.setTextViewText(R.id.widget_minutes_text, "⏳")
                views.setViewVisibility(R.id.widget_separator, View.GONE)
                views.setViewVisibility(R.id.widget_seconds_text, View.GONE)
                views.setTextViewText(R.id.widget_status_text, "جاري تحديد الأشعة...")
                views.setTextColor(R.id.widget_status_text, Color.parseColor("#4A6B5F"))
                views.setTextViewText(R.id.widget_btn_text, "جاري القياس... ⏳")
            }

            state == STATE_RUNNING && wallClockEndTime > now -> {
                val remainingSeconds = Math.max(0L, (wallClockEndTime - now) / 1000L)
                val m = remainingSeconds / 60
                val s = remainingSeconds % 60

                views.setViewVisibility(R.id.widget_separator, View.VISIBLE)
                views.setViewVisibility(R.id.widget_seconds_text, View.VISIBLE)

                views.setTextViewText(R.id.widget_minutes_text, "$m")
                views.setTextColor(R.id.widget_minutes_text, Color.parseColor("#18352D"))

                views.setInt(R.id.widget_separator, "setBackgroundColor", colorInt)

                views.setTextViewText(R.id.widget_seconds_text, String.format(":%02d", s))
                views.setTextColor(R.id.widget_seconds_text, colorInt)

                views.setTextViewText(R.id.widget_status_text, "حماية نشطة")
                views.setTextColor(R.id.widget_status_text, Color.parseColor("#1C9A66"))
                views.setTextViewText(R.id.widget_btn_text, "إعادة المؤقت ↻")

                val progress = if (totalDuration > 0) ((wallClockEndTime - now).toFloat() / totalDuration * 100).toInt() else 100
                views.setProgressBar(R.id.widget_progress_active, 100, progress, false)
                setProgressBarTint(views, colorInt)
            }

            state == STATE_EXPIRED || (state == STATE_RUNNING && wallClockEndTime <= now) -> {
                views.setViewVisibility(R.id.widget_separator, View.VISIBLE)
                views.setViewVisibility(R.id.widget_seconds_text, View.VISIBLE)

                views.setTextViewText(R.id.widget_minutes_text, "00")
                views.setTextColor(R.id.widget_minutes_text, Color.parseColor("#D94A4F"))

                views.setInt(R.id.widget_separator, "setBackgroundColor", Color.parseColor("#D94A4F"))

                views.setTextViewText(R.id.widget_seconds_text, "00")
                views.setTextColor(R.id.widget_seconds_text, Color.parseColor("#D94A4F"))

                views.setTextViewText(R.id.widget_status_text, "انتهت الحماية")
                views.setTextColor(R.id.widget_status_text, Color.parseColor("#D94A4F"))
                views.setTextViewText(R.id.widget_btn_text, "تجديد الآن ↻")

                views.setProgressBar(R.id.widget_progress_active, 100, 0, false)
                setProgressBarTint(views, Color.parseColor("#D94A4F"))
            }

            isNight -> {
                views.setTextViewText(R.id.widget_minutes_text, "🌙")
                views.setTextColor(R.id.widget_minutes_text, Color.parseColor("#818CF8"))
                views.setViewVisibility(R.id.widget_separator, View.GONE)
                views.setViewVisibility(R.id.widget_seconds_text, View.VISIBLE)
                views.setTextViewText(R.id.widget_seconds_text, "راحة")
                views.setTextColor(R.id.widget_seconds_text, Color.parseColor("#818CF8"))
                views.setTextViewText(R.id.widget_status_text, "وقت راحة البشرة 🌙")
                views.setTextColor(R.id.widget_status_text, Color.parseColor("#818CF8"))
                views.setTextViewText(R.id.widget_btn_text, "أشعة آمنة 🌙")
                views.setProgressBar(R.id.widget_progress_active, 100, 100, false)
                setProgressBarTint(views, Color.parseColor("#818CF8"))
            }

            else -> {
                val duration = getDurationMinutes(uv)
                if (duration == 0) {
                    views.setTextViewText(R.id.widget_minutes_text, "😊")
                    views.setTextColor(R.id.widget_minutes_text, Color.parseColor("#1C9A66"))
                    views.setViewVisibility(R.id.widget_separator, View.GONE)
                    views.setViewVisibility(R.id.widget_seconds_text, View.VISIBLE)
                    views.setTextViewText(R.id.widget_seconds_text, "آمن")
                    views.setTextColor(R.id.widget_seconds_text, Color.parseColor("#1C9A66"))
                    views.setTextViewText(R.id.widget_status_text, "أشعة آمنة")
                    views.setTextViewText(R.id.widget_btn_text, "أشعة آمنة")
                    views.setProgressBar(R.id.widget_progress_active, 100, 100, false)
                    setProgressBarTint(views, Color.parseColor("#1C9A66"))
                } else {
                    views.setViewVisibility(R.id.widget_separator, View.VISIBLE)
                    views.setViewVisibility(R.id.widget_seconds_text, View.VISIBLE)

                    views.setTextViewText(R.id.widget_minutes_text, "$duration")
                    views.setTextColor(R.id.widget_minutes_text, Color.parseColor("#18352D"))

                    views.setInt(R.id.widget_separator, "setBackgroundColor", colorInt)

                    views.setTextViewText(R.id.widget_seconds_text, "دقيقة")
                    views.setTextColor(R.id.widget_seconds_text, colorInt)

                    views.setTextViewText(R.id.widget_status_text, "بانتظار البدء")
                    views.setTextViewText(R.id.widget_btn_text, "بدء الحماية")

                    views.setProgressBar(R.id.widget_progress_active, 100, 100, false)
                    setProgressBarTint(views, colorInt)
                }
            }
        }

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun checkIsNightTime(uv: Float): Boolean {
        val calendar = Calendar.getInstance()
        val hour = calendar.get(Calendar.HOUR_OF_DAY) + calendar.get(Calendar.MINUTE) / 60f
        return (hour >= 19.5 || hour < 6.5) || uv <= 0.2f
    }

    private fun estimateSolarUv(): Float {
        val calendar = Calendar.getInstance()
        val hour = calendar.get(Calendar.HOUR_OF_DAY) + calendar.get(Calendar.MINUTE) / 60f
        val month = calendar.get(Calendar.MONTH)

        if (hour < 6.5 || hour >= 18.5) return 0f

        val isSummer = month in 4..8
        val seasonMultiplier = if (isSummer) 1.0f else 0.65f
        val solarNoon = 12.5f
        val hoursFromNoon = Math.abs(hour - solarNoon)
        val solarFactor = Math.max(0.0, Math.cos((hoursFromNoon / 6f) * (Math.PI / 2.0))).toFloat()

        val maxEstimatedUv = 11.5f * seasonMultiplier
        val estimatedUv = (maxEstimatedUv * Math.pow(solarFactor.toDouble(), 1.4)).toFloat()

        return Math.max(0f, Math.round(estimatedUv * 10f) / 10f)
    }

    private fun getDurationMinutes(uv: Float): Int {
        if (uv >= 11) return 60
        if (uv >= 8) return 75
        if (uv >= 6) return 90
        if (uv >= 3) return 120
        return 0
    }

    private fun getUvColor(uv: Float): String {
        if (uv >= 11) return "#D94A4F"
        if (uv >= 8) return "#CC8A1A"
        if (uv >= 6) return "#BF8F20"
        if (uv >= 3) return "#3F7FB8"
        return "#1C9A66"
    }
}