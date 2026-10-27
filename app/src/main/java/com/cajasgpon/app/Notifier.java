package com.cajasgpon.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashSet;
import java.util.Set;

/** Avisos de evaluaciones asignadas: consulta al servidor en segundo plano y muestra la notificación. */
final class Notifier {
    static final String CHANNEL = "asignaciones";
    static final String PREFS = "vizor_native";
    static final int JOB_ID = 4711;

    private Notifier() {
    }

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static void saveAuth(Context c, String url, String key, String token, String userId) {
        SharedPreferences p = prefs(c);
        String oldUser = p.getString("uid", "");
        String uid = userId == null ? "" : userId;
        SharedPreferences.Editor e = p.edit();
        e.putString("url", url == null ? "" : url);
        e.putString("key", key == null ? "" : key);
        e.putString("token", token == null ? "" : token);
        e.putString("uid", uid);
        if (!uid.equals(oldUser)) {
            // otro usuario en este teléfono: se empieza de cero sin avisar de lo que ya tenía
            e.remove("seen");
            e.putBoolean("baseline", false);
        }
        e.apply();
    }

    static void clearAuth(Context c) {
        prefs(c).edit().clear().apply();
        try {
            JobScheduler js = (JobScheduler) c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
            if (js != null) js.cancel(JOB_ID);
        } catch (Exception ignored) {
        }
    }

    /** Programa la revisión periódica (mínimo que permite Android: cada 15 minutos). */
    static void schedule(Context c) {
        try {
            JobScheduler js = (JobScheduler) c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
            if (js == null || js.getPendingJob(JOB_ID) != null) return;
            JobInfo info = new JobInfo.Builder(JOB_ID, new ComponentName(c, PollJobService.class))
                    .setPeriodic(15L * 60L * 1000L)
                    .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                    .setPersisted(true)
                    .build();
            js.schedule(info);
        } catch (Exception ignored) {
        }
    }

    static void ensureChannel(Context c) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Asignaciones", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Avisos cuando te asignan evaluaciones o una ruta");
        nm.createNotificationChannel(ch);
    }

    static void show(Context c, String title, String text) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || !nm.areNotificationsEnabled()) return;
        ensureChannel(c);
        Intent open = new Intent(c, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification n = new Notification.Builder(c, CHANNEL)
                .setSmallIcon(android.R.drawable.ic_dialog_map)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setContentIntent(pi)
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_MESSAGE)
                .build();
        nm.notify((int) (System.currentTimeMillis() & 0x7fffffff), n);
    }

    static Set<String> seen(Context c) {
        return new HashSet<String>(prefs(c).getStringSet("seen", new HashSet<String>()));
    }

    /** La app ya avisó (o mostró en pantalla) estas evaluaciones: la revisión de fondo no las repite. */
    static void markSeen(Context c, String idsCsv) {
        Set<String> s = seen(c);
        if (idsCsv != null) {
            for (String id : idsCsv.split("\n")) {
                if (id.length() > 0) s.add(id);
            }
        }
        prefs(c).edit().putStringSet("seen", s).apply();
    }

    private static String post(String url, String key, String body) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        try {
            c.setRequestMethod("POST");
            c.setConnectTimeout(15000);
            c.setReadTimeout(20000);
            c.setDoOutput(true);
            c.setRequestProperty("Content-Type", "application/json");
            c.setRequestProperty("apikey", key);
            if (key.startsWith("eyJ")) c.setRequestProperty("Authorization", "Bearer " + key);
            OutputStream os = c.getOutputStream();
            os.write(body.getBytes("UTF-8"));
            os.close();
            int code = c.getResponseCode();
            InputStream is = code >= 400 ? c.getErrorStream() : c.getInputStream();
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            if (is != null) {
                byte[] buf = new byte[4096];
                int r;
                while ((r = is.read(buf)) > 0) bo.write(buf, 0, r);
                is.close();
            }
            String txt = bo.toString("UTF-8");
            if (code >= 400) throw new Exception(txt.contains("no_session") ? "no_session" : "http_" + code);
            return txt;
        } finally {
            c.disconnect();
        }
    }

    /** Consulta las evaluaciones asignadas a este técnico y avisa de las nuevas. */
    static void poll(Context c, boolean notify) {
        SharedPreferences p = prefs(c);
        String url = p.getString("url", ""), key = p.getString("key", ""), token = p.getString("token", "");
        if (url.length() == 0 || token.length() == 0) return;
        try {
            String res = post(url + "/rest/v1/rpc/cj_my_assignments", key, new JSONObject().put("p_token", token).toString());
            JSONArray arr = new JSONArray(res);
            Set<String> prev = seen(c), now = new HashSet<String>();
            int fresh = 0;
            String first = "";
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                String id = o.optString("u", "");
                if (id.length() == 0) continue;
                now.add(id);
                if (!prev.contains(id)) {
                    fresh++;
                    if (first.length() == 0) {
                        String cli = o.optString("cliente", "");
                        String dir = o.optString("direccion", "");
                        first = (cli.length() > 0 ? cli : "Orden " + o.optString("orden", "")) + (dir.length() > 0 ? " · " + dir : "");
                    }
                }
            }
            boolean baseline = p.getBoolean("baseline", false);
            p.edit().putStringSet("seen", now).putBoolean("baseline", true).apply();
            if (notify && baseline && fresh > 0) {
                if (fresh == 1) show(c, "Nueva evaluación asignada", first);
                else show(c, "Te asignaron " + fresh + " evaluaciones", "Primera: " + first);
            }
        } catch (Exception e) {
            if ("no_session".equals(e.getMessage())) {
                p.edit().remove("token").apply();  // la sesión terminó: se vuelve a guardar al iniciar sesión
            }
        }
    }
}
