package com.wathiq.app.widget

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
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import com.wathiq.app.MainActivity
import com.wathiq.app.R
import java.util.Calendar

class SpfNativeWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_START_TIMER = "com.wathiq.app.ACTION_START_TIMER"
        const val ACTION_TIMER_EXPIRED = "com.wathiq.app.ACTION_TIMER_EXPIRED"
        const val CHANNEL_ID = "wathiq_spf_timer_channel"
        const val NOTIFICATION_ID = 1001
        const val PREFS_NAME = "wathiq_widget_prefs"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        when (intent.action) {
            ACTION_START_TIMER -> {
                startTimer(context)
            }
            ACTION_TIMER_EXPIRED -> {
                onTimerFinished(context)
            }
        }
    }

    // 🌟 1. START TIMER & SCHEDULE EXACT SYSTEM ALARM
    private fun startTimer(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val uv = estimateSolarUv()
        val durationMinutes = getDurationMinutes(uv)

        if (durationMinutes > 0) {
            val durationMillis = durationMinutes * 60 * 1000L
            val elapsedEndTime = SystemClock.elapsedRealtime() + durationMillis
            val triggerAtWallClock = System.currentTimeMillis() + durationMillis

            // Save state
            prefs.edit()
                .putLong("END_TIME_MILLIS", elapsedEndTime)
                .putFloat("LAST_UV", uv)
                .putString("STATE", "RUNNING")
                .apply()

            // Schedule Exact Alarm for Notification & Widget update
            scheduleAlarm(context, triggerAtWallClock)

            // Refresh Widget UI immediately
            refreshAllWidgets(context)
        }
    }

    // 🌟 2. TIMER FINISHED: PLAY SOUND, VIBRATE, NOTIFY & TURN WIDGET RED
    private fun onTimerFinished(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val uv = prefs.getFloat("LAST_UV", estimateSolarUv())

        // Update State to Expired
        prefs.edit()
            .putString("STATE", "EXPIRED")
            .putLong("END_TIME_MILLIS", 0L)
            .apply()

        // 1. Show Ringing Notification
        showExpirationNotification(context, uv)

        // 2. Refresh Widget to Red Expired UI
        refreshAllWidgets(context)
    }

    private fun scheduleAlarm(context: Context, triggerAtMillis: Long) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val intent = Intent(context, SpfNativeWidgetProvider::class.java).apply {
            action = ACTION_TIMER_EXPIRED
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAtMillis,
                    pendingIntent
                )
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    triggerAtMillis,
                    pendingIntent
                )
            }
        } catch (e: Exception) {
            // Fallback for non-exact alarm if special permission is restricted
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        }
    }

    private fun showExpirationNotification(context: Context, uv: Float) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        // Create Channel for Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .build()

            val channel = NotificationChannel(
                CHANNEL_ID,
                "تنبيهات تجديد واقي الشمس",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "إشعار صوتي عند انتهاء مدة حماية واقي الشمس"
                enableLights(true)
                lightColor = Color.RED
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 250, 500)
                setSound(soundUri, audioAttributes)
            }
            notificationManager.createNotificationChannel(channel)
        }

        // Tap notification to open App
        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val contentPendingIntent = PendingIntent.getActivity(
            context,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Choose valid notification icon
        val iconRes = try {
            R.drawable.notification_icon
        } catch (e: Exception) {
            R.mipmap.ic_launcher
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(iconRes)
            .setContentTitle("☀️ حان وقت تجديد واقي الشمس!")
            .setContentText("تلاشت طبقة الحماية (UV ~$uv). يُرجى إعادة التطبيق لحماية بشرتك.")
            .setStyle(NotificationCompat.BigTextStyle().bigText("تلاشت طبقة الحماية تماماً (مستوى الأشعة الآن UV ~$uv). يُرجى إعادة التطبيق فوراً لتجنب حروق وتصبغات البشرة."))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setSound(soundUri)
            .setVibrate(longArrayOf(0, 500, 250, 500))
            .setContentIntent(contentPendingIntent)
            .build()

        try {
            notificationManager.notify(NOTIFICATION_ID, notification)
        } catch (e: SecurityException) {
            // Android 13 POST_NOTIFICATIONS permission not yet accepted
        }
    }

    private fun refreshAllWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val thisWidget = ComponentName(context, SpfNativeWidgetProvider::class.java)
        val allIds = appWidgetManager.getAppWidgetIds(thisWidget)
        for (id in allIds) {
            updateAppWidget(context, appWidgetManager, id)
        }
    }

    // 🌟 3. BIND XML AND DYNAMIC VIEWS
    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_spf_timer)
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        val state = prefs.getString("STATE", "IDLE") ?: "IDLE"
        val endTime = prefs.getLong("END_TIME_MILLIS", 0L)
        var uv = prefs.getFloat("LAST_UV", -1f)

        if (uv == -1f) uv = estimateSolarUv()

        val colorHex = getUvColor(uv)
        val colorInt = Color.parseColor(colorHex)
        val now = SystemClock.elapsedRealtime()

        // Setup Button Click Intent
        val clickIntent = Intent(context, SpfNativeWidgetProvider::class.java).apply {
            action = ACTION_START_TIMER
        }
        val pendingClick = PendingIntent.getBroadcast(
            context,
            0,
            clickIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_action_btn, pendingClick)

        // Header Values
        views.setTextViewText(R.id.widget_uv_text, "UV ~$uv ☀️")
        views.setTextColor(R.id.widget_uv_text, colorInt)

        if (state == "RUNNING" && endTime > now) {
            // Running State
            views.setViewVisibility(R.id.widget_chronometer, View.VISIBLE)
            views.setViewVisibility(R.id.widget_ring_text, View.GONE)
            views.setChronometer(R.id.widget_chronometer, endTime, "%s", true)

            views.setTextViewText(R.id.widget_status_text, "حماية نشطة")
            views.setTextColor(R.id.widget_status_text, Color.parseColor("#1C9A66"))

            views.setTextViewText(R.id.widget_btn_text, "إعادة المؤقت ↻")
            views.setInt(R.id.widget_progress_active, "setColorFilter", colorInt)

        } else if (state == "EXPIRED" || (state == "RUNNING" && endTime <= now)) {
            // Expired State
            views.setViewVisibility(R.id.widget_chronometer, View.GONE)
            views.setViewVisibility(R.id.widget_ring_text, View.VISIBLE)
            views.setTextViewText(R.id.widget_ring_text, "00")
            views.setTextColor(R.id.widget_ring_text, Color.parseColor("#D94A4F"))

            views.setTextViewText(R.id.widget_status_text, "انتهت الحماية")
            views.setTextColor(R.id.widget_status_text, Color.parseColor("#D94A4F"))

            views.setTextViewText(R.id.widget_btn_text, "تجديد الآن ↻")
            views.setInt(R.id.widget_progress_active, "setColorFilter", Color.parseColor("#D94A4F"))

        } else {
            // Idle / Safe State
            views.setViewVisibility(R.id.widget_chronometer, View.GONE)
            views.setViewVisibility(R.id.widget_ring_text, View.VISIBLE)

            val duration = getDurationMinutes(uv)
            if (duration == 0) {
                views.setTextViewText(R.id.widget_ring_text, "آمن")
                views.setTextColor(R.id.widget_ring_text, Color.parseColor("#1C9A66"))
                views.setTextViewText(R.id.widget_status_text, "أشعة آمنة")
                views.setTextViewText(R.id.widget_btn_text, "أشعة آمنة")
                views.setInt(R.id.widget_progress_active, "setColorFilter", Color.parseColor("#1C9A66"))
            } else {
                views.setTextViewText(R.id.widget_ring_text, "$duration")
                views.setTextColor(R.id.widget_ring_text, Color.parseColor("#18352D"))
                views.setTextViewText(R.id.widget_status_text, "بانتظار البدء")
                views.setTextViewText(R.id.widget_btn_text, "بدء الحماية")
                views.setInt(R.id.widget_progress_active, "setColorFilter", colorInt)
            }
        }

        appWidgetManager.updateAppWidget(appWidgetId, views)
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