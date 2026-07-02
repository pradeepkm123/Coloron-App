package com.vms;

import android.content.Intent;
import android.util.Log;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.sdk.interfance.NVRSDKCallback;
import com.sdk.interfance.NET_SDK_N9000_ALARM_TYPE;
import com.sdk.interfance.NET_SDK_DEVICEINFO;
import com.sdk.interfance.bean.*;
import com.vms.tvt.TVTManager;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.json.JSONArray;
import org.json.JSONObject;

public class TvtAlarmModule extends ReactContextBaseJavaModule implements NVRSDKCallback {
    private static final String TAG = "TvtAlarmModule";

    // ─── SDK Alarm Type Constants (verified from SDK jar) ─────────────────────
    // MOTION0=1, SENSOR=2, VFD(Face)=12, AOIENTRY(Intrusion/PEA)=21, AOILEAVE=22
    // VSD/PVD(Vehicle/Human metadata) uses SetupAlarmChan + VSD callback, no smartSubscrib
    private static final int ALARM_TYPE_MOTION   = NET_SDK_N9000_ALARM_TYPE.NET_SDK_N9000_ALARM_TYPE_MOTION0; // 1
    private static final int ALARM_TYPE_SENSOR   = NET_SDK_N9000_ALARM_TYPE.NET_SDK_N9000_ALARM_TYPE_SENSOR;  // 2
    private static final int ALARM_TYPE_VFD      = NET_SDK_N9000_ALARM_TYPE.NET_SDK_N9000_ALARM_TYPE_VFD;     // 12
    private static final int ALARM_TYPE_AOIENTRY = NET_SDK_N9000_ALARM_TYPE.NET_SDK_N9000_ALARM_TYPE_AOIENTRY; // 21
    private static final int ALARM_TYPE_AOILEAVE = 22; // NET_SDK_N9000_ALARM_TYPE_AOILEAVE

    private final ReactApplicationContext reactContext;
    private final Map<Integer, DeviceAlarmInfo> devices = new ConcurrentHashMap<>();
    private final Map<String, Long> lastEventTimestamps = new ConcurrentHashMap<>();
    private final Map<String, String> subscriptionServerAddresses = new ConcurrentHashMap<>();
    // Track active alarm channels (handle → channel alarm handle) for motion/sensor
    private final Map<String, Long> alarmChanHandles = new ConcurrentHashMap<>();

    private static final long THROTTLE_COOLDOWN_MS = 5000; // 5 second per-type per-channel

    private static class DeviceAlarmInfo {
        String deviceId;
        String deviceName;
        int loginHandle;
        int userId;
        String deviceType;
        int channelCount;
        final List<String> channelNames = new ArrayList<>();
    }

    public TvtAlarmModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() { return "TvtAlarmModule"; }

    @Override
    public void initialize() {
        super.initialize();
        TVTManager.initSDK(reactContext);
        TVTManager.addListener(this);
        createNotificationChannel();
        Log.d(TAG, "TvtAlarmModule initialized, SDK callback registered");
    }

