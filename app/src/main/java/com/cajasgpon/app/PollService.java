package com.cajasgpon.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.IBinder;

/** Servicio en primer plano: revisa el servidor cada ~40 s para avisar de nuevas asignaciones casi al instante. */
public class PollService extends Service {
    private static final int NOTIF_ID = 4712;
    private volatile boolean run = false;
    private Thread th;

    @Override
    public void onCreate() {
        super.onCreate();
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) {
            NotificationChannel ch = new NotificationChannel(Notifier.SVC_CHANNEL, "Vizor G activo", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Mantiene la app atenta a nuevas asignaciones");
            nm.createNotificationChannel(ch);
        }
        Intent open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 1, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification n = new Notification.Builder(this, Notifier.SVC_CHANNEL)
                .setSmallIcon(android.R.drawable.ic_dialog_map)
                .setContentTitle("Vizor G")
                .setContentText("Atento a asignaciones y actualizaciones")
                .setContentIntent(pi)
                .setOngoing(true)
                .build();
        try {
            startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } catch (Throwable t) {
            stopSelf();
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (Notifier.prefs(this).getString("token", "").length() == 0) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!run) {
            run = true;
            th = new Thread(new Runnable() {
                @Override
                public void run() {
                    while (run) {
                        try {
                            Notifier.poll(getApplicationContext(), true);
                        } catch (Throwable ignored) {
                        }
                        if (Notifier.prefs(getApplicationContext()).getString("token", "").length() == 0) break;
                        try {
                            Thread.sleep(40000);
                        } catch (InterruptedException e) {
                            break;
                        }
                    }
                    run = false;
                    stopSelf();
                }
            });
            th.start();
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        run = false;
        if (th != null) th.interrupt();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
