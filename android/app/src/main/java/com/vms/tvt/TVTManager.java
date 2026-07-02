package com.vms.tvt;

import android.content.Context;
import com.sdk.interfance.nvrsdk;
import com.sdk.interfance.NVRSDKCallback;

public class TVTManager {

    private static boolean initialized = false;
    public static int loginHandle = -1;
    private static nvrsdk sdkInstance;
    public static final Object sdkLock = new Object();

    private static final java.util.List<NVRSDKCallback> listeners = new java.util.concurrent.CopyOnWriteArrayList<>();

    public static void addListener(NVRSDKCallback listener) {
        if (listener != null && !listeners.contains(listener)) {
            listeners.add(listener);
        }
    }

    public static void removeListener(NVRSDKCallback listener) {
        listeners.remove(listener);
    }

    public static NVRSDKCallback globalCallback = new NVRSDKCallback() {
        @Override public void onVideoDataFormatHead(long l, int i) {
            for (NVRSDKCallback listener : listeners) listener.onVideoDataFormatHead(l, i);
        }
        @Override public void onVideoData(long l, int i, byte[] b, int i1, long l1, boolean b1, int i2, int i3, int i4, int i5, int i6) {
            for (NVRSDKCallback listener : listeners) listener.onVideoData(l, i, b, i1, l1, b1, i2, i3, i4, i5, i6);
        }
        @Override public void onAudioData(long l, int i, byte[] b, int i1, long l1, int i2, int i3, int i4, int i5) {
            for (NVRSDKCallback listener : listeners) listener.onAudioData(l, i, b, i1, l1, i2, i3, i4, i5);
        }
        @Override public void onTalkData(int i, int i1, byte[] b) {
            for (NVRSDKCallback listener : listeners) listener.onTalkData(i, i1, b);
        }
        @Override public void ExceptionCallback(int i, int i1, int i2) {
            for (NVRSDKCallback listener : listeners) listener.ExceptionCallback(i, i1, i2);
        }
        @Override public void AcceptRegisterCallback(int i, int i1, com.sdk.interfance.NET_SDK_DEVICEINFO[] d) {
            for (NVRSDKCallback listener : listeners) listener.AcceptRegisterCallback(i, i1, d);
        }
        @Override public void onPlaybackEnd() {
            for (NVRSDKCallback listener : listeners) listener.onPlaybackEnd();
        }
        @Override public void onAlarmTypeVFD(com.sdk.interfance.bean.N900AlarmVFDContainer c) {
            for (NVRSDKCallback listener : listeners) listener.onAlarmTypeVFD(c);
        }
        @Override public void onAlarmTypeAVD(com.sdk.interfance.bean.NET_SDK_IVE_AVD_T c) {
            for (NVRSDKCallback listener : listeners) listener.onAlarmTypeAVD(c);
        }
        @Override public void onAlarmTypeFaceMatch(com.sdk.interfance.bean.NET_SDK_IVE_FACE_MATCH_T c) {
            for (NVRSDKCallback listener : listeners) listener.onAlarmTypeFaceMatch(c);
        }
        @Override public void onAlarmTypeFaceMatchForIPC(com.sdk.interfance.bean.N900AlarmFaceIPCContainer c) {
            for (NVRSDKCallback listener : listeners) listener.onAlarmTypeFaceMatchForIPC(c);
        }
        @Override public void onAlarmASD(com.sdk.interfance.bean.N9000SmartASDContainer c) {
            for (NVRSDKCallback listener : listeners) listener.onAlarmASD(c);
        }
        @Override public void onAlarmIpcAOIENTRY(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
            for (NVRSDKCallback listener : listeners) listener.onAlarmIpcAOIENTRY(c);
        }
        @Override public void onAlarmNvrAOIENTRY(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
            for (NVRSDKCallback listener : listeners) listener.onAlarmNvrAOIENTRY(c);
        }
        @Override public void onAlarmIpcAOILEAVE(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
            for (NVRSDKCallback listener : listeners) listener.onAlarmIpcAOILEAVE(c);
        }
        @Override public void onAlarmNvrAOILEAVE(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
            for (NVRSDKCallback listener : listeners) listener.onAlarmNvrAOILEAVE(c);
        }
        @Override public void onAlarmPVD(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
            for (NVRSDKCallback listener : listeners) listener.onAlarmPVD(c);
        }
        @Override public void onAlarmLoiter(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
            for (NVRSDKCallback listener : listeners) listener.onAlarmLoiter(c);
        }
        @Override public void onAlarmVSD(com.sdk.interfance.bean.N9000SmartVSDContainer c) {
            for (NVRSDKCallback listener : listeners) listener.onAlarmVSD(c);
        }
    };

    private static boolean librariesLoaded = false;
    private static void loadLibraries() {
        if (librariesLoaded) return;
        try {
            System.loadLibrary("AudioCode");
            System.loadLibrary("AudioCodec");
            System.loadLibrary("H264Decode");
            System.loadLibrary("NatTraveral");
            System.loadLibrary("Recorder");
            System.loadLibrary("nvrsdk");
            librariesLoaded = true;
            android.util.Log.i("TVTManager", "Native libraries loaded successfully");
        } catch (UnsatisfiedLinkError e) {
            android.util.Log.e("TVTManager", "Native library load failed: " + e.getMessage());
        }
    }

    public static void initSDK(Context context) {
        loadLibraries();
        if (!initialized) {
            sdkInstance = nvrsdk.getInstance(context);
            if (sdkInstance != null) {
                sdkInstance.SetCallback(globalCallback);
                initialized = true;
            }
        }
    }

    public static nvrsdk getSdk() {
        return sdkInstance;
    }
}
