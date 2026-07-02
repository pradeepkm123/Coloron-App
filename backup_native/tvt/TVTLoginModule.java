package com.vms.tvt;

import com.facebook.react.bridge.*;
import com.sdk.interfance.nvrsdk;

public class TVTLoginModule extends ReactContextBaseJavaModule {

    public TVTLoginModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "TVTLogin";
    }

    @ReactMethod
    public void login(String ip, int port, String user, String pass, Promise promise) {
        TVTManager.initSDK(getReactApplicationContext());

        nvrsdk sdk = TVTManager.getSdk();
        if (sdk == null) {
            promise.reject("INIT_FAILED", "SDK init failed");
            return;
        }

        // LoginType 0 = TCP
        int handle = sdk.LoginEx(ip, port, user, pass, 0, "", false);

        if (handle > 0) {
            TVTManager.loginHandle = handle;
            promise.resolve(handle);
        } else {
            promise.reject("LOGIN_FAILED", "Invalid IP / credentials. Return code: " + handle);
        }
    }
}
