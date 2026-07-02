package com.vms.nvrsdk;

import android.graphics.Color;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.sdk.interfance.NVRSDKCallback;
import com.sdk.interfance.SDKDefs;
import com.sdk.interfance.nvrsdk;
import com.sdk.interfance.bean.*;
import com.sdk.interfance.NET_SDK_DEVICEINFO;
import com.sdk.network.VideoPlayer;
import com.sdk.network.VideoViewCallback;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class NvrVideoViewManager extends SimpleViewManager<View> implements VideoViewCallback, NVRSDKCallback {

    public static final String REACT_CLASS = "NvrVideoView";
    private final ReactApplicationContext reactContext;
    public static final List<VideoPlayer> activePlayers = Collections.synchronizedList(new ArrayList<>());
    private final ConcurrentHashMap<Long, Integer> pendingHeaders = new ConcurrentHashMap<>();
    private final android.os.Handler watchdogHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    private final ConcurrentHashMap<Long, Long> lastDataTime = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Integer> retryCounts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Boolean> firstKeyHandled = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Integer> frameCounts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Long> lastBitrateEmitTime = new ConcurrentHashMap<>();

    // Audio Support
    private final ConcurrentHashMap<Long, android.media.AudioTrack> audioTracks = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<VideoPlayer, Boolean> viewMuteStates = new ConcurrentHashMap<>();

    public NvrVideoViewManager(ReactApplicationContext reactContext) {
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return REACT_CLASS;
    }

    @NonNull
    @Override
    protected View createViewInstance(@NonNull ThemedReactContext reactContext) {
        try {
            // Use factory method for cleaner initialization
            final VideoPlayer vp = VideoPlayer.getVideoView(reactContext);

            // CRITICAL: Set LayoutParams FIRST to prevent NullPointerException
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT);
            vp.setLayoutParams(params);
            vp.setKeepScreenOn(true);
            vp.setCallback(this);
            vp.setBackgroundColor(Color.BLACK);
            vp.setMediaCodecType(true); // Hardware Decoding (Fastest)
            vp.setRenderModel(1); // SurfaceView (Direct path to screen)
            vp.setDropState(true); // Allow dropping to maintain sync
            vp.RestoreVideoSize();
            vp.showOrHideVideo(true);

            activePlayers.add(vp);
            
            // Register this manager to the central callback dispatcher
            com.vms.tvt.TVTManager.addListener(this);
            Log.i("NvrVideoView", "TVTManager.addListener(this) REGISTERED (Total Players: " + activePlayers.size() + ")");

            return vp;
        } catch (Throwable e) {
            Log.e("NvrVideoView", "Fatal error creating VideoPlayer: " + e.getMessage());
            // Fallback for Emulator or Missing Libs
            FrameLayout errorLayout = new FrameLayout(reactContext);
            errorLayout.setBackgroundColor(Color.DKGRAY);

            TextView errorText = new TextView(reactContext);
            errorText.setText("[Native Player Error]\n" + e.toString());
            errorText.setTextColor(Color.WHITE);
            errorText.setGravity(Gravity.CENTER);

            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT);
            params.gravity = Gravity.CENTER;
            errorLayout.addView(errorText, params);

            return errorLayout;
        }
    }

    @ReactProp(name = "handle")
    public void setHandle(View view, @Nullable String handleStr) {
        if (handleStr == null || handleStr.isEmpty())
            return;

        if (view instanceof VideoPlayer) {
            final VideoPlayer vp = (VideoPlayer) view;
            try {
                final long handle = NvrSdkModule.safeParseHandle(handleStr);
                if (vp.getLiveHandle() == handle) {
                    Log.d("NvrVideoView", " Already playing handle " + handle);
                    return;
                }

                // Clean cleanup
                vp.stop();
                vp.setLiveHandle(handle);

                // Setup specific for this handle
                vp.setMediaCodecType(true); // HARDWARE
                vp.setRenderModel(1); // SURFACE VIEW
                vp.setDropState(true);
                vp.SetupLayout("", 1, 1);
                vp.RestoreVideoSize();
                vp.setIdentityMatrix();

                // For SurfaceView inside RN, this often helps transparency/layering
                vp.setKeepScreenOn(true);

                // CRITICAL: Check cached header
                long normalizedHandle = (long) (int) handle;
                if (pendingHeaders.containsKey(normalizedHandle)) {
                    int headerType = pendingHeaders.get(normalizedHandle);
                    Log.i("NvrVideoView", " Applying cached header: " + headerType);
                    vp.playVideoDataFormatHead(handle, headerType);
                }

                vp.start();
                vp.play();

                lastDataTime.put(handle, System.currentTimeMillis());

                // Reset state for new handle
                long normalized = (long) (int) handle;
                // Note: detectedHandles was used but not defined in the snippet in Step 182?
                // Ah, it was private java.util.Set<Long> detectedHandles = new
                // java.util.HashSet<>();
                // I'll add it below.
                if (detectedHandles != null) {
                    detectedHandles.remove(handle);
                    detectedHandles.remove(normalized);
                }
                firstKeyHandled.remove(handle);
                firstKeyHandled.remove(normalized);
                retryCounts.remove(handle);
                retryCounts.remove(normalized);
                frameCounts.remove(handle);
                frameCounts.remove(normalized);

                startWatchdog(handle, vp);

                // Accelerated Sequence Start: Use post() for immediate execution on main thread
                vp.post(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            final nvrsdk sdk = nvrsdk.getInstance(vp.getContext());
                            com.vms.tvt.TVTManager.addListener(NvrVideoViewManager.this);

                            vp.play();
                            vp.RestoreVideoSize();
                            vp.setIdentityMatrix();
                            vp.requestLayout();

                            // ACCELERATION: Only apply PlayBackControl if NOT a live stream
                            synchronized (com.vms.tvt.TVTManager.sdkLock) {
                                if (NvrSdkModule.isPlaybackHandle(handle)) {
                                    Log.d("NvrVideoView", " Applying Playback Controls for handle: " + handle);
                                    sdk.SetPlayerBufNumber(handle, 0);
                                    sdk.PlayBackControl(handle, 3, 0); // CMD_RESUME
                                    sdk.PlayBackControl(handle, 15, 0); // CMD_START_DECODE
                                    sdk.PlayBackControl(handle, 6, 0); // CMD_NORMAL_SPEED
                                } else {
                                    Log.d("NvrVideoView", " Live stream detected or tracked, skipping playback controls for handle: " + handle);
                                    sdk.SetPlayerBufNumber(handle, 10); // Normal live buffer
                                }

                                // Apply initial audio mute state based on viewMuteStates prop
                                Boolean isMutedObj = viewMuteStates.get(vp);
                                boolean isMuted = (isMutedObj != null) ? isMutedObj : false;
                                Log.d("NvrVideoView", "Applying initial audio state for handle " + handle + ": muted = " + isMuted);
                                if (isMuted) {
                                    sdk.PlayBackControl(handle, 10, 0); // STOPAUDIO
                                } else {
                                    sdk.PlayBackControl(handle, 9, 0); // STARTAUDIO
                                }

                                // Force NVR to send a keyframe ASAP
                                int tagUserId = com.vms.tvt.TVTManager.loginHandle;
                                if (view.getTag() instanceof Integer)
                                    tagUserId = (Integer) view.getTag();
                                sdk.MakeKeyFrame(tagUserId, handle);
                            }

                            Log.i("NvrVideoView", " AGGRESSIVE START handle: " + handle);
                        } catch (Exception e) {
                            Log.e("NvrVideoView", "Init sequence err: " + e.getMessage());
                        }
                    }
                });

            } catch (Throwable e) {
                android.util.Log.e("NvrVideoView", " Error setting handle: " + e.getMessage());
            }
        }

    }

    @ReactProp(name = "host")
    public void setHost(View view, @Nullable String host) {
        if (view instanceof VideoPlayer && host != null) {
            ((VideoPlayer) view).setServerAddress(host);
        }
    }

    @ReactProp(name = "channelId")
    public void setChannelId(View view, int channelId) {
        if (view instanceof VideoPlayer) {
            ((VideoPlayer) view).setChannelID(channelId);
        }
    }

    @ReactProp(name = "userId")
    public void setUserId(View view, int userId) {
        if (view instanceof VideoPlayer) {
            view.setTag(userId);
        }
    }

    @ReactProp(name = "muted")
    public void setMuted(View view, final boolean muted) {
        if (view instanceof VideoPlayer) {
            final VideoPlayer vp = (VideoPlayer) view;
            viewMuteStates.put(vp, muted);
            final long handle = vp.getLiveHandle();
            if (handle != 0) {
                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            nvrsdk sdk = nvrsdk.getInstance(vp.getContext());
                            synchronized (com.vms.tvt.TVTManager.sdkLock) {
                                if (muted) {
                                    sdk.PlayBackControl(handle, 10, 0); // STOPAUDIO
                                } else {
                                    sdk.PlayBackControl(handle, 9, 0); // STARTAUDIO
                                }
                            }
                            if (muted) {
                                android.media.AudioTrack track = audioTracks.get(handle);
                                if (track != null) {
                                    try {
                                        track.stop();
                                    } catch (Exception e) {}
                                }
                            } else {
                                android.media.AudioTrack track = audioTracks.get(handle);
                                if (track != null && track.getPlayState() != android.media.AudioTrack.PLAYSTATE_PLAYING) {
                                    try {
                                        track.play();
                                    } catch (Exception e) {}
                                }
                            }
                        } catch (Exception e) {
                            Log.e("NvrVideoView", "setMuted error: " + e.getMessage());
                        }
                    }
                }).start();
            }
        }
    }

    @Override
    public void onDropViewInstance(@NonNull View view) {
        super.onDropViewInstance(view);
        if (view instanceof VideoPlayer) {
            final VideoPlayer vp = (VideoPlayer) view;
            activePlayers.remove(vp);
            viewMuteStates.remove(vp);
            if (activePlayers.isEmpty()) {
                com.vms.tvt.TVTManager.removeListener(this);
            }
            final long handle = vp.getLiveHandle();

            Log.i("NvrVideoView", " Releasing player surface for handle: " + handle);

            // Clean up Audio
            try {
                nvrsdk sdk = nvrsdk.getInstance(vp.getContext());
                synchronized (com.vms.tvt.TVTManager.sdkLock) {
                    sdk.PlayBackControl(handle, 10, 0); // STOPAUDIO
                }
            } catch (Exception e) {
                Log.e("NvrVideoView", "Audio stop JNI error: " + e.getMessage());
            }

            try {
                android.media.AudioTrack track = audioTracks.remove(handle);
                if (track != null) {
                    track.stop();
                    track.release();
                    Log.i("NvrVideoView", " AudioTrack Released for " + handle);
                }
            } catch (Exception e) {
                Log.e("NvrVideoView", "Audio cleanup error: " + e.getMessage());
            }

            try {
                // IMPORTANT: We do NOT call StopPlayBack here anymore.
                // The React Native layer (Playback.tsx) manages handles and stops them when
                // necessary.
                // This allows seamless transitions between Portrait and Landscape views.
                vp.stop(); // Stop visual rendering/decoder
                vp.setLiveHandle(-1);

                // Keep the handle tracking in detectedHandles/lastDataTime for a few seconds
                // in case it's picked up by another view (like in a Modal)
            } catch (Exception e) {
                Log.e("NvrVideoView", "Cleanup error: " + e.getMessage());
            }
        }
    }

    @Nullable
    @Override
    public Map<String, Object> getExportedCustomDirectEventTypeConstants() {
        return MapBuilder.<String, Object>builder()
                .put("onBitrateUpdate", MapBuilder.of("registrationName", "onBitrateUpdate"))
                .put("onPlayError", MapBuilder.of("registrationName", "onPlayError"))
                .put("onCaptureRet", MapBuilder.of("registrationName", "onCaptureRet"))
                .build();
    }

    @Override
    public void onVideoDataFormatHead(final long liveHandle, final int iEncodeType) {
        android.util.Log.i("NvrVideoView", " Header Received: Handle=" + liveHandle + " (hex="
                + Long.toHexString(liveHandle) + ") Type=" + iEncodeType);

        // Always store with normalized (low-32) handle to ensure matching
        long normalizedHandle = (long) (int) liveHandle;
        pendingHeaders.put(normalizedHandle, iEncodeType);

        synchronized (activePlayers) {
            boolean found = false;
            for (final VideoPlayer vp : activePlayers) {
                long playerHandle = vp.getLiveHandle();
                // Better matching including Low-32 as headers often use it too
                if (playerHandle == liveHandle || (int) playerHandle == (int) liveHandle) {
                    found = true;
                    final long finalHandle = playerHandle; // Use the one the player knows
                    vp.post(new Runnable() {
                        @Override
                        public void run() {
                            Log.i("NvrVideoView",
                                    " Applying header to player: Handle=" + finalHandle + " Type=" + iEncodeType);
                            vp.playVideoDataFormatHead(finalHandle, iEncodeType);
                            vp.play(); // Ensure decoder is running

                            // Show Toast to confirm header application (only for live view, not for playback)
                            if (vp.getContext() != null && !NvrSdkModule.isPlaybackHandle(finalHandle) && !NvrSdkModule.isPlaybackHandle(liveHandle)) {
                                android.widget.Toast.makeText(vp.getContext(),
                                        " DECODER INIT: Ch " + vp.GetChannelID(),
                                        android.widget.Toast.LENGTH_SHORT).show();
                            }
                        }
                    });
                    break;
                }
            }
            if (!found) {
                Log.w("NvrVideoView", " Header Received for UNKNOWN handle: " + liveHandle + " (Total Players: "
                        + activePlayers.size() + ")");
            }
        }
    }

    private long lastVideoDataLog = 0;
    private java.util.Set<Long> detectedHandles = new java.util.HashSet<>();

    @Override
    public void onVideoData(long handle, int iNodeID, byte[] data, int lens, long time, boolean isKeyFrame, int width,
            int height, int frameIndex, int encodeType, int frameType) {

        boolean matched = playFrameToPlayer(handle, data, lens, isKeyFrame, width, height, time, frameIndex, encodeType, frameType);

        if (matched) {
            lastDataTime.put(handle, System.currentTimeMillis());

            // Emit Bitrate/FPS update every 1 second
            long nowEmit = System.currentTimeMillis();
            Long lastEmit = lastBitrateEmitTime.get(handle);
            if (lastEmit == null || nowEmit - lastEmit > 1000) {
                lastBitrateEmitTime.put(handle, nowEmit);

                // Find the view associated with this handle to emit event
                synchronized (activePlayers) {
                    for (VideoPlayer vp : activePlayers) {
                        if (vp.getLiveHandle() == handle || (int) vp.getLiveHandle() == (int) handle) {
                            WritableMap event = Arguments.createMap();
                            // bitRate is usually in bps, convert to kbps for display
                            event.putDouble("bitrate", 0); // encodeType is not bitrate
                            event.putInt("fps", 0); // frameIndex is not fps
                            event.putInt("width", width);
                            event.putInt("height", height);

                            reactContext.getJSModule(RCTEventEmitter.class)
                                    .receiveEvent(vp.getId(), "onBitrateUpdate", event);
                            break;
                        }
                    }
                }
            }
        }

        if (!detectedHandles.contains(handle)) {
            Log.i("NvrVideoView",
                    " FIRST PACKET for Handle=" + handle + " (key=" + isKeyFrame + ") - Matched: " + matched);
            detectedHandles.add(handle);

            if (!matched) {
                Log.w("NvrVideoView", " ORPHAN FIRST PACKET - No matching player for handle " + handle);
            }
        }

        long now = System.currentTimeMillis();
        if (now - lastVideoDataLog > 10000) {
            Log.d("NvrVideoView",
                    " DATA FLOW: Handle=" + handle + " Len=" + lens + " [" + width + "x" + height + "]"
                            + (matched ? " [OK]" : " [ORPHAN]") + " Frames: " + frameCounts.getOrDefault(handle, 0));
            lastVideoDataLog = now;
        }
    }

    private void startWatchdog(final long handle, final VideoPlayer vp) {
        watchdogHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                try {
                    Long last = lastDataTime.get(handle);
                    long now = System.currentTimeMillis();

                    if (NvrSdkModule.pausedHandles.contains(handle)) {
                        lastDataTime.put(handle, now);
                        startWatchdog(handle, vp);
                        return;
                    }

                    long elapsed = (last == null) ? (now - vp.getDrawingTime()) : (now - last);

                    if (elapsed > 3000) { // Aggressive 3s watchdog for playback
                        int retries = retryCounts.getOrDefault(handle, 0);
                        if (retries < 10) {
                            retryCounts.put(handle, retries + 1);
                            Log.w("NvrVideoView",
                                    " Watchdog Pulsing handle " + handle + " (elapsed: " + (elapsed / 1000) + "s)");

                            final nvrsdk sdk = nvrsdk.getInstance(vp.getContext());
                            if (sdk != null) {
                                synchronized (com.vms.tvt.TVTManager.sdkLock) {
                                    sdk.PlayBackControl(handle, 1, 0); // Pulse PLAY
                                    sdk.PlayBackControl(handle, 3, 0); // Pulse RESUME
                                    sdk.PlayBackControl(handle, 15, 0); // Pulse DECODE
                                    sdk.MakeKeyFrame(com.vms.tvt.TVTManager.loginHandle, handle);
                                }
                            }

                            vp.post(new Runnable() {
                                @Override
                                public void run() {
                                    vp.play();
                                    vp.RestoreVideoSize();
                                    vp.setIdentityMatrix();
                                    vp.requestLayout();
                                }
                            });
                            startWatchdog(handle, vp);
                        }
                    } else {
                        startWatchdog(handle, vp);
                    }
                } catch (Exception e) {
                    Log.e("NvrVideoView", "Watchdog err: " + e.getMessage());
                }
            }
        }, 3000);
    }

    private boolean playFrameToPlayer(long handle, byte[] data, int lens, boolean isKey, int w, int h, long time, int frameIndex, int encodeType, int frameType) {
        boolean matched = false;
        synchronized (activePlayers) {
            for (final VideoPlayer vp : activePlayers) {
                // Robust matching: exact OR low-32 bits
                if (vp.getLiveHandle() == handle || (int) vp.getLiveHandle() == (int) handle) {
                    matched = true;

                    // matched = true;
                    // DONT update player handle here! It causes flickering loops.
                    // Just feed the data.

                    try {
                        com.sdk.network.CFrameData frame = new com.sdk.network.CFrameData();
                        frame.bFrameData = data;
                        frame.iNodeID = (int) handle; // Standard overflow id mapping
                        frame.iFrameLen = lens;
                        frame.isKeyFrame = isKey;
                        frame.iFrameWidth = w;
                        frame.iFrameHeight = h;
                        frame.dwLowDateTime = time;
                        frame.iFrameIndex = frameIndex;
                        frame.iEncodeType = encodeType;
                        vp.playVideoData(frame);

                        int count = frameCounts.getOrDefault(handle, 0) + 1;
                        frameCounts.put(handle, count);

                        // Stabilized activation logic
                        long normalizedKey = (long) (int) handle;
                        if (isKey && (!firstKeyHandled.getOrDefault(normalizedKey, false) || count % 50 == 1)) {
                            firstKeyHandled.put(normalizedKey, true);
                            Log.i("NvrVideoView", " Keyframe " + count + " for " + handle);

                            vp.post(new Runnable() {
                                @Override
                                public void run() {
                                    vp.play();
                                    vp.RestoreVideoSize();
                                    vp.setIdentityMatrix();
                                    vp.requestLayout();
                                    vp.invalidate();
                                }
                            });
                        }
                    } catch (Exception e) {
                        // Only log occasionally to avoid noise
                        if (System.currentTimeMillis() % 5000 < 50)
                            Log.e("NvrVideoView", "Forward err: " + e.getMessage());
                    }
                    break;
                }
            }
        }
        return matched;
    }

    private static final short[] ALAW_TABLE = new short[256];
    static {
        for (int i = 0; i < 256; i++) {
            int val = i ^ 0x55;
            int sign = (val & 0x80) != 0 ? -1 : 1;
            int exponent = (val & 0x70) >> 4;
            int data = val & 0x0f;
            int decoded = (data << 4) + 8;
            if (exponent != 0) {
                decoded += 0x100;
            }
            if (exponent > 1) {
                decoded <<= (exponent - 1);
            }
            ALAW_TABLE[i] = (short) (sign * decoded);
        }
    }

    @Override
    public void onAudioData(long handle, int type, byte[] data, int lens, long time, int sampleRate, int channels,
            int bitsPerSample, int reserved) {
        if (data == null || lens <= 0)
            return;

        try {
            // Check if this player is muted
            boolean isMuted = false;
            synchronized (activePlayers) {
                for (VideoPlayer vp : activePlayers) {
                    if (vp.getLiveHandle() == handle) {
                        Boolean m = viewMuteStates.get(vp);
                        if (m != null && m) {
                            isMuted = true;
                        }
                        break;
                    }
                }
            }

            if (isMuted) {
                android.media.AudioTrack track = audioTracks.get(handle);
                if (track != null && track.getPlayState() == android.media.AudioTrack.PLAYSTATE_PLAYING) {
                    try {
                        track.stop();
                    } catch (Exception e) {}
                }
                return;
            }

            android.media.AudioTrack track = audioTracks.get(handle);

            // Default parameters if SDK returns 0/garbage
            int safeSampleRate = (sampleRate > 0) ? sampleRate : 8000;
            int safeChannels = (channels > 0) ? channels : 1;

            if (track == null) {
                int channelConfig = (safeChannels == 2) ? android.media.AudioFormat.CHANNEL_OUT_STEREO
                        : android.media.AudioFormat.CHANNEL_OUT_MONO;

                // FORCE 16-BIT PCM for Output (since we decode G.711 to 16-bit)
                int audioFormat = android.media.AudioFormat.ENCODING_PCM_16BIT;

                int minBufSize = android.media.AudioTrack.getMinBufferSize(safeSampleRate, channelConfig, audioFormat);

                if (minBufSize == android.media.AudioTrack.ERROR_BAD_VALUE)
                    return;

                track = new android.media.AudioTrack(
                        android.media.AudioManager.STREAM_MUSIC,
                        safeSampleRate,
                        channelConfig,
                        audioFormat,
                        minBufSize * 2,
                        android.media.AudioTrack.MODE_STREAM);

                if (track.getState() == android.media.AudioTrack.STATE_INITIALIZED) {
                    track.play();
                    audioTracks.put(handle, track);
                    Log.i("NvrVideoView", " AudioTrack Started: G.711 A-Law -> PCM16 | " + safeSampleRate + "Hz");
                } else {
                    track.release();
                    track = null;
                }
            } else if (track.getPlayState() != android.media.AudioTrack.PLAYSTATE_PLAYING) {
                try {
                    track.play();
                } catch (Exception e) {}
            }

            if (track != null && track.getPlayState() == android.media.AudioTrack.PLAYSTATE_PLAYING) {
                // Decode G.711 A-Law to PCM 16-bit
                // Optimization: reuse a buffer if possible, but for safety allocate here or use
                // a thread-local
                short[] pcmBuffer = new short[lens];
                for (int i = 0; i < lens; i++) {
                    // Java bytes are signed (-128 to 127). The table index must be 0-255.
                    // data[i] & 0xFF converts byte to unsigned int 0-255
                    pcmBuffer[i] = ALAW_TABLE[data[i] & 0xFF];
                }

                // Write short array (PCM 16)
                track.write(pcmBuffer, 0, lens);
            }
        } catch (Exception e) {
            // Log.e("NvrVideoView", "Audio Exception: " + e.getMessage());
        }
    }

    @Override
    public void onTalkData(int handle, int type, byte[] data) {
    }

    @Override
    public void ExceptionCallback(int handle, int type, int error) {
        Log.e("NvrVideoView", " SDK Exception: Handle=" + handle + " Type=" + type + " Error=" + error);
    }

    @Override
    public void AcceptRegisterCallback(int userId, int type, NET_SDK_DEVICEINFO[] deviceInfos) {
    }

    @Override
    public void onPlaybackEnd() {
        Log.i("NvrVideoView", " Playback End reached");
    }

    @Override
    public void onAlarmTypeVFD(N900AlarmVFDContainer container) {
    }

    @Override
    public void onAlarmTypeAVD(NET_SDK_IVE_AVD_T container) {
    }

    @Override
    public void onAlarmTypeFaceMatch(NET_SDK_IVE_FACE_MATCH_T container) {
    }

    @Override
    public void onAlarmTypeFaceMatchForIPC(N900AlarmFaceIPCContainer container) {
    }

    @Override
    public void onAlarmASD(N9000SmartASDContainer container) {
    }

    @Override
    public void onAlarmIpcAOIENTRY(N9000SmartCommonContainer container) {
    }

    @Override
    public void onAlarmNvrAOIENTRY(N9000SmartCommonContainer container) {
    }

    @Override
    public void onAlarmIpcAOILEAVE(N9000SmartCommonContainer container) {
    }

    @Override
    public void onAlarmNvrAOILEAVE(N9000SmartCommonContainer container) {
    }

    @Override
    public void onAlarmPVD(N9000SmartCommonContainer container) {
    }

    @Override
    public void onAlarmLoiter(N9000SmartCommonContainer container) {
    }

    @Override
    public void onAlarmVSD(N9000SmartVSDContainer container) {
    }

    // VideoViewCallback Implementation
    @Override
    public void onCaptureRet(boolean success, String path) {
        Log.i("NvrVideoView", "onCaptureRet: success=" + success + ", path=" + path);
        WritableMap event = Arguments.createMap();
        event.putBoolean("success", success);
        event.putString("path", path);

        synchronized (activePlayers) {
            for (VideoPlayer vp : activePlayers) {
                try {
                    reactContext.getJSModule(RCTEventEmitter.class)
                            .receiveEvent(vp.getId(), "onCaptureRet", event);
                } catch (Exception e) {
                    Log.e("NvrVideoView", "Failed to emit onCaptureRet to player: " + e.getMessage());
                }
            }
        }

        try {
            reactContext.getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onCaptureRet", event);
        } catch (Exception e) {
            Log.e("NvrVideoView", "Failed to emit global onCaptureRet event: " + e.getMessage());
        }
    }

    @Override
    public void onDecodeFrameTime(boolean success, long time, int type) {
        if (success) {
            // Only log once to verify it started
            if (time % 50 == 0) { // Slightly more frequent for debugging
                Log.i("NvrVideoView", " VIDEO PIXELS RENDERING! Time: " + time);
            }

            // On first successful decode, maybe show a temporary toast or notification?
            // Actually let's just use log for now as toast on every frame would be bad.
            // But if it's the VERY FIRST success...
        } else {
            Log.w("NvrVideoView", " Decode Frame failed (success=false). Check codec/header.");
        }
    }

    @Override
    public void onRequestSingleFrameData() {
    }
}