    @Override
    public void onCatalystInstanceDestroy() {
        TVTManager.removeListener(this);
        super.onCatalystInstanceDestroy();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // startAlarmService — registers device info and starts motion channel listen
    // ─────────────────────────────────────────────────────────────────────────
    @ReactMethod
    public void startAlarmService(String deviceId, String deviceName, int loginHandle,
            int userId, String deviceType, int channelCount, String channelNamesJson, Promise promise) {
        try {
            Log.d(TAG, "startAlarmService device=" + deviceId + " handle=" + loginHandle + " userId=" + userId);
            DeviceAlarmInfo info = new DeviceAlarmInfo();
            info.deviceId = deviceId;
            info.deviceName = deviceName;
            info.loginHandle = loginHandle;
            info.userId = userId;
            info.deviceType = deviceType;
            info.channelCount = channelCount;

            // Parse channel names
            if (channelNamesJson != null && !channelNamesJson.isEmpty()) {
                try {
                    JSONArray array = new JSONArray(channelNamesJson);
                    for (int i = 0; i < array.length(); i++) {
                        JSONObject obj = array.getJSONObject(i);
                        int id = obj.optInt("id", i);
                        String name = obj.optString("name", "CH " + (id + 1));
                        while (info.channelNames.size() <= id) info.channelNames.add(null);
                        info.channelNames.set(id, name);
                    }
                } catch (Exception ex) {
                    Log.e(TAG, "Error parsing channelNamesJson", ex);
                }
            }

            devices.put(loginHandle, info);
            if (userId != loginHandle) devices.put(userId, info);

            // Save to SharedPreferences so it persists across JS reloads/background kills
            try {
                android.content.SharedPreferences prefs = reactContext.getSharedPreferences("VMS_ALARM_DEVICES", android.content.Context.MODE_PRIVATE);
                android.content.SharedPreferences.Editor editor = prefs.edit();
                editor.putString("last_device_id", deviceId);
                editor.putString("last_device_name", deviceName);
                editor.putString("last_device_type", deviceType);
                editor.putInt("last_channel_count", channelCount);
                editor.putInt("last_login_handle", loginHandle);
                editor.putInt("last_user_id", userId);
                if (channelNamesJson != null) {
                    editor.putString("last_channel_names", channelNamesJson);
                }
                editor.apply();
            } catch (Exception ex) {
                Log.e(TAG, "Error saving to SharedPreferences", ex);
            }

            // Start the SetupAlarmChan for motion/sensor — this is the generic alarm channel
            com.sdk.interfance.nvrsdk sdk = TVTManager.getSdk();
            if (sdk != null) {
                String chanKey = deviceId + "_alarm_chan";
                long existingHandle = alarmChanHandles.getOrDefault(chanKey, -1L);
                if (existingHandle > 0) {
                    sdk.CloseAlarmChan(existingHandle);
                }
                long alarmHandle = sdk.SetupAlarmChan(loginHandle);
                if (alarmHandle > 0) {
                    alarmChanHandles.put(chanKey, alarmHandle);
                    Log.d(TAG, "SetupAlarmChan success handle=" + alarmHandle + " for device=" + deviceId);
                    logDeviceInfo(loginHandle, deviceId);
                } else {
                    Log.w(TAG, "SetupAlarmChan failed for device=" + deviceId + " lastError=" + sdk.GetLastError());
                }
            }

            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "startAlarmService error", e);
            promise.reject("START_ALARM_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopAlarmService(String deviceId, Promise promise) {
        try {
            Log.d(TAG, "stopAlarmService device=" + deviceId);
            // Close the alarm channel
            String chanKey = deviceId + "_alarm_chan";
            Long alarmHandle = alarmChanHandles.remove(chanKey);
            if (alarmHandle != null && alarmHandle > 0) {
                com.sdk.interfance.nvrsdk sdk = TVTManager.getSdk();
                if (sdk != null) sdk.CloseAlarmChan(alarmHandle);
                Log.d(TAG, "CloseAlarmChan handle=" + alarmHandle);
            }

            java.util.Iterator<Map.Entry<Integer, DeviceAlarmInfo>> it = devices.entrySet().iterator();
            while (it.hasNext()) {
                if (it.next().getValue().deviceId.equals(deviceId)) it.remove();
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("STOP_ALARM_ERROR", e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // subscribeAlarm — smart subscribe for AI events (VFD, AOI, etc.)
    // Motion/Sensor are handled via SetupAlarmChan (already done in startAlarmService)
    // ─────────────────────────────────────────────────────────────────────────
    @ReactMethod
    public void subscribeAlarm(String deviceId, String alarmType, String channelsJson, Promise promise) {
        try {
            Log.d(TAG, "subscribeAlarm device=" + deviceId + " type=" + alarmType + " channels=" + channelsJson);

            // Motion, Sensor, and Tampering use SetupAlarmChan — no smartSubscrib needed
            if (alarmType.equalsIgnoreCase("MOTION") || alarmType.equalsIgnoreCase("SENSOR") || alarmType.equalsIgnoreCase("TAMPERING")) {
                Log.d(TAG, "Motion/Sensor/Tampering use SetupAlarmChan — handled at startAlarmService. Skip smartSubscrib.");
                promise.resolve(true);
                return;
            }

            DeviceAlarmInfo info = findDeviceByDeviceId(deviceId);
            if (info == null) {
                Log.w(TAG, "subscribeAlarm: device not registered yet for " + deviceId + ", deferring ok.");
                promise.resolve(false);
                return;
            }

            int typeCode = getSmartTypeCode(deviceId, alarmType);
            if (typeCode == -1) {
                Log.w(TAG, "subscribeAlarm: unknown smart alarm type: " + alarmType);
                promise.resolve(false);
                return;
            }

            List<Integer> channelIds = parseChannelIds(channelsJson, info.channelCount);
            com.sdk.interfance.nvrsdk sdk = TVTManager.getSdk();
            if (sdk == null) {
                promise.reject("SDK_NOT_INITIALIZED", "NVR SDK not initialized");
                return;
            }

            int successCount = 0;
            int totalCount = channelIds.size();
            for (int chId : channelIds) {
                Log.d(TAG, "smartSubscrib handle=" + info.loginHandle + " type=" + typeCode + " ch=" + chId);
                NET_DVR_SUBSCRIBE_REPLY reply = sdk.smartSubscrib(info.loginHandle, typeCode, chId);
                boolean ok = (reply != null);
                if (ok && reply.serverAddress != null && !reply.serverAddress.isEmpty()) {
                    String subKey = deviceId + "_" + chId + "_" + typeCode;
                    subscriptionServerAddresses.put(subKey, reply.serverAddress);
                    Log.d(TAG, "Stored serverAddress=" + reply.serverAddress + " for key=" + subKey);
                    successCount++;
                }
                if (!ok) {
                    Log.w(TAG, "smartSubscrib failed ch=" + chId + " lastError=" + sdk.GetLastError());
                }
            }
            Log.d(TAG, "subscribeAlarm stats: device=" + deviceId + " type=" + alarmType + " success=" + successCount + "/" + totalCount);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "subscribeAlarm error", e);
            promise.reject("SUBSCRIBE_ALARM_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void unsubscribeAlarm(String deviceId, String alarmType, String channelsJson, Promise promise) {
        try {
            if (alarmType.equalsIgnoreCase("MOTION") || alarmType.equalsIgnoreCase("SENSOR") || alarmType.equalsIgnoreCase("TAMPERING")) {
                promise.resolve(true);
                return;
            }

            DeviceAlarmInfo info = findDeviceByDeviceId(deviceId);
            if (info == null) {
                promise.resolve(false);
                return;
            }

            int typeCode = getSmartTypeCode(deviceId, alarmType);
            if (typeCode == -1) {
                promise.resolve(false);
                return;
            }

            List<Integer> channelIds = parseChannelIds(channelsJson, info.channelCount);
            com.sdk.interfance.nvrsdk sdk = TVTManager.getSdk();
            if (sdk == null) {
                promise.reject("SDK_NOT_INITIALIZED", "NVR SDK not initialized");
                return;
            }

            for (int chId : channelIds) {
                String subKey = deviceId + "_" + chId + "_" + typeCode;
                String serverAddress = subscriptionServerAddresses.remove(subKey);
                if (serverAddress == null) serverAddress = "";
                int result = sdk.unSmartSubscrib(info.loginHandle, typeCode, chId, serverAddress);
                Log.d(TAG, "unSmartSubscrib handle=" + info.loginHandle + " type=" + typeCode
                        + " ch=" + chId + " res=" + result + " server=" + serverAddress);
            }
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "unsubscribeAlarm error", e);
            promise.reject("UNSUBSCRIBE_ALARM_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void testEmitAlarm(Promise promise) {
        // Fire a real synthetic MOTION event so the JS pipeline can be verified end-to-end
        Log.d(TAG, "testEmitAlarm: firing synthetic MOTION event");
        DeviceAlarmInfo info = devices.isEmpty() ? null : devices.values().iterator().next();
        int uid = (info != null) ? info.userId : 0;
        handleAlarmEvent(uid, null, 0, "MOTION", "🚨 Motion Detected", "[Test] Synthetic alarm", null);
        promise.resolve(true);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Alarm Type Code Mapping — uses NET_SDK_N9000_ALARM_TYPE constants
    // ─────────────────────────────────────────────────────────────────────────
    private int getSmartTypeCode(String deviceId, String alarmType) {
        if (alarmType == null) return -1;
        String type = alarmType.toUpperCase();

        // Determine if device is IPC or NVR
        boolean isIPC = false;
        DeviceAlarmInfo info = findDeviceByDeviceId(deviceId);
        if (info != null && info.deviceType != null) {
            isIPC = info.deviceType.equalsIgnoreCase("IPC") || info.deviceType.equalsIgnoreCase("IPCAMERA");
        }

        switch (type) {
            case "FACE_DETECTION":
            case "VFD":
                return 12; // NET_SDK_SMART_EVENT_TYPE_VFD (VFD = 12)
            case "FACE_RECOGNITION":
            case "FACE_MATCH":
                return isIPC ? 17 : 16; // FACE_MATCH_FOR_IPC (17) vs FACE_MATCH (16)
            case "VEHICLE_DETECTION":
            case "HUMAN_DETECTION":
            case "VSD":
                return 26; // NET_SDK_SMART_EVENT_TYPE_VSD (VSD = 26, needed for onAlarmVSD callbacks!)
            case "INTRUSION":
            case "AOIENTRY":
                return isIPC ? 21 : 30; // AOIENTRY (21) vs NVR_AOIENTRY (30)
            case "LINE_CROSSING":
            case "AOILEAVE":
                return isIPC ? 22 : 31; // AOILEAVE (22) vs NVR_AOILEAVE (31)
            case "LOITERING":
            case "LOITER":
                return 33; // NET_SDK_SMART_EVENT_TYPE_LOITER (LOITER = 33)
            case "CROWD_DETECTION":
            case "CDD":
                return 13; // NET_SDK_SMART_EVENT_TYPE_CDD (CDD = 13)
            default:
                return -1;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Central alarm event handler
    // ─────────────────────────────────────────────────────────────────────────
    private void handleAlarmEvent(int userId, String serialNumber, int channelId, String eventType, String title, String detailText, byte[] imageBytes) {
        handleAlarmEvent(userId, serialNumber, channelId, eventType, title, detailText, imageBytes, null);
    }

    private void handleAlarmEvent(int userId, String serialNumber, int channelId, String eventType, String title, String detailText, byte[] imageBytes, String plate) {
        Log.d(TAG, "handleAlarmEvent type=" + eventType + " ch=" + channelId + " userId=" + userId);

        DeviceAlarmInfo info = findDevice(userId, serialNumber);
        String deviceId   = info != null ? info.deviceId   : (serialNumber != null ? serialNumber : "unknown");
        String deviceName = info != null ? info.deviceName : "NVR";
        String channelName = resolveChannelName(info, channelId);

        // Throttle — 5 s per type per channel
        String throttleKey = deviceId + "_" + channelId + "_" + eventType;
        long now = System.currentTimeMillis();
        Long last = lastEventTimestamps.get(throttleKey);
        if (last != null && (now - last) < THROTTLE_COOLDOWN_MS) {
            Log.d(TAG, "Throttled event " + throttleKey);
            return;
        }
        lastEventTimestamps.put(throttleKey, now);

        String body = deviceName + " - " + channelName;
        if (detailText != null && !detailText.isEmpty()) {
            body += "\n" + detailText;
        }

        String imageUri = null;
        if (imageBytes != null && imageBytes.length > 0) {
            imageUri = saveImageToCache(imageBytes, eventType.toLowerCase());
        }

        WritableMap params = Arguments.createMap();
        params.putString("deviceId",     deviceId);
        params.putString("deviceName",   deviceName);
        params.putInt   ("channelId",    channelId);
        params.putString("channelName",  channelName);
        params.putString("type",         eventType);
        params.putString("title",        title);
        params.putString("body",         body);
        params.putString("detailText",   detailText != null ? detailText : "");
        params.putString("imageUri",     imageUri != null ? imageUri : "");
        params.putDouble("timestamp",    (double) now);
        if (plate != null) {
            params.putString("plate",    plate);
        }

        sendEvent("TVT_AI_EVENT", params);
    }

    private void handleAlarmEventWithUri(int userId, String serialNumber, int channelId, String eventType, String title, String detailText, String imageUri) {
        Log.d(TAG, "handleAlarmEvent type=" + eventType + " ch=" + channelId + " userId=" + userId);

        DeviceAlarmInfo info = findDevice(userId, serialNumber);
        String deviceId   = info != null ? info.deviceId   : (serialNumber != null ? serialNumber : "unknown");
        String deviceName = info != null ? info.deviceName : "NVR";
        String channelName = resolveChannelName(info, channelId);

        // Throttle — 5 s per type per channel
        String throttleKey = deviceId + "_" + channelId + "_" + eventType;
        long now = System.currentTimeMillis();
        Long last = lastEventTimestamps.get(throttleKey);
        if (last != null && (now - last) < THROTTLE_COOLDOWN_MS) {
            Log.d(TAG, "Throttled event " + throttleKey);
            return;
        }
        lastEventTimestamps.put(throttleKey, now);

        String body = deviceName + " - " + channelName;
        if (detailText != null && !detailText.isEmpty()) {
            body += "\n" + detailText;
        }

        WritableMap params = Arguments.createMap();
        params.putString("deviceId",     deviceId);
        params.putString("deviceName",   deviceName);
        params.putInt   ("channelId",    channelId);
        params.putString("channelName",  channelName);
        params.putString("type",         eventType);
        params.putString("title",        title);
        params.putString("body",         body);
        params.putString("detailText",   detailText != null ? detailText : "");
        params.putString("imageUri",     imageUri != null ? imageUri : "");
        params.putDouble("timestamp",    (double) now);

        sendEvent("TVT_AI_EVENT", params);
    }

    private String captureMotionSnapshot(int userId, int channelId) {
        try {
            com.sdk.interfance.nvrsdk sdk = TVTManager.getSdk();
            if (sdk == null) return null;

            java.io.File cacheDir = reactContext.getCacheDir();
            java.io.File imageFile = java.io.File.createTempFile("motion_ch" + channelId + "_", ".jpg", cacheDir);
            String path = imageFile.getAbsolutePath();

            long startTime = System.currentTimeMillis();
            boolean success = false;
            synchronized (TVTManager.sdkLock) {
                success = sdk.CaptureJPEGFileV2(userId, channelId, path);
            }
            if (!success) {
                // Try next channel ID offset if the first one failed (some TVT firmware offsets by 1)
                synchronized (TVTManager.sdkLock) {
                    success = sdk.CaptureJPEGFileV2(userId, channelId + 1, path);
                }
            }

            if (!success || !imageFile.exists() || imageFile.length() < 100) {
                // Try CaptureJPEGDataV2
                byte[] data = null;
                synchronized (TVTManager.sdkLock) {
                    data = sdk.CaptureJPEGDataV2(userId, channelId);
                    if (data == null) {
                        data = sdk.CaptureJPEGDataV2(userId, channelId + 1);
                    }
                }
                if (data != null && data.length > 0) {
                    java.io.FileOutputStream fos = new java.io.FileOutputStream(imageFile);
                    fos.write(data);
                    fos.close();
                    success = true;
                }
            }

            long duration = System.currentTimeMillis() - startTime;
            if (success && imageFile.exists() && imageFile.length() > 100) {
                Log.d(TAG, "captureMotionSnapshot success for ch=" + channelId + " in " + duration + "ms. Path=" + path + " Size=" + imageFile.length());
                return "file://" + path;
            } else {
                Log.w(TAG, "captureMotionSnapshot failed for ch=" + channelId + " in " + duration + "ms. Last error=" + sdk.GetLastError());
            }
        } catch (Exception e) {
            Log.e(TAG, "Error capturing motion snapshot for ch " + channelId, e);
        }
        return null;
    }

    private void logDeviceInfo(int userId, String deviceId) {
        try {
            com.sdk.interfance.nvrsdk sdk = TVTManager.getSdk();
            if (sdk != null) {
                byte[] infoBytes;
                synchronized (TVTManager.sdkLock) {
                    infoBytes = sdk.GetDeviceInfo(userId);
                }
                if (infoBytes != null && infoBytes.length > 0) {
                    NET_SDK_DEVICEINFO info = NET_SDK_DEVICEINFO.deserialize(infoBytes, 0);
                    String fw = info.firmwareVersion != null ? new String(info.firmwareVersion).trim() : "unknown";
                    String fwEx = info.firmwareVersionEx != null ? new String(info.firmwareVersionEx).trim() : "unknown";
                    String sn = info.szSN != null ? new String(info.szSN).trim() : "unknown";
                    String model = info.deviceProduct != null ? new String(info.deviceProduct).trim() : "unknown";
                    
                    Log.i(TAG, "=== DEVICE INFO VALIDATION ===");
                    Log.i(TAG, "Device ID: " + deviceId);
                    Log.i(TAG, "Model: " + model);
                    Log.i(TAG, "SN: " + sn);
                    Log.i(TAG, "Firmware: " + fw);
                    Log.i(TAG, "FirmwareEx: " + fwEx);
                    Log.i(TAG, "Build Date: " + info.buildDate);
                    Log.i(TAG, "Channels: " + info.videoInputNum);
                    
                    if (info.buildDate > 0 && info.buildDate < 20230000) {
                        Log.w(TAG, "⚠️ WARNING: Device " + deviceId + " build date is " + info.buildDate + 
                            ". Devices older than 3 years may experience inconsistent behavior with SDK alarm subscriptions.");
                    }
                    Log.i(TAG, "==============================");
                } else {
                    Log.w(TAG, "GetDeviceInfo returned null or empty for device " + deviceId);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to retrieve device info for device " + deviceId, e);
        }
    }

    private String saveImageToCache(byte[] imgBytes, String prefix) {
        if (imgBytes == null || imgBytes.length == 0) return null;
        try {
            java.io.File cacheDir = reactContext.getCacheDir();
            java.io.File imageFile = java.io.File.createTempFile(prefix + "_", ".jpg", cacheDir);
            java.io.FileOutputStream fos = new java.io.FileOutputStream(imageFile);
            fos.write(imgBytes);
            fos.close();
            return "file://" + imageFile.getAbsolutePath();
        } catch (Exception e) {
            Log.e(TAG, "Error saving image to cache", e);
            return null;
        }
    }

    private String resolveChannelName(DeviceAlarmInfo info, int channelId) {
        if (info != null && channelId >= 0 && channelId < info.channelNames.size()) {
            String name = info.channelNames.get(channelId);
            if (name != null && !name.isEmpty()) return name;
        }
        return "CH " + (channelId + 1);
    }

    private void sendEvent(String eventName, WritableMap params) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
            Log.d(TAG, "Emitted " + eventName + " type=" + params.getString("type"));
        } catch (Exception e) {
            Log.e(TAG, "Error emitting event " + eventName + ": " + e.getMessage());
        }
    }

    private DeviceAlarmInfo findDevice(int userId, String serialNumber) {
        if (userId > 0 && devices.containsKey(userId)) return devices.get(userId);
        if (serialNumber != null && !serialNumber.trim().isEmpty()) {
            String cleanSN = serialNumber.trim();
            for (DeviceAlarmInfo dev : devices.values()) {
                if (dev.deviceId != null && cleanSN.equalsIgnoreCase(dev.deviceId.trim())) return dev;
            }
        }
        if (!devices.isEmpty()) return devices.values().iterator().next();

        // Fallback to SharedPreferences
        try {
            android.content.SharedPreferences prefs = reactContext.getSharedPreferences("VMS_ALARM_DEVICES", android.content.Context.MODE_PRIVATE);
            String savedId = prefs.getString("last_device_id", null);
            if (savedId != null) {
                DeviceAlarmInfo info = new DeviceAlarmInfo();
                info.deviceId = savedId;
                info.deviceName = prefs.getString("last_device_name", "NVR");
                info.deviceType = prefs.getString("last_device_type", "NVR");
                info.channelCount = prefs.getInt("last_channel_count", 16);
                info.loginHandle = prefs.getInt("last_login_handle", 0);
                info.userId = prefs.getInt("last_user_id", 0);
                String savedChanJson = prefs.getString("last_channel_names", null);
                if (savedChanJson != null && !savedChanJson.isEmpty()) {
                    try {
                        JSONArray array = new JSONArray(savedChanJson);
                        for (int i = 0; i < array.length(); i++) {
                            JSONObject obj = array.getJSONObject(i);
                            int id = obj.optInt("id", i);
                            String name = obj.optString("name", "CH " + (id + 1));
                            while (info.channelNames.size() <= id) info.channelNames.add(null);
                            info.channelNames.set(id, name);
                        }
                    } catch (Exception ignored) {}
                }
                // Restore into the devices map to keep live reference active
                if (info.loginHandle > 0) {
                    devices.put(info.loginHandle, info);
                }
                if (info.userId > 0 && info.userId != info.loginHandle) {
                    devices.put(info.userId, info);
                }
                return info;
            }
        } catch (Exception ex) {
            Log.e(TAG, "Error loading fallback device from SharedPreferences", ex);
        }
        return null;
    }

    private DeviceAlarmInfo findDeviceByDeviceId(String deviceId) {
        if (deviceId == null) return null;
        String cleanId = deviceId.trim();
        for (DeviceAlarmInfo dev : devices.values()) {
            if (dev.deviceId != null && cleanId.equalsIgnoreCase(dev.deviceId.trim())) return dev;
        }
        // Fallback to restore from SharedPreferences
        try {
            android.content.SharedPreferences prefs = reactContext.getSharedPreferences("VMS_ALARM_DEVICES", android.content.Context.MODE_PRIVATE);
            String savedId = prefs.getString("last_device_id", null);
            if (savedId != null && savedId.trim().equalsIgnoreCase(cleanId)) {
                DeviceAlarmInfo info = new DeviceAlarmInfo();
                info.deviceId = savedId;
                info.deviceName = prefs.getString("last_device_name", "NVR");
                info.deviceType = prefs.getString("last_device_type", "NVR");
                info.channelCount = prefs.getInt("last_channel_count", 16);
                info.loginHandle = prefs.getInt("last_login_handle", 0);
                info.userId = prefs.getInt("last_user_id", 0);
                String savedChanJson = prefs.getString("last_channel_names", null);
                if (savedChanJson != null && !savedChanJson.isEmpty()) {
                    try {
                        JSONArray array = new JSONArray(savedChanJson);
                        for (int i = 0; i < array.length(); i++) {
                            JSONObject obj = array.getJSONObject(i);
                            int id = obj.optInt("id", i);
                            String name = obj.optString("name", "CH " + (id + 1));
                            while (info.channelNames.size() <= id) info.channelNames.add(null);
                            info.channelNames.set(id, name);
                        }
                    } catch (Exception ignored) {}
                }
                if (info.loginHandle > 0) {
                    devices.put(info.loginHandle, info);
                }
                if (info.userId > 0 && info.userId != info.loginHandle) {
                    devices.put(info.userId, info);
                }
                return info;
            }
        } catch (Exception ex) {
            Log.e(TAG, "Error loading fallback device in findDeviceByDeviceId", ex);
        }
        return null;
    }

    private List<Integer> parseChannelIds(String channelsJson, int channelCount) {
        List<Integer> ids = new ArrayList<>();
        if (channelsJson != null && !channelsJson.isEmpty()) {
            try {
                JSONArray arr = new JSONArray(channelsJson);
                for (int i = 0; i < arr.length(); i++) ids.add(arr.getInt(i));
            } catch (Exception ignored) {}
        }
        if (ids.isEmpty()) {
            for (int i = 0; i < channelCount; i++) ids.add(i);
        }
        return ids;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NVRSDKCallback — NVR alarm event handlers
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public void onVideoDataFormatHead(long l, int i) {}
    @Override
    public void onVideoData(long l, int i, byte[] b, int i1, long l1, boolean b1, int i2, int i3, int i4, int i5, int i6) {}
    @Override
    public void onAudioData(long l, int i, byte[] b, int i1, long l1, int i2, int i3, int i4, int i5) {}
    @Override
    public void onTalkData(int i, int i1, byte[] b) {}
    @Override
    public void AcceptRegisterCallback(int i, int i1, com.sdk.interfance.NET_SDK_DEVICEINFO[] d) {}
    @Override
    public void onPlaybackEnd() {}

    /**
     * ExceptionCallback fires for motion, sensor, video loss, disk errors, etc.
     * dwType=1 is motion, dwType=2 is sensor/alarm-in, based on SDK docs.
     */
    @Override
    public void ExceptionCallback(final int userId, final int dwType, final int channelId) {
        Log.d(TAG, "ExceptionCallback userId=" + userId + " dwType=" + dwType + " ch=" + channelId);
        switch (dwType) {
            case 1: // Motion detection
                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        String motionImgUri = captureMotionSnapshot(userId, channelId);
                        handleAlarmEventWithUri(userId, null, channelId, "MOTION", "🚨 Motion Detected", null, motionImgUri);
                    }
                }).start();
                break;
            case 2: // Sensor / alarm input
                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        String sensorImgUri = captureMotionSnapshot(userId, channelId);
                        handleAlarmEventWithUri(userId, null, channelId, "SENSOR", "⚡ Sensor Alarm", null, sensorImgUri);
                    }
                }).start();
                break;
            case 4: // Video loss / camera offline (DD_EVENT_TYPE_V_LOSS)
                handleAlarmEvent(userId, null, channelId, "OFFLINE", "📷 Camera Offline", "Camera channel lost connection", null);
                break;
            case 8: // Video cover / shelter (DD_EVENT_TYPE_V_COVER)
                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        String tamperImgUri = captureMotionSnapshot(userId, channelId);
                        handleAlarmEventWithUri(userId, null, channelId, "TAMPERING", "🔧 Tampering Detected", null, tamperImgUri);
                    }
                }).start();
                break;
            // Common NVR Health Exceptions (dwType values based on TVT SDK)
            case 6:
            case 32:
                handleAlarmEvent(userId, null, channelId, "DISK_FULL", "💾 Disk Full", "Storage reached capacity", null);
                break;
            case 7:
            case 64:
                handleAlarmEvent(userId, null, channelId, "DISK_IO_ERROR", "⚠️ Disk R/W Error", "Hard disk problem detected", null);
                break;
            case 128:
            case 11:
                handleAlarmEvent(userId, null, channelId, "NO_DISK", "❌ No Disk", "HDD removed or not detected", null);
                break;
            case 256:
            case 12:
                handleAlarmEvent(userId, null, channelId, "PULL_OUT_DISK", "🛑 Disk Pulled Out", "Disk unplugged while running", null);
                break;
            case 512:
            case 5:
                handleAlarmEvent(userId, null, channelId, "ILLEGAL_ACCESS", "🚫 Illegal Access", "Multiple wrong passwords", null);
                break;
            case 1024:
            case 9:
                handleAlarmEvent(userId, null, channelId, "IP_CONFLICT", "⚠️ IP Conflict", "IP Address Conflict detected", null);
                break;
            case 2048:
            case 10:
                handleAlarmEvent(userId, null, channelId, "NETWORK_DISCONNECTION", "🔌 Network Disconnected", "NVR Network connection lost", null);
                break;
            default:
                Log.d(TAG, "ExceptionCallback unhandled dwType=" + dwType);
                break;
        }
    }

    @Override
    public void onAlarmTypeVFD(N900AlarmVFDContainer c) {
        if (c == null) return;
        Log.e("TVT_AI_REAL", "FACE DETECTION REAL");
        Log.d(TAG, "onAlarmTypeVFD userId=" + c.userId);

        String details = null;
        if (c.head != null && c.head.faceCnt >= 1 && c.faces != null && c.faces.length > 0 && c.faces[0] != null) {
            details = "Face ID: " + c.faces[0].faceId + ", Age: " + c.faces[0].age;
            if (c.faces[0].temperature > 0) {
                String unit = c.faces[0].tempUnitsType == 0 ? "℃" : "℉";
                details += ", Temp: " + (c.faces[0].temperature / 100.0) + unit;
            }
        }

        handleAlarmEvent(c.userId, null, 0, "FACE_DETECTION", "👤 Face Detected", details, null);
    }

    @Override
    public void onAlarmTypeFaceMatch(NET_SDK_IVE_FACE_MATCH_T c) {
        if (c == null) return;
        Log.d(TAG, "onAlarmTypeFaceMatch serial=" + c.serialNumber + " ch=" + c.Channel);

        String details = null;
        if (c.byName != null) {
            String name = c.byName.trim();
            if (!name.isEmpty()) {
                details = "Matched: " + name;
                if (c.dwSimilar > 0) {
                    details += " (" + c.dwSimilar + "% match)";
                }
            }
        }

        byte[] img = null;
        if (c.img != null && c.img.length > 0) {
            img = c.img;
        }

        handleAlarmEvent(0, c.serialNumber, c.Channel, "FACE_RECOGNITION", "🎯 Face Recognized", details, img);
    }

    @Override
    public void onAlarmTypeFaceMatchForIPC(N900AlarmFaceIPCContainer c) {
        if (c == null) return;
        Log.d(TAG, "onAlarmTypeFaceMatchForIPC userId=" + c.userId);

        String details = null;
        if (c.baseInfo != null && c.baseInfo.szName != null) {
            String name = c.baseInfo.szName.trim();
            if (!name.isEmpty()) {
                details = "Matched: " + name;
                if (c.baseInfo.iSimilarity > 0) {
                    details += " (" + c.baseInfo.iSimilarity + "% match)";
                }
                if (c.baseInfo.temperature > 0) {
                    String unit = c.baseInfo.tempUnitsType == 0 ? "℃" : "℉";
                    details += ", Temp: " + (c.baseInfo.temperature / 100.0) + unit;
                }
            }
        }

        int ch = 0; // IPC uses channel 0 / custom mapping
        handleAlarmEvent(c.userId, null, ch, "FACE_RECOGNITION", "🎯 Face Recognized", details, null);
    }

    @Override
    public void onAlarmIpcAOIENTRY(N9000SmartCommonContainer c) {
        if (c == null) return;
        int ch = c.event != null ? c.event.chnn : 0;
        Log.d(TAG, "onAlarmIpcAOIENTRY userId=" + c.userId + " ch=" + ch);

        byte[] img = null;
        if (c.snapPicInfo != null && c.snapPicInfo.length > 0 && c.snapPicInfo[0] != null) {
            img = c.snapPicInfo[0].img;
        }

        handleAlarmEvent(c.userId, null, ch, "INTRUSION", "⚠️ Region Intrusion", "Intrusion detected in region", img);
    }

    @Override
    public void onAlarmNvrAOIENTRY(N9000SmartCommonContainer c) {
        if (c == null) return;
        Log.e("TVT_AI_REAL", "INTRUSION REAL channel=" + (c.event != null ? c.event.chnn + 1 : 1));
        int ch = c.event != null ? c.event.chnn : 0;
        Log.d(TAG, "onAlarmNvrAOIENTRY userId=" + c.userId + " ch=" + ch);

        byte[] img = null;
        if (c.snapPicInfo != null && c.snapPicInfo.length > 0 && c.snapPicInfo[0] != null) {
            img = c.snapPicInfo[0].img;
        }

        handleAlarmEvent(c.userId, null, ch, "INTRUSION", "⚠️ Region Intrusion", "Intrusion detected in region", img);
    }

    @Override
    public void onAlarmIpcAOILEAVE(N9000SmartCommonContainer c) {
        if (c == null) return;
        int ch = c.event != null ? c.event.chnn : 0;

        byte[] img = null;
        if (c.snapPicInfo != null && c.snapPicInfo.length > 0 && c.snapPicInfo[0] != null) {
            img = c.snapPicInfo[0].img;
        }

        handleAlarmEvent(c.userId, null, ch, "LINE_CROSSING", "↔️ Region Exit", "Object crossed boundary", img);
    }

    @Override
    public void onAlarmNvrAOILEAVE(N9000SmartCommonContainer c) {
        if (c == null) return;
        int ch = c.event != null ? c.event.chnn : 0;

        byte[] img = null;
        if (c.snapPicInfo != null && c.snapPicInfo.length > 0 && c.snapPicInfo[0] != null) {
            img = c.snapPicInfo[0].img;
        }

        handleAlarmEvent(c.userId, null, ch, "LINE_CROSSING", "↔️ Region Exit", "Object crossed boundary", img);
    }

    @Override
    public void onAlarmPVD(N9000SmartCommonContainer c) {
        if (c == null) return;
        int ch = c.event != null ? c.event.chnn : 0;
        Log.d(TAG, "onAlarmPVD ch=" + ch);

        byte[] img = null;
        if (c.snapPicInfo != null && c.snapPicInfo.length > 0 && c.snapPicInfo[0] != null) {
            img = c.snapPicInfo[0].img;
        }

        if (img != null) {
            VehicleInfoParser.VehicleInfo vehicleInfo = VehicleInfoParser.parse(img);
            if (vehicleInfo.isValid && vehicleInfo.plate != null && !vehicleInfo.plate.isEmpty()) {
                String details = "Plate: " + vehicleInfo.plate;
                if (vehicleInfo.owner != null && !vehicleInfo.owner.isEmpty()) {
                    details += " (Owner: " + vehicleInfo.owner + ")";
                } else {
                    details += " (Unknown Owner)";
                }

                String title = "🚗 Vehicle Detected";
                if (vehicleInfo.listType == 2) {
                    title = "🚗 Whitelist Vehicle Detected";
                } else if (vehicleInfo.listType == 3) {
                    title = "🚨 Blacklist Vehicle Detected";
                }

                handleAlarmEvent(c.userId, null, ch, "VEHICLE_DETECTION", title, details, vehicleInfo.jpegData, vehicleInfo.plate);
                return;
            }
        }

        handleAlarmEvent(c.userId, null, ch, "VEHICLE_DETECTION", "🚗 Vehicle Detected", "Illegal parking detected", img);
    }

    @Override
    public void onAlarmLoiter(N9000SmartCommonContainer c) {
        if (c == null) return;
        Log.e("TVT_AI_REAL", "LOITERING REAL channel=" + (c.event != null ? c.event.chnn + 1 : 1));
        int ch = c.event != null ? c.event.chnn : 0;

        byte[] img = null;
        if (c.snapPicInfo != null && c.snapPicInfo.length > 0 && c.snapPicInfo[0] != null) {
            img = c.snapPicInfo[0].img;
        }

        handleAlarmEvent(c.userId, null, ch, "LOITERING", "🕐 Loitering Detected", "Object loitering detected", img);
    }

    @Override
    public void onAlarmVSD(N9000SmartVSDContainer c) {
        if (c == null) return;
        Log.e("TVT_AI_REAL", "onAlarmVSD REAL AI channel=" + (c.head != null ? c.head.channel + 1 : 1));
        int ch = (c.head != null) ? c.head.channel : 0;
        String title = "📊 Metadata Detection";
        String type  = "VEHICLE_DETECTION";
        String details = "";
        byte[] img = null;
        String plate = null;

        if (c.targetInfo != null && c.targetInfo.length > 0 && c.targetInfo[0] != null) {
            int tType = c.targetInfo[0].targetType;
            img = c.targetInfo[0].img;

            if (tType == 1) {
                title = "🚶 Human Detected";
                type  = "HUMAN_DETECTION";
                details = "Target: Person";
                if (c.targetInfo[0].targetUnion instanceof NET_SDK_IVE_VSD_TARGET_PERSON) {
                    NET_SDK_IVE_VSD_TARGET_PERSON target = (NET_SDK_IVE_VSD_TARGET_PERSON) c.targetInfo[0].targetUnion;
                    details += " (Gender: " + (target.gender == 1 ? "Male" : "Female") + ", Age: " + target.age + ")";
                }
            } else if (tType == 2 || tType == 4) {
                title = "🚗 Vehicle Detected";
                type  = "VEHICLE_DETECTION";
                details = "Target: Vehicle";
                if (c.targetInfo[0].targetUnion instanceof NET_SDK_IVE_VSD_TARGET_CAR) {
                    NET_SDK_IVE_VSD_TARGET_CAR target = (NET_SDK_IVE_VSD_TARGET_CAR) c.targetInfo[0].targetUnion;
                    details += " (Year: " + target.year + ")";
                }
                if (img != null) {
                    VehicleInfoParser.VehicleInfo vehicleInfo = VehicleInfoParser.parse(img);
                    if (vehicleInfo.isValid && vehicleInfo.plate != null && !vehicleInfo.plate.isEmpty()) {
                        plate = vehicleInfo.plate;
                        details += " | Plate: " + vehicleInfo.plate;
                        if (vehicleInfo.owner != null && !vehicleInfo.owner.isEmpty()) {
                            details += " (Owner: " + vehicleInfo.owner + ")";
                        }
                        if (vehicleInfo.listType == 2) {
                            title = "🚗 Whitelist Vehicle Detected";
                        } else if (vehicleInfo.listType == 3) {
                            title = "🚨 Blacklist Vehicle Detected";
                        }
                        img = vehicleInfo.jpegData;
                    }
                }
            } else if (tType == 3) {
                title = "🚲 Bike Detected";
                type  = "VEHICLE_DETECTION";
                details = "Target: Non-motor Vehicle";
                if (c.targetInfo[0].targetUnion instanceof NET_SDK_IVE_VSD_TARGET_BIKE) {
                    NET_SDK_IVE_VSD_TARGET_BIKE target = (NET_SDK_IVE_VSD_TARGET_BIKE) c.targetInfo[0].targetUnion;
                    details += " (Type: " + target.bikeType + ")";
                }
            }
        }

        Log.d(TAG, "onAlarmVSD ch=" + ch + " type=" + type);
        handleAlarmEvent(c.userId, null, ch, type, title, details, img, plate);
    }

    @Override
    public void onAlarmTypeAVD(NET_SDK_IVE_AVD_T c) {
        if (c == null) return;

        // Memory-safe: SDK array is fixed at 32 elements; count may be arbitrary
        int safeCount = Math.min(c.count, 32);
        Log.d(TAG, "onAlarmTypeAVD count=" + c.count + " (clamped=" + safeCount + ")");

        // Resolve device context — AVD container carries no userId, so fall through
        // to first registered device (same pattern as IPC FaceMatch)
        DeviceAlarmInfo deviceInfo = findDevice(0, null);
        int resolvedUserId = (deviceInfo != null) ? deviceInfo.userId : 0;

        for (int i = 0; i < safeCount; i++) {
            NET_SDK_IVE_AVD_INFO_T info = c.avdInfo[i];
            if (info == null) continue;

            int status = info.status;
            int type   = info.type;

            // status 0 = none; skip idle slots
            if (status == 0) continue;

            // Normalize tampering type
            String tamperType;
            switch (type) {
                case 1:  tamperType = "Scene Change";  break;
                case 2:  tamperType = "Blur/Defocus";  break;
                case 3:  tamperType = "Color Cast";    break;
                default: tamperType = "Video Abnormal"; break;
            }

            // Normalize event lifecycle
            String statusLabel;
            switch (status) {
                case 1:  statusLabel = "Started";   break;
                case 2:  statusLabel = "Ended";     break;
                case 3:  statusLabel = "Happening"; break;
                default: statusLabel = "Unknown";   break;
            }

            // eventId maps 1-to-1 to camera channel index (0-based in SDK, matches NVR channel numbering)
            int channelId = (info.eventId > 0) ? (info.eventId - 1) : 0;

            String details = tamperType + " — " + statusLabel;
            Log.d(TAG, "onAlarmTypeAVD[" + i + "] eventId=" + info.eventId
                    + " ch=" + channelId + " status=" + status + " type=" + type
                    + " → " + details);

            // Attempt a snapshot from the affected channel for richer notification
            final int finalUserId   = resolvedUserId;
            final int finalChannel  = channelId;
            final String finalDetails = details;

            new Thread(() -> {
                String imgUri = captureMotionSnapshot(finalUserId, finalChannel);
                handleAlarmEventWithUri(
                        finalUserId, null, finalChannel,
                        "TAMPERING", "🔧 Tampering Detected",
                        finalDetails, imgUri);
            }).start();
        }

        // Safety net: if count was 0 or all slots were idle, fire a generic alert
        if (safeCount == 0) {
            Log.w(TAG, "onAlarmTypeAVD received count=0 — firing generic tampering alert");
            handleAlarmEvent(resolvedUserId, null, 0,
                    "TAMPERING", "🔧 Tampering Detected",
                    "Video abnormality detected", null);
        }
    }

    @Override
    public void onAlarmASD(N9000SmartASDContainer c) {
        if (c == null) return;
        int ch = c.event != null ? c.event.chnn : 0;
        String details = "Audio Exception";
        if (c.audioInfo != null && c.audioInfo.length > 0 && c.audioInfo[0] != null) {
            details += ": Sound Level " + c.audioInfo[0].soundLevel;
        }
        handleAlarmEvent(c.userId, null, ch, "AUDIO_ABNORMAL", "🔊 Audio Abnormal", details, null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Notification Helpers
    // ─────────────────────────────────────────────────────────────────────────
    private void createNotificationChannel() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            android.app.NotificationChannel channel = new android.app.NotificationChannel(
                    "vms_alarms", "VMS Alarms", android.app.NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Motion, AI, and Alarm Notifications");
            channel.enableVibration(true);
            android.app.NotificationManager nm = reactContext.getSystemService(android.app.NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }


}
