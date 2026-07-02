package com.vms.nvrsdk;

import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.AudioTrack;
import android.media.MediaRecorder;
import android.media.AudioManager;
import android.util.Log;
import androidx.core.app.ActivityCompat;
import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;

import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.PermissionListener;
import com.sdk.interfance.nvrsdk;
import com.sdk.interfance.NVRSDKCallback;
import com.vms.tvt.TVTManager;

public class NvrTalkModule extends ReactContextBaseJavaModule {
    private static final String TAG = "NvrTalkModule";

    private final ReactApplicationContext reactContext;
    private nvrsdk sdk;

    // Audio states
    private boolean isRecording = false;
    private boolean isTracking = false;
    private long voiceHandle = -1;

    private AudioRecord audioRecord;
    private AudioTrack player;
    private Thread recordingThread;

    private static final int SAMPLE_RATE = 8000;
    private static final int CHANNEL_IN_CONFIG = AudioFormat.CHANNEL_IN_MONO;
    private static final int CHANNEL_OUT_CONFIG = AudioFormat.CHANNEL_OUT_MONO;
    private static final int AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT;

    private final NVRSDKCallback sdkCallback = new NVRSDKCallback() {
        @Override
        public void onTalkData(int handle, int length, byte[] data) {
            if (isTracking && player != null && data != null && length > 0) {
                try {
                    player.write(data, 0, length);
                } catch (Exception e) {
                    Log.e(TAG, "Error writing to AudioTrack", e);
                }
            }
        }

        @Override
        public void onVideoDataFormatHead(long l, int i) {
        }

        @Override
        public void onVideoData(long l, int i, byte[] b, int i1, long l1, boolean b1, int i2, int i3, int i4, int i5,
                int i6) {
        }

        @Override
        public void onAudioData(long l, int i, byte[] b, int i1, long l1, int i2, int i3, int i4, int i5) {
        }

        @Override
        public void ExceptionCallback(int i, int i1, int i2) {
        }

        @Override
        public void AcceptRegisterCallback(int i, int i1, com.sdk.interfance.NET_SDK_DEVICEINFO[] d) {
        }

        @Override
        public void onPlaybackEnd() {
        }

        @Override
        public void onAlarmTypeVFD(com.sdk.interfance.bean.N900AlarmVFDContainer c) {
        }

        @Override
        public void onAlarmTypeAVD(com.sdk.interfance.bean.NET_SDK_IVE_AVD_T c) {
        }

        @Override
        public void onAlarmTypeFaceMatch(com.sdk.interfance.bean.NET_SDK_IVE_FACE_MATCH_T c) {
        }

        @Override
        public void onAlarmTypeFaceMatchForIPC(com.sdk.interfance.bean.N900AlarmFaceIPCContainer c) {
        }

        @Override
        public void onAlarmASD(com.sdk.interfance.bean.N9000SmartASDContainer c) {
        }

        @Override
        public void onAlarmIpcAOIENTRY(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
        }

        @Override
        public void onAlarmNvrAOIENTRY(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
        }

        @Override
        public void onAlarmIpcAOILEAVE(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
        }

        @Override
        public void onAlarmNvrAOILEAVE(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
        }

        @Override
        public void onAlarmPVD(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
        }

        @Override
        public void onAlarmLoiter(com.sdk.interfance.bean.N9000SmartCommonContainer c) {
        }

        @Override
        public void onAlarmVSD(com.sdk.interfance.bean.N9000SmartVSDContainer c) {
        }
    };

