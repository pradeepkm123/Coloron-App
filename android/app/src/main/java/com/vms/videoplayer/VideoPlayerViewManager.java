package com.vms.videoplayer;

import android.graphics.Color;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

import java.util.Map;

public class VideoPlayerViewManager extends SimpleViewManager<VideoPlayerView> {

    public static final String REACT_CLASS = "VideoPlayerViewOld";

    @NonNull
    @Override
    public String getName() {
        return REACT_CLASS;
    }

    @NonNull
    @Override
    protected VideoPlayerView createViewInstance(@NonNull ThemedReactContext reactContext) {
        VideoPlayerView view = new VideoPlayerView(reactContext);
        view.setBackgroundColor(Color.BLACK);
        return view;
    }

    @ReactProp(name = "liveHandle")
    public void setLiveHandle(VideoPlayerView view, @Nullable String liveHandle) {
        if (liveHandle != null && !liveHandle.isEmpty()) {
            view.setLiveHandle(liveHandle);
        }
    }

    @Override
    public void onDropViewInstance(@NonNull VideoPlayerView view) {
        super.onDropViewInstance(view);
        view.cleanup();
    }

    @Override
    public Map<String, Object> getExportedCustomDirectEventTypeConstants() {
        return MapBuilder.of();
    }
}
