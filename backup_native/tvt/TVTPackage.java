package com.vms.tvt;

import com.facebook.react.*;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.*;

public class TVTPackage implements ReactPackage {

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext context) {
        return Arrays.<NativeModule>asList(
                new TVTLoginModule(context));
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext context) {
        return Arrays.<ViewManager>asList(
                new TVTLiveViewManager());
    }
}
