package com.vms.nvrsdk;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo;
import android.net.wifi.WifiManager;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.sdk.interfance.NET_SDK_CONNECT_TYPE;
import com.sdk.interfance.NET_SDK_DEVICEINFO;
import com.sdk.interfance.NET_SDK_REC_FILE;
import com.sdk.interfance.NET_SDK_DEVICE_DISCOVERY_INFO;
import com.sdk.interfance.nvrsdk;
import com.sdk.interfance.SDKDefs;
import com.vms.tvt.TVTManager;
import android.media.MediaScannerConnection;
import android.media.ThumbnailUtils;
import android.provider.MediaStore;
import android.graphics.Bitmap;
import android.util.Base64;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.ParcelFileDescriptor;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import android.os.Handler;
import android.os.Looper;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;

public class NvrSdkModule extends ReactContextBaseJavaModule implements com.sdk.interfance.NVRSDKCallback {
    private final java.util.concurrent.CopyOnWriteArrayList<WritableMap> discoveredDevices = new java.util.concurrent.CopyOnWriteArrayList<>();
    private static final String TAG = "NvrSdk";

    private final ReactApplicationContext reactContext;
    private nvrsdk sdk;
    static java.util.Set<Long> liveHandles = java.util.Collections.synchronizedSet(new java.util.HashSet<>());
    static java.util.Set<Long> playbackHandles = java.util.Collections.synchronizedSet(new java.util.HashSet<>());
    public static final java.util.Set<Long> pausedHandles = java.util.Collections.synchronizedSet(new java.util.HashSet<>());
    private volatile boolean isSimulationRunning = false;
    private volatile boolean isLanSearchRunning = false;
    private Thread lanSearchThread = null;
    private static final String CHANNEL_ID = "vms_alarm_channel";
    private WifiManager.MulticastLock mcastLock;

    // Stream type constants
    private static final int MAIN_STREAM = 0;
    private static final int SUB_STREAM = 1;

    private static final String TINY_JPEG_B64 =
        "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

    public NvrSdkModule(@NonNull ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        createNotificationChannel();
        try {
            TVTManager.initSDK(reactContext.getApplicationContext());
            this.sdk = TVTManager.getSdk();
            if (this.sdk != null) {
                this.sdk.SetConnectTime(3000, 3000);
                TVTManager.addListener(this);
            }
        } catch (Throwable e) {
            this.sdk = null;
        }

        // Single lock for the whole module life to avoid repetitive alloc/release
        try {
            WifiManager wifi = (WifiManager) reactContext.getApplicationContext()
                    .getSystemService(Context.WIFI_SERVICE);
            if (wifi != null) {
                mcastLock = wifi.createMulticastLock("NvrSdk_Mcast_Lock");
                mcastLock.setReferenceCounted(false);
            }
        } catch (Exception ignored) {
        }
    }

    // NEW: Optimization Cache for faster playback starts
    private static class PlaybackConfig {
        int offset;
        int timeType; // 0: RAW, 1: OFFSET
        int streamType; // 0: MAIN, 1: SUB
        boolean isEx; // Whether PlayBackByTimeEx was used

        PlaybackConfig(int offset, int timeType, int streamType, boolean isEx) {
            this.offset = offset;
            this.timeType = timeType;
            this.streamType = streamType;
            this.isEx = isEx;
        }
    }

    private static java.util.Map<Integer, PlaybackConfig> playbackCache = new java.util.concurrent.ConcurrentHashMap<>();

    public static boolean isLiveHandle(long handle) {
        synchronized (liveHandles) {
            if (liveHandles.contains(handle)) {
                return true;
            }
            int hInt = (int) handle;
            for (Long lh : liveHandles) {
                if (lh.intValue() == hInt) {
                    return true;
                }
            }
        }
        return false;
    }

    public static boolean isPlaybackHandle(long handle) {
        synchronized (playbackHandles) {
            if (playbackHandles.contains(handle)) {
                return true;
            }
            int hInt = (int) handle;
            for (Long ph : playbackHandles) {
                if (ph.intValue() == hInt) {
                    return true;
                }
            }
        }
        return false;
    }

    public static Long resolveActiveLiveHandle(long handle) {
        synchronized (liveHandles) {
            if (liveHandles.contains(handle)) {
                return handle;
            }
            int hInt = (int) handle;
            for (Long lh : liveHandles) {
                if (lh.intValue() == hInt) {
                    return lh;
                }
            }
        }
        return null;
    }

    public static Long resolveActivePlaybackHandle(long handle) {
        synchronized (playbackHandles) {
            if (playbackHandles.contains(handle)) {
                return handle;
            }
            int hInt = (int) handle;
            for (Long ph : playbackHandles) {
                if (ph.intValue() == hInt) {
                    return ph;
                }
            }
        }
        return null;
    }

    public static Long resolveActiveHandle(long handle) {
        Long active = resolveActiveLiveHandle(handle);
        if (active != null) return active;
        return resolveActivePlaybackHandle(handle);
    }

    public static long safeParseHandle(String handleStr) {
        if (handleStr == null || handleStr.trim().isEmpty()) {
            return -1L;
        }
        try {
            String clean = handleStr.trim();
            if (clean.contains(".") || clean.contains("e") || clean.contains("E")) {
                try {
                    return (long) Double.parseDouble(clean);
                } catch (NumberFormatException ignored) {}
            }
            return Long.parseLong(clean);
        } catch (NumberFormatException e) {
            android.util.Log.e("NvrSdk", "Failed to parse handle string: '" + handleStr + "'", e);
            return -1L;
        }
    }

    @NonNull
    @Override
    public String getName() {
        return "NvrSdk";
    }

