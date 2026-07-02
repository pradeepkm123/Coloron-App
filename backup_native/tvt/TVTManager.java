package com.vms.tvt;

import android.content.Context;
import com.sdk.interfance.nvrsdk;

public class TVTManager {

    private static boolean initialized = false;
    public static int loginHandle = -1;
    private static nvrsdk sdkInstance;

    public static void initSDK(Context context) {
        if (!initialized) {
            sdkInstance = nvrsdk.getInstance(context);
            initialized = true;
        }
    }

    public static nvrsdk getSdk() {
        return sdkInstance;
    }
}
