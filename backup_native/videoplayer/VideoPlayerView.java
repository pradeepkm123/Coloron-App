package com.vms.videoplayer;

import android.content.Context;
import android.util.Log;
import android.view.View;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;

import com.sdk.network.VideoPlayer;

public class VideoPlayerView extends FrameLayout {
    private static final String TAG = "VideoPlayerView";

    private VideoPlayer videoPlayer;
    private long currentLiveHandle = -1;
    private boolean isInitialized = false;

    public VideoPlayerView(@NonNull Context context) {
        super(context);
        initializePlayer();
    }

    private void initializePlayer() {
        try {
            Log.d(TAG, "Initializing VideoPlayer...");
            videoPlayer = VideoPlayer.getVideoView(getContext());

            if (videoPlayer != null) {
                videoPlayer.setKeepScreenOn(true);
                // Enable logs for better debugging if black screen persists
                videoPlayer.setPrintLog(true);

                FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT);
                addView(videoPlayer, params);
                isInitialized = true;
                Log.d(TAG, "VideoPlayer initialized successfully");
            } else {
                Log.e(TAG, "getVideoView() returned null");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error initializing VideoPlayer: " + e.getMessage());
            e.printStackTrace();
            isInitialized = false;
        }
    }

    public void setLiveHandle(String handleStr) {
        if (!isInitialized || videoPlayer == null) {
            Log.w(TAG, "VideoPlayer not initialized, cannot set live handle");
            return;
        }

        try {
            long newHandle = Long.parseLong(handleStr);

            // Only update if the handle actually changed
            if (newHandle != currentLiveHandle) {
                Log.d(TAG, "Setting live handle: " + newHandle);
                android.widget.Toast.makeText(getContext(), "Play H:" + newHandle, android.widget.Toast.LENGTH_SHORT)
                        .show();

                // Stop previous stream if any
                if (currentLiveHandle > 0) {
                    Log.d(TAG, "Stopping previous stream: " + currentLiveHandle);
                    videoPlayer.stop();
                }

                // Start new stream
                if (newHandle > 0) {
                    videoPlayer.setLiveHandle(newHandle);
                    videoPlayer.RestoreVideoSize();
                    videoPlayer.start();

                    currentLiveHandle = newHandle;
                    Log.d(TAG, "Live stream started successfully with handle: " + newHandle);

                    // Fix for black screen: Force layout refresh with delay
                    postDelayed(new Runnable() {
                        @Override
                        public void run() {
                            if (videoPlayer != null) {
                                videoPlayer.setVisibility(View.INVISIBLE);
                                videoPlayer.setVisibility(View.VISIBLE);
                                videoPlayer.requestLayout();
                                videoPlayer.invalidate();
                                requestLayout();
                            }
                        }
                    }, 500);
                } else {
                    currentLiveHandle = -1;
                    Log.d(TAG, "Invalid handle, stream stopped");
                }
            }
        } catch (NumberFormatException e) {
            Log.e(TAG, "Invalid live handle format: " + handleStr);
        } catch (Exception e) {
            Log.e(TAG, "Error setting live handle: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void cleanup() {
        Log.d(TAG, "Cleaning up VideoPlayer");
        try {
            if (videoPlayer != null && currentLiveHandle > 0) {
                videoPlayer.stop();
                currentLiveHandle = -1;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error during cleanup: " + e.getMessage());
        }
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
        Log.d(TAG, "onLayout: " + (right - left) + "x" + (bottom - top));
        if (videoPlayer != null) {
            videoPlayer.layout(0, 0, right - left, bottom - top);
        }
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        cleanup();
    }
}
