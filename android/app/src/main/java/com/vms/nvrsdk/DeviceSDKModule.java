package com.vms.nvrsdk;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo;
import android.util.Log;
import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.sdk.interfance.nvrsdk;
import com.sdk.interfance.NET_SDK_CONNECT_TYPE;
import com.vms.tvt.TVTManager;

public class DeviceSDKModule extends ReactContextBaseJavaModule {
    private static final String TAG = "DeviceSDK";
    private final ReactApplicationContext reactContext;

    public DeviceSDKModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "DeviceSDK";
    }

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


    @ReactMethod
    public void loginBySN(String sn, String user, String pass, int loginType, boolean isWifi, Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    TVTManager.initSDK(getReactApplicationContext());
                    nvrsdk sdk = TVTManager.getSdk();
                    
                    String server = "c2020.autonat.com";
                    int port = 7968;
                    int connectType = NET_SDK_CONNECT_TYPE.NET_SDK_CONNECT_NAT20; 

                    if (loginType == 1) {
                        connectType = NET_SDK_CONNECT_TYPE.NET_SDK_CONNECT_NAT;
                        server = "c2.autonat.com";
                        port = 40002;
                    }

                    int handle = -1;
                    synchronized (TVTManager.sdkLock) {
                        if (connectType == NET_SDK_CONNECT_TYPE.NET_SDK_CONNECT_NAT20) {
                            // Register NAT 2.0 server before login (SetNat2Addr resets state internally)
                            boolean natOk = sdk.SetNat2Addr(server, port);
                            int natErr = sdk.GetLastError();
                            Log.d(TAG, "SetNat2Addr → natOk=" + natOk + ", err=" + natErr
                                    + ", server=" + server + ", port=" + port);
                            if (!natOk) {
                                Log.w(TAG, "NAT20 server init reported failure (err=" + natErr + "), attempting login anyway...");
                            }
                        }

                        // IMPORTANT: Use the isWifi value passed from JavaScript (derived from NetInfo).
                        // Do NOT override with isWifiConnected() — JS already correctly detects
                        // wifi vs cellular. On mobile data, JS passes false so the SDK applies
                        // carrier-grade NAT traversal (matching SuperLivePlus behavior).
                        boolean nativeWifi = isWifiConnected();
                        Log.d(TAG, "loginBySN → sn=" + sn + ", type=" + connectType
                                + ", jsIsWifi=" + isWifi + ", nativeIsWifi=" + nativeWifi
                                + ", usingJsValue=true, user=" + user);
                        handle = sdk.LoginEx(server, port, user, pass, connectType, sn, isWifi);

                        // Fallback: If NAT20 fails, try NAT (P2P 1.0)
                        if (handle <= 0 && loginType == 2) {
                            Log.w(TAG, "NAT20 failed (err=" + sdk.GetLastError() + "), falling back to NAT P2P 1.0...");
                            connectType = NET_SDK_CONNECT_TYPE.NET_SDK_CONNECT_NAT;
                            server = "c2.autonat.com";
                            port = 40002;
                            handle = sdk.LoginEx(server, port, user, pass, connectType, sn, isWifi);
                            Log.d(TAG, "NAT fallback result: handle=" + handle + ", err=" + sdk.GetLastError());
                        }
                    }

                    if (handle > 0) {
                        TVTManager.loginHandle = handle;
                        byte[] devBytes = sdk.GetDeviceInfo(handle);
                        WritableMap res = Arguments.createMap();
                        res.putInt("userId", handle);
                        
                        WritableMap deviceInfo = Arguments.createMap();
                        if (devBytes != null && devBytes.length > 0) {
                           try {
                               com.sdk.interfance.NET_SDK_DEVICEINFO info = com.sdk.interfance.NET_SDK_DEVICEINFO.deserialize(devBytes, 0);
                               deviceInfo.putInt("videoInputNum", info.videoInputNum);
                               deviceInfo.putString("deviceName", new String(info.deviceName).trim());
                               deviceInfo.putString("serialNumber", new String(info.szSN).trim());
                               deviceInfo.putInt("audioInputNum", info.audioInputNum);
                               deviceInfo.putInt("deviceType", info.deviceType);
                               res.putInt("channelCount", info.videoInputNum);
                           } catch (Throwable t) {
                               Log.e(TAG, "SN Info Deserialization failed: " + t.getMessage());
                               deviceInfo.putInt("videoInputNum", 16);
                               res.putInt("channelCount", 16);
                           }
                        } else {
                            deviceInfo.putInt("videoInputNum", 16);
                            res.putInt("channelCount", 16);
                        }
                        res.putMap("deviceInfo", deviceInfo);
                        promise.resolve(res);
                    } else {
                        int err = sdk.GetLastError();
                        promise.reject("LOGIN_FAILED", "Handle: " + handle + ", Error: " + err);
                    }
                } catch (Exception e) {
                    promise.reject("LOGIN_ERROR", e.getMessage());
                }
            }
        }).start();
    }

    @ReactMethod
    public void startPreview(int channel, int viewId, Promise promise) {
        // Placeholder for preview initialization
        Log.d(TAG, "startPreview CH: " + channel + " View: " + viewId);
        promise.resolve(true);
    }

    @ReactMethod
    public void enableDeviceAlarms(int userId, int start, int end, Promise promise) {
        try {
            nvrsdk sdk = TVTManager.getSdk();
            long res = sdk.SetupAlarmChan(userId);
            promise.resolve(res > 0);
        } catch (Exception e) {
            promise.reject("ALARM_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void startAlarmMonitor(int userId, Promise promise) {
        Log.d(TAG, "startAlarmMonitor for user: " + userId);
        promise.resolve(true);
    }
}
