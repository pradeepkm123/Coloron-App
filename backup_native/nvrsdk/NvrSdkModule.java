package com.vms.nvrsdk;

import android.content.Context;
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
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import android.os.Handler;
import android.os.Looper;

public class NvrSdkModule extends ReactContextBaseJavaModule {
    private static final String TAG = "NvrSdk";
    // Load native libraries in the correct order
    static {
        try {
            System.loadLibrary("AudioCode");
            System.loadLibrary("AudioCodec");
            System.loadLibrary("H264Decode");
            System.loadLibrary("NatTraveral");
            System.loadLibrary("Recorder");
            System.loadLibrary("nvrsdk");
        } catch (UnsatisfiedLinkError e) {
            Log.e(TAG, "Native library load failed: " + e.getMessage());
        }
    }

    private final ReactApplicationContext reactContext;
    private nvrsdk sdk;
    private static final Object sdkLock = new Object();
    static java.util.Set<Long> liveHandles = java.util.Collections.synchronizedSet(new java.util.HashSet<>());
    private volatile boolean isSimulationRunning = false;
    private volatile boolean isLanSearchRunning = false;
    private Thread lanSearchThread = null;
    private static final String CHANNEL_ID = "vms_alarm_channel";
    private WifiManager.MulticastLock mcastLock;

    // Stream type constants
    private static final int MAIN_STREAM = 0;
    private static final int SUB_STREAM = 1;

