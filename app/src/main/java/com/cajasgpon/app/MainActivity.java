package com.cajasgpon.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.ViewGroup;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import android.content.res.AssetFileDescriptor;
import java.io.FileInputStream;
import java.io.OutputStream;
import java.nio.channels.FileChannel;
import java.nio.ByteBuffer;

public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final int REQ_LOCATION = 11;
    private static final int REQ_FILE = 12;
    private static final int REQ_NOTIF = 13;

    private WebView web;
    private ValueCallback<Uri[]> filePathCallback;
    private GeolocationPermissions.Callback geoCallback;
    private String geoOrigin;
    private volatile String pendingGeo = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.parseColor("#0b1220"));
        getWindow().setNavigationBarColor(Color.parseColor("#0b1220"));

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0b1220"));
        setContentView(web, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) return false;
                openExternal(u.toString(), "");
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (hasLocationPermission()) {
                    callback.invoke(origin, true, false);
                } else {
                    geoOrigin = origin;
                    geoCallback = callback;
                    requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOCATION);
                }
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try {
                    startActivityForResult(Intent.createChooser(i, "Elegir archivo"), REQ_FILE);
                } catch (ActivityNotFoundException e) {
                    filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        web.addJavascriptInterface(new Bridge(), "AndroidBridge");

        if (!hasLocationPermission()) {
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOCATION);
        }

        handleIntent(getIntent());
        web.loadUrl("https://" + HOST + "/index.html");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    /** Ubicación recibida desde otra app (geo:… o enlace de Google Maps). Los enlaces cortos se resuelven aparte. */
    private void handleIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction()) || intent.getData() == null) return;
        final String raw = intent.getData().toString();
        intent.setData(null);
        if (raw.startsWith("http") && (raw.contains("maps.app.goo.gl") || raw.contains("://goo.gl/"))) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    pendingGeo = resolveShort(raw);
                    pushGeo();
                }
            }).start();
        } else {
            pendingGeo = raw;
            pushGeo();
        }
    }

    private String resolveShort(String url) {
        String cur = url;
        try {
            for (int i = 0; i < 6; i++) {
                java.net.HttpURLConnection c = (java.net.HttpURLConnection) new java.net.URL(cur).openConnection();
                c.setInstanceFollowRedirects(false);
                c.setConnectTimeout(6000);
                c.setReadTimeout(6000);
                c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile");
                int code = c.getResponseCode();
                String loc = c.getHeaderField("Location");
                c.disconnect();
                if (code >= 300 && code < 400 && loc != null) {
                    cur = new java.net.URL(new java.net.URL(cur), loc).toString();
                    if (cur.contains("@") || cur.contains("!3d") || cur.contains("q=")) return cur;
                } else {
                    break;
                }
            }
        } catch (Exception ignored) {
        }
        return cur;
    }

    private void pushGeo() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (web != null) web.evaluateJavascript("window.__geoIntent && window.__geoIntent()", null);
            }
        });
    }

    private void askNotificationPermission() {
        if (android.os.Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);
        }
    }

    private boolean hasLocationPermission() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_LOCATION && geoCallback != null) {
            geoCallback.invoke(geoOrigin, hasLocationPermission(), false);
            geoCallback = null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE && filePathCallback != null) {
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int n = data.getClipData().getItemCount();
                    result = new Uri[n];
                    for (int i = 0; i < n; i++) result[i] = data.getClipData().getItemAt(i).getUri();
                } else if (data.getData() != null) {
                    result = new Uri[]{data.getData()};
                }
            }
            filePathCallback.onReceiveValue(result);
            filePathCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.__back ? window.__back() : false", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                if (!"true".equals(value)) finish();
            }
        });
    }

    private void toast(final String msg) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show();
            }
        });
    }

    private void openExternal(String url, String fallback) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } catch (ActivityNotFoundException e) {
            if (fallback != null && fallback.length() > 0) {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(fallback)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                    return;
                } catch (ActivityNotFoundException e2) {
                    // sigue abajo
                }
            }
            toast("No hay una app para abrir este enlace");
        }
    }

    /** Funciones que la página puede llamar desde JavaScript. */
    // Cambia cada vez que el proceso de la app se inicia de cero (app cerrada por completo)
    private static final String BOOT_ID = java.util.UUID.randomUUID().toString();

    private class Bridge {
        @JavascriptInterface
        public String takeGeo() {
            String g = pendingGeo;
            pendingGeo = "";
            return g == null ? "" : g;
        }

        @JavascriptInterface
        public String bootId() {
            return BOOT_ID;
        }

        /** Guarda la sesión del técnico para poder avisarle de nuevas asignaciones aunque la app esté cerrada. */
        @JavascriptInterface
        public void setAuth(final String url, final String key, final String token, final String userId, final String role) {
            if (!"tecnico".equals(role)) {
                Notifier.clearAuth(getApplicationContext());
                return;
            }
            Notifier.saveAuth(getApplicationContext(), url, key, token, userId);
            Notifier.ensureChannel(getApplicationContext());
            Notifier.schedule(getApplicationContext());
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    askNotificationPermission();
                }
            });
            new Thread(new Runnable() {
                @Override
                public void run() {
                    Notifier.poll(getApplicationContext(), false);
                }
            }).start();
        }

        @JavascriptInterface
        public void clearAuth() {
            Notifier.clearAuth(getApplicationContext());
        }

        /** La página detectó asignaciones nuevas: se marcan como avisadas y, si la app no está a la vista, se notifica. */
        @JavascriptInterface
        public void assigned(final String title, final String text, final String idsLines, final boolean show) {
            Notifier.markSeen(getApplicationContext(), idsLines);
            if (show) Notifier.show(getApplicationContext(), title, text);
        }

        private String clean(String name) {
            if (name == null) return "";
            int q = name.indexOf('?'); if (q >= 0) name = name.substring(0, q);
            while (name.startsWith("/") || name.startsWith("./")) name = name.substring(name.startsWith("/") ? 1 : 2);
            return name;
        }

        @JavascriptInterface
        public double assetSize(String name) {
            try {
                AssetFileDescriptor fd = getAssets().openFd(clean(name));
                long n = fd.getLength();
                fd.close();
                return n;
            } catch (Exception e) {
                return -1;
            }
        }

        @JavascriptInterface
        public String readRange(String name, double offset, int length) {
            AssetFileDescriptor fd = null;
            FileInputStream in = null;
            try {
                fd = getAssets().openFd(clean(name));
                in = fd.createInputStream();
                FileChannel ch = in.getChannel();
                long start = fd.getStartOffset() + (long) offset;
                long avail = fd.getLength() - (long) offset;
                int n = (int) Math.max(0, Math.min((long) length, avail));
                if (n == 0) return "";
                ByteBuffer buf = ByteBuffer.allocate(n);
                long pos = start;
                while (buf.hasRemaining()) {
                    int r = ch.read(buf, pos);
                    if (r < 0) break;
                    pos += r;
                }
                return Base64.encodeToString(buf.array(), 0, buf.position(), Base64.NO_WRAP);
            } catch (Exception e) {
                return "";
            } finally {
                try { if (in != null) in.close(); } catch (Exception ignored) {}
                try { if (fd != null) fd.close(); } catch (Exception ignored) {}
            }
        }
        @JavascriptInterface
        public void openExternal(final String url, final String fallback) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    MainActivity.this.openExternal(url, fallback);
                }
            });
        }

        @JavascriptInterface
        public void shareText(final String text) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Intent i = new Intent(Intent.ACTION_SEND);
                    i.setType("text/plain");
                    i.putExtra(Intent.EXTRA_TEXT, text);
                    startActivity(Intent.createChooser(i, "Enviar ubicación"));
                }
            });
        }

        @JavascriptInterface
        public void saveFile(final String name, String base64, final String mime, final boolean share) {
            try {
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                ContentValues v = new ContentValues();
                v.put(MediaStore.Downloads.DISPLAY_NAME, name);
                v.put(MediaStore.Downloads.MIME_TYPE, mime);
                v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                ContentResolver cr = getContentResolver();
                final Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (uri == null) {
                    toast("No se pudo guardar el archivo");
                    return;
                }
                OutputStream out = cr.openOutputStream(uri);
                out.write(bytes);
                out.close();
                if (share) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Intent i = new Intent(Intent.ACTION_SEND);
                            i.setType(mime);
                            i.putExtra(Intent.EXTRA_STREAM, uri);
                            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            startActivity(Intent.createChooser(i, "Enviar KMZ"));
                        }
                    });
                } else {
                    toast("Guardado en Descargas: " + name);
                }
            } catch (Exception e) {
                toast("No se pudo guardar: " + e.getMessage());
            }
        }
    }
}
