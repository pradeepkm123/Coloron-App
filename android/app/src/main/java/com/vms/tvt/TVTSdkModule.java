package com.vms.tvt;

import android.util.Log;
import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.sdk.interfance.nvrsdk;
import com.sdk.interfance.NET_SDK_DEVICEINFO;
import com.sdk.interfance.NET_SDK_CONNECT_TYPE;
import java.util.HashMap;
import java.util.Map;

public class TVTSdkModule extends ReactContextBaseJavaModule {
    private static final String TAG = "TVTSdkModule";
    private final ReactApplicationContext reactContext;

    public TVTSdkModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "TVTSdkModule";
    }

    @ReactMethod
    public void initSDK(Promise promise) {
        try {
            TVTManager.initSDK(getReactApplicationContext());
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("INIT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void loginDevice(String ip, int port, String user, String pass, int loginType, String sn, boolean isWifi,
            Promise promise) {
        try {
            TVTManager.initSDK(getReactApplicationContext());
            nvrsdk sdk = TVTManager.getSdk();

            synchronized (TVTManager.sdkLock) {
                int connectType = NET_SDK_CONNECT_TYPE.NET_SDK_CONNECT_TCP;
                String serverHost = ip != null ? ip : "";
                int serverPort = port;

                if (loginType == 1) {
                    connectType = NET_SDK_CONNECT_TYPE.NET_SDK_CONNECT_NAT;
                    serverHost = "c2.autonat.com";
                    serverPort = 40002;
                } else if (loginType == 2) {
                    connectType = NET_SDK_CONNECT_TYPE.NET_SDK_CONNECT_NAT20;
                    serverHost = "c2020.autonat.com";
                    serverPort = 7968;
                    sdk.SetNat2Addr(serverHost, serverPort);
                }

                boolean finalIsWifi = isWifi;
                if (connectType == NET_SDK_CONNECT_TYPE.NET_SDK_CONNECT_TCP) {
                    finalIsWifi = false;
                }

                int userId = sdk.LoginEx(serverHost, serverPort, user, pass, connectType, sn != null ? sn : "", finalIsWifi);

                if (userId >= 0) {
                    promise.resolve(userId);
                } else {
                    promise.reject("LOGIN_FAILED", "Login failed with code: " + userId);
                }
            }
        } catch (Exception e) {
            promise.reject("LOGIN_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void setupAlarmChan(int userId, Promise promise) {
        try {
            nvrsdk sdk = TVTManager.getSdk();
            long res = sdk.SetupAlarmChan(userId);
            promise.resolve(res > 0);
        } catch (Exception e) {
            promise.reject("ALARM_CHAN_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void subscribeAllChannels(int userId, int channelCount, Promise promise) {
        try {
            nvrsdk sdk = TVTManager.getSdk();
            boolean success = true;
            for (int i = 0; i < channelCount; i++) {
                // Simplified subscription for now
                // In a real scenario, this would call a specific SDK method for AI events
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SUBSCRIBE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void startBackgroundService(Promise promise) {
        // Placeholder for background service to keep SDK alive
        Log.d(TAG, "Background service started (stub)");
        promise.resolve(true);
    }

    @ReactMethod
    public void getDeviceInfo(int userId, Promise promise) {
        try {
            nvrsdk sdk = TVTManager.getSdk();
            synchronized (TVTManager.sdkLock) {
                byte[] infoBytes = sdk.GetDeviceInfo(userId);
                if (infoBytes != null && infoBytes.length > 0) {
                    NET_SDK_DEVICEINFO info = NET_SDK_DEVICEINFO.deserialize(infoBytes, 0);
                    WritableMap map = Arguments.createMap();
                    map.putInt("videoInputNum", info.videoInputNum);
                    map.putString("deviceName", new String(info.deviceName).trim());
                    map.putString("serialNumber", new String(info.szSN).trim());
                    promise.resolve(map);
                } else {
                    promise.reject("GET_INFO_FAILED", "Null or empty info bytes");
                }
            }
        } catch (Exception e) {
            promise.reject("GET_INFO_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void logout(int userId, Promise promise) {
        try {
            nvrsdk sdk = TVTManager.getSdk();
            boolean res = sdk.Logout(userId);
            promise.resolve(res);
        } catch (Exception e) {
            promise.reject("LOGOUT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void makeKeyFrame(int userId, String handleStr, Promise promise) {
        try {
            nvrsdk sdk = TVTManager.getSdk();
            if (sdk != null) {
                long handle = Long.parseLong(handleStr);
                synchronized (TVTManager.sdkLock) {
                    boolean success = sdk.MakeKeyFrame(userId, handle);
                    sdk.MakeKeyFrameSub(userId, handle);
                    promise.resolve(success);
                }
            } else {
                promise.reject("SDK_NULL", "SDK not initialized");
            }
        } catch (Exception e) {
            promise.reject("MAKE_KEYFRAME_ERROR", e.getMessage());
        }
    }
}
