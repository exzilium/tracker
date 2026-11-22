package expo.modules.lockscreentimer

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LockScreenTimerModule : Module() {
  companion object {
    private const val CHANNEL_ID = "space_tether_pacing_timer"
    private const val CHANNEL_NAME = "Pacing Timer"
    private const val NOTIFICATION_ID = 4201
  }

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("LockScreenTimer")

    AsyncFunction("updateTimer") { mode: String, primaryEpochMs: Double, secondaryEpochMs: Double? ->
      val ctx = context
      if (!canPostNotifications(ctx)) {
        return@AsyncFunction
      }

      ensureChannel(ctx)

      val remoteViews = RemoteViews(ctx.packageName, R.layout.notification_discreet_timer)
      val primaryBase = epochMsToChronometerBase(primaryEpochMs)

      when (mode) {
        "both" -> {
          remoteViews.setImageViewResource(R.id.dot_1, R.drawable.dot_primary)
          remoteViews.setChronometer(R.id.chronometer_1, primaryBase, null, true)
          if (secondaryEpochMs != null) {
            val secondaryBase = epochMsToChronometerBase(secondaryEpochMs)
            remoteViews.setViewVisibility(R.id.timer_slot_2, View.VISIBLE)
            remoteViews.setImageViewResource(R.id.dot_2, R.drawable.dot_secondary)
            remoteViews.setChronometer(R.id.chronometer_2, secondaryBase, null, true)
          } else {
            remoteViews.setViewVisibility(R.id.timer_slot_2, View.GONE)
          }
        }
        "alcohol" -> {
          remoteViews.setImageViewResource(R.id.dot_1, R.drawable.dot_primary)
          remoteViews.setChronometer(R.id.chronometer_1, primaryBase, null, true)
          remoteViews.setViewVisibility(R.id.timer_slot_2, View.GONE)
        }
        "thc" -> {
          remoteViews.setImageViewResource(R.id.dot_1, R.drawable.dot_secondary)
          remoteViews.setChronometer(R.id.chronometer_1, primaryBase, null, true)
          remoteViews.setViewVisibility(R.id.timer_slot_2, View.GONE)
        }
        else -> {
          remoteViews.setImageViewResource(R.id.dot_1, R.drawable.dot_neutral)
          remoteViews.setChronometer(R.id.chronometer_1, primaryBase, null, true)
          remoteViews.setViewVisibility(R.id.timer_slot_2, View.GONE)
        }
      }

      val launchIntent = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
      val pendingIntent = if (launchIntent != null) {
        PendingIntent.getActivity(
          ctx,
          0,
          launchIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
      } else {
        null
      }

      val builder = NotificationCompat.Builder(ctx, CHANNEL_ID)
        .setSmallIcon(R.drawable.ic_stat_tether)
        .setContentTitle("Space Tether")
        .setStyle(NotificationCompat.DecoratedCustomViewStyle())
        .setCustomContentView(remoteViews)
        .setCustomBigContentView(remoteViews)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setSilent(true)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .setShowWhen(false)

      if (pendingIntent != null) {
        builder.setContentIntent(pendingIntent)
      }

      try {
        NotificationManagerCompat.from(ctx).notify(NOTIFICATION_ID, builder.build())
      } catch (_: SecurityException) {
        // Permission revoked between check and notify
      }
    }

    AsyncFunction("stopTimer") {
      NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    }
  }

  private fun epochMsToChronometerBase(epochMs: Double): Long {
    val nowWall = System.currentTimeMillis()
    val elapsedMs = (nowWall - epochMs.toLong()).coerceAtLeast(0L)
    return SystemClock.elapsedRealtime() - elapsedMs
  }

  private fun canPostNotifications(ctx: Context): Boolean {
    if (!NotificationManagerCompat.from(ctx).areNotificationsEnabled()) {
      return false
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return ContextCompat.checkSelfPermission(
        ctx,
        Manifest.permission.POST_NOTIFICATIONS
      ) == PackageManager.PERMISSION_GRANTED
    }
    return true
  }

  private fun ensureChannel(ctx: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val existing = manager.getNotificationChannel(CHANNEL_ID)
      if (existing != null) return

      val channel = NotificationChannel(
        CHANNEL_ID,
        CHANNEL_NAME,
        NotificationManager.IMPORTANCE_DEFAULT
      ).apply {
        description = "Discreet live stopwatch for active sessions"
        setSound(null, null)
        enableVibration(false)
        enableLights(false)
        setShowBadge(false)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }
      manager.createNotificationChannel(channel)
    }
  }
}
