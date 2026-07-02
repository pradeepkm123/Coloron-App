package com.vms.tvt;

import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

public class TVTLiveViewManager extends SimpleViewManager<TVTLiveView> {

    public static final String REACT_CLASS = "TVTLiveViewNative";

    @Override
    public String getName() {
        return REACT_CLASS;
    }

    @Override
    protected TVTLiveView createViewInstance(ThemedReactContext context) {
        return new TVTLiveView(context);
    }

    @ReactProp(name = "channelId")
    public void setChannelId(TVTLiveView view, int channelId) {
        view.setChannelId(channelId);
    }

    @ReactProp(name = "streamType")
    public void setStreamType(TVTLiveView view, int streamType) {
        view.setStreamType(streamType);
    }

    @ReactProp(name = "userId")
    public void setUserId(TVTLiveView view, int userId) {
        view.setUserId(userId);
    }

    @ReactProp(name = "host")
    public void setHost(TVTLiveView view, String host) {
        view.setHost(host);
    }
}
