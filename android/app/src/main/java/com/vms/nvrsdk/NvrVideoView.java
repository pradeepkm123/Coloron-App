package com.vms.nvrsdk;

import android.content.Context;
import android.os.Handler;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import com.sdk.network.VideoPlayer;
import com.sdk.network.VideoViewCallback;
import com.sdk.interfance.nvrsdk;
import com.vms.tvt.TVTManager;

/**
 * NvrVideoView - Native component for both live and playback video
 * Supports handle-based video rendering
 */
public class NvrVideoView extends FrameLayout implements VideoViewCallback {
    private static final String TAG = "NvrVideoView";

    private String mHandle = null;
    private int mChannelId = -1;
    private int mUserId = -1;
    private String mHost = "";

    private VideoPlayer mVideoPlayer;
    private boolean mIsInitialized = false;
    private boolean mHasReceivedData = false;
    private boolean mUseHardwareDecoding = false;
    private int mRenderModel = 1; // Default SurfaceView
    private final Handler mHandler = new Handler();

    public NvrVideoView(Context context) {
        super(context);
        Log.d(TAG, "NvrVideoView instance created");
        initView(context);
    }

    private void initView(Context context) {
        setBackgroundColor(0xFF000000);
        try {
            mVideoPlayer = VideoPlayer.getVideoView(context);
            if (mVideoPlayer != null) {
                mVideoPlayer.setMediaCodecType(mUseHardwareDecoding);
                mVideoPlayer.setRenderModel(mRenderModel);
                mVideoPlayer.setCallback(this);
                mVideoPlayer.setPrintLog(true);

                LayoutParams params = new LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT);
                addView(mVideoPlayer, params);

                mVideoPlayer.addOnLayoutChangeListener(new OnLayoutChangeListener() {
                    @Override
                    public void onLayoutChange(View v, int l, int t, int r, int b, int ol, int ot, int or, int ob) {
                        int w = r - l;
                        int h = b - t;
                        if (w > 0 && h > 0 && mHandle != null && !mIsInitialized) {
                            Log.d(TAG, "Layout ready, retriggering renderer sequence");
                            executeRendererSequence();
                        }
                    }
                });

                Log.d(TAG, "VideoPlayer initialized successfully");
            }
        } catch (Exception e) {
            Log.e(TAG, "initView failed: " + e.getMessage());
        }
    }

    @Override
    public void onCaptureRet(boolean success, String path) {
        Log.i(TAG, "onCaptureRet success=" + success + " path=" + path);
    }

    @Override
    public void onDecodeFrameTime(boolean success, long time, int type) {
        if (success && !mHasReceivedData) {
            mHasReceivedData = true;
            Log.i(TAG, "SUCCESS! Video rendering started for handle: " + mHandle);
        }
    }

    @Override
    public void onRequestSingleFrameData() {
    }

    public void setHandle(String handle) {
        if (handle != null && !handle.equals(mHandle)) {
            Log.d(TAG, "setHandle: " + handle);
            this.mHandle = handle;
            mIsInitialized = false;
            mHasReceivedData = false;
            triggerRender();
        }
    }

    public void setChannelId(int channelId) {
        if (this.mChannelId != channelId) {
            Log.d(TAG, "setChannelId: " + channelId);
            this.mChannelId = channelId;
        }
    }

    public void setUserId(int userId) {
        if (this.mUserId != userId) {
            Log.d(TAG, "setUserId: " + userId);
            this.mUserId = userId;
        }
    }

    public void setHost(String host) {
        if (host != null && !host.equals(mHost)) {
            Log.d(TAG, "setHost: " + host);
            this.mHost = host;
        }
    }

    private void triggerRender() {
        if (mHandle == null || mHandle.isEmpty()) {
            return;
        }
        executeRendererSequence();
    }

    private void executeRendererSequence() {
        if (mVideoPlayer == null || mHandle == null || mHandle.isEmpty()) {
            return;
        }

        if (mIsInitialized) {
            return;
        }

        if (mVideoPlayer.getWidth() <= 0) {
            return;
        }

        mIsInitialized = true;

        try {
            long handleLong = NvrSdkModule.safeParseHandle(mHandle);
            Log.i(TAG, " INSTANT START: Handle " + handleLong);

            if (!mHost.isEmpty())
                mVideoPlayer.setServerAddress(mHost);
            if (mChannelId >= 0)
                mVideoPlayer.setChannelID(mChannelId);

            mVideoPlayer.setMediaCodecType(mUseHardwareDecoding);
            mVideoPlayer.setRenderModel(mRenderModel);
            mVideoPlayer.setLiveHandle(handleLong);

            try {
                mVideoPlayer.SetupLayout("", 1, 1);
            } catch (Exception e) {
            }

            mVideoPlayer.start();
            mVideoPlayer.setKeepScreenOn(true);
            mVideoPlayer.showOrHideVideo(true);
            mVideoPlayer.requestLayout();

            nvrsdk sdk = TVTManager.getSdk();
            if (sdk != null) {
                sdk.SetPlayerBufNumber(handleLong, 10); // Increased from 1 to 10 for better stability
                final long h = handleLong;
                final int u = (mUserId > 0) ? mUserId : TVTManager.loginHandle;
                mHandler.postDelayed(() -> {
                    nvrsdk s = TVTManager.getSdk();
                    if (s != null && h > 0)
                        s.MakeKeyFrame(u, h);
                }, 100);
            }

            mHandler.postDelayed(() -> {
                if (mVideoPlayer != null) {
                    mVideoPlayer.RestoreVideoSize();
                    mVideoPlayer.setIdentityMatrix();
                    mVideoPlayer.requestLayout();
                }
            }, 500);

        } catch (Exception e) {
            Log.e(TAG, "executeRendererSequence error: " + e.getMessage());
            mIsInitialized = false;
        }
    }

    public void cleanup() {
        Log.d(TAG, "cleanup called for handle: " + mHandle);
        mHandler.removeCallbacksAndMessages(null);

        if (mVideoPlayer != null) {
            try {
                mVideoPlayer.stop();
                mVideoPlayer.setLiveHandle(-1);
            } catch (Exception e) {
                Log.e(TAG, "cleanup error: " + e.getMessage());
            }
        }

        mHandle = null;
        mIsInitialized = false;
        mHasReceivedData = false;
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
        if (mVideoPlayer != null) {
            mVideoPlayer.layout(0, 0, right - left, bottom - top);
        }
    }

    @Override
    protected void onDetachedFromWindow() {
        Log.d(TAG, "View detached from window");
        cleanup();
        super.onDetachedFromWindow();
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        Log.d(TAG, "View attached to window");
        if (mHandle != null && !mIsInitialized) {
            triggerRender();
        }
    }
}