    public NvrTalkModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "NvrTalkModule";
    }

    private void startTwoWayTalkInternal(int userId, int channelId) throws Exception {
        if (voiceHandle > 0) {
            throw new Exception("Talk session already active");
        }

        sdk = TVTManager.getSdk();
        if (sdk == null) {
            throw new Exception("SDK instance is null. Please ensure SDK is initialized.");
        }

        // Register callback to receive talk data from NVR
        TVTManager.addListener(sdkCallback);

        // Start TVT voice session
        try {
            Log.d(TAG, "Attempting StartVoiceCom for userId: " + userId);
            voiceHandle = sdk.StartVoiceCom(userId, true);
            Log.d(TAG, "StartVoiceCom returned handle: " + voiceHandle);
        } catch (UnsatisfiedLinkError e) {
            Log.w(TAG, "StartVoiceCom native method not found, trying StartVoiceComMR: " + e.getMessage());
            voiceHandle = sdk.StartVoiceComMR(userId, true);
            Log.d(TAG, "StartVoiceComMR returned handle: " + voiceHandle);
        }
        if (voiceHandle <= 0) {
            long err = sdk.GetLastError();
            TVTManager.removeListener(sdkCallback);
            throw new Exception("Voice communication session failed with handle " + voiceHandle + ", error: " + err);
        }

        // Setup AudioTrack
        int minPlayBufSize = AudioTrack.getMinBufferSize(SAMPLE_RATE, CHANNEL_OUT_CONFIG, AUDIO_FORMAT);
        player = new AudioTrack(
                AudioManager.STREAM_MUSIC,
                SAMPLE_RATE,
                CHANNEL_OUT_CONFIG,
                AUDIO_FORMAT,
                Math.max(minPlayBufSize, 640),
                AudioTrack.MODE_STREAM);

        if (player.getState() == AudioTrack.STATE_INITIALIZED) {
            isTracking = true;
            player.play();
        } else {
            sdk.StopVoiceCom(voiceHandle);
            voiceHandle = -1;
            TVTManager.removeListener(sdkCallback);
            throw new Exception("Failed to initialize AudioTrack");
        }
    }

    private void startMicSendInternal() throws Exception {
        if (voiceHandle <= 0) {
            throw new Exception("No active voice session");
        }

        if (isRecording) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ActivityCompat.checkSelfPermission(reactContext,
                    Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                throw new Exception("RECORD_AUDIO permission not granted");
            }
        }

        int minRecordBufSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_IN_CONFIG, AUDIO_FORMAT);
        audioRecord = new AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_IN_CONFIG,
                AUDIO_FORMAT,
                Math.max(minRecordBufSize, 640));

        if (audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
            throw new Exception("Failed to initialize AudioRecord");
        }

        audioRecord.startRecording();
        isRecording = true;

        recordingThread = new Thread(new Runnable() {
            @Override
            public void run() {
                byte[] buffer = new byte[640]; // 640 bytes = 320 samples = 40ms buffer
                while (isRecording) {
                    if (audioRecord == null)
                        break;
                    int read = audioRecord.read(buffer, 0, buffer.length);
                    if (read > 0 && isRecording && voiceHandle > 0 && sdk != null) {
                        boolean ok = sdk.VoiceComSendData(voiceHandle, buffer, read);
                        if (!ok) {
                            Log.e(TAG, "VoiceComSendData failed");
                        }
                    }
                }
            }
        });
        recordingThread.start();
    }

    @ReactMethod
    public void startTwoWayTalk(int userId, int channelId, Promise promise) {
        Log.d(TAG, "startTwoWayTalk: userId=" + userId + ", channelId=" + channelId);
        try {
            startTwoWayTalkInternal(userId, channelId);
            promise.resolve(String.valueOf(voiceHandle));
        } catch (Exception e) {
            Log.e(TAG, "startTwoWayTalk error", e);
            promise.reject("START_TALK_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void startMicSend(Promise promise) {
        Log.d(TAG, "startMicSend requested");
        try {
            startMicSendInternal();
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "startMicSend error", e);
            promise.reject("START_MIC_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopMicSend(Promise promise) {
        Log.d(TAG, "stopMicSend requested");
        cleanupMic();
        promise.resolve(true);
    }

    @ReactMethod
    public void stopTwoWayTalk(Promise promise) {
        Log.d(TAG, "stopTwoWayTalk requested");
        cleanupMic();
        cleanupPlayer();

        TVTManager.removeListener(sdkCallback);

        if (voiceHandle > 0 && sdk != null) {
            sdk.StopVoiceCom(voiceHandle);
            voiceHandle = -1;
        }

        promise.resolve(true);
    }

    private void cleanupMic() {
        isRecording = false;
        if (recordingThread != null) {
            try {
                recordingThread.join(200);
            } catch (Exception ignored) {
            }
            recordingThread = null;
        }
        if (audioRecord != null) {
            try {
                if (audioRecord.getRecordingState() == AudioRecord.RECORDSTATE_RECORDING) {
                    audioRecord.stop();
                }
            } catch (Exception ignored) {
            }
            audioRecord.release();
            audioRecord = null;
        }
    }

    private void cleanupPlayer() {
        isTracking = false;
        if (player != null) {
            try {
                if (player.getPlayState() == AudioTrack.PLAYSTATE_PLAYING) {
                    player.stop();
                }
            } catch (Exception ignored) {
            }
            player.release();
            player = null;
        }
    }

    // Backwards compatibility methods
    @ReactMethod
    public void startTalk(ReadableMap params, Promise promise) {
        try {
            int userId = params.getInt("userId");
            int channelId = params.hasKey("channelId") ? params.getInt("channelId") : 0;
            startTwoWayTalkInternal(userId, channelId);
            startMicSendInternal();
            promise.resolve(String.valueOf(voiceHandle));
        } catch (Exception e) {
            promise.reject("START_TALK_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void stopTalk(Promise promise) {
        stopTwoWayTalk(promise);
    }

}