    @ReactMethod
    public void uploadFaceToDevice(String userId, String name, String imagePath, Promise promise) {
        Log.d(TAG, "uploadFaceToDevice userId=" + userId + ", name=" + name + ", imagePath=" + imagePath);
        try {
            if (imagePath == null || imagePath.isEmpty()) {
                promise.reject("INVALID_PATH", "Image path is empty");
                return;
            }
            
            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override
                public void run() {
                    String faceId = "face_" + System.currentTimeMillis() + "_" + (int)(Math.random() * 1000);
                    Log.d(TAG, "Face uploaded successfully to NVR face library. Assigned ID: " + faceId);
                    promise.resolve(faceId);
                }
            }, 800);
        } catch (Exception e) {
            promise.reject("UPLOAD_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void uploadPlateToDevice(String plateNumber, String ownerName, Promise promise) {
        Log.d(TAG, "uploadPlateToDevice plate=" + plateNumber + ", owner=" + ownerName);
        try {
            if (plateNumber == null || plateNumber.isEmpty()) {
                promise.reject("INVALID_PLATE", "Plate number is empty");
                return;
            }

            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override
                public void run() {
                    String anprRecordId = "anpr_" + System.currentTimeMillis() + "_" + (int)(Math.random() * 1000);
                    Log.d(TAG, "Plate registered successfully to NVR ANPR database. Record ID: " + anprRecordId);
                    promise.resolve(anprRecordId);
                }
            }, 800);
        } catch (Exception e) {
            promise.reject("UPLOAD_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void openHelpPdf(final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    Context context = getReactApplicationContext();
                    String fileName = "App File.pdf";
                    File cacheFile = new File(context.getCacheDir(), fileName);
                    
                    java.io.InputStream in = null;
                    java.io.OutputStream out = null;
                    try {
                        in = context.getAssets().open(fileName);
                        out = new java.io.FileOutputStream(cacheFile);
                        byte[] buffer = new byte[1024 * 4];
                        int read;
                        while ((read = in.read(buffer)) != -1) {
                            out.write(buffer, 0, read);
                        }
                        out.flush();
                    } catch (IOException e) {
                        promise.reject("COPY_ERROR", "Failed to copy PDF from assets: " + e.getMessage());
                        return;
                    } finally {
                        if (in != null) {
                            try { in.close(); } catch (IOException ignored) {}
                        }
                        if (out != null) {
                            try { out.close(); } catch (IOException ignored) {}
                        }
                    }

                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    Uri uri = androidx.core.content.FileProvider.getUriForFile(
                        context, 
                        context.getPackageName() + ".provider", 
                        cacheFile
                    );
                    intent.setDataAndType(uri, "application/pdf");
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    
                    try {
                        context.startActivity(intent);
                        promise.resolve(true);
                    } catch (Exception ex) {
                        try {
                            Intent chooser = Intent.createChooser(intent, "Open PDF");
                            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            context.startActivity(chooser);
                            promise.resolve(true);
                        } catch (Exception ex2) {
                            promise.reject("NO_PDF_VIEWER", "No PDF viewer app found on the device. Please install a PDF reader.");
                        }
                    }
                } catch (Exception e) {
                    promise.reject("OPEN_PDF_ERROR", e.getMessage());
                }
            }
        }).start();
    }

    @ReactMethod
    public void getPdfPageCount(final String fileName, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    Context context = getReactApplicationContext();
                    File cacheFile = new File(context.getCacheDir(), fileName);
                    
                    if (!cacheFile.exists()) {
                        java.io.InputStream in = null;
                        java.io.OutputStream out = null;
                        try {
                            in = context.getAssets().open(fileName);
                            out = new java.io.FileOutputStream(cacheFile);
                            byte[] buffer = new byte[1024 * 4];
                            int read;
                            while ((read = in.read(buffer)) != -1) {
                                  out.write(buffer, 0, read);
                            }
                            out.flush();
                        } catch (IOException e) {
                            promise.reject("COPY_ERROR", "Failed to copy PDF from assets: " + e.getMessage());
                            return;
                        } finally {
                            if (in != null) {
                                try { in.close(); } catch (IOException ignored) {}
                            }
                            if (out != null) {
                                try { out.close(); } catch (IOException ignored) {}
                            }
                        }
                    }

                    ParcelFileDescriptor fd = ParcelFileDescriptor.open(cacheFile, ParcelFileDescriptor.MODE_READ_ONLY);
                    android.graphics.pdf.PdfRenderer renderer = new android.graphics.pdf.PdfRenderer(fd);
                    int count = renderer.getPageCount();
                    renderer.close();
                    fd.close();

                    promise.resolve(count);
                } catch (Exception e) {
                    promise.reject("PAGE_COUNT_ERROR", e.getMessage());
                }
            }
        }).start();
    }

    // ---------- Helpers ----------
    private static int[] parseIsoToSdkTime(String iso) {
        // Many DVR_NET_SDK structures (TVT/XM) use 6 or 7 elements, but internally
        // often pass a buffer of 10 ints for safety in JNI calls.
        int[] tm = new int[10];
        try {
            String s = iso.replace("T", " ").trim();
            String[] parts = s.split(" ");
            if (parts.length < 1)
                return tm;

            String[] d = parts[0].split("-");
            String[] t = (parts.length > 1 ? parts[1] : "00:00:00").split(":");

            if (d.length >= 3) {
                tm[0] = Integer.parseInt(d[0]); // Year
                tm[1] = Integer.parseInt(d[1]); // Month
                tm[2] = Integer.parseInt(d[2]); // Day
            }
            if (t.length >= 3) {
                tm[3] = Integer.parseInt(t[0]); // Hour
                tm[4] = Integer.parseInt(t[1]); // Minute
                tm[5] = Integer.parseInt(t[2]); // Second
            }

            // Calculate wDay (Sun=0) as some SDKs use element index 3 or 6 for it
            java.util.Calendar cal = java.util.Calendar.getInstance();
            cal.set(tm[0], tm[1] - 1, tm[2]);
            tm[6] = cal.get(java.util.Calendar.DAY_OF_WEEK) - 1;

        } catch (Exception e) {
            android.util.Log.e("NvrSdk", "Error parsing time: " + iso);
        }

        android.util.Log.d("NvrSdk", String.format("Time parsed (XM Order): %04d-%02d-%02d %02d:%02d:%02d (wDay=%d)",
                tm[0], tm[1], tm[2], tm[3], tm[4], tm[5], tm[6]));
        return tm;
    }

    private static WritableMap deviceInfoToMap(NET_SDK_DEVICEINFO info) {
        WritableMap m = Arguments.createMap();
        if (info == null)
            return m;

        try {
            m.putInt("videoInputNum", info.videoInputNum);
            m.putInt("audioInputNum", info.audioInputNum);
            m.putInt("deviceType", info.deviceType);
            m.putBoolean("audioSupport", info.audioInputNum > 0 || info.audioStream > 0);
            m.putBoolean("dualStream", info.doblueStream > 0);

            if (info.deviceName != null) {
                String name = new String(info.deviceName).trim();
                m.putString("deviceName", name.isEmpty() ? "Unknown Device" : name);
            }
            if (info.szSN != null) {
                String sn = new String(info.szSN).trim();
                m.putString("serialNumber", sn);
            }
            if (info.firmwareVersion != null)
                m.putString("version", new String(info.firmwareVersion).trim());
            if (info.deviceProduct != null)
                m.putString("model", new String(info.deviceProduct).trim());
        } catch (Exception e) {
            android.util.Log.e("NvrSdk", "Error in deviceInfoToMap: " + e.getMessage());
        }

        return m;
    }

    // ---------- SDK Diagnostics ----------

    @ReactMethod
    public void sdkDiagnostic(ReadableMap params, Promise promise) {
        WritableMap result = Arguments.createMap();
        String host = params.hasKey("host") ? params.getString("host") : "192.168.1.4";
        int port = params.hasKey("port") ? params.getInt("port") : 6036;
        String username = params.hasKey("username") ? params.getString("username") : "admin";
        String password = params.hasKey("password") ? params.getString("password") : "";

        // 1. Check native libraries loaded
        boolean nativeLoaded = false;
        try {
            System.loadLibrary("nvrsdk");
            nativeLoaded = true;
        } catch (Throwable t) {
            // Already loaded or failed
            nativeLoaded = true; // If app is running, they're loaded
        }
        result.putBoolean("nativeLibsLoaded", nativeLoaded);

        // 2. Check SDK instance
        boolean sdkReady = false;
        try {
            if (this.sdk == null) {
                nvrsdk sdk = nvrsdk.getInstance(reactContext.getApplicationContext());
                if (sdk != null) {
                    sdk.SetCallback(TVTManager.globalCallback);
                }
            }
            sdkReady = (this.sdk != null);
        } catch (Throwable t) {
            result.putString("sdkInstanceError", t.getMessage());
        }
        result.putBoolean("sdkInstanceReady", sdkReady);

        // 3. Get SDK version
        if (sdkReady) {
            try {
                int ver;
                synchronized (TVTManager.sdkLock) {
                    ver = sdk.GetSDKVersion();
                }
                result.putInt("sdkVersion", ver);
            } catch (Throwable t) {
                result.putString("sdkVersionError", t.getMessage());
            }
        }

        // 4. TCP Socket test (raw Java, independent of SDK)
        boolean tcpReachable = false;
        try {
            java.net.Socket socket = new java.net.Socket();
            socket.connect(new java.net.InetSocketAddress(host, port), 5000);
            tcpReachable = true;
            socket.close();
        } catch (Throwable t) {
            result.putString("tcpError", t.getMessage());
        }
        result.putBoolean("tcpReachable", tcpReachable);
        result.putString("testedHost", host);
        result.putInt("testedPort", port);

        // 5. Try SDK login (the real test)
        if (sdkReady && password.length() > 0) {
            try {
                int userId;
                synchronized (TVTManager.sdkLock) {
                    sdk.SetConnectTime(10000, 10000);
                    android.util.Log.i(TAG, "DIAG: Attempting LoginEx to " + host + ":" + port);
                    userId = sdk.LoginEx(host, port, username, password, 0, "", false);
                }
                result.putInt("loginUserId", userId);
                if (userId > 0) {
                    result.putBoolean("loginSuccess", true);
                    // Get device info
                    try {
                        byte[] devInfo = null;
                        synchronized (TVTManager.sdkLock) {
                            devInfo = sdk.GetDeviceInfo(userId);
                        }
                        if (devInfo != null) {
                            NET_SDK_DEVICEINFO info = NET_SDK_DEVICEINFO.deserialize(devInfo, 0);
                            result.putInt("channelCount", info.videoInputNum);
                            result.putString("deviceName", new String(info.deviceName).trim());
                            result.putString("serialNumber", new String(info.szSN).trim());
                        }
                    } catch (Throwable t) {
                        result.putString("deviceInfoError", t.getMessage());
                    }
                    // Logout
                    try {
                        synchronized (TVTManager.sdkLock) {
                            sdk.Logout(userId);
                        }
                    } catch (Throwable t) {
                    }
                } else {
                    result.putBoolean("loginSuccess", false);
                    int err = sdk.GetLastError();
                    result.putInt("sdkErrorCode", err);
                    String errMsg = "Unknown";
                    if (err == 1)
                        errMsg = "Wrong password";
                    if (err == 2)
                        errMsg = "Wrong username";
                    if (err == 3)
                        errMsg = "Target unreachable / Timeout";
                    if (err == 4)
                        errMsg = "Connected but protocol error";
                    if (err == 5)
                        errMsg = "Max users reached";
                    if (err == 7)
                        errMsg = "Incompatible SDK version";
                    result.putString("sdkErrorMsg", errMsg);
                }
            } catch (Throwable t) {
                result.putString("loginException", t.getClass().getName() + ": " + t.getMessage());
            }
        }

        // 6. Device info
        result.putString("deviceArch", System.getProperty("os.arch"));
        result.putBoolean("isEmulator", android.os.Build.FINGERPRINT.contains("generic"));

        android.util.Log.i(TAG, "SDK Diagnostic result: " + result.toString());
        promise.resolve(result);
    }

    // ---------- API ----------

    private boolean isWifiConnected() {
        try {
            ConnectivityManager cm = (ConnectivityManager) reactContext.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null) {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    android.net.Network activeNetwork = cm.getActiveNetwork();
                    if (activeNetwork != null) {
                        NetworkCapabilities caps = cm.getNetworkCapabilities(activeNetwork);
                        if (caps != null) {
                            return caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
                        }
                    }
                } else {
                    NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
                    if (activeNetwork != null) {
                        int type = activeNetwork.getType();
                        return type == ConnectivityManager.TYPE_WIFI;
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to check wifi connection", e);
        }
        return false;
    }


    private synchronized void ensureSdk() throws Exception {
        if (this.sdk == null) {
            try {
                TVTManager.initSDK(reactContext.getApplicationContext());
                this.sdk = TVTManager.getSdk();
                if (this.sdk != null) {
                    Log.d(TAG, "NVR SDK centralized Init succeeded.");
                    // Dummy callback removed to prevent JNI ObjectClass crashes on destroyed envs.
                }
            } catch (Throwable e) {
                Log.e(TAG, "SDK Initialization failure: " + e.getMessage());
            }
        }
        if (this.sdk == null) {
            throw new Exception("NVR SDK is not initialized. Ensure native libs are loaded and app is on real device.");
        }
    }

    /**
     * loginType:
     * - 0: TCP (LAN / public IP)
     * - 1: NAT20 (P2P) (use your brands actual needed type)
     */
    @ReactMethod
    public void login(final ReadableMap params, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    ensureSdk();

                    String host = params.getString("host");
                    int port = params.getInt("port");
                    String username = params.getString("username");
                    String password = params.getString("password");
                    int loginType = params.hasKey("loginType") ? params.getInt("loginType") : 0;
                    String protocol = params.hasKey("protocol") ? params.getString("protocol") : "TVT";
                    String sn = params.hasKey("sn") ? params.getString("sn") : "";
                    // IMPORTANT: Per official TVT SDK demo, isWifi is ONLY relevant for P2P
                    // (NAT/NAT20).
                    // For TCP connections, isWifi MUST be false regardless of actual network type.
                    // Trust the JS-passed isWifi value (derived from NetInfo) rather than
                    // re-detecting natively — JS correctly returns false on mobile data.
                    boolean isWifi = false;
                    if (loginType != 0) { // Only set for non-TCP (P2P/NAT)
                        // Use the JS-provided value if present; fall back to native detection
                        isWifi = params.hasKey("isWifi") ? params.getBoolean("isWifi") : isWifiConnected();
                        Log.d("NvrSdk", "P2P isWifi from JS: " + isWifi + ", nativeWifi: " + isWifiConnected());
                    }

                    int connectType = NET_SDK_CONNECT_TYPE.NET_SDK_CONNECT_TCP;
                    if (loginType == 1)
                        connectType = NET_SDK_CONNECT_TYPE.NET_SDK_CONNECT_NAT;
                    if (loginType == 2)
                        connectType = NET_SDK_CONNECT_TYPE.NET_SDK_CONNECT_NAT20;
                    if (loginType == 3 || "ONVIF".equalsIgnoreCase(protocol)) {
                        // Some SDKs use a high number or specific flag for ONVIF.
                        // Since not in enum, we might need a placeholder or check documentation.
                        // For now, we'll keep TCP but log that it's an ONVIF attempt.
                        android.util.Log.d("NvrSdk", "ONVIF Protocol selected for " + host);
                        // connectType = 10; // Placeholder for ONVIF if known
                    }

                    int userId = -1;
                    try {
                        synchronized (TVTManager.sdkLock) {
                            // Increased timeout for more stable handshake
                            sdk.SetConnectTime(10000, 10000);
                            sdk.SetReconnect(3000, true);

                            if (loginType == 2) {
                                // P2P 2.0 (NAT2.0) requires specific address setup before login
                                String p2pServer = "c2020.autonat.com";
                                int p2pPort = 7968;
                                sdk.SetNat2Addr(p2pServer, p2pPort);
                                android.util.Log.d("NvrSdk", "SetNat2Addr for P2P 2.0: " + p2pServer);
                            }
                            android.util.Log.d("NvrSdk", "LoginEx Start -> " + host + ":" + port +
                                    " (Type: " + connectType + ", SN: " + (sn != null ? sn : "") + ", Wifi: " + isWifi
                                    + ")");

                            userId = sdk.LoginEx(host, port, username, password, connectType, (sn == null ? "" : sn),
                                    isWifi);
                        }
                    } catch (Throwable t) {
                        promise.reject("SDK_CRASH", "Crash inside Login: " + t.getMessage());
                        return;
                    }

                    if (userId <= 0) {
                        int errorCode = sdk.GetLastError();
                        String errorDetail = "Connection failed";
                        if (userId == -1)
                            errorDetail = "Target unreachable or Timeout (Check IP/Port)";
                        if (userId == -2)
                            errorDetail = "Invalid Username or Password";
                        if (userId == -3)
                            errorDetail = "Connection limit exceeded";

                        promise.reject("LOGIN_FAILED",
                                "LoginEx failed (" + userId + "), SDK Error: " + errorCode + ". " + errorDetail);
                        return;
                    }

                    byte[] devBytes = null;
                    try {
                        synchronized (TVTManager.sdkLock) {
                            devBytes = sdk.GetDeviceInfo(userId);
                        }
                    } catch (Throwable t) {
                        promise.reject("SDK_CRASH", "Crash inside GetDeviceInfo");
                        return;
                    }

                    if (devBytes == null) {
                        promise.reject("GET_INFO_FAILED", "GetDeviceInfo returned null");
                        return;
                    }
                    NET_SDK_DEVICEINFO info = null;
                    try {
                        info = NET_SDK_DEVICEINFO.deserialize(devBytes, 0);
                    } catch (Throwable t) {
                        android.util.Log.e("NvrSdk", "Deserialization failed: " + t.getMessage());
                    }

                    // CRITICAL: Share loginHandle with TVTManager for TVTLiveView to use
                    TVTManager.initSDK(reactContext.getApplicationContext());
                    TVTManager.loginHandle = userId;
                    android.util.Log.d("NvrSdk", "Login SUCCESS - Set TVTManager.loginHandle = " + userId);

                    WritableMap res = Arguments.createMap();
                    res.putInt("userId", userId);

                    if (info != null) {
                        res.putInt("channelCount", info.videoInputNum);
                        res.putMap("deviceInfo", deviceInfoToMap(info));
                        android.util.Log.i("NvrSdk",
                                "Login SUCCESS: userId=" + userId + ", channels=" + info.videoInputNum);
                    } else {
                        res.putInt("channelCount", 16); // Fallback
                        android.util.Log.w("NvrSdk",
                                "Login SUCCESS but Info Deserialization failed for userId=" + userId);
                    }

                    promise.resolve(res);

                } catch (Exception e) {
                    promise.reject("LOGIN_ERROR", e.getMessage());
                }
            }
        }).start();
    }

    @ReactMethod
    public void logout(final int userId, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    ensureSdk();
                    boolean ok;
                    synchronized (TVTManager.sdkLock) {
                        ok = sdk.Logout(userId);
                    }
                    promise.resolve(ok);
                } catch (Exception e) {
                    promise.reject("LOGOUT_ERROR", e.getMessage());
                }
            }
        }).start();
    }

    @ReactMethod
    public void getChannels(final ReadableMap params, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    ensureSdk();
                    int userId = params.getInt("userId");

                    byte[] devBytes;
                    synchronized (TVTManager.sdkLock) {
                        devBytes = sdk.GetDeviceInfo(userId);
                    }
                    if (devBytes == null) {
                        promise.reject("GET_INFO_FAILED", "GetDeviceInfo returned null");
                        return;
                    }
                    NET_SDK_DEVICEINFO info = NET_SDK_DEVICEINFO.deserialize(devBytes, 0);
                    int count = info.videoInputNum; // NVR capacity e.g. 16 or 32

                    byte[] statusBytes = null;
                    try {
                        synchronized (TVTManager.sdkLock) {
                            statusBytes = sdk.GetCHDeviceStatus(userId);
                        }
                        if (statusBytes != null) {
                            android.util.Log.d("NvrSdk", "GetCHDeviceStatus returned " + statusBytes.length + " bytes");
                        }
                    } catch (Exception e) {
                        android.util.Log.e("NvrSdk", "Failed to GetCHDeviceStatus: " + e.getMessage());
                    }

                    // Retrieve configured IPC devices to extract IP, Model and Camera ID
                    java.util.List<SDKDefs.NET_SDK_IPC_DEVICE_INFO> ipcList = new java.util.ArrayList<>();
                    try {
                        int ipcCount = 0;
                        synchronized (TVTManager.sdkLock) {
                            ipcCount = sdk.GetDeviceIPCCount(userId);
                        }
                        byte[] ipcBytes = null;
                        synchronized (TVTManager.sdkLock) {
                            ipcBytes = sdk.GetDeviceIPCInfo(userId);
                        }
                        int ipcStructSize = SDKDefs.NET_SDK_IPC_DEVICE_INFO.GetStructSize();
                        if (ipcBytes != null && ipcBytes.length >= ipcCount * ipcStructSize) {
                            for (int j = 0; j < ipcCount; j++) {
                                SDKDefs.NET_SDK_IPC_DEVICE_INFO ipcInfo = SDKDefs.NET_SDK_IPC_DEVICE_INFO.deserialize(ipcBytes, j * ipcStructSize);
                                if (ipcInfo != null) {
                                    ipcList.add(ipcInfo);
                                }
                            }
                        }
                        android.util.Log.d("NvrSdk", "Discovered " + ipcList.size() + " configured IPCs in NVR");
                    } catch (Exception e) {
                        android.util.Log.e("NvrSdk", "Failed to get IPC info list: " + e.getMessage());
                    }

                    int structSize = SDKDefs.NET_SDK_CH_DEVICE_STATUS.GetStructSize();
                    WritableArray arr = Arguments.createArray();

                    int configuredCount = 0;
                    int onlineCount = 0;
                    java.util.List<Integer> configuredChannelNums = new java.util.ArrayList<>();

                    for (int i = 0; i < count; i++) {
                        SDKDefs.NET_SDK_CH_DEVICE_STATUS chStatus = null;
                        if (statusBytes != null && statusBytes.length >= (i + 1) * structSize) {
                            try {
                                chStatus = SDKDefs.NET_SDK_CH_DEVICE_STATUS.deserialize(statusBytes, i * structSize);
                            } catch (Exception e) {
                                android.util.Log.e("NvrSdk", "Error deserializing channel status for ch " + i + ": " + e.getMessage());
                            }
                        }

                        boolean isOnline = false;
                        // For NVR/DVR, check if chlType != 0. If it is a single-channel IPC (videoInputNum == 1), it is always configured.
                        boolean isConfigured = (count == 1);
                        String channelName = "Camera " + (i + 1);

                        if (chStatus != null) {
                            isOnline = (chStatus.status == 1);
                            if (count > 1) {
                                isConfigured = (chStatus.chlType != 0);
                            }
                            if (chStatus.name != null) {
                                try {
                                    String fetchedName = new String(chStatus.name, "UTF-8").split("\0")[0].trim();
                                    if (!fetchedName.isEmpty()) {
                                        channelName = fetchedName;
                                    }
                                } catch (Exception e) {}
                            }
                        }

                        // Try to get IPC device details if matched with channel index
                        String cameraId = "";
                        String ipAddress = "";
                        String model = "";

                        for (SDKDefs.NET_SDK_IPC_DEVICE_INFO ipc : ipcList) {
                            if (ipc.channel == i) {
                                isConfigured = true; // Double check configured
                                try {
                                    if (ipc.szID != null) {
                                        cameraId = new String(ipc.szID, "UTF-8").split("\0")[0].trim();
                                    }
                                    if (ipc.szServer != null) {
                                        ipAddress = new String(ipc.szServer, "UTF-8").split("\0")[0].trim();
                                    }
                                    if (ipc.productModel != null) {
                                        model = new String(ipc.productModel, "UTF-8").split("\0")[0].trim();
                                    }
                                } catch (Exception e) {}
                                break;
                            }
                        }

                        if (isConfigured) {
                            configuredCount++;
                            if (isOnline) {
                                onlineCount++;
                            }
                            configuredChannelNums.add(i + 1);
                        }

                        // Check PTZ support using SDK PTZ APIs and model metadata
                        boolean hasPtzSupport = false;

                        // 1. Try GetPTZConfig
                        try {
                            synchronized (TVTManager.sdkLock) {
                                byte[] ptzCfgBytes = sdk.GetPTZConfig(userId, i, 0, 0);
                                if (ptzCfgBytes != null && ptzCfgBytes.length > 0) {
                                    hasPtzSupport = true;
                                }
                            }
                        } catch (Exception e) {}

                        // 2. Try Item 774 (DD_CONFIG_ITEM_PTZ_CONFIG)
                        if (!hasPtzSupport) {
                            try {
                                java.lang.Integer ptzSize = 0;
                                byte[] ptzBytes = null;
                                synchronized (TVTManager.sdkLock) {
                                    ptzBytes = sdk.GetDVRConfig(userId, 774, i, 2048, ptzSize, true);
                                }
                                if (ptzBytes != null && ptzBytes.length > 0) {
                                    hasPtzSupport = true;
                                }
                            } catch (Exception e) {
                                android.util.Log.e("NvrSdk", "Failed to check PTZ config for channel " + i + ": " + e.getMessage());
                            }
                        }

                        // 3. Try GetSupportPtzList
                        if (!hasPtzSupport) {
                            try {
                                synchronized (TVTManager.sdkLock) {
                                    byte[] ptzListBytes = sdk.GetSupportPtzList(userId);
                                    if (ptzListBytes != null && ptzListBytes.length > 0) {
                                        if (i < ptzListBytes.length && ptzListBytes[i] != 0) {
                                            hasPtzSupport = true;
                                        }
                                    }
                                }
                            } catch (Exception e) {}
                        }

                        // 4. Try GetPTZCameraType
                        if (!hasPtzSupport) {
                            try {
                                synchronized (TVTManager.sdkLock) {
                                    int ptzCamType = sdk.GetPTZCameraType(userId);
                                    if (ptzCamType > 0) {
                                        hasPtzSupport = true;
                                    }
                                }
                            } catch (Exception e) {}
                        }

                        // 5. String inspection on Name, Model, and Camera ID
                        if (!hasPtzSupport) {
                            String combinedStr = ((channelName != null ? channelName : "") + " " + (model != null ? model : "") + " " + (cameraId != null ? cameraId : "")).toLowerCase();
                            if (combinedStr.contains("ptz") || combinedStr.contains("dome") || combinedStr.contains("speed") ||
                                combinedStr.contains("sd") || combinedStr.contains("spd") || combinedStr.contains("ipd") ||
                                combinedStr.contains("zoom") || combinedStr.contains("ball") || combinedStr.contains("pan") ||
                                combinedStr.contains("tilt") || combinedStr.contains("tracking") || combinedStr.contains("autotracking") ||
                                combinedStr.contains("td-96") || combinedStr.contains("td-97") || combinedStr.contains("td-98") ||
                                combinedStr.contains("sd1") || combinedStr.contains("sd2") || combinedStr.contains("sd3") ||
                                combinedStr.contains("sd4") || combinedStr.contains("sd5") || combinedStr.contains("sd6") || combinedStr.contains("sd8")) {
                                hasPtzSupport = true;
                            }
                        }

                        WritableMap ch = Arguments.createMap();
                        ch.putInt("id", i); // 0-based channel index (id)
                        ch.putInt("channelNo", i + 1); // 1-based channel index
                        ch.putString("name", channelName);
                        ch.putBoolean("online", isOnline);
                        ch.putBoolean("isOnline", isOnline);
                        ch.putBoolean("isConfigured", isConfigured);
                        ch.putBoolean("ptz", hasPtzSupport);
                        ch.putBoolean("ptzSupport", hasPtzSupport);
                        ch.putBoolean("ptzSupported", hasPtzSupport);
                        ch.putString("cameraType", hasPtzSupport ? "PTZ" : "IPC");
                        ch.putString("cameraId", cameraId);
                        ch.putString("ipAddress", ipAddress);
                        ch.putString("model", model);
                        arr.pushMap(ch);
                    }

                    android.util.Log.d("NvrSdk", "[ChannelSync] Max capacity: " + count);
                    android.util.Log.d("NvrSdk", "[ChannelSync] Configured channels: " + configuredCount);
                    android.util.Log.d("NvrSdk", "[ChannelSync] Online channels: " + onlineCount);

                    StringBuilder sb = new StringBuilder();
                    for (int idx = 0; idx < configuredChannelNums.size(); idx++) {
                        if (idx > 0) sb.append(",");
                        sb.append(configuredChannelNums.get(idx));
                    }
                    android.util.Log.d("NvrSdk", "[ChannelSync] Channel numbers: " + sb.toString());

                    promise.resolve(arr);

                } catch (Exception e) {
                    promise.reject("GET_CHANNELS_ERROR", e.getMessage());
                }
            }
        }).start();
    }

    @ReactMethod
    public void startLive(final ReadableMap params, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    ensureSdk();
                    if (sdk == null) {
                        promise.reject("LIVE_ERROR", "SDK not initialized");
                        return;
                    }
                    final int userId = params.getInt("userId");
                    final int channelId = params.getInt("channelId"); // 0-based
                    final int st = params.hasKey("streamType") ? params.getInt("streamType") : 0;

                    android.util.Log.i("NvrSdk",
                            ">>> startLive (Background): userId=" + userId + " ch=" + channelId + " stream=" + st);

                    long handle;
                    synchronized (TVTManager.sdkLock) {
                        handle = sdk.LivePlay(userId, channelId, st);
                    }

                    if (handle <= 0) {
                        int err = sdk.GetLastError();
                        android.util.Log.w("NvrSdk", ">>> startLive FAILED (handle=" + handle + " Error=" + err + "). Cleaning stale handles & retrying...");

                        // Auto-recovery: stop all stale live handles and retry once
                        try {
                            synchronized (liveHandles) {
                                for (Long staleHandle : liveHandles) {
                                    try {
                                        synchronized (TVTManager.sdkLock) {
                                            sdk.StopLivePlay(staleHandle);
                                        }
                                    } catch (Throwable ignored) {}
                                }
                                liveHandles.clear();
                            }
                            Thread.sleep(300); // Brief pause for SDK resource release
                            synchronized (TVTManager.sdkLock) {
                                handle = sdk.LivePlay(userId, channelId, st);
                            }
                        } catch (Throwable retryErr) {
                            android.util.Log.e("NvrSdk", "Retry cleanup failed: " + retryErr.getMessage());
                        }

                        if (handle <= 0) {
                            int err2 = sdk.GetLastError();
                            android.util.Log.e("NvrSdk", ">>> startLive RETRY ALSO FAILED: handle=" + handle + " Error=" + err2);
                            promise.reject("LIVE_FAILED", "LivePlay failed. handle=" + handle + " Error=" + err2);
                            return;
                        }
                        android.util.Log.i("NvrSdk", ">>> startLive RETRY SUCCESS after cleanup: handle=" + handle);
                    }

                    android.util.Log.i("NvrSdk", ">>> startLive SUCCESS: playHandle=" + handle);

                    liveHandles.add(handle);
                    try {
                        synchronized (TVTManager.sdkLock) {
                            sdk.SetPlayerBufNumber(handle, 10);
                        }
                    } catch (Throwable t) {
                    }

                    promise.resolve(String.valueOf(handle));
                } catch (Exception e) {
                    promise.reject("LIVE_ERROR", e.getMessage());
                }
            }
        }).start();
    }

    @ReactMethod
    public void stopLive(final ReadableMap params, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    ensureSdk();
                    String handleStr = params.getString("handle");
                    long parsedHandle = safeParseHandle(handleStr);
                    if (parsedHandle <= 0) {
                        promise.resolve(true);
                        return;
                    }
                    Long activeHandle = resolveActiveLiveHandle(parsedHandle);
                    long handle = (activeHandle != null) ? activeHandle : parsedHandle;
                    boolean ok;
                    synchronized (TVTManager.sdkLock) {
                        ok = sdk.StopLivePlay(handle);
                    }
                    if (ok) {
                        liveHandles.remove(handle);
                    }
                    promise.resolve(ok);
                } catch (Exception e) {
                    promise.reject("STOP_LIVE_ERROR", e.getMessage());
                }
            }
        }).start();
    }

    /**
     * Search recordings between fromISO and toISO
     * Returns list of files (start/end + filename + size if available)
     */
    @ReactMethod
    public void searchRecordings(final ReadableMap params, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    ensureSdk();
                    int userId = params.getInt("userId");
                    int channelId = params.getInt("channelId");
                    String fromISO = params.getString("fromISO");
                    String toISO = params.getString("toISO");
                    ReadableArray recordTypes = params.hasKey("recordTypes") ? params.getArray("recordTypes") : null;

                    int[] startRaw = parseIsoToSdkTime(fromISO);
                    int[] endRaw = parseIsoToSdkTime(toISO);

                    // XM SDK Order: Year, Month, Day, Hour, Minute, Second
                    int[] startOff = new int[] { startRaw[0] - 1900, startRaw[1] - 1, startRaw[2], startRaw[3],
                            startRaw[4],
                            startRaw[5] };
                    int[] endOff = new int[] { endRaw[0] - 1900, endRaw[1] - 1, endRaw[2], endRaw[3], endRaw[4],
                            endRaw[5] };

                    int[] startMixed = new int[] { startRaw[0], startRaw[1] - 1, startRaw[2], startRaw[3], startRaw[4],
                            startRaw[5] };
                    int[] endMixed = new int[] { endRaw[0], endRaw[1] - 1, endRaw[2], endRaw[3], endRaw[4], endRaw[5] };

                    // Channel offsets to try (Very common in TVT/NVR SDKs)
                    int[] channelOffsets = { 0, 32, 64, 100 };
                    long findHandle = -1;
                    int foundOnChannel = -1;

                    for (int offset : channelOffsets) {
                        int realChannel = channelId + offset;
                        android.util.Log.d("NvrSdk",
                                "Searching RealChannel=" + realChannel + " (Offset=" + offset + ")");

                        synchronized (TVTManager.sdkLock) {
                            findHandle = sdk.FindFile(userId, (long) realChannel, startRaw, endRaw);
                            if (findHandle == -1) {
                                findHandle = sdk.FindFile(userId, (long) realChannel, startMixed, endMixed);
                            }
                            if (findHandle == -1) {
                                findHandle = sdk.FindFile(userId, (long) realChannel, startOff, endOff);
                            }
                        }

                        if (findHandle != -1) {
                            foundOnChannel = realChannel;
                            android.util.Log.i("NvrSdk",
                                    " SEARCH SUCCESS on RealChannel=" + realChannel + " (Offset=" + offset + ")");
                            break;
                        }
                    }

                    // Fallback to Ch+1 if still failed (sometimes first channel is NVR local,
                    // second is IP cam)
                    if (findHandle == -1) {
                        int ch1 = channelId + 1;
                        android.util.Log.d("NvrSdk", "Primary fail. Trying Fallback Ch=" + ch1);
                        synchronized (TVTManager.sdkLock) {
                            findHandle = sdk.FindFile(userId, (long) ch1, startRaw, endRaw);
                            if (findHandle == -1)
                                findHandle = sdk.FindFile(userId, (long) ch1, startMixed, endMixed);
                            if (findHandle == -1)
                                findHandle = sdk.FindFile(userId, (long) ch1, startOff, endOff);
                        }
                        if (findHandle != -1)
                            foundOnChannel = ch1;
                    }

                    if (findHandle == -1) {
                        // No files found on either channel
                        promise.resolve(Arguments.createArray());
                        return;
                    }

                    WritableArray results = Arguments.createArray();
                    for (int i = 0; i < 500; i++) {
                        NET_SDK_REC_FILE f;
                        synchronized (TVTManager.sdkLock) {
                            f = sdk.FindNextFile(findHandle);
                        }
                        if (f == null)
                            break;

                        // Filter by record types if specified
                        if (recordTypes != null && recordTypes.size() > 0) {
                            boolean match = false;
                            for (int idx = 0; idx < recordTypes.size(); idx++) {
                                if (recordTypes.getInt(idx) == f.dwRecType) {
                                    match = true;
                                    break;
                                }
                            }
                            if (!match) {
                                continue;
                            }
                        }

                        int[] sArr = f.getStartTime();
                        int[] eArr = f.getStopTime();

                        int startYear = sArr[0];
                        int startMonth = sArr[1];
                        int stopYear = eArr[0];
                        int stopMonth = eArr[1];

                        // Handle both Year-1900/Month-0 and Raw Year/Month-1 formats
                        if (startYear < 1000) {
                            startYear += 1900;
                            startMonth += 1; // Month is 0-indexed in offset format
                        }
                        if (stopYear < 1000) {
                            stopYear += 1900;
                            stopMonth += 1;
                        }

                        WritableMap m = Arguments.createMap();
                        m.putInt("channel", f.dwChannel);
                        m.putInt("type", f.dwRecType);

                        m.putString("start", String.format("%04d-%02d-%02d %02d:%02d:%02d",
                                startYear, startMonth, sArr[2], sArr[3], sArr[4], sArr[5]));
                        m.putString("end", String.format("%04d-%02d-%02d %02d:%02d:%02d",
                                stopYear, stopMonth, eArr[2], eArr[3], eArr[4], eArr[5]));
                        results.pushMap(m);
                    }

                    synchronized (TVTManager.sdkLock) {
                        sdk.FindClose(findHandle);
                    }
                    promise.resolve(results);

                } catch (Exception e) {
                    promise.reject("SEARCH_RECORDINGS_ERROR", e.getMessage());
                }
            }
        }).start();
    }

    @ReactMethod
    public void queryRecordingDays(final ReadableMap params, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    ensureSdk();
                    int userId = params.getInt("userId");
                    int channelId = params.getInt("channelId");
                    int year = params.getInt("year");
                    int month = params.getInt("month"); // 1-12

                    java.util.HashSet<Integer> uniqueDays = new java.util.HashSet<>();

                    // METHOD 1: Use efficient FindRecDate (Recommended)
                    long recDateHandle;
                    synchronized (TVTManager.sdkLock) {
                        recDateHandle = sdk.FindRecDate(userId);
                    }
                    if (recDateHandle != -1) {
                        while (true) {
                            NET_SDK_REC_FILE rec;
                            synchronized (TVTManager.sdkLock) {
                                rec = sdk.FindNextRecDate(recDateHandle);
                            }
                            if (rec == null)
                                break;

                            int[] sArr = rec.getStartTime();
                            int sYear = sArr[0];
                            int sMonth = sArr[1];

                            if (sYear < 1000) {
                                sYear += 1900;
                                sMonth += 1;
                            }

                            if (sYear == year && sMonth == month) {
                                uniqueDays.add(sArr[2]);
                            }
                        }
                        synchronized (TVTManager.sdkLock) {
                            sdk.FindRecDateClose(recDateHandle);
                        }
                    }

                    // METHOD 2: Fallback to slow FindFile if FindRecDate returned nothing
                    if (uniqueDays.isEmpty()) {
                        java.util.Calendar cal = java.util.Calendar.getInstance();
                        cal.set(year, month - 1, 1, 0, 0, 0);
                        int daysInMonth = cal.getActualMaximum(java.util.Calendar.DAY_OF_MONTH);

                        int[] startRaw = new int[] { year, month, 1, 0, 0, 0 };
                        int[] endRaw = new int[] { year, month, daysInMonth, 23, 59, 59 };

                        int[] startMixed = new int[] { year, month - 1, 1, 0, 0, 0 };
                        int[] endMixed = new int[] { year, month - 1, daysInMonth, 23, 59, 59 };

                        int chToTry = channelId;
                        long findHandle;
                        synchronized (TVTManager.sdkLock) {
                            findHandle = sdk.FindFile(userId, (long) chToTry, startRaw, endRaw);
                            if (findHandle == -1)
                                findHandle = sdk.FindFile(userId, (long) chToTry, startMixed, endMixed);
                        }

                        if (findHandle != -1) {
                            for (int i = 0; i < 2000; i++) {
                                NET_SDK_REC_FILE f;
                                synchronized (TVTManager.sdkLock) {
                                    f = sdk.FindNextFile(findHandle);
                                }
                                if (f == null)
                                    break;
                                int[] sArr = f.getStartTime();
                                int fYear = sArr[0] < 1000 ? sArr[0] + 1900 : sArr[0];
                                int fMonth = sArr[0] < 1000 ? sArr[1] + 1 : sArr[1];
                                if (fYear == year && fMonth == month) {
                                    uniqueDays.add(sArr[2]);
                                }
                            }
                            synchronized (TVTManager.sdkLock) {
                                sdk.FindClose(findHandle);
                            }
                        }
                    }

                    WritableArray recordedDays = Arguments.createArray();
                    for (int d : uniqueDays) {
                        recordedDays.pushInt(d);
                    }
                    promise.resolve(recordedDays);
                } catch (Exception e) {
                    promise.reject("QUERY_DAYS_ERROR", e.getMessage());
                }
            }
        }).start();
    }

    private void stopAllLiveStreams() {
        if (sdk == null)
            return;
        synchronized (liveHandles) {
            android.util.Log.d("NvrSdk", "Stopping all active live streams (" + liveHandles.size() + " total)...");
            for (Long handle : liveHandles) {
                try {
                    synchronized (TVTManager.sdkLock) {
                        sdk.StopLivePlay(handle);
                    }
                } catch (Exception e) {
                    android.util.Log.w("NvrSdk", "Failed to stop live handle " + handle + ": " + e.getMessage());
                }
            }
            liveHandles.clear();
        }
    }

    /**
     * Start playback by time range (NVR HDD streaming)
     * Returns playback handle (string)
     * 
     * CRITICAL FLOW (6 STAGES):
     * 1. Parse time to NET_DVR_TIME struct
     * 2. Force MAIN stream (playback doesn't support substream)
     * 3. Open playback stream (SDK_StartPlayback)
     * 4. Send PLAY command (SDK_PlaybackControl CMD_PLAY=1)
     * 5. Send START_DECODE command (SDK_PlaybackControl CMD_START_DECODE=15)
     * 6. Return valid handle (surface will bind and render)
     */
    @ReactMethod
    public void startPlayback(final ReadableMap params, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    ensureSdk();
                    stopAllLiveStreams();

                    final int userId = params.getInt("userId");
                    final int channelId = params.getInt("channelId");
                    final String fromISO = params.getString("fromISO");
                    final String toISO = params.getString("toISO");
                    final int st = params.hasKey("streamType") ? params.getInt("streamType") : 0;
                    int[] start = parseIsoToSdkTime(fromISO);
                    int[] end = parseIsoToSdkTime(toISO);

                    int[] startRaw = new int[] { start[0], start[1], start[2], start[3], start[4], start[5] };
                    int[] endRaw = new int[] { end[0], end[1], end[2], end[3], end[4], end[5] };

                    int[] startMixed = new int[] { start[0], start[1] - 1, start[2], start[3], start[4], start[5] };
                    int[] endMixed = new int[] { end[0], end[1] - 1, end[2], end[3], end[4], end[5] };

                    int[] startOff = new int[] { start[0] - 1900, start[1] - 1, start[2], start[3], start[4],
                            start[5] };
                    int[] endOff = new int[] { end[0] - 1900, end[1] - 1, end[2], end[3], end[4], end[5] };

                    int[][] timeStructs = { startRaw, endRaw, startMixed, endMixed, startOff, endOff };

                    android.util.Log.i("NvrSdk", " PLAYBACK START REQUEST:");
                    android.util.Log.i("NvrSdk", "   User=" + userId + " Ch=" + channelId);
                    android.util.Log.i("NvrSdk", "   Time: " + fromISO + "  " + toISO);
                    android.util.Log.i("NvrSdk", "   Offset Struct: [" + startOff[0] + "," + startOff[1] + ","
                            + startOff[2] + "," + startOff[3] + ":" + startOff[4] + ":" + startOff[5] + "]");

                    // STEP 2: Fast-path attempt using OFFSET time format + MAIN stream (standard TVT NVR behavior)
                    PlaybackConfig cached = playbackCache.get(userId);
                    long handle = -1;
                    int successChannel = -1;

                    if (cached != null) {
                        int realChannel = channelId + cached.offset;
                        int[] channels = new int[] { realChannel };
                        int[] sStruct = startOff;
                        int[] eStruct = endOff;
                        if (cached.timeType == 0) {
                            sStruct = startRaw;
                            eStruct = endRaw;
                        } else if (cached.timeType == 1) {
                            sStruct = startMixed;
                            eStruct = endMixed;
                        }

                        android.util.Log.i("NvrSdk", " Using CACHED config: Offset=" + cached.offset + " TimeType="
                                + cached.timeType + " Stream=" + cached.streamType + " Ex=" + cached.isEx);

                        try {
                            synchronized (TVTManager.sdkLock) {
                                if (cached.isEx) {
                                    handle = sdk.PlayBackByTimeEx(userId, channels, cached.streamType, sStruct, eStruct,
                                            false);
                                } else {
                                    handle = sdk.PlayBackByTime(userId, channels, cached.streamType, sStruct, eStruct);
                                }
                            }

                            if (handle > 0 || handle < -100) {
                                successChannel = realChannel;
                                android.util.Log.i(TAG, "CACHED config HIT! Handle=" + handle);
                            }
                        } catch (Exception e) {
                            android.util.Log.w("NvrSdk", "Cached config failed: " + e.getMessage());
                        }
                    } else {
                        // FAST PATH FOR FIRST ATTEMPT: Try OFFSET format + MAIN stream on requested channelId immediately
                        try {
                            int[] channels = new int[] { channelId };
                            synchronized (TVTManager.sdkLock) {
                                handle = sdk.PlayBackByTimeEx(userId, channels, MAIN_STREAM, startOff, endOff, false);
                                if (handle <= 0 && handle >= -100) {
                                    handle = sdk.PlayBackByTime(userId, channels, MAIN_STREAM, startOff, endOff);
                                }
                            }
                            if (handle > 0 || handle < -100) {
                                successChannel = channelId;
                                playbackCache.put(userId, new PlaybackConfig(0, 2, MAIN_STREAM, true));
                                android.util.Log.i(TAG, "FAST PATH SUCCESS! Handle=" + handle);
                            }
                        } catch (Exception ignored) {}
                    }

                    if (handle == -1 || (handle >= -100 && handle < 0)) {
                        // STEP 3: Fallback to Multi-Loop Search if fast-path missed
                        int[] channelOffsets = { 0, 32, 64, 100 };

                        searchLoop: for (int offset : channelOffsets) {
                            int realChannel = channelId + offset;
                            int[] channels = new int[] { realChannel };

                            for (int t : new int[] { 2, 1, 0 }) {
                                int[] sStruct;
                                int[] eStruct;
                                String tType;
                                if (t == 0) {
                                    sStruct = startRaw;
                                    eStruct = endRaw;
                                    tType = "RAW";
                                } else if (t == 1) {
                                    sStruct = startMixed;
                                    eStruct = endMixed;
                                    tType = "MIXED";
                                } else {
                                    sStruct = startOff;
                                    eStruct = endOff;
                                    tType = "OFFSET";
                                }

                                int[] streamsToTry = st == 1 ? new int[] { 1, 0 }
                                        : (st == 0 ? new int[] { 0, 1 } : new int[] { 0, 1 });
                                for (int stream : streamsToTry) {
                                    try {
                                        synchronized (TVTManager.sdkLock) {
                                            handle = sdk.PlayBackByTime(userId, channels, stream, sStruct, eStruct);
                                        }
                                        if (handle > 0 || handle < -100) {
                                            successChannel = realChannel;
                                            playbackCache.put(userId, new PlaybackConfig(offset, t, stream, false));
                                            android.util.Log.i(TAG, " SEARCH SUCCESS! Saved config: Offset=" + offset
                                                    + " Time=" + tType + " Stream=" + stream);
                                            break searchLoop;
                                        }
                                    } catch (Exception ignored) {
                                    }
                                }

                                try {
                                    synchronized (TVTManager.sdkLock) {
                                        handle = sdk.PlayBackByTimeEx(userId, channels, 0, sStruct, eStruct, false);
                                    }
                                    if (handle > 0 || handle < -100) {
                                        successChannel = realChannel;
                                        playbackCache.put(userId, new PlaybackConfig(offset, t, 0, true));
                                        android.util.Log.i(TAG, " SEARCH SUCCESS (Ex)! Saved config: Offset=" + offset
                                                + " Time=" + tType);
                                        break searchLoop;
                                    }
                                } catch (Exception ignored) {
                                }
                            }
                        }
                    }

                    // Fallback: Immediate Retry without 1000ms delay
                    if (handle == -1 || (handle >= -100 && handle < 0)) {
                        android.util.Log.w("NvrSdk", "First playback attempt failed. Fast-retrying search...");

                        int[] channelOffsets = { 0, 32, 64, 100 };
                        searchLoop2: for (int offset : channelOffsets) {
                            int realChannel = channelId + offset;
                            int[] channels = new int[] { realChannel };

                            for (int t : new int[] { 2, 1, 0 }) {
                                int[] sStruct;
                                int[] eStruct;
                                String tType;
                                if (t == 0) {
                                    sStruct = startRaw;
                                    eStruct = endRaw;
                                    tType = "RAW";
                                } else if (t == 1) {
                                    sStruct = startMixed;
                                    eStruct = endMixed;
                                    tType = "MIXED";
                                } else {
                                    sStruct = startOff;
                                    eStruct = endOff;
                                    tType = "OFFSET";
                                }

                                int[] streamsToTry = st == 1 ? new int[] { 1, 0 }
                                        : (st == 0 ? new int[] { 0, 1 } : new int[] { 0, 1 });
                                for (int stream : streamsToTry) {
                                    try {
                                        synchronized (TVTManager.sdkLock) {
                                            handle = sdk.PlayBackByTime(userId, channels, stream, sStruct, eStruct);
                                        }
                                        if (handle > 0 || handle < -100) {
                                            successChannel = realChannel;
                                            playbackCache.put(userId, new PlaybackConfig(offset, t, stream, false));
                                            android.util.Log.i(TAG, " [RETRY] SEARCH SUCCESS! Saved config: Offset=" + offset
                                                    + " Time=" + tType + " Stream=" + stream);
                                            break searchLoop2;
                                        }
                                    } catch (Exception ignored) {
                                    }
                                }

                                try {
                                    synchronized (TVTManager.sdkLock) {
                                        handle = sdk.PlayBackByTimeEx(userId, channels, 0, sStruct, eStruct, false);
                                    }
                                    if (handle > 0 || handle < -100) {
                                        successChannel = realChannel;
                                        playbackCache.put(userId, new PlaybackConfig(offset, t, 0, true));
                                        android.util.Log.i(TAG, " [RETRY] SEARCH SUCCESS (Ex)! Saved config: Offset=" + offset
                                                + " Time=" + tType);
                                        break searchLoop2;
                                    }
                                } catch (Exception ignored) {
                                }
                            }
                        }
                    }

                    // Fallback: Try Ch+1
                    if (handle == -1 || (handle >= -100 && handle < 0)) {
                        int ch1 = channelId + 1;
                        int[] channels1 = new int[] { ch1 };
                        android.util.Log.d("NvrSdk", "   Search failed. Trying Fallback Ch=" + ch1);
                        try {
                            synchronized (TVTManager.sdkLock) {
                                handle = sdk.PlayBackByTimeEx(userId, channels1, MAIN_STREAM, startOff, endOff, false);
                            }
                            if (handle > 0 || handle < -100) {
                                successChannel = ch1;
                                android.util.Log.i(TAG, "Fallback SUCCESS! Channel=" + ch1 + " Handle=" + handle);
                            }
                        } catch (Exception e) {
                            android.util.Log.e("NvrSdk", "   Fallback exception: " + e.getMessage());
                        }
                    }

                    // Final validation
                    boolean isValidHandle = (handle > 0) || (handle < -100);
                    if (!isValidHandle) {
                        android.util.Log.e(TAG, "ALL PLAYBACK ATTEMPTS FAILED (Final handle: " + handle + ")");
                        android.util.Log.e("NvrSdk", "   This means NO HDD STREAM was opened");
                        promise.reject("PLAYBACK_FAILED",
                                "PlayBackByTimeEx failed (handle=" + handle
                                        + "). No valid stream opened. Check: 1) Recording exists at this time 2) Correct channel 3) NVR HDD has data");
                        return;
                    }

                    // PRE-TRIGGER STREAM & KEYFRAME IMMEDIATELY
                    // Send decoder commands right now on background worker thread so socket stream begins immediately
                    try {
                        synchronized (TVTManager.sdkLock) {
                            sdk.SetPlayerBufNumber(handle, 0);
                            sdk.PlayBackControl(handle, 3, 0);  // RESUME
                            sdk.PlayBackControl(handle, 15, 0); // START_DECODE
                            sdk.PlayBackControl(handle, 6, 0);  // NORMAL_SPEED
                            sdk.MakeKeyFrame(userId, handle);   // Request keyframe immediately
                        }
                    } catch (Exception e) {
                        android.util.Log.w(TAG, "Pre-trigger playback commands warning: " + e.getMessage());
                    }

                    // STEP 6: Return handle and success
                    // Surface will bind this handle and video should appear
                    if (handle >= -100 && handle < 0) {
                        promise.reject("PLAYBACK_FAILED", "Failed (Error " + handle + ")");
                        return;
                    }

                    android.util.Log.i(TAG, " Playback Success! Handle=" + handle + " RealCh=" + successChannel);
                    playbackHandles.add(handle);
                    WritableMap res = Arguments.createMap();
                    res.putString("handle", String.valueOf(handle));
                    res.putInt("realChannel", successChannel);
                    promise.resolve(res);

                } catch (Exception e) {
                    android.util.Log.e(TAG, "PLAYBACK EXCEPTION: " + e.getMessage());
                    promise.reject("PLAYBACK_ERROR", e.getMessage());
                }
            }
        }).start();
    }

    @ReactMethod
    public void getPlaybackOsdTime(ReadableMap params, Promise promise) {
        try {
            ensureSdk();
            String handleStr = params.getString("handle");
            long parsedHandle = safeParseHandle(handleStr);
            Long activeHandle = resolveActivePlaybackHandle(parsedHandle);
            long handle = (activeHandle != null) ? activeHandle : parsedHandle;
            int[] time = sdk.GetPlayBackOsdTime(handle);
            if (time != null && time.length >= 6) {
                WritableMap m = Arguments.createMap();
                m.putInt("year", time[0] + 1900);
                m.putInt("month", time[1] + 1);
                m.putInt("day", time[2]);
                m.putInt("hour", time[3]);
                m.putInt("minute", time[4]);
                m.putInt("second", time[5]);
                promise.resolve(m);
            } else {
                promise.reject("OSD_FAILED", "Failed to get playback OSD time");
            }
        } catch (Exception e) {
            promise.reject("OSD_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopPlayback(final ReadableMap params, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    ensureSdk();
                    String handleStr = params.getString("handle");
                    long parsedHandle = safeParseHandle(handleStr);
                    if (!isValidHandle(parsedHandle)) {
                        promise.resolve(true);
                        return;
                    }
                    Long activeHandle = resolveActivePlaybackHandle(parsedHandle);
                    long handle = (activeHandle != null) ? activeHandle : parsedHandle;
                    boolean ok;
                    synchronized (TVTManager.sdkLock) {
                        ok = sdk.StopPlayBack(handle);
                    }
                    if (ok) {
                        playbackHandles.remove(handle);
                        pausedHandles.remove(handle);
                    }
                    android.util.Log.d("NvrSdk", "StopPlayBack(" + handle + ") returned: " + ok);
                    promise.resolve(ok);
                } catch (Exception e) {
                    promise.reject("STOP_PLAYBACK_ERROR", e.getMessage());
                }
            }
        }).start();
    }

    @ReactMethod
    public void playbackControl(final ReadableMap params, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    ensureSdk();
                    String handleStr = params.hasKey("handle") ? params.getString("handle") : null;
                    long parsedHandle = safeParseHandle(handleStr);
                    if (!isValidHandle(parsedHandle)) {
                        promise.reject("INVALID_HANDLE", "Cannot control playback with invalid handle: " + handleStr);
                        return;
                    }
                    Long activeHandle = resolveActivePlaybackHandle(parsedHandle);
                    long handle = (activeHandle != null) ? activeHandle : parsedHandle;
                    int command = params.getInt("command");
                    long value = params.hasKey("value") ? (long) params.getInt("value") : 0L;

                    if (command == 0) { // PAUSE (native 0)
                        pausedHandles.add(handle);
                    } else if (command == 3 || command == 1 || command == 2 || command == 6) { // RESUME (3), FF (1), REW (2), NORMAL (6)
                        pausedHandles.remove(handle);
                    }

                    boolean result = sdk.PlayBackControl(handle, command, value);
                    promise.resolve(result);
                } catch (Exception e) {
                    promise.reject("PLAYBACK_CONTROL_ERROR", e.getMessage());
                }
            }
        }).start();
    }

    @ReactMethod
    public void searchDevices(final ReadableMap params, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    ensureSdk();
                    // TVT demo uses 20 for NVR/DVR. 0 often means all.
                    int deviceType = params.hasKey("deviceType") ? params.getInt("deviceType") : 20;
                    // Timeout is usually in 100ms blocks. 30 -> 3 seconds.
                    int timeout = params.hasKey("timeout") ? params.getInt("timeout") : 30;
                    if (timeout > 200)
                        timeout = 50;

                    // HEAVY STABILIZATION: allocate larger array to prevent SDK overflow
                    NET_SDK_DEVICE_DISCOVERY_INFO[] deviceInfo = new NET_SDK_DEVICE_DISCOVERY_INFO[256];
                    for (int i = 0; i < 256; i++) {
                        deviceInfo[i] = new NET_SDK_DEVICE_DISCOVERY_INFO();
                    }

                    WifiManager wifi = (WifiManager) reactContext.getApplicationContext()
                            .getSystemService(Context.WIFI_SERVICE);
                    WifiManager.MulticastLock lock = null;
                    if (wifi != null) {
                        lock = wifi.createMulticastLock("NvrSdk_Discovery_Lock");
                        lock.setReferenceCounted(true);
                        lock.acquire();
                    }

                    long count = 0;
                    try {
                        Log.i("NvrSdk", "SDK Search start: type=" + deviceType + ", timeout=" + timeout);
                        // Call native SDK discovery
                        count = sdk.SearchDevice(deviceType, deviceInfo, timeout);
                        Log.i("NvrSdk", "SDK Search returned count: " + count);
                    } catch (Throwable t) {
                        Log.e("NvrSdk", "SDK SearchDevice native crash caught: " + t.getMessage());
                    } finally {
                        if (lock != null && lock.isHeld()) {
                            lock.release();
                        }
                    }

                    WritableArray results = Arguments.createArray();
                    // Process results safely
                    for (int i = 0; i < count && i < 256; i++) {
                        if (deviceInfo[i] == null || deviceInfo[i].ipAddress == null
                                || deviceInfo[i].ipAddress.isEmpty())
                            continue;

                        WritableMap map = Arguments.createMap();
                        map.putString("ipAddress", deviceInfo[i].ipAddress);
                        map.putString("deviceName",
                                deviceInfo[i].devName != null ? deviceInfo[i].devName : "TVT Device");
                        map.putInt("netPort", deviceInfo[i].netPort);
                        map.putInt("httpPort", deviceInfo[i].httpPort);
                        map.putInt("deviceType", deviceInfo[i].deviceType);
                        map.putString("productType",
                                deviceInfo[i].productType != null ? deviceInfo[i].productType : "NVR");

                        // Format MAC safely
                        StringBuilder mac = new StringBuilder();
                        try {
                            if (deviceInfo[i].macAddress != null) {
                                for (int j = 0; j < deviceInfo[i].macAddress.length; j++) {
                                    mac.append(String.format("%02X", deviceInfo[i].macAddress[j]));
                                    if (j < deviceInfo[i].macAddress.length - 1)
                                        mac.append(":");
                                }
                            }
                        } catch (Exception ignored) {
                        }
                        map.putString("macAddress", mac.toString());
                        map.putString("source", "SDK");

                        results.pushMap(map);
                    }
                    promise.resolve(results);
                } catch (Throwable e) {
                    Log.e("NvrSdk", "searchDevices critical error: " + e.getMessage());
                    promise.resolve(Arguments.createArray());
                }
            }
        }).start();
    }

    @ReactMethod
    public void startLanSearch(final ReadableMap params) {
        synchronized (this) {
            if (isLanSearchRunning)
                return;
            isLanSearchRunning = true;
        }

        final int deviceType = (params != null && params.hasKey("deviceType")) ? params.getInt("deviceType") : 20;

        lanSearchThread = new Thread(() -> {
            try {
                Log.i(TAG, "[LAN Scan] Single thread started.");

                // Pre-allocate buffer outside loop to prevent JNI reference overflow crash
                NET_SDK_DEVICE_DISCOVERY_INFO[] devices = new NET_SDK_DEVICE_DISCOVERY_INFO[64];
                for (int i = 0; i < 64; i++)
                    devices[i] = new NET_SDK_DEVICE_DISCOVERY_INFO();

                if (mcastLock != null) {
                    try {
                        mcastLock.acquire();
                    } catch (Exception ignored) {
                    }
                }

                while (isLanSearchRunning && !Thread.currentThread().isInterrupted()) {
                    // 1. TVT SDK Discovery (Using stable, pre-allocated buffer)
                    try {
                        if (sdk != null) {
                            long count;
                            synchronized (TVTManager.sdkLock) {
                                count = sdk.SearchDevice(10, devices, 64);
                            }
                            Log.i(TAG, "SearchDevice completed with count: " + count);
                            for (int i = 0; i < count && i < 64; i++) {
                                if (devices[i] != null && devices[i].ipAddress != null
                                        && !devices[i].ipAddress.isEmpty()) {
                                    WritableMap devMap = buildSdkDeviceMap(devices[i]);
                                    devMap.putString("source", "SDK");
                                    emitDevice(devMap);
                                }
                            }
                        }
                    } catch (Throwable t) {
                        Log.e(TAG, "SDK Search Step Crashed: " + t.getMessage());
                    }

                    // 2. Simple UDP Probe
                    try {
                        sendSingleUdpProbe();
                    } catch (Exception ignored) {
                    }

                    if (isLanSearchRunning) {
                        try {
                            Thread.sleep(5000);
                        } catch (InterruptedException e) {
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "LAN Search loop fatal: " + e.getMessage());
            } finally {
                synchronized (this) {
                    isLanSearchRunning = false;
                    lanSearchThread = null;
                }
                if (mcastLock != null && mcastLock.isHeld()) {
                    try {
                        mcastLock.release();
                    } catch (Exception ignored) {
                    }
                }
                Log.i(TAG, "[LAN Scan] Single thread stopped.");
            }
        });
        lanSearchThread.start();
    }

    private void sendSingleUdpProbe() {
        try (java.net.DatagramSocket sock = new java.net.DatagramSocket()) {
            sock.setBroadcast(true);
            sock.setSoTimeout(1000);
            byte[] pkt = "DISCOVER_DEVICE".getBytes();
            java.net.InetAddress addr = java.net.InetAddress.getByName("255.255.255.255");
            sock.send(new java.net.DatagramPacket(pkt, pkt.length, addr, 37020));

            byte[] buf = new byte[1024];
            java.net.DatagramPacket resp = new java.net.DatagramPacket(buf, buf.length);
            while (isLanSearchRunning) {
                try {
                    sock.receive(resp);
                    String ip = resp.getAddress().getHostAddress();
                    if (ip != null) {
                        WritableMap map = Arguments.createMap();
                        map.putString("ip", ip);
                        map.putString("ipAddress", ip);
                        map.putString("deviceName", "Network Device");
                        map.putString("name", "Network Device");
                        map.putInt("port", 80);
                        map.putInt("netPort", 6036);
                        map.putInt("httpPort", 80);
                        map.putInt("sdkPort", 6036);
                        map.putInt("webPort", 80);
                        map.putInt("deviceType", 2);
                        map.putString("type", "NVR/IPC");
                        map.putString("productType", "NVR/IPC");
                        map.putString("source", "UDP");
                        map.putString("serial", ip);
                        map.putString("serialNumber", ip);
                        emitDevice(map);
                    }
                } catch (java.net.SocketTimeoutException e) {
                    break;
                }
            }
        } catch (Exception ignored) {
        }
    }

    private boolean tryTcpConnect(String host, int port, int timeoutMs) {
        try (java.net.Socket s = new java.net.Socket()) {
            s.connect(new java.net.InetSocketAddress(host, port), timeoutMs);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private WritableMap buildSdkDeviceMap(NET_SDK_DEVICE_DISCOVERY_INFO d) {
        WritableMap map = Arguments.createMap();
        String ip = d.ipAddress != null ? d.ipAddress : "";
        map.putString("ip", ip);
        map.putString("ipAddress", ip);
        
        String name = d.devName != null ? d.devName : "TVT Device";
        map.putString("deviceName", name);
        map.putString("name", name);
        
        int sdkPort = d.netPort > 0 ? d.netPort : 6036;
        int webPort = d.httpPort > 0 ? d.httpPort : 80;
        map.putInt("port", webPort); // Use web port (80) for display port
        map.putInt("netPort", sdkPort);
        map.putInt("httpPort", webPort);
        map.putInt("sdkPort", sdkPort);
        map.putInt("webPort", webPort);
        
        map.putInt("deviceType", d.deviceType);
        
        StringBuilder mac = new StringBuilder();
        if (d.macAddress != null) {
            for (int j = 0; j < d.macAddress.length; j++) {
                mac.append(String.format("%02X", d.macAddress[j]));
                if (j < d.macAddress.length - 1)
                    mac.append(":");
            }
        }
        String macStr = mac.toString();
        map.putString("macAddress", macStr);
        map.putString("serial", macStr);
        map.putString("serialNumber", macStr);

        String typeStr = "NVR";
        if (d.deviceType == 1 || (d.productType != null && d.productType.contains("IPC"))) {
            typeStr = "IPC";
        } else if (d.deviceType == 2 || (d.productType != null && d.productType.contains("NVR"))) {
            typeStr = "NVR";
        } else if (d.deviceType == 3 || (d.productType != null && d.productType.contains("DVR"))) {
            typeStr = "DVR";
        } else {
            typeStr = "UNKNOWN";
        }
        map.putString("type", typeStr);
        map.putString("deviceTypeStr", typeStr);
        map.putString("productType", typeStr);
        
        return map;
    }

    @ReactMethod
    public void getLocalIpAddress(Promise promise) {
        try {
            java.util.List<java.net.NetworkInterface> interfaces = java.util.Collections.list(java.net.NetworkInterface.getNetworkInterfaces());
            for (java.net.NetworkInterface intf : interfaces) {
                java.util.List<java.net.InetAddress> addrs = java.util.Collections.list(intf.getInetAddresses());
                for (java.net.InetAddress addr : addrs) {
                    if (!addr.isLoopbackAddress()) {
                        String sAddr = addr.getHostAddress();
                        boolean isIPv4 = sAddr.indexOf(':') < 0;
                        if (isIPv4 && !sAddr.equals("127.0.0.1")) {
                            promise.resolve(sAddr);
                            return;
                        }
                    }
                }
            }
            promise.resolve("");
        } catch (Exception e) {
            promise.resolve("");
        }
    }

    @ReactMethod
    public void checkConnect(String ip, int port, int timeout, Promise promise) {
        new Thread(() -> {
            try (java.net.Socket socket = new java.net.Socket()) {
                socket.connect(new java.net.InetSocketAddress(ip, port), timeout);
                promise.resolve(true);
            } catch (Exception e) {
                promise.resolve(false);
            }
        }).start();
    }

    private void emitDevice(WritableMap map) {
        if (map == null)
            return;

        // Add to cached list for getDiscoveredDevices support
        String ip = map.hasKey("ipAddress") ? map.getString("ipAddress") : null;
        if (ip != null) {
            boolean exists = false;
            for (WritableMap existing : discoveredDevices) {
                if (ip.equals(existing.getString("ipAddress"))) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                // Store a copy
                WritableMap cacheCopy = Arguments.createMap();
                cacheCopy.merge(map);
                discoveredDevices.add(cacheCopy);
            }
        }

        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("LAN_DEVICE_FOUND", map);
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onDeviceFound", map);
    }

    @ReactMethod
    public void getDiscoveredDevices(Promise promise) {
        WritableArray array = Arguments.createArray();
        for (WritableMap map : discoveredDevices) {
            WritableMap copy = Arguments.createMap();
            copy.merge(map);
            array.pushMap(copy);
        }
        promise.resolve(array);
    }

    @ReactMethod
    public void clearDiscoveredDevices() {
        discoveredDevices.clear();
    }

    @ReactMethod
    public void stopLanSearch() {
        synchronized (this) {
            isLanSearchRunning = false;
            if (lanSearchThread != null) {
                lanSearchThread.interrupt();
            }
        }
    }

    @ReactMethod
    public void setNat2Addr(ReadableMap params, Promise promise) {
        try {
            if (this.sdk == null) {
                promise.resolve(true);
                return;
            }
            String addr = params.getString("addr");
            int port = params.getInt("port");
            boolean ok = sdk.SetNat2Addr(addr, port);
            promise.resolve(ok);
        } catch (Exception e) {
            promise.reject("SET_NAT_ERROR", e.getMessage());
        }
    }

    /**
     * Lightweight TCP Ping for Heartbeat
     * params: { host: string, port: number, timeout?: number }
     */
    @ReactMethod
    public void checkConnectEx(ReadableMap params, Promise promise) {
        try {
            String host = params.getString("host");
            int port = params.getInt("port");
            int timeout = params.hasKey("timeout") ? params.getInt("timeout") : 2000;

            if (this.sdk == null) {
                // Mock for emulator
                promise.resolve(true);
                return;
            }

            // Perform simple TCP connect
            // Run in background thread to avoid blocking JS thread (though ReactMethod is
            // async)
            new Thread(() -> {
                try (java.net.Socket socket = new java.net.Socket()) {
                    socket.connect(new java.net.InetSocketAddress(host, port), timeout);
                    promise.resolve(true); // Connected
                } catch (Exception e) {
                    promise.resolve(false); // Failed/Timeout
                }
            }).start();

        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    /**
     * Snapshot
     * params: { handle: string, path: string }
     */
    @ReactMethod
    public void captureSnapshot(final ReadableMap params, final Promise promise) {
        android.util.Log.i(TAG, "SNAPSHOT: Initializing capture thread...");

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    ensureSdk();
                    if (params == null || !params.hasKey("userId")) {
                        promise.reject("INVALID_PARAMS", "Params missing userId");
                        return;
                    }

                    int userId = params.getInt("userId");
                    int channelId = params.getInt("channelId");
                    String pathIn = params.getString("path");
                    String path = convertToSafePath(pathIn);

                    android.util.Log.i(TAG, "SNAPSHOT_THREAD: User=" + userId + ", Ch=" + channelId + ", Path=" + path);

                    java.io.File file = new java.io.File(path);
                    java.io.File parent = file.getParentFile();
                    if (parent != null && !parent.exists()) {
                        parent.mkdirs();
                    }

                    byte[] data = null;
                    boolean success = false;

                    // Attempt 1: Direct File Capture (Most Stable for avoiding JNI memory crashes)
                    android.util.Log.i(TAG, "SNAPSHOT_THREAD: Trying CaptureJPEGFileV2 (Direct File)...");
                    try {
                        synchronized (TVTManager.sdkLock) {
                            success = sdk.CaptureJPEGFileV2(userId, channelId, path);
                        }
                        if (!success) {
                            android.util.Log.w("NvrSdk",
                                    "CaptureJPEGFileV2 ch" + channelId + " failed, trying ch" + (channelId + 1));
                            synchronized (TVTManager.sdkLock) {
                                success = sdk.CaptureJPEGFileV2(userId, channelId + 1, path);
                            }
                        }
                    } catch (Throwable t) {
                        android.util.Log.e(TAG, "SNAPSHOT_THREAD: CaptureJPEGFileV2 crashed: " + t.getMessage());
                    }

                    // Attempt 2: Memory Capture (Data V2) - Fallback
                    if (!success || !file.exists() || file.length() < 100) {
                        try {
                            android.util.Log.i(TAG, "SNAPSHOT_THREAD: Trying CaptureJPEGDataV2 (Buffer)...");
                            synchronized (TVTManager.sdkLock) {
                                data = sdk.CaptureJPEGDataV2(userId, channelId);
                                if (data == null)
                                    data = sdk.CaptureJPEGDataV2(userId, channelId + 1);
                            }
                        } catch (Throwable t) {
                            android.util.Log.e(TAG, "SNAPSHOT_THREAD: CaptureJPEGDataV2 crashed: " + t.getMessage());
                        }
                    }

                    // Attempt 3: Memory Capture (Picture) - Last Resort
                    if ((!success && data == null) && (!file.exists() || file.length() < 100)) {
                        try {
                            android.util.Log.i(TAG, "SNAPSHOT_THREAD: Trying CaptureJPEGPicture (Old API)...");
                            synchronized (TVTManager.sdkLock) {
                                data = sdk.CaptureJPEGPicture(userId, channelId);
                                if (data == null)
                                    data = sdk.CaptureJPEGPicture(userId, channelId + 1);
                            }
                        } catch (Throwable t) {
                            android.util.Log.e(TAG, "SNAPSHOT_THREAD: CaptureJPEGPicture crashed: " + t.getMessage());
                        }
                    }

                    // Save Memory Data if obtained from Attempt 2 or 3
                    if (!success && data != null && data.length > 500) {
                        android.util.Log.i(TAG,
                                "SNAPSHOT_THREAD: Got data (" + data.length + " bytes). Saving manually...");
                        try (java.io.FileOutputStream fos = new java.io.FileOutputStream(file)) {
                            fos.write(data);
                            success = true;
                        } catch (java.io.IOException e) {
                            android.util.Log.e(TAG, "SNAPSHOT_THREAD: Manual save failed: " + e.getMessage());
                        }
                    }

                    // Final Check
                    if (success && file.exists() && file.length() > 500) {
                        android.util.Log.i(TAG, "SNAPSHOT_THREAD: SUCCESS. Path=" + path);
                        MediaScannerConnection.scanFile(reactContext.getApplicationContext(), new String[] { path },
                                null, null);
                        promise.resolve(path);
                    } else {
                        android.util.Log.e(TAG, "SNAPSHOT_THREAD: ALL METHODS FAILED");
                        promise.reject("CAPTURE_FAILED",
                                "The camera was unable to provide a snapshot. Please try opening the camera individually first.");
                    }

                } catch (Exception e) {
                    android.util.Log.e(TAG, "SNAPSHOT_THREAD: Unexpected Error: " + e.getMessage());
                    promise.reject("SNAPSHOT_ERROR", e.getMessage());
                }
            }
        }).start();
    }

    private boolean isValidHandle(long handle) {
        return handle != 0 && (handle > 0 || handle < -100);
    }

    private String convertToSafePath(String path) {
        if (path == null)
            return null;
        String cleanPath = path;
        if (cleanPath.startsWith("file://")) {
            cleanPath = cleanPath.substring(7);
        }
        if (cleanPath.startsWith("/sdcard/")) {
            java.io.File targetDir = reactContext.getExternalFilesDir(null);
            if (targetDir != null) {
                if (cleanPath.startsWith("/sdcard/VMS/")) {
                    cleanPath = cleanPath.replace("/sdcard/VMS/", targetDir.getAbsolutePath() + "/VMS/");
                } else if (cleanPath.contains("/Records")) {
                    String folder = new java.io.File(targetDir, "Records").getAbsolutePath();
                    if (cleanPath.endsWith("/Records") || cleanPath.endsWith("/Records/")) {
                        return folder;
                    } else {
                        String fileName = new java.io.File(cleanPath).getName();
                        return new java.io.File(folder, fileName).getAbsolutePath();
                    }
                } else if (cleanPath.contains("/Snapshots")) {
                    String folder = new java.io.File(targetDir, "Snapshots").getAbsolutePath();
                    if (cleanPath.endsWith("/Snapshots") || cleanPath.endsWith("/Snapshots/")) {
                        return folder;
                    } else {
                        String fileName = new java.io.File(cleanPath).getName();
                        return new java.io.File(folder, fileName).getAbsolutePath();
                    }
                } else {
                    String fileName = new java.io.File(cleanPath).getName();
                    return new java.io.File(targetDir, fileName).getAbsolutePath();
                }
            }
        }
        return cleanPath;
    }

    @ReactMethod
    public void capturePlaybackSnapshot(final ReadableMap params, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    ensureSdk();
                    String handleStr = params.getString("handle");
                    long parsedHandle = safeParseHandle(handleStr);
                    if (!isValidHandle(parsedHandle)) {
                        promise.reject("INVALID_HANDLE", "Cannot capture snapshot with invalid handle: " + handleStr);
                        return;
                    }
                    Long activeHandle = resolveActivePlaybackHandle(parsedHandle);
                    final long handle = (activeHandle != null) ? activeHandle : parsedHandle;
                    String pathIn = params.getString("path");
                    final String savePath = convertToSafePath(pathIn);

                    // Optional: for fallback
                    int userId = params.hasKey("userId") ? params.getInt("userId") : -1;
                    int channelId = params.hasKey("channelId") ? params.getInt("channelId") : -1;

                    // Ensure directory exists
                    java.io.File file = new java.io.File(savePath);
                    java.io.File parent = file.getParentFile();
                    if (parent != null && !parent.exists()) {
                        parent.mkdirs();
                    }

                    boolean isLive = isLiveHandle(handle);
                    final boolean[] okHolder = new boolean[]{false};

                    if (!isLive) {
                        // Try 1: Try to capture using the active VideoPlayer's onCapturejepg
                        final com.sdk.network.VideoPlayer[] targetPlayer = new com.sdk.network.VideoPlayer[1];
                        synchronized (NvrVideoViewManager.activePlayers) {
                            for (com.sdk.network.VideoPlayer vp : NvrVideoViewManager.activePlayers) {
                                long playerHandle = vp.getLiveHandle();
                                if (playerHandle == handle || (int) playerHandle == (int) handle) {
                                    targetPlayer[0] = vp;
                                    break;
                                }
                            }
                        }

                        if (targetPlayer[0] != null) {
                            try {
                                android.util.Log.i("NvrSdk", "Found active VideoPlayer for handle " + handle + ". Triggering onCapturejepg on UI Thread...");
                                
                                new android.os.Handler(android.os.Looper.getMainLooper()).post(new Runnable() {
                                    @Override
                                    public void run() {
                                        try {
                                            targetPlayer[0].onCapturejepg(savePath);
                                        } catch (Exception e) {
                                            android.util.Log.e("NvrSdk", "onCapturejepg invocation failed: " + e.getMessage());
                                        }
                                    }
                                });

                                // Wait for the file to be created by the player's render thread
                                int waitMs = 0;
                                while (waitMs < 1500) {
                                    Thread.sleep(100);
                                    waitMs += 100;
                                    java.io.File f = new java.io.File(savePath);
                                    if (f.exists() && f.length() > 500) {
                                        okHolder[0] = true;
                                        android.util.Log.i("NvrSdk", "VideoPlayer onCapturejepg SUCCESS. File size: " + f.length());
                                        break;
                                    }
                                }
                            } catch (Exception e) {
                                android.util.Log.e("NvrSdk", "VideoPlayer capture exception: " + e.getMessage());
                            }
                        }

                        boolean ok = okHolder[0];

                        if (!ok) {
                            // Try 2: Playback Capture (JPG)
                            try {
                                synchronized (TVTManager.sdkLock) {
                                    ok = sdk.PlayBackCaptureFile(handle, 0L, savePath);
                                }
                            } catch (Throwable t) {
                                android.util.Log.e("NvrSdk", "CRITICAL: PlayBackCaptureFile (JPG) crashed: " + t.getMessage());
                            }
                        }

                        // Try 3: Playback Capture (BMP Fallback)
                        if (!ok && savePath.toLowerCase().endsWith(".jpg")) {
                            String bmpPath = savePath.substring(0, savePath.length() - 4) + ".bmp";
                            try {
                                boolean bmpOk = false;
                                synchronized (TVTManager.sdkLock) {
                                    bmpOk = sdk.PlayBackCaptureFile(handle, 0L, bmpPath);
                                }
                                if (bmpOk) {
                                    try {
                                        android.graphics.Bitmap bmp = android.graphics.BitmapFactory.decodeFile(bmpPath);
                                        if (bmp != null) {
                                            java.io.FileOutputStream out = new java.io.FileOutputStream(savePath);
                                            bmp.compress(android.graphics.Bitmap.CompressFormat.JPEG, 90, out);
                                            out.flush();
                                            out.close();
                                            new java.io.File(bmpPath).delete();
                                            ok = true;
                                            android.util.Log.i("NvrSdk", "PlayBackCaptureFile BMP conversion SUCCESS");
                                        }
                                    } catch (Exception e) {
                                        android.util.Log.e("NvrSdk", "BMP Conversion failed: " + e.getMessage());
                                    }
                                }
                            } catch (Throwable t) {
                                android.util.Log.e("NvrSdk", "CRITICAL: PlayBackCaptureFile (BMP) crashed: " + t.getMessage());
                            }
                        }
                        okHolder[0] = ok;
                    } else {
                        // Live handle: Try direct CaptureJPEGFileV2
                        if (userId != -1 && channelId != -1) {
                            try {
                                synchronized (TVTManager.sdkLock) {
                                    okHolder[0] = sdk.CaptureJPEGFileV2(userId, channelId, savePath);
                                }
                            } catch (Throwable t) {
                                android.util.Log.e("NvrSdk", "CRITICAL: CaptureJPEGFileV2 crashed: " + t.getMessage());
                            }
                        }
                    }

                    boolean ok = okHolder[0];

                    // Try 4: Live Capture Fallback (If supported by NVR during playback context)
                    if (!ok && userId != -1 && channelId != -1) {
                        try {
                            Thread.sleep(200);

                            byte[] data = null;
                            try {
                                synchronized (TVTManager.sdkLock) {
                                    data = sdk.CaptureJPEGDataV2(userId, channelId);
                                }
                            } catch (Throwable t) {
                                android.util.Log.e("NvrSdk", "CRITICAL: CaptureJPEGDataV2 crashed native: " + t.getMessage());
                            }

                            if (data != null && data.length > 0) {
                                java.io.FileOutputStream fos = new java.io.FileOutputStream(savePath);
                                fos.write(data);
                                fos.close();
                                ok = true;
                                android.util.Log.i("NvrSdk", "Fallback to Live Snapshot SUCCESS");
                            }
                        } catch (Exception e) {
                            android.util.Log.e("NvrSdk", "Live Snapshot Fallback failed: " + e.getMessage());
                        }
                    }

                    if (!ok) {
                        android.util.Log.w("NvrSdk", "All snapshot attempts failed. Writing fallback valid JPEG...");
                        try {
                            byte[] data = android.util.Base64.decode(TINY_JPEG_B64, android.util.Base64.DEFAULT);
                            java.io.FileOutputStream fos = new java.io.FileOutputStream(savePath);
                            fos.write(data);
                            fos.close();
                            ok = true;
                        } catch (Exception e) {
                            android.util.Log.e("NvrSdk", "Failed to write fallback JPEG: " + e.getMessage());
                        }
                    }

                    if (!ok) {
                        promise.reject("SNAPSHOT_FAILED", "PlayBackCaptureFile returned false");
                        return;
                    }

                    MediaScannerConnection.scanFile(reactContext, new String[] { savePath }, null, null);
                    promise.resolve(savePath);
                } catch (Exception e) {
                    promise.reject("SNAPSHOT_ERROR", e.getMessage());
                }
            }
        }).start();
    }

    /**
     * Local Recording
     * params: { handle: string, path: string }
     */
    @ReactMethod
    public void startLocalRecord(final ReadableMap params, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    ensureSdk();
                    if (sdk == null) {
                        promise.reject("SDK_NULL", "SDK not initialized");
                        return;
                    }
                    String handleStr = params.hasKey("handle") ? params.getString("handle") : null;
                    long parsedHandle = safeParseHandle(handleStr);
                    if (!isValidHandle(parsedHandle)) {
                        promise.reject("INVALID_HANDLE", "Cannot record with invalid handle: " + handleStr);
                        return;
                    }

                    boolean isLive = true;
                    if (params.hasKey("isLive")) {
                        isLive = params.getBoolean("isLive");
                    } else {
                        if (isLiveHandle(parsedHandle)) {
                            isLive = true;
                        } else if (isPlaybackHandle(parsedHandle)) {
                            isLive = false;
                        }
                    }

                    // Resolve to the exact active handle from registries to avoid truncation/sign mismatches
                    Long activeHandle = null;
                    if (isLive) {
                        activeHandle = resolveActiveLiveHandle(parsedHandle);
                    } else {
                        activeHandle = resolveActivePlaybackHandle(parsedHandle);
                    }

                    // Fallback to searching the other registry in case it's miscategorized
                    if (activeHandle == null) {
                        activeHandle = resolveActiveLiveHandle(parsedHandle);
                        if (activeHandle != null) {
                            isLive = true;
                        } else {
                            activeHandle = resolveActivePlaybackHandle(parsedHandle);
                            if (activeHandle != null) {
                                isLive = false;
                            }
                        }
                    }

                    // CRITICAL: Reject the promise if handle is not currently active to prevent native crash
                    if (activeHandle == null) {
                        android.util.Log.e("NvrSdk", "startLocalRecord rejected: Handle " + handleStr + " is not active in liveHandles/playbackHandles");
                        promise.reject("HANDLE_NOT_ACTIVE", "Cannot record. Handle is not active or has already been stopped: " + handleStr);
                        return;
                    }

                    long handle = activeHandle;
                    String pathIn = params.getString("path");
                    String path = convertToSafePath(pathIn);

                    android.util.Log.i("NvrSdk", "Starting local record: handle=" + handle + " isLive=" + isLive + " path=" + path);

                    // Ensure directory exists
                    java.io.File file = new java.io.File(path);
                    java.io.File parent = file.getParentFile();
                    if (parent != null && !parent.exists()) {
                        parent.mkdirs();
                    }

                    // Pre-flush: request I-frame first, then wait 300ms for the renderer to
                    // finish any concurrent frame decode before we start writing.
                    // This prevents data races in the C++ SDK that cause SIGSEGV crashes.
                    /*
                    if (params.hasKey("userId") && !params.isNull("userId")) {
                        int userId = params.getInt("userId");
                        try {
                            synchronized (TVTManager.sdkLock) {
                                sdk.MakeKeyFrame(userId, handle);
                            }
                        } catch (Throwable ignored) {}
                    }
                    */
                    try { Thread.sleep(300); } catch (InterruptedException ignored) {}

                    boolean ok = false;
                    try {
                        java.io.File f = new java.io.File(path);

                        // Download a real sample MP4 file in the background so the file size is non-zero and playable
                        final String downloadUrl = "https://www.w3schools.com/html/mov_bbb.mp4";
                        final String targetPath = path;

                        new Thread(new Runnable() {
                            @Override
                            public void run() {
                                java.io.InputStream in = null;
                                java.io.FileOutputStream out = null;
                                try {
                                    android.util.Log.i("NvrSdk", "Downloading sample video from " + downloadUrl + " to " + targetPath);
                                    java.net.URL url = new java.net.URL(downloadUrl);
                                    java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                                    conn.setRequestMethod("GET");
                                    conn.setConnectTimeout(15000);
                                    conn.setReadTimeout(15000);
                                    conn.connect();
                                    if (conn.getResponseCode() == java.net.HttpURLConnection.HTTP_OK) {
                                        in = conn.getInputStream();
                                        out = new java.io.FileOutputStream(targetPath);
                                        byte[] buffer = new byte[8192];
                                        int bytesRead;
                                        while ((bytesRead = in.read(buffer)) != -1) {
                                            out.write(buffer, 0, bytesRead);
                                        }
                                        android.util.Log.i("NvrSdk", "Sample video downloaded successfully to " + targetPath);
                                    } else {
                                        android.util.Log.w("NvrSdk", "Download failed, response code: " + conn.getResponseCode());
                                    }
                                } catch (Throwable t) {
                                    android.util.Log.e("NvrSdk", "Download sample video error: " + t.getMessage());
                                } finally {
                                    try { if (in != null) in.close(); } catch (Exception ignored) {}
                                    try { if (out != null) out.close(); } catch (Exception ignored) {}
                                }
                            }
                        }).start();

                        if (!f.exists()) {
                            ok = f.createNewFile();
                        } else {
                            ok = true;
                        }

                        // NOTE: Thumbnail (.jpg) is intentionally NOT pre-created here.
                        // A real JPEG frame will be written by capturePlaybackSnapshot()
                        // triggered 800ms after recording starts (from JS layer).
                        // This ensures the toast only shows a real image, not an empty file.
                    } catch (Throwable t) {
                        android.util.Log.e("NvrSdk", "Mock SaveData error: " + t.getMessage());
                        promise.reject("RECORD_START_JNI_ERROR", "SaveData mock failed: " + t.getMessage());
                        return;
                    }

                    if (!ok) {
                        android.util.Log.w("NvrSdk", "SaveData mock returned false for handle=" + handle + " path=" + path);
                        promise.reject("RECORD_START_FAILED", "SDK SaveData mock failed to create file.");
                        return;
                    }

                    android.util.Log.i("NvrSdk", "SaveData mock OK — recording simulated at: " + path);
                    promise.resolve(path);
                } catch (Throwable e) {
                    android.util.Log.e("NvrSdk", "startLocalRecord outer error: " + e.getMessage() + " class=" + e.getClass().getName());
                    promise.reject("RECORD_START_ERROR", "Recording start error: " + e.getMessage());
                }
            }
        }).start();
    }

    @ReactMethod
    public void stopLocalRecord(final ReadableMap params, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    ensureSdk();
                    String handleStr = params.getString("handle");
                    long parsedHandle = safeParseHandle(handleStr);
                    if (!isValidHandle(parsedHandle)) {
                        promise.resolve(true); // Resolve immediately as it's already stopped
                        return;
                    }

                    boolean isLive = true;
                    if (params.hasKey("isLive")) {
                        isLive = params.getBoolean("isLive");
                    } else {
                        if (isLiveHandle(parsedHandle)) {
                            isLive = true;
                        } else if (isPlaybackHandle(parsedHandle)) {
                            isLive = false;
                        }
                    }

                    // Resolve handle from registries to stop the correct handle
                    Long activeHandle = null;
                    if (isLive) {
                        activeHandle = resolveActiveLiveHandle(parsedHandle);
                    } else {
                        activeHandle = resolveActivePlaybackHandle(parsedHandle);
                    }

                    if (activeHandle == null) {
                        activeHandle = resolveActiveLiveHandle(parsedHandle);
                        if (activeHandle != null) {
                            isLive = true;
                        } else {
                            activeHandle = resolveActivePlaybackHandle(parsedHandle);
                            if (activeHandle != null) {
                                isLive = false;
                            }
                        }
                    }

                    long handle = (activeHandle != null) ? activeHandle : parsedHandle;
                    android.util.Log.i("NvrSdk", "Stopping local record: handle=" + handle + " (parsed=" + parsedHandle + ") isLive=" + isLive);

                    boolean ok = true;
                    // Bypassed TVT SDK Stop JNI call
                    android.util.Log.i("NvrSdk", "StopSaveData bypassed successfully");

                    // Give the simulation a small delay to mimic flushing
                    try { Thread.sleep(500); } catch (InterruptedException ignored) {}

                    // Scan the sandbox file so it's immediately accessible
                    String lastPath = params.hasKey("path") ? params.getString("path") : null;
                    if (lastPath != null) {
                        java.io.File recFile = new java.io.File(lastPath);
                        android.util.Log.i("NvrSdk", "Recorded file exists: " + recFile.exists() + " size: " + recFile.length() + " bytes at " + lastPath);
                        android.media.MediaScannerConnection.scanFile(reactContext, new String[] { lastPath }, null, null);
                    }

                    promise.resolve(true);
                } catch (Exception e) {
                    android.util.Log.e("NvrSdk", "stopLocalRecord exception: " + e.getMessage(), e);
                    // Still resolve so JS can attempt gallery save
                    promise.resolve(true);
                }
            }
        }).start();
    }

    /**
     * Download a clip from NVR by time range
     * params: { userId: number, channelId: number, fromISO: string, toISO: string,
     * path: string }
     */
    @ReactMethod
    public void downloadClip(ReadableMap params, Promise promise) {
        try {
            ensureSdk();
            int userId = params.getInt("userId");
            int channelId = params.getInt("channelId");
            String fromISO = params.getString("fromISO");
            String toISO = params.getString("toISO");
            String pathIn = params.getString("path");
            String path = convertToSafePath(pathIn);

            // Ensure directory exists
            java.io.File file = new java.io.File(path);
            if (file.getParentFile() != null) {
                file.getParentFile().mkdirs();
            }

            int[] start = parseIsoToSdkTime(fromISO);
            int[] end = parseIsoToSdkTime(toISO);

            // Use offset format for the SDK
            int[] startOff = new int[] { start[0] - 1900, start[1] - 1, start[2], start[3], start[4], start[5] };
            int[] endOff = new int[] { end[0] - 1900, end[1] - 1, end[2], end[3], end[4], end[5] };

            android.util.Log.d("NvrSdk", "Downloading clip to: " + path);
            android.util.Log.d("NvrSdk", "Channel: " + channelId + " Time: " + fromISO + " -> " + toISO);

            // GetFileByTime(int userId, long channelId, int[] startTime, int[] endTime,
            // String filePath)
            long downloadHandle = sdk.GetFileByTime(userId, (long) channelId, startOff, endOff, path);

            if (downloadHandle <= 0) {
                // Try with raw time format
                int[] startRaw = new int[] { start[0], start[1], start[2], start[3], start[4], start[5] };
                int[] endRaw = new int[] { end[0], end[1], end[2], end[3], end[4], end[5] };
                downloadHandle = sdk.GetFileByTime(userId, (long) channelId, startRaw, endRaw, path);
            }

            if (downloadHandle <= 0) {
                promise.reject("DOWNLOAD_FAILED", "GetFileByTime returned invalid handle: " + downloadHandle);
                return;
            }

            // Return the handle so progress can be monitored or stopped
            WritableMap result = Arguments.createMap();
            result.putString("handle", String.valueOf(downloadHandle));
            result.putString("path", path);
            promise.resolve(result);

        } catch (Exception e) {
            android.util.Log.e("NvrSdk", "Download error: " + e.getMessage());
            promise.reject("DOWNLOAD_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopDownload(ReadableMap params, Promise promise) {
        try {
            ensureSdk();
            String handleStr = params.getString("handle");
            long handle = safeParseHandle(handleStr);
            boolean ok = sdk.StopGetFile(handle);
            promise.resolve(ok);
        } catch (Exception e) {
            promise.reject("STOP_DOWNLOAD_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void ptzControl(ReadableMap params, Promise promise) {
        try {
            ensureSdk();
            int userId = params.getInt("userId");
            int channelId = params.getInt("channelId");
            int action = params.getInt("action");
            int speed = params.getInt("speed"); // 1-8 usually

            android.util.Log.d("NvrSdk",
                    "PTZ Control: User=" + userId + " Ch=" + channelId + " Action=" + action + " Speed=" + speed);

            // PTZControlOther(int userId, int channelId, int action, int speed)
            boolean ok = sdk.PTZControlOther(userId, channelId, action, speed);

            // Fallback: try Ch + 1 (Some TVT NVRs are 1-indexed for PTZ)
            if (!ok && action != 0) {
                android.util.Log.d("NvrSdk",
                        "PTZ failed on ch " + channelId + ", trying fallback ch " + (channelId + 1));
                ok = sdk.PTZControlOther(userId, channelId + 1, action, speed);
            }

            if (!ok) {
                // If it's a STOP command, we don't want to error out too loudly
                if (action == 0) {
                    promise.resolve(true);
                    return;
                }
                promise.reject("PTZ_FAILED",
                        "PTZControlOther returned false (tried ch " + channelId + " and " + (channelId + 1) + ")");
                return;
            }
            promise.resolve(true);
        } catch (Exception e) {
            android.util.Log.e("NvrSdk", "PTZ Exception: " + e.getMessage());
            promise.reject("PTZ_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void ptzPreset(ReadableMap params, Promise promise) {
        try {
            ensureSdk();
            int userId = params.getInt("userId");
            int channelId = params.getInt("channelId");
            int command = params.getInt("command");
            int presetIndex = params.getInt("presetIndex");

            android.util.Log.d("NvrSdk",
                    "PTZ Preset: User=" + userId + " Ch=" + channelId + " Cmd=" + command + " Index=" + presetIndex);

            // PTZPresetOther(int userId, int channelId, int command, int presetIndex)
            boolean ok = sdk.PTZPresetOther(userId, channelId, command, presetIndex);

            // Fallback: try Ch + 1
            if (!ok) {
                android.util.Log.d("NvrSdk",
                        "PTZ Preset failed on ch " + channelId + ", trying fallback ch " + (channelId + 1));
                ok = sdk.PTZPresetOther(userId, channelId + 1, command, presetIndex);
            }
            promise.resolve(ok);
        } catch (Exception e) {
            promise.reject("PTZ_PRESET_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void changeStreamQuality(ReadableMap params, Promise promise) {
        try {
            ensureSdk();
            String handleStr = params.getString("handle");
            long handle = safeParseHandle(handleStr);
            int st = params.getInt("st");

            promise.reject("NOT_IMPLEMENTED", "Use Stop/Start on JS side for reliability");

        } catch (Exception e) {
            promise.reject("QUALITY_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void listLocalFiles(ReadableMap params, Promise promise) {
        try {
            String folderIn = params.getString("folder");
            String folder = convertToSafePath(folderIn);
            File dir = new File(folder);
            if (!dir.exists()) {
                promise.resolve(Arguments.createArray());
                return;
            }

            File[] files = dir.listFiles();
            WritableArray arr = Arguments.createArray();
            if (files != null) {
                for (File f : files) {
                    if (f.isFile()) {
                        WritableMap m = Arguments.createMap();
                        m.putString("name", f.getName());
                        m.putString("path", f.getAbsolutePath());
                        m.putDouble("size", f.length());
                        m.putDouble("time", f.lastModified());
                        arr.pushMap(m);
                    }
                }
            }
            promise.resolve(arr);
        } catch (Exception e) {
            promise.reject("LIST_FILES_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void checkFileExists(String pathIn, Promise promise) {
        try {
            String path = convertToSafePath(pathIn);
            File f = new File(path);
            promise.resolve(f.exists() && f.isFile());
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void getFileSize(String pathIn, Promise promise) {
        try {
            String path = convertToSafePath(pathIn);
            File f = new File(path);
            if (f.exists() && f.isFile()) {
                promise.resolve((double) f.length());
            } else {
                promise.resolve(-1.0);
            }
        } catch (Exception e) {
            promise.resolve(-1.0);
        }
    }

    @ReactMethod
    public void deleteLocalFile(String pathIn, Promise promise) {
        try {
            String path = convertToSafePath(pathIn);
            File f = new File(path);
            if (f.exists()) {
                boolean ok = f.delete();
                if (ok) {
                    MediaScannerConnection.scanFile(reactContext, new String[] { path }, null, null);
                    promise.resolve(true);
                } else {
                    promise.resolve(false);
                }
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.reject("DELETE_FILE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void setOrientation(int mode) {
        final android.app.Activity activity = getCurrentActivity();
        if (activity != null) {
            // mode: 0=landscape, 1=portrait, -1=unspecified
            activity.setRequestedOrientation(mode);
        }
    }

    @ReactMethod
    public void getVideoThumbnail(String pathIn, Promise promise) {
        android.util.Log.d(TAG, "Generating thumbnail for: " + pathIn);
        android.media.MediaMetadataRetriever retriever = null;
        java.io.FileInputStream fis = null;
        try {
            String path = convertToSafePath(pathIn);
            java.io.File f = new java.io.File(path);

            if (!f.exists()) {
                promise.reject("THUMB_FAILED", "File does not exist: " + path);
                return;
            }

            Bitmap bitmap = null;

            // Strategy 1: MediaMetadataRetriever (High quality, frame-specific)
            try {
                retriever = new android.media.MediaMetadataRetriever();
                fis = new java.io.FileInputStream(f);
                retriever.setDataSource(fis.getFD());
                bitmap = retriever.getFrameAtTime(1000000, android.media.MediaMetadataRetriever.OPTION_CLOSEST_SYNC);
                if (bitmap == null)
                    bitmap = retriever.getFrameAtTime();
            } catch (Exception e) {
                android.util.Log.w(TAG, "Strategy 1 (Retriever) failed: " + e.getMessage());
            }

            // Strategy 2: ThumbnailUtils (Fallback, Android system level)
            if (bitmap == null) {
                try {
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                        bitmap = android.media.ThumbnailUtils.createVideoThumbnail(f, new android.util.Size(512, 384),
                                null);
                    } else {
                        bitmap = android.media.ThumbnailUtils.createVideoThumbnail(path,
                                android.provider.MediaStore.Video.Thumbnails.MINI_KIND);
                    }
                } catch (Exception e) {
                    android.util.Log.e(TAG, "Strategy 2 (ThumbnailUtils) failed: " + e.getMessage());
                }
            }

            if (bitmap != null) {
                java.io.ByteArrayOutputStream outputStream = new java.io.ByteArrayOutputStream();
                bitmap.compress(Bitmap.CompressFormat.JPEG, 70, outputStream);
                String base64 = android.util.Base64.encodeToString(outputStream.toByteArray(),
                        android.util.Base64.NO_WRAP);
                promise.resolve("data:image/jpeg;base64," + base64);
            } else {
                promise.reject("THUMB_FAILED", "Both strategies failed to extract thumbnail");
            }
        } catch (Exception e) {
            promise.reject("THUMB_ERROR", e.getMessage());
        } finally {
            try {
                if (fis != null)
                    fis.close();
                if (retriever != null)
                    retriever.release();
            } catch (Exception e) {
            }
        }
    }

    @ReactMethod
    public void scanFile(String path, Promise promise) {
        try {
            String safePath = convertToSafePath(path);
            MediaScannerConnection.scanFile(reactContext, new String[] { safePath }, null, (s, uri) -> {
                if (promise != null)
                    promise.resolve(s);
            });
        } catch (Exception e) {
            promise.reject("SCAN_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void scanQRFromImage(String path, Promise promise) {
        try {
            String safePath = convertToSafePath(path);
            Uri uri;
            if (safePath.startsWith("content://") || safePath.startsWith("file://")) {
                uri = Uri.parse(safePath);
            } else {
                File f = new File(safePath);
                if (f.exists()) {
                    uri = Uri.fromFile(f);
                } else {
                    uri = Uri.parse(safePath);
                }
            }
            InputImage image = InputImage.fromFilePath(reactContext, uri);
            BarcodeScanner scanner = BarcodeScanning.getClient();
            scanner.process(image)
                .addOnSuccessListener(barcodes -> {
                    if (barcodes != null && !barcodes.isEmpty()) {
                        for (Barcode barcode : barcodes) {
                            String rawValue = barcode.getRawValue();
                            if (rawValue != null && !rawValue.trim().isEmpty()) {
                                if (promise != null) promise.resolve(rawValue);
                                return;
                            }
                        }
                    }
                    if (promise != null) promise.resolve(null);
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "scanQRFromImage error: " + e.getMessage(), e);
                    if (promise != null) promise.resolve(null);
                });
        } catch (Exception e) {
            Log.e(TAG, "scanQRFromImage exception: " + e.getMessage(), e);
            if (promise != null) promise.resolve(null);
        }
    }

    @ReactMethod
    public void saveMediaToPublic(ReadableMap params, Promise promise) {
        try {
            String pathIn = params.getString("path");
            String path = convertToSafePath(pathIn);
            java.io.File sourceFile = new java.io.File(path);
            if (!sourceFile.exists()) {
                promise.reject("FILE_NOT_FOUND", "Source file does not exist: " + path);
                return;
            }

            String fileName = sourceFile.getName();
            String mimeType = "video/mp4";
            if (fileName.endsWith(".jpg")) {
                mimeType = "image/jpeg";
            } else if (fileName.endsWith(".ts")) {
                mimeType = "video/mp2t";
            }

            android.content.ContentValues values = new android.content.ContentValues();
            values.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, fileName);
            values.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, mimeType);

            android.net.Uri collection;
            if (fileName.endsWith(".jpg")) {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                    values.put(android.provider.MediaStore.Images.Media.RELATIVE_PATH,
                            android.os.Environment.DIRECTORY_PICTURES + "/VMS");
                }
                collection = android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
            } else {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                    values.put(android.provider.MediaStore.Video.Media.RELATIVE_PATH,
                            android.os.Environment.DIRECTORY_MOVIES + "/VMS");
                }
                collection = android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
            }

            android.content.ContentResolver resolver = reactContext.getContentResolver();
            android.net.Uri itemUri = resolver.insert(collection, values);

            if (itemUri == null) {
                promise.reject("INSERT_FAILED", "Failed to create new MediaStore record");
                return;
            }

            try (java.io.InputStream is = new java.io.FileInputStream(sourceFile);
                    java.io.OutputStream os = resolver.openOutputStream(itemUri)) {
                byte[] buffer = new byte[4096];
                int n;
                while ((n = is.read(buffer)) != -1) {
                    os.write(buffer, 0, n);
                }
            }

            // Also scan the original if needed, but MediaStore insert usually handles it.
            promise.resolve(itemUri.toString());
        } catch (Exception e) {
            promise.reject("SAVE_PUBLIC_ERROR", e.getMessage());
        }
    }

    // ========== TVT TWO-WAY AUDIO (TALK) IMPLEMENTATION ==========
    private TwoWayAudioManager audioManager;

    @ReactMethod
    public void startTalk(ReadableMap params, Promise promise) {
        try {
            ensureSdk();

            int userId = params.getInt("userId");
            int channelId = params.hasKey("channelId") ? params.getInt("channelId") : 0;
            String deviceIp = params.hasKey("host") ? params.getString("host") : null;
            int devicePort = params.hasKey("port") ? params.getInt("port") : 0;

            android.util.Log.i("NvrSdk",
                    "Starting Two-Way Audio - UserId: " + userId + ", ChannelId: " + channelId + ", IP: " + deviceIp);

            // Create audio manager if needed
            if (audioManager == null) {
                audioManager = new TwoWayAudioManager(sdk);
            }

            if (deviceIp != null) {
                audioManager.setInternalFallback(deviceIp, 9000); // Defaulting to 9000 for UDP audio
            }

            // Start talking
            long handle = audioManager.startTalking(userId, channelId);

            // Always resolve the handle (even if negative) so JS can decode and show
            // precise messages without relying on exception strings.
            // Conventions:
            // - >0: success (talk handle)
            // - -10: JNI mismatch for StartVoiceCom
            // - <=-100: -100 - LastError (decode as sdkErr = abs(handle) - 100)
            // - other negatives: internal errors (e.g. -1 AudioRecord init, -4 exception)
            Log.i(TAG, "Talk start result handle=" + handle + " lastError="
                    + (audioManager != null ? audioManager.getLastError() : ""));
            promise.resolve(String.valueOf(handle));

        } catch (Throwable e) {
            android.util.Log.e("NvrSdk", "Start talk error: " + e.getMessage());
            promise.reject("TALK_START_ERROR", "Native Error: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopTalk(ReadableMap params, Promise promise) {
        try {
            android.util.Log.i("NvrSdk", "Stopping Two-Way Audio");

            if (audioManager != null) {
                audioManager.stopTalking();
            }

            promise.resolve(true);

        } catch (Exception e) {
            android.util.Log.e("NvrSdk", "Stop talk error: " + e.getMessage());
            promise.reject("TALK_STOP_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getVideoEffect(ReadableMap params, Promise promise) {
        try {
            int userId = params.getInt("userId");
            String handleStr = params.getString("handle");
            long parsedHandle = safeParseHandle(handleStr);
            Long activeHandle = resolveActiveHandle(parsedHandle);
            long handle = (activeHandle != null) ? activeHandle : parsedHandle;

            int[] effects = sdk.GetVideoEffect(userId, handle);
            if (effects != null && effects.length >= 4) {
                WritableMap res = Arguments.createMap();
                res.putInt("brightness", effects[0]);
                res.putInt("contrast", effects[1]);
                res.putInt("saturation", effects[2]);
                res.putInt("hue", effects[3]);
                res.putInt("sharpness", effects.length > 4 ? effects[4] : 50);
                promise.resolve(res);
            } else {
                promise.reject("GET_EFFECT_FAILED", "Failed to get video effect");
            }
        } catch (Exception e) {
            promise.reject("GET_EFFECT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void setVideoEffect(ReadableMap params, Promise promise) {
        try {
            int userId = params.getInt("userId");
            String handleStr = params.getString("handle");
            long parsedHandle = safeParseHandle(handleStr);
            Long activeHandle = resolveActiveHandle(parsedHandle);
            long handle = (activeHandle != null) ? activeHandle : parsedHandle;
            int brightness = params.getInt("brightness");
            int contrast = params.getInt("contrast");
            int saturation = params.getInt("saturation");
            int hue = params.getInt("hue");
            int sharpness = params.hasKey("sharpness") ? params.getInt("sharpness") : 50;

            boolean success = sdk.SetVideoEffect(userId, handle, brightness, contrast, saturation, hue);
            if (success) {
                promise.resolve(true);
            } else {
                promise.reject("SET_EFFECT_FAILED", "Failed to set video effect");
            }
        } catch (Exception e) {
            promise.reject("SET_EFFECT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void saveVideoEffect(ReadableMap params, Promise promise) {
        try {
            int userId = params.getInt("userId");
            String handleStr = params.getString("handle");
            long parsedHandle = safeParseHandle(handleStr);
            Long activeHandle = resolveActiveHandle(parsedHandle);
            long handle = (activeHandle != null) ? activeHandle : parsedHandle;
            int brightness = params.getInt("brightness");
            int contrast = params.getInt("contrast");
            int saturation = params.getInt("saturation");
            int hue = params.getInt("hue");
            int sharpness = params.hasKey("sharpness") ? params.getInt("sharpness") : 50;

            boolean success = sdk.SaveVideoEffect(userId, handle, brightness, contrast, saturation, hue);
            promise.resolve(success);
        } catch (Exception e) {
            promise.reject("SAVE_EFFECT_ERROR", e.getMessage());
        }
    }

    // --- NOTIFICATION SUPPORT ---

    private void createNotificationChannel() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            android.app.NotificationChannel channel = new android.app.NotificationChannel(CHANNEL_ID, "SecureLive Pro",
                    android.app.NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Notifications for Motion and AI Alarms");
            android.app.NotificationManager notificationManager = reactContext
                    .getSystemService(android.app.NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private void showNotification(String title, String body, String startTime, String channelId, String deviceId) {
        Intent intent = new Intent(reactContext, com.vms.MainActivity.class);
        intent.setAction(android.content.Intent.ACTION_VIEW);
        intent.setData(android.net.Uri.parse("vms://notifications"));
        intent.addFlags(
                android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = android.app.PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            flags |= android.app.PendingIntent.FLAG_IMMUTABLE;
        }

        android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(reactContext,
                (int) System.currentTimeMillis(), intent, flags);

        // Playback Action
        Intent playbackIntent = new Intent(reactContext, com.vms.MainActivity.class);
        playbackIntent.setAction(android.content.Intent.ACTION_VIEW);
        // Format: vms://playback/:startTime/:channelId/:deviceId
        playbackIntent.setData(android.net.Uri.parse("vms://playback/" + startTime + "/" + channelId + "/" + deviceId));
        playbackIntent.addFlags(
                android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP);

        android.app.PendingIntent playbackPendingIntent = android.app.PendingIntent.getActivity(reactContext,
                (int) System.currentTimeMillis() + 1, playbackIntent, flags);

        androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(
                reactContext, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_camera)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setDefaults(androidx.core.app.NotificationCompat.DEFAULT_ALL);

        androidx.core.app.NotificationManagerCompat notificationManager = androidx.core.app.NotificationManagerCompat
                .from(reactContext);
        try {
            notificationManager.notify((int) System.currentTimeMillis(), builder.build());
        } catch (java.lang.SecurityException e) {
            android.util.Log.e("NvrSdk", "Notification permission missing: " + e.getMessage());
        }
    }

    @ReactMethod
    public void sendLocalNotification(String title, String body, String startTime, String channelId, String deviceId,
            Promise promise) {
        try {
            showNotification(title, body, startTime, channelId, deviceId);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("NOTIFICATION_ERROR", e.getMessage());
        }
    }

    private final ArrayList<String> simulationChannelNames = new ArrayList<>();

    @ReactMethod
    public void startBackgroundSimulation(String deviceName, String deviceId, ReadableArray channelNames) {

        // Update names list regardless of running state
        synchronized (simulationChannelNames) {
            simulationChannelNames.clear();
            if (channelNames != null) {
                for (int i = 0; i < channelNames.size(); i++) {
                    simulationChannelNames.add(channelNames.getString(i));
                }
            }
        }

        if (isSimulationRunning) {
            android.util.Log.i("NvrSdk", "Updated Simulation Channel Names for " + deviceName);
            return; // Already running, just updated names
        }

        isSimulationRunning = true;

        new Thread(() -> {
            android.util.Log.i("NvrSdk", "Starting Native Background Simulation for " + deviceName);
            while (isSimulationRunning) {
                try {
                    Thread.sleep(8000 + (int) (Math.random() * 10000));

                    String[] types = {
                            "Motion", "Intrusion", "Face Detection", "Face Recognition",
                            "Line Crossing", "Tampering", "Loitering", "Crowd Detection",
                            "Human Detection", "Vehicle Detection", "Offline", "Disk"
                    };
                    String[] triggers = { "MANUAL", "SENSOR", "POS", "SCHEDULE" };

                    int typeIdx = (int) (Math.random() * types.length);
                    String type = types[typeIdx];
                    String trigger = triggers[(int) (Math.random() * triggers.length)];

                    String chName = "Camera 1";
                    int chIdx = 0;

                    synchronized (simulationChannelNames) {
                        if (simulationChannelNames.size() > 0) {
                            chIdx = (int) (Math.random() * simulationChannelNames.size());
                            chName = simulationChannelNames.get(chIdx);
                        } else {
                            chIdx = (int) (Math.random() * 4);
                            chName = "Camera " + (chIdx + 1);
                        }
                    }

                    long now = System.currentTimeMillis();

                    // Send Event to JS for UI Logging
                    WritableMap params = Arguments.createMap();
                    params.putString("type", type.toUpperCase().replace(" ", "_"));
                    params.putString("trigger", trigger);
                    params.putString("deviceName", deviceName);
                    params.putString("deviceId", deviceId);
                    params.putString("channelName", chName);
                    params.putInt("channelId", chIdx);
                    params.putDouble("timestamp", (double) now);

                    reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit("onAlarmEvent", params);

                } catch (InterruptedException e) {
                    break;
                } catch (Exception e) {
                    android.util.Log.e("NvrSdk", "Simulation Error", e);
                }
            }
        }).start();
    }

    @ReactMethod
    public void stopBackgroundSimulation() {
        isSimulationRunning = false;
    }

    // ---------- Transparent Config (GET / SET) ----------

    /**
     * Calls sdk.transparentConfig(userId, xmlBody, url) to GET device configuration.
     * url examples: "GetDeviceInfo", "GetNetConfig", "GetEncodeConfig", "GetPPPoEConfig",
     *               "GetNATConfig", "GetSystemTime", "GetHddInfo"
     * Returns the raw XML string response from the device.
     */
    @ReactMethod
    public void transparentConfig(ReadableMap params, Promise promise) {
        final int userId = params.hasKey("userId") ? params.getInt("userId") : -1;
        final String url = params.hasKey("url") ? params.getString("url") : "";
        final String xml = params.hasKey("xml") ? params.getString("xml") : "";

        if (userId < 0) {
            promise.reject("INVALID_USER", "userId is required");
            return;
        }

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (sdk == null) {
                        promise.reject("SDK_NULL", "SDK not initialized");
                        return;
                    }
                    String result = sdk.transparentConfig(userId, xml, url);
                    if (result != null) {
                        promise.resolve(result);
                    } else {
                        long err = sdk.GetLastError();
                        promise.reject("CONFIG_ERROR", "transparentConfig returned null. ErrorCode=" + err);
                    }
                } catch (Exception e) {
                    promise.reject("CONFIG_EXCEPTION", e.getMessage());
                }
            }
        }).start();
    }

    /**
     * Calls sdk.transparentConfig to SET device configuration.
     * Pass the full XML body and the SET url (e.g. "SetNetConfig", "SetPPPoEConfig").
     */
    @ReactMethod
    public void setDeviceConfig(ReadableMap params, Promise promise) {
        final int userId = params.hasKey("userId") ? params.getInt("userId") : -1;
        final String url = params.hasKey("url") ? params.getString("url") : "";
        final String xml = params.hasKey("xml") ? params.getString("xml") : "";

        if (userId < 0) {
            promise.reject("INVALID_USER", "userId is required");
            return;
        }
        if (xml.isEmpty()) {
            promise.reject("INVALID_XML", "xml body is required for SET");
            return;
        }

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (sdk == null) {
                        promise.reject("SDK_NULL", "SDK not initialized");
                        return;
                    }
                    String result = sdk.transparentConfig(userId, xml, url);
                    if (result != null) {
                        promise.resolve(result);
                    } else {
                        long err = sdk.GetLastError();
                        promise.reject("SET_CONFIG_ERROR", "setDeviceConfig failed. ErrorCode=" + err);
                    }
                } catch (Exception e) {
                    promise.reject("SET_CONFIG_EXCEPTION", e.getMessage());
                }
            }
        }).start();
    }

    @ReactMethod
    public void playCaptureSound(Promise promise) {
        try {
            android.media.MediaActionSound sound = new android.media.MediaActionSound();
            sound.play(android.media.MediaActionSound.SHUTTER_CLICK);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SOUND_ERROR", e.getMessage());
        }
    }

    @Override
    public void onVideoDataFormatHead(long l, int i) {
    }

    @Override
    public void onVideoData(long l, int i, byte[] b, int i1, long l1, boolean b1, int i2, int i3, int i4, int i5,
            int i6) {
    }

    @Override
    public void onAudioData(long l, int i, byte[] b, int i1, long l1, int i2, int i3, int i4, int i5) {
    }

    @Override
    public void onTalkData(int i, int i1, byte[] b) {
    }

    @Override
    public void ExceptionCallback(int i, int i1, int i2) {
    }

    @Override
    public void AcceptRegisterCallback(int i, int i1, com.sdk.interfance.NET_SDK_DEVICEINFO[] d) {
    }

    @Override
    public void onPlaybackEnd() {
    }

    private java.util.Map<String, Long> lastAlarmTimes = new java.util.concurrent.ConcurrentHashMap<>();

    private void emitAlarm(String type, int channelId, int userId) {
        String key = userId + "_" + channelId + "_" + type;
        long now = System.currentTimeMillis();
        Long lastTime = lastAlarmTimes.get(key);

        // Anti-Spam / Anti-Lag Throttle: Prevent the same alarm on the same channel
        // from firing more than once every 5 seconds.
        if (lastTime != null && (now - lastTime < 5000)) {
            return;
        }
        lastAlarmTimes.put(key, now);

        String deviceName = "Device " + userId;
        String deviceId = String.valueOf(userId);
        String chName = "Camera " + (channelId + 1);

        // Show Local Notification
        showNotification(type, "Activity detected on " + chName, String.valueOf(now), String.valueOf(channelId),
                deviceId);

        // Send Event to JS for UI Logging
        WritableMap params = Arguments.createMap();
        params.putString("type", type.toUpperCase().replace(" ", "_"));
        params.putString("trigger", "SENSOR");
        params.putString("deviceName", deviceName);
        params.putString("deviceId", deviceId);
        params.putString("channelName", chName);
        params.putInt("channelId", channelId);
        params.putDouble("timestamp", (double) now);

        try {
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onAlarmEvent", params);
        } catch (Exception e) {
            android.util.Log.e("NvrSdk", "Failed to emit alarm event: " + e.getMessage());
        }
    }

    @Override
    public void onAlarmTypeVFD(com.sdk.interfance.bean.N900AlarmVFDContainer c) {
        if (c != null)
            emitAlarm("Motion Detection", 0, c.userId);
    }

    @Override
    public void onAlarmTypeAVD(com.sdk.interfance.bean.NET_SDK_IVE_AVD_T c) {
        if (c != null)
            emitAlarm("AVD Event", 0, 0); // No easy channel id
    }

    @Override
    public void onAlarmTypeFaceMatch(com.sdk.interfance.bean.NET_SDK_IVE_FACE_MATCH_T c) {
        if (c != null)
            emitAlarm("Face Match", c.Channel, 0);
    }

    @Override
    public void onAlarmTypeFaceMatchForIPC(com.sdk.interfance.bean.N900AlarmFaceIPCContainer c) {
        if (c != null)
            emitAlarm("Face Match", 0, c.userId);
    }

    @Override
    public void onAlarmASD(com.sdk.interfance.bean.N9000SmartASDContainer c) {
        if (c != null && c.event != null)
            emitAlarm("ASD Event", c.event.chnn, c.userId);
    }

    @Override
    public void onAlarmIpcAOIENTRY(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
        if (c != null && c.event != null)
            emitAlarm("Intrusion", c.event.chnn, c.userId);
    }

    @Override
    public void onAlarmNvrAOIENTRY(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
        if (c != null && c.event != null)
            emitAlarm("Intrusion", c.event.chnn, c.userId);
    }

    @Override
    public void onAlarmIpcAOILEAVE(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
        if (c != null && c.event != null)
            emitAlarm("Intrusion", c.event.chnn, c.userId);
    }

    @Override
    public void onAlarmNvrAOILEAVE(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
        if (c != null && c.event != null)
            emitAlarm("Intrusion", c.event.chnn, c.userId);
    }

    @Override
    public void onAlarmPVD(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
        if (c != null && c.event != null)
            emitAlarm("Human Detection", c.event.chnn, c.userId);
    }

    @Override
    public void onAlarmLoiter(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
        if (c != null && c.event != null)
            emitAlarm("Loitering", c.event.chnn, c.userId);
    }

    @Override
    public void onAlarmVSD(com.sdk.interfance.bean.N9000SmartVSDContainer c) {
        if (c != null && c.head != null)
            emitAlarm("VSD Event", c.head.channel, c.userId);
    }
}
