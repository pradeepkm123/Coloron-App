package com.vms.tvt;

import android.content.Context;
import android.os.Handler;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import com.sdk.network.VideoPlayer;
import com.sdk.network.VideoViewCallback;
import com.sdk.interfance.nvrsdk;

/**
 * TVTLiveViewNative - Final Stability Polish
 * Optimized for Software Decoding (Higher compatibility with H.264/H.265
 * fallback).
 */
public class TVTLiveView extends FrameLayout implements VideoViewCallback {
    private static final String TAG = "TVTLiveViewNative";

    private int mChannelId = -1;
    private int mStreamType = 0;
    private int mUserId = -1;
    private String mHost = "";
    private long mPlayHandle = -1;

    private VideoPlayer mVideoPlayer;
    private boolean mIsInitialized = false;
    private boolean mHasReceivedData = false;
    private boolean mUseHardwareDecoding = false; // Start with Software for safety
    private int mRenderModel = 1; // Default SurfaceView
    private int mRetryCount = 0;
    private final Handler mWatchdogHandler = new Handler();

    public TVTLiveView(Context context) {
        super(context);
        Log.d(TAG, "=> View Instance Created");
        initView(context);
    }

    private void initView(Context context) {
        setBackgroundColor(0xFF000000);
        try {
            mVideoPlayer = VideoPlayer.getVideoView(context);
            if (mVideoPlayer != null) {
                // Configurable decoding
                mVideoPlayer.setMediaCodecType(mUseHardwareDecoding);
                mVideoPlayer.setRenderModel(mRenderModel);
                Log.i(TAG, "=> initView: Codec=" + mUseHardwareDecoding + ", Render=" + mRenderModel);

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
                        if (w > 0 && h > 0) {
                            Log.d(TAG, "=> Layout Size: " + w + "x" + h);
                            if (mPlayHandle > 0 && !mIsInitialized) {
                                Log.d(TAG, "=> Retriggering renderer sequence...");
                                executeRendererSequence(mUserId > 0 ? mUserId : TVTManager.loginHandle);
                            }
                        }
                    }
                });
            }
        } catch (Exception e) {
            Log.e(TAG, "=> initView Failed: " + e.getMessage());
        }
    }

    @Override
    public void onCaptureRet(boolean success, String path) {
    }

    @Override
    public void onDecodeFrameTime(boolean success, long time, int type) {
        if (success) {
            if (!mHasReceivedData) {
                mHasReceivedData = true;
                mRetryCount = 0;
                stopWatchdog();
                Log.i(TAG, "!!! SUCCESS !!! VIDEO PIXELS RENDERING !!! (handle=" + mPlayHandle + " | HW="
                        + mUseHardwareDecoding + ")");
            }
        } else {
            // Log as info so user can see pulses in filtered logs
            Log.i(TAG, "=> Decoder Pulse: success=false (Awaiting frames) handle=" + mPlayHandle);
        }
    }

    private void startWatchdog() {
        stopWatchdog();
        mWatchdogHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (!mHasReceivedData && mPlayHandle > 0 && mRetryCount < 3) {
                    mRetryCount++;
                    Log.w(TAG,
                            "!!! WATCHDOG TIMEOUT !!! No pixels for 8s. Toggling codec/render and retrying... (Retry "
                                    + mRetryCount + ")");

                    if (mRetryCount == 1) {
                        mUseHardwareDecoding = !mUseHardwareDecoding; // Toggle HW/SW
                    } else if (mRetryCount == 2) {
                        mRenderModel = (mRenderModel == 1) ? 0 : 1; // Toggle SurfaceView/TextureView
                    }

                    triggerStart(true); // Force restart
                }
            }
        }, 8000); // 8 second timeout
    }

    private void stopWatchdog() {
        mWatchdogHandler.removeCallbacksAndMessages(null);
    }

    @Override
    public void onRequestSingleFrameData() {
    }

    public void setUserId(int userId) {
        if (this.mUserId == userId && mPlayHandle > 0)
            return;
        this.mUserId = userId;
        Log.d(TAG, "=> prop userId: " + userId);
        triggerStart(false);
    }

    public void setHost(String host) {
        if (host != null && !host.equals(mHost)) {
            this.mHost = host;
            Log.d(TAG, "=> prop host: " + host);
            triggerStart(false);
        }
    }

    public void setChannelId(int channelId) {
        if (this.mChannelId == channelId && mPlayHandle > 0)
            return;
        this.mChannelId = channelId;
        Log.d(TAG, "=> prop channelId: " + channelId);
        triggerStart(false);
    }

    public void setStreamType(int streamType) {
        if (this.mStreamType == streamType && mPlayHandle > 0)
            return;
        this.mStreamType = streamType;
        triggerStart(false);
    }

    private void triggerStart(boolean force) {
        // Debounce: If already starting with same parameters, skip
        if (!force && mPlayHandle > 0 && mIsInitialized) {
            Log.i(TAG, "=> triggerStart skipped: already running handle=" + mPlayHandle);
            return;
        }
        if (force) {
            Log.i(TAG, "=> triggerStart: FORCED restart requested");
            stopPlayback();
        }
        mHasReceivedData = false;
        removeCallbacks(mStartRunnable);
        postDelayed(mStartRunnable, 500); // 500ms debounce
    }

    private final Runnable mStartRunnable = new Runnable() {
        @Override
        public void run() {
            startPlayback();
        }
    };

    private void startPlayback() {
        if (mVideoPlayer == null) {
            Log.e(TAG, "=> startPlayback: mVideoPlayer is NULL");
            return;
        }
        if (mChannelId < 0) {
            Log.w(TAG, "=> startPlayback: Invalid channelId " + mChannelId);
            return;
        }

        int userId = (mUserId > 0) ? mUserId : TVTManager.loginHandle;
        if (userId <= 0) {
            Log.w(TAG, "=> startPlayback: No valid userId yet (mUserId=" + mUserId + ", Global="
                    + TVTManager.loginHandle + ")");
            return;
        }

        nvrsdk sdk = TVTManager.getSdk();
        if (sdk == null) {
            Log.e(TAG, "=> startPlayback: SDK instance is NULL");
            return;
        }

        stopPlayback();
        mIsInitialized = false;

        Log.d(TAG, "=> Opening Stream: User=" + userId + ", Channel=" + mChannelId + ", Type=" + mStreamType + ", Host="
                + mHost);

        mVideoPlayer.setServerAddress(mHost);
        mVideoPlayer.setChannelID(mChannelId);
        mVideoPlayer.setMediaCodecType(mUseHardwareDecoding);
        mVideoPlayer.setRenderModel(mRenderModel);

        try {
            long handle = sdk.LivePlay(userId, mChannelId, mStreamType);
            Log.d(TAG, "=> LivePlay Result (Handle): " + handle);

            if (handle > 0) {
                mPlayHandle = handle;
                if (mVideoPlayer.getWidth() > 0) {
                    Log.d(TAG, "=> handle=" + handle + " | ViewSize=" + mVideoPlayer.getWidth() + "x"
                            + mVideoPlayer.getHeight());
                    executeRendererSequence(userId);
                    startWatchdog();
                } else {
                    Log.d(TAG, "=> Delaying sequence: Width is 0. Will retry on next layout change.");
                }
            } else {
                Log.e(TAG, "=> LivePlay FAILED (Ch=" + mChannelId + "). Error Code: " + handle);
                if (mRetryCount < 2) {
                    mRetryCount++;
                    Log.i(TAG, "=> Scheduling LivePlay retry in 3s...");
                    postDelayed(mStartRunnable, 3000);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "=> LivePlay Exception: " + e.getMessage());
        }
    }

    private void executeRendererSequence(final int userId) {
        if (mVideoPlayer == null)
            return;
        if (mPlayHandle <= 0) {
            Log.w(TAG, "=> executeRendererSequence: No valid mPlayHandle");
            return;
        }
        if (mIsInitialized) {
            Log.d(TAG, "=> executeRendererSequence: Already initialized for handle " + mPlayHandle);
            return;
        }
        mIsInitialized = true;

        postDelayed(new Runnable() {
            @Override
            public void run() {
                if (mPlayHandle <= 0)
                    return;
                try {
                    Log.i(TAG, "=> Sequence START: handle=" + mPlayHandle
                            + " (Software) | NOTE: Check 'ADB LOGCAT' for 'SUCCESS' msgs!");

                    // Essential setup: Link handle to UI
                    mVideoPlayer.setLiveHandle(mPlayHandle);

                    try {
                        mVideoPlayer.SetupLayout("", 1, 1);
                    } catch (Exception e) {
                    }

                    mVideoPlayer.start();
                    mVideoPlayer.setKeepScreenOn(true);

                    // Force a view update
                    mVideoPlayer.showOrHideVideo(true);
                    mVideoPlayer.requestLayout();

                    nvrsdk s = TVTManager.getSdk();
                    if (s != null) {
                        s.SetPlayerBufNumber(mPlayHandle, 5); // Standard buffer
                        // Delay keyframe request to allow decoder to settle
                        final long h = mPlayHandle;
                        final int u = userId;
                        postDelayed(new Runnable() {
                            @Override
                            public void run() {
                                nvrsdk s2 = TVTManager.getSdk();
                                if (s2 != null && h > 0)
                                    s2.MakeKeyFrame(u, h);
                            }
                        }, 2000);
                    }

                    Log.i(TAG,
                            "=> Sequence OK: handle=" + mPlayHandle + " (Ch=" + mChannelId + "). Awaiting pixels...");

                    // Multi-staged refresher
                    postDelayed(new Runnable() {
                        @Override
                        public void run() {
                            if (mVideoPlayer != null && mPlayHandle > 0) {
                                mVideoPlayer.RestoreVideoSize();
                                mVideoPlayer.setIdentityMatrix();
                                mVideoPlayer.requestLayout();
                                Log.i(TAG, "=> Refresh Pulse Sent (layout=" + mVideoPlayer.getWidth() + "x"
                                        + mVideoPlayer.getHeight() + ")");
                            }
                        }
                    }, 1000);

                } catch (Exception e) {
                    Log.e(TAG, "=> Sequence Error: " + e.getMessage());
                    mIsInitialized = false;
                }
            }
        }, 600);
    }

    private void stopPlayback() {
        if (mPlayHandle > 0) {
            Log.i(TAG, "=> stopPlayback: Closing handle " + mPlayHandle);
            try {
                if (mVideoPlayer != null) {
                    mVideoPlayer.stop();
                    mVideoPlayer.setLiveHandle(-1);
                }
                nvrsdk sdk = TVTManager.getSdk();
                if (sdk != null)
                    sdk.StopLivePlay(mPlayHandle);
            } catch (Exception e) {
            }
            mPlayHandle = -1;
            mIsInitialized = false;
        }
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
        Log.d(TAG, "=> View Detached from Window. Cleaning up handle " + mPlayHandle);
        stopPlayback();
        super.onDetachedFromWindow();
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        Log.i(TAG, "=> View Attached to Window (Ch=" + mChannelId + ")");
        if (mChannelId >= 0 && mPlayHandle <= 0) {
            triggerStart(false);
        }
    }
}