    public NvrSdkModule(@NonNull ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        createNotificationChannel();
        try {
            this.sdk = nvrsdk.getInstance(reactContext.getApplicationContext());
            if (this.sdk != null) {
                this.sdk.Init(reactContext.getApplicationContext());
                this.sdk.SetConnectTime(3000, 3000);
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
        return liveHandles.contains(handle);
    }

    @NonNull
    @Override
    public String getName() {
        return "NvrSdk";
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
        m.putInt("videoInputNum", info.videoInputNum);
        m.putInt("audioInputNum", info.audioInputNum);
        m.putInt("deviceType", info.deviceType);
        m.putBoolean("audioSupport", info.audioInputNum > 0 || info.audioStream > 0);
        m.putBoolean("dualStream", info.doblueStream > 0);

        if (info.deviceName != null)
            m.putString("deviceName", new String(info.deviceName).trim());
        if (info.szSN != null)
            m.putString("serialNumber", new String(info.szSN).trim());
        if (info.firmwareVersion != null)
            m.putString("version", new String(info.firmwareVersion).trim());
        if (info.deviceProduct != null)
            m.putString("model", new String(info.deviceProduct).trim());

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
                this.sdk = nvrsdk.getInstance(reactContext.getApplicationContext());
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
                synchronized (sdkLock) {
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
                synchronized (sdkLock) {
                    sdk.Init(reactContext.getApplicationContext());
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
                        synchronized (sdkLock) {
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
                        synchronized (sdkLock) {
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

    private synchronized void ensureSdk() throws Exception {
        if (this.sdk == null) {
            try {
                // TVT SDK getInstance follows the Singleton pattern.
                this.sdk = nvrsdk.getInstance(reactContext.getApplicationContext());
                if (this.sdk != null) {
                    Log.d(TAG, "NVR SDK getInstance() succeeded. Calling Init()...");
                    // CRITICAL: Even if some demos skip this, many versions require
                    // Init(context) to initialize the network and socket engine properly.
                    boolean initRes = this.sdk.Init(reactContext.getApplicationContext());
                    Log.d(TAG, "NVR SDK Init() result: " + initRes);

                    // Injecting a Dummy Callback to prevent JNI "java_object == null" crashes
                    // When the Native Component (NvrVideoView) is fully mounted, it overwrites this
                    // callback with its own.
                    this.sdk.SetCallback(new com.sdk.interfance.NVRSDKCallback() {
                        @Override
                        public void onVideoDataFormatHead(long liveHandle, int iEncodeType) {
                        }

                        @Override
                        public void onVideoData(long handle, int type, byte[] data, int lens, long time,
                                boolean isKeyFrame, int width, int height, int frameRate, int bitRate, int reserved) {
                        }

                        @Override
                        public void onAudioData(long handle, int type, byte[] data, int lens, long time, int sampleRate,
                                int channels, int bitsPerSample, int reserved) {
                        }

                        @Override
                        public void onTalkData(int handle, int type, byte[] data) {
                        }

                        @Override
                        public void ExceptionCallback(int handle, int type, int error) {
                        }

                        @Override
                        public void AcceptRegisterCallback(int userId, int type,
                                com.sdk.interfance.NET_SDK_DEVICEINFO[] deviceInfos) {
                        }

                        @Override
                        public void onPlaybackEnd() {
                        }

                        @Override
                        public void onAlarmTypeVFD(com.sdk.interfance.bean.N900AlarmVFDContainer container) {
                        }

                        @Override
                        public void onAlarmTypeAVD(com.sdk.interfance.bean.NET_SDK_IVE_AVD_T container) {
                        }

                        @Override
                        public void onAlarmTypeFaceMatch(com.sdk.interfance.bean.NET_SDK_IVE_FACE_MATCH_T container) {
                        }

                        @Override
                        public void onAlarmTypeFaceMatchForIPC(
                                com.sdk.interfance.bean.N900AlarmFaceIPCContainer container) {
                        }

                        @Override
                        public void onAlarmASD(com.sdk.interfance.bean.N9000SmartASDContainer container) {
                        }

                        @Override
                        public void onAlarmIpcAOIENTRY(com.sdk.interfance.bean.N9000SmartCommonContainer container) {
                        }

                        @Override
                        public void onAlarmNvrAOIENTRY(com.sdk.interfance.bean.N9000SmartCommonContainer container) {
                        }

                        @Override
                        public void onAlarmIpcAOILEAVE(com.sdk.interfance.bean.N9000SmartCommonContainer container) {
                        }

                        @Override
                        public void onAlarmNvrAOILEAVE(com.sdk.interfance.bean.N9000SmartCommonContainer container) {
                        }

                        @Override
                        public void onAlarmPVD(com.sdk.interfance.bean.N9000SmartCommonContainer container) {
                        }

                        @Override
                        public void onAlarmLoiter(com.sdk.interfance.bean.N9000SmartCommonContainer container) {
                        }

                        @Override
                        public void onAlarmVSD(com.sdk.interfance.bean.N9000SmartVSDContainer container) {
                        }
                    });
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
                    boolean isWifi = false;
                    if (loginType != 0) { // Only set for non-TCP (P2P/NAT)
                        isWifi = params.hasKey("isWifi") && params.getBoolean("isWifi");
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
                        synchronized (sdkLock) {
                            // Increased timeout for more stable handshake
                            sdk.SetConnectTime(5000, 5000);
                            sdk.SetReconnect(3000, true);

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
                        synchronized (sdkLock) {
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
                    NET_SDK_DEVICEINFO info = NET_SDK_DEVICEINFO.deserialize(devBytes, 0);

                    // CRITICAL: Share loginHandle with TVTManager for TVTLiveView to use
                    TVTManager.initSDK(reactContext.getApplicationContext());
                    TVTManager.loginHandle = userId;
                    android.util.Log.d("NvrSdk", "Login SUCCESS - Set TVTManager.loginHandle = " + userId);

                    WritableMap res = Arguments.createMap();
                    res.putInt("userId", userId);
                    res.putInt("channelCount", info.videoInputNum);
                    res.putMap("deviceInfo", deviceInfoToMap(info));

                    android.util.Log.i("NvrSdk",
                            "Login SUCCESS: userId=" + userId + ", channels=" + info.videoInputNum);
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
                    synchronized (sdkLock) {
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
                    synchronized (sdkLock) {
                        devBytes = sdk.GetDeviceInfo(userId);
                    }
                    if (devBytes == null) {
                        promise.reject("GET_INFO_FAILED", "GetDeviceInfo returned null");
                        return;
                    }
                    NET_SDK_DEVICEINFO info = NET_SDK_DEVICEINFO.deserialize(devBytes, 0);
                    int count = info.videoInputNum;

                    byte[] statusBytes = null;
                    try {
                        synchronized (sdkLock) {
                            statusBytes = sdk.GetCHDeviceStatus(userId);
                        }
                        if (statusBytes != null) {
                            android.util.Log.d("NvrSdk", "GetCHDeviceStatus returned " + statusBytes.length + " bytes");
                        }
                    } catch (Exception e) {
                        android.util.Log.e("NvrSdk", "Failed to GetCHDeviceStatus: " + e.getMessage());
                    }

                    WritableArray arr = Arguments.createArray();
                    for (int i = 0; i < count; i++) {
                        WritableMap ch = Arguments.createMap();
                        ch.putInt("id", i); // 0-based channel index

                        String channelName = "Camera " + (i + 1);
                        try {
                            // Try to get actual channel name from config
                            // 769 = DD_CONFIG_ITEM_CHNN_CONFIG
                            java.lang.Integer actualSize = 0;
                            byte[] cfgBytes = null;
                            synchronized (sdkLock) {
                                cfgBytes = sdk.GetDVRConfig(userId, 769, i, 2048, actualSize, true);
                            }
                            if (cfgBytes != null) {
                                SDKDefs.DD_CHANNEL_CONFIG chCfg = SDKDefs.DD_CHANNEL_CONFIG.deserialize(cfgBytes, 0);
                                if (chCfg != null && chCfg.name != null) {
                                    // Extract name and handle non-ASCII chars
                                    String fetchedName = new String(chCfg.name, "UTF-8").split("\0")[0].trim();
                                    if (!fetchedName.isEmpty()) {
                                        channelName = fetchedName;
                                        android.util.Log.d("NvrSdk",
                                                "Fetched name for channel " + i + ": " + channelName);
                                    }
                                }
                            }
                        } catch (Exception e) {
                            android.util.Log.e("NvrSdk",
                                    "Failed to fetch channel name for ch " + i + ": " + e.getMessage());
                        }

                        boolean isOnline = true;
                        if (statusBytes != null && i < statusBytes.length) {
                            // In TVT SDK, status != 0 usually means online/active
                            isOnline = (statusBytes[i] != 0);
                        }

                        ch.putString("name", channelName);
                        ch.putBoolean("online", isOnline);
                        arr.pushMap(ch);
                    }
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
                    synchronized (sdkLock) {
                        handle = sdk.LivePlay(userId, channelId, st);
                    }

                    if (handle <= 0) {
                        int err = sdk.GetLastError();
                        android.util.Log.e("NvrSdk", ">>> startLive FAILED: handle=" + handle + " Error=" + err);
                        promise.reject("LIVE_FAILED", "LivePlay failed. handle=" + handle + " Error=" + err);
                        return;
                    }

                    android.util.Log.i("NvrSdk", ">>> startLive SUCCESS: playHandle=" + handle);

                    liveHandles.add(handle);
                    try {
                        synchronized (sdkLock) {
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
                    long handle = Long.parseLong(handleStr);
                    boolean ok = sdk.StopLivePlay(handle);
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

                        findHandle = sdk.FindFile(userId, (long) realChannel, startRaw, endRaw);
                        if (findHandle == -1) {
                            findHandle = sdk.FindFile(userId, (long) realChannel, startMixed, endMixed);
                        }
                        if (findHandle == -1) {
                            findHandle = sdk.FindFile(userId, (long) realChannel, startOff, endOff);
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
                        findHandle = sdk.FindFile(userId, (long) ch1, startRaw, endRaw);
                        if (findHandle == -1)
                            findHandle = sdk.FindFile(userId, (long) ch1, startMixed, endMixed);
                        if (findHandle == -1)
                            findHandle = sdk.FindFile(userId, (long) ch1, startOff, endOff);
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
                        NET_SDK_REC_FILE f = sdk.FindNextFile(findHandle);
                        if (f == null)
                            break;

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

                    sdk.FindClose(findHandle);
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
                    long recDateHandle = sdk.FindRecDate(userId);
                    if (recDateHandle != -1) {
                        while (true) {
                            NET_SDK_REC_FILE rec = sdk.FindNextRecDate(recDateHandle);
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
                        sdk.FindRecDateClose(recDateHandle);
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
                        long findHandle = sdk.FindFile(userId, (long) chToTry, startRaw, endRaw);
                        if (findHandle == -1)
                            findHandle = sdk.FindFile(userId, (long) chToTry, startMixed, endMixed);

                        if (findHandle != -1) {
                            for (int i = 0; i < 2000; i++) {
                                NET_SDK_REC_FILE f = sdk.FindNextFile(findHandle);
                                if (f == null)
                                    break;
                                int[] sArr = f.getStartTime();
                                int fYear = sArr[0] < 1000 ? sArr[0] + 1900 : sArr[0];
                                int fMonth = sArr[0] < 1000 ? sArr[1] + 1 : sArr[1];
                                if (fYear == year && fMonth == month) {
                                    uniqueDays.add(sArr[2]);
                                }
                            }
                            sdk.FindClose(findHandle);
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
                    sdk.StopLivePlay(handle);
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

                    int[] startOff = new int[] { start[0] - 1900, start[1] - 1, start[2], start[3], start[4],
                            start[5] };
                    int[] endOff = new int[] { end[0] - 1900, end[1] - 1, end[2], end[3], end[4], end[5] };

                    int[][] timeStructs = { startRaw, endRaw, startOff, endOff };

                    android.util.Log.i("NvrSdk", " PLAYBACK START REQUEST:");
                    android.util.Log.i("NvrSdk", "   User=" + userId + " Ch=" + channelId);
                    android.util.Log.i("NvrSdk", "   Time: " + fromISO + "  " + toISO);
                    android.util.Log.i("NvrSdk", "   Offset Struct: [" + startOff[0] + "," + startOff[1] + ","
                            + startOff[2] + "," + startOff[3] + ":" + startOff[4] + ":" + startOff[5] + "]");

                    // STEP 2: Try CACHED config first for speed
                    PlaybackConfig cached = playbackCache.get(userId);
                    long handle = -1;
                    int successChannel = -1;

                    if (cached != null) {
                        int realChannel = channelId + cached.offset;
                        int[] channels = new int[] { realChannel };
                        int[] sStruct = (cached.timeType == 0) ? startRaw : startOff;
                        int[] eStruct = (cached.timeType == 0) ? endRaw : endOff;

                        android.util.Log.i("NvrSdk", " Using CACHED config: Offset=" + cached.offset + " TimeType="
                                + cached.timeType + " Stream=" + cached.streamType + " Ex=" + cached.isEx);

                        try {
                            if (cached.isEx) {
                                handle = sdk.PlayBackByTimeEx(userId, channels, cached.streamType, sStruct, eStruct,
                                        false);
                            } else {
                                handle = sdk.PlayBackByTime(userId, channels, cached.streamType, sStruct, eStruct);
                            }

                            if (handle > 0 || handle < -100) {
                                successChannel = realChannel;
                                android.util.Log.i(TAG, "CACHED config HIT! Handle=" + handle);
                            }
                        } catch (Exception e) {
                            android.util.Log.w("NvrSdk", "Cached config failed: " + e.getMessage());
                        }
                    }

                    if (handle == -1 || (handle >= -100 && handle < 0)) {
                        // STEP 3: Fallback to Multi-Loop Search
                        int[] channelOffsets = { 0, 32, 64, 100 };

                        searchLoop: for (int offset : channelOffsets) {
                            int realChannel = channelId + offset;
                            int[] channels = new int[] { realChannel };

                            for (int t = 0; t < 2; t++) {
                                int[] sStruct = (t == 0) ? startRaw : startOff;
                                int[] eStruct = (t == 0) ? endRaw : endOff;
                                String tType = (t == 0) ? "RAW" : "OFFSET";

                                android.util.Log.d("NvrSdk",
                                        "   Trying Ch=" + realChannel + " with " + tType + " time...");

                                int[] streamsToTry = st != -1 ? new int[] { st } : new int[] { 1, 0 };
                                for (int stream : streamsToTry) {
                                    try {
                                        handle = sdk.PlayBackByTime(userId, channels, stream, sStruct, eStruct);
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

                                // Try PlayBackByTimeEx
                                try {
                                    handle = sdk.PlayBackByTimeEx(userId, channels, 0, sStruct, eStruct, false);
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

                    // Fallback: Try Ch+1
                    if (handle == -1 || (handle >= -100 && handle < 0)) {
                        int ch1 = channelId + 1;
                        int[] channels1 = new int[] { ch1 };
                        android.util.Log.d("NvrSdk", "   Search failed. Trying Fallback Ch=" + ch1);
                        try {
                            handle = sdk.PlayBackByTimeEx(userId, channels1, MAIN_STREAM, startOff, endOff, false);
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

                    // DEFER PlayBackControl to the View (PlaybackSurfaceView)
                    // This ensures we don't start decoding before the surface is ready.
                    // sdk.PlayBackControl(handle, 15, 0); // CMD_START_DECODE
                    // sdk.PlayBackControl(handle, 3, 0); // RESUME
                    // sdk.SetPlayerBufNumber(handle, 1);

                    // STEP 6: Return handle and success
                    // Surface will bind this handle and video should appear
                    if (handle >= -100 && handle < 0) {
                        promise.reject("PLAYBACK_FAILED", "Failed (Error " + handle + ")");
                        return;
                    }

                    android.util.Log.i(TAG, " Playback Success! Handle=" + handle + " RealCh=" + successChannel);
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
            long handle = Long.parseLong(handleStr);
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
                    long handle = Long.parseLong(handleStr);
                    boolean ok = sdk.StopPlayBack(handle);
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
                    long handle = Long.parseLong(params.getString("handle"));
                    int command = params.getInt("command");
                    long value = params.hasKey("value") ? (long) params.getInt("value") : 0L;

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
                            synchronized (sdkLock) {
                                count = sdk.SearchDevice(deviceType, devices, 20);
                            }
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
                        map.putString("ipAddress", ip);
                        map.putString("deviceName", "Network Device");
                        map.putInt("netPort", 6036);
                        map.putInt("httpPort", 80);
                        map.putInt("deviceType", 2);
                        map.putString("productType", "NVR/IPC");
                        map.putString("source", "UDP");
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
        map.putString("ipAddress", d.ipAddress != null ? d.ipAddress : "");
        map.putString("deviceName", d.devName != null ? d.devName : "TVT Device");
        map.putInt("netPort", d.netPort > 0 ? d.netPort : 5000);
        map.putInt("httpPort", d.httpPort > 0 ? d.httpPort : 80);
        map.putInt("deviceType", d.deviceType);
        map.putString("productType", d.productType != null ? d.productType : "NVR");
        StringBuilder mac = new StringBuilder();
        if (d.macAddress != null) {
            for (int j = 0; j < d.macAddress.length; j++) {
                mac.append(String.format("%02X", d.macAddress[j]));
                if (j < d.macAddress.length - 1)
                    mac.append(":");
            }
        }
        map.putString("macAddress", mac.toString());
        return map;
    }

    private void emitDevice(WritableMap map) {
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onDeviceFound", map);
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
    public void checkConnect(ReadableMap params, Promise promise) {
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
                        success = sdk.CaptureJPEGFileV2(userId, channelId, path);
                        if (!success) {
                            android.util.Log.w("NvrSdk",
                                    "CaptureJPEGFileV2 ch" + channelId + " failed, trying ch" + (channelId + 1));
                            success = sdk.CaptureJPEGFileV2(userId, channelId + 1, path);
                        }
                    } catch (Throwable t) {
                        android.util.Log.e(TAG, "SNAPSHOT_THREAD: CaptureJPEGFileV2 crashed: " + t.getMessage());
                    }

                    // Attempt 2: Memory Capture (Data V2) - Fallback
                    if (!success || !file.exists() || file.length() < 100) {
                        try {
                            android.util.Log.i(TAG, "SNAPSHOT_THREAD: Trying CaptureJPEGDataV2 (Buffer)...");
                            data = sdk.CaptureJPEGDataV2(userId, channelId);
                            if (data == null)
                                data = sdk.CaptureJPEGDataV2(userId, channelId + 1);
                        } catch (Throwable t) {
                            android.util.Log.e(TAG, "SNAPSHOT_THREAD: CaptureJPEGDataV2 crashed: " + t.getMessage());
                        }
                    }

                    // Attempt 3: Memory Capture (Picture) - Last Resort
                    if ((!success && data == null) && (!file.exists() || file.length() < 100)) {
                        try {
                            android.util.Log.i(TAG, "SNAPSHOT_THREAD: Trying CaptureJPEGPicture (Old API)...");
                            data = sdk.CaptureJPEGPicture(userId, channelId);
                            if (data == null)
                                data = sdk.CaptureJPEGPicture(userId, channelId + 1);
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

    private String convertToSafePath(String path) {
        if (path == null)
            return null;
        String cleanPath = path;
        if (cleanPath.startsWith("file://")) {
            cleanPath = cleanPath.substring(7);
        }
        if (cleanPath.startsWith("/sdcard/")) {
            java.io.File extDir = reactContext.getExternalFilesDir(null);
            if (extDir != null) {
                String subPath = cleanPath.substring(8); // remove /sdcard/
                subPath = subPath.replace("@", "_").replace("..", ".");
                return new java.io.File(extDir, subPath).getAbsolutePath();
            }
        }
        return cleanPath;
    }

    @ReactMethod
    public void capturePlaybackSnapshot(ReadableMap params, Promise promise) {
        try {
            ensureSdk();
            String handleStr = params.getString("handle");
            long handle = Long.parseLong(handleStr);
            String pathIn = params.getString("path");
            String savePath = convertToSafePath(pathIn);

            // Optional: for fallback
            int userId = params.hasKey("userId") ? params.getInt("userId") : -1;
            int channelId = params.hasKey("channelId") ? params.getInt("channelId") : -1;

            // Ensure directory exists
            java.io.File file = new java.io.File(savePath);
            java.io.File parent = file.getParentFile();
            if (parent != null && !parent.exists()) {
                parent.mkdirs();
            }

            // Try 1: Playback Capture (JPG)
            boolean ok = false;
            try {
                ok = sdk.PlayBackCaptureFile(handle, 0L, savePath);
            } catch (Throwable t) {
                android.util.Log.e("NvrSdk", "CRITICAL: PlayBackCaptureFile (JPG) crashed: " + t.getMessage());
            }

            // Try 2: Playback Capture (BMP Fallback)
            if (!ok && savePath.toLowerCase().endsWith(".jpg")) {
                String bmpPath = savePath.substring(0, savePath.length() - 4) + ".bmp";
                try {
                    boolean bmpOk = sdk.PlayBackCaptureFile(handle, 0L, bmpPath);
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
                            }
                        } catch (Exception e) {
                            android.util.Log.e("NvrSdk", "BMP Conversion failed: " + e.getMessage());
                        }
                    }
                } catch (Throwable t) {
                    android.util.Log.e("NvrSdk", "CRITICAL: PlayBackCaptureFile (BMP) crashed: " + t.getMessage());
                }
            }

            // Try 3: Live Capture Fallback (If supported by NVR during playback context)
            if (!ok && userId != -1 && channelId != -1) {
                try {
                    // Add small delay to avoid race conditions with previous capture attempt
                    Thread.sleep(200);

                    // SAFETY: Catch Throwable to prevent native crash (SIGSEGV etc)
                    byte[] data = null;
                    try {
                        data = sdk.CaptureJPEGDataV2(userId, channelId);
                    } catch (Throwable t) {
                        android.util.Log.e("NvrSdk", "CRITICAL: CaptureJPEGDataV2 crashed native: " + t.getMessage());
                        // Do not rethrow
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
                promise.reject("SNAPSHOT_FAILED", "PlayBackCaptureFile returned false");
                return;
            }

            MediaScannerConnection.scanFile(reactContext, new String[] { savePath }, null, null);
            promise.resolve(savePath);
        } catch (Exception e) {
            promise.reject("SNAPSHOT_ERROR", e.getMessage());
        }
    }

    /**
     * Local Recording
     * params: { handle: string, path: string }
     */
    @ReactMethod
    public void startLocalRecord(ReadableMap params, Promise promise) {
        try {
            ensureSdk();
            String handleStr = params.getString("handle");
            long handle = Long.parseLong(handleStr);
            String pathIn = params.getString("path");
            String path = convertToSafePath(pathIn);

            // Ensure directory exists
            java.io.File file = new java.io.File(path);
            if (file.getParentFile() != null) {
                file.getParentFile().mkdirs();
            }

            if (params.hasKey("userId")) {
                int userId = params.getInt("userId");
                sdk.MakeKeyFrame(userId, handle);
                sdk.MakeKeyFrameSub(userId, handle);
                try {
                    Thread.sleep(200);
                } catch (Exception ignored) {
                }
            }

            // USE A LARGER BUFFER for recording stability
            sdk.SetPlayerBufNumber(handle, 20);

            boolean ok = false;
            // Check if this is a Live handle or Playback handle
            if (liveHandles.contains(handle)) {
                ok = sdk.SaveLiveData(handle, path);
            } else {
                // Assume Playback
                ok = sdk.PlayBackSaveData(handle, 0L, path);
            }

            if (!ok) {
                promise.reject("RECORD_START_FAILED", "SaveData returned false for path: " + path);
                return;
            }

            // FORCE AN I-FRAME immediately so the recording starts with valid video data
            try {
                if (params.hasKey("userId")) {
                    int userId = params.getInt("userId");
                    sdk.MakeKeyFrame(userId, handle);
                    sdk.MakeKeyFrameSub(userId, handle);
                }
            } catch (Exception ignored) {
            }

            promise.resolve(path);
        } catch (Exception e) {
            promise.reject("RECORD_START_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopLocalRecord(ReadableMap params, Promise promise) {
        try {
            ensureSdk();
            String handleStr = params.getString("handle");
            long handle = Long.parseLong(handleStr);

            boolean ok = false;
            if (liveHandles.contains(handle)) {
                ok = sdk.StopSaveLiveData(handle);
            } else {
                // Playback
                ok = sdk.StopPlayBackSave(handle, 0L);
            }

            if (!ok) {
                promise.reject("RECORD_STOP_FAILED", "StopSaveData returned false");
                return;
            }

            // Scan file so it shows in Gallery immediately
            String lastPath = params.hasKey("path") ? params.getString("path") : null;
            if (lastPath != null) {
                String safe = convertToSafePath(lastPath);
                android.media.MediaScannerConnection.scanFile(reactContext, new String[] { safe }, null, null);
            }

            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                // Optionally verify file
            }, 800);

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("RECORD_STOP_ERROR", e.getMessage());
        }
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
            long handle = Long.parseLong(handleStr);
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
            long handle = Long.parseLong(handleStr);
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
    public void saveMediaToPublic(String pathIn, Promise promise) {
        try {
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
            // Native handle is string in JS, convert to long
            long handle = Long.parseLong(params.getString("handle"));

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
            long handle = Long.parseLong(params.getString("handle"));
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
            long handle = Long.parseLong(params.getString("handle"));
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
}
