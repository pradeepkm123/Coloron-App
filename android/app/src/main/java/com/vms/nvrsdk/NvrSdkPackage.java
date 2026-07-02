package com.vms.nvrsdk;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import com.vms.videoplayer.VideoPlayerViewManager;
import com.vms.TvtAlarmModule;
import com.vms.TvtAlarmDatabaseModule;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class NvrSdkPackage implements ReactPackage {

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        android.util.Log.d("NvrSdkPackage", "Creating native modules...");
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new NvrSdkModule(reactContext));
        modules.add(new DeviceSDKModule(reactContext));
        modules.add(new TvtAlarmModule(reactContext));
        modules.add(new NvrTalkModule(reactContext));
        modules.add(new TvtAlarmDatabaseModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        List<ViewManager> managers = new ArrayList<>();
        managers.add(new VideoPlayerViewManager());
        managers.add(new NvrVideoViewManager(reactContext)); // Added for Playback
        managers.add(new com.vms.pdf.PdfViewManager());
        return managers;
    }
}
