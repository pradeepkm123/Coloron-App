package com.vms.nvrsdk;

import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.SystemClock;
import android.util.Base64;
import android.util.Log;
import androidx.core.app.ActivityCompat;
import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;

import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter;
import com.facebook.react.modules.core.PermissionListener;
import com.sdk.interfance.nvrsdk;

import java.util.Arrays;

public class NvrTalkModule extends ReactContextBaseJavaModule implements PermissionListener {
    private static final String TAG = "NvrTalkModule";

    private final ReactApplicationContext reactContext;
    private nvrsdk sdk;

    // Audio Recording
    private boolean isRecording = false;
    private AudioRecord audioRecord;
    private Thread recordingThread;
    private final int sampleRate = 8000;
    private final int channelConfig = AudioFormat.CHANNEL_IN_MONO;
    private final int audioFormat = AudioFormat.ENCODING_PCM_16BIT;
    private int bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat);
    private final int READ_CHUNK_SIZE = 320; // 320 bytes PCM = 160 samples = 20ms packet

    // Talk Handle and UDP
    private long talkHandle = -1;
    private java.net.DatagramSocket talkSocket;
    private java.net.InetAddress talkAddress;
    private String cameraIp;
    private int talkPort;

    public NvrTalkModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        try {
            this.sdk = nvrsdk.getInstance(reactContext.getApplicationContext());
        } catch (Throwable e) {
            this.sdk = null;
            Log.e(TAG, "Failed to get SDK instance", e);
        }
    }

    @Override
    public String getName() {
        return "NvrTalkModule";
    }

    @ReactMethod
    public void startTalk(ReadableMap params, Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ActivityCompat.checkSelfPermission(reactContext,
                    Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                promise.reject("NO_PERMISSION", "Audio recording permission not granted");
                return;
            }
        }

        if (isRecording) {
            promise.reject("ALREADY_RECORDING", "Talk is already active");
            return;
        }

        if (sdk == null) {
            promise.reject("SDK_NULL", "NVR SDK not initialized");
            return;
        }

        try {
            int userId = params.getInt("userId");
            int channelId = params.getInt("channelId");
            String cameraIp = params.getString("cameraIp");
            int talkPort = params.hasKey("talkPort") ? params.getInt("talkPort") : 9000;

            Log.d(TAG, "Starting talk to " + cameraIp + ":" + talkPort);

            // For TVT/XM cameras without SDK talk support, we send audio via UDP
            // This is a common fallback method used by many VMS apps

            // Store connection info for the recording thread
            this.cameraIp = cameraIp;
            this.talkPort = talkPort;
            this.talkHandle = System.currentTimeMillis(); // Use timestamp as handle

            try {
                // Create UDP socket for sending audio
                talkSocket = new java.net.DatagramSocket();
                talkAddress = java.net.InetAddress.getByName(cameraIp);

                Log.d(TAG, "UDP socket created for talk");

            } catch (Exception e) {
                Log.e(TAG, "Failed to create UDP socket", e);
                promise.reject("SOCKET_ERROR", "Failed to create UDP socket: " + e.getMessage());
                return;
            }

            // Start Audio Recording
            if (bufferSize == AudioRecord.ERROR || bufferSize == AudioRecord.ERROR_BAD_VALUE) {
                bufferSize = sampleRate * 2;
            }

            audioRecord = new AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    sampleRate,
                    channelConfig,
                    audioFormat,
                    Math.max(bufferSize, READ_CHUNK_SIZE * 2));

            if (audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
                promise.reject("AUDIO_INIT_FAILED", "AudioRecord initialization failed");
                return;
            }

            audioRecord.startRecording();
            isRecording = true;

            Log.d(TAG, "AudioRecord started: 8kHz Mono 16bit");

            // Start recording thread
            recordingThread = new Thread(() -> {
                byte[] buffer = new byte[READ_CHUNK_SIZE];
                byte[] g711Buffer = new byte[READ_CHUNK_SIZE / 2];

                while (isRecording) {
                    int readResult = audioRecord.read(buffer, 0, READ_CHUNK_SIZE);
                    if (readResult > 0) {
                        // Convert PCM to G.711 A-Law
                        for (int i = 0; i < readResult / 2; i++) {
                            int low = buffer[i * 2] & 0xFF;
                            int high = buffer[i * 2 + 1] << 8;
                            short pcmSample = (short) (high | low);
                            g711Buffer[i] = linearToALaw(pcmSample);
                        }

                        // Send G.711 audio via UDP to camera
                        byte[] validData = Arrays.copyOf(g711Buffer, readResult / 2);
                        try {
                            if (talkSocket != null && talkAddress != null) {
                                java.net.DatagramPacket packet = new java.net.DatagramPacket(
                                        validData, validData.length, talkAddress, talkPort);
                                talkSocket.send(packet);
                            }
                        } catch (Exception e) {
                            Log.e(TAG, "Error sending UDP audio", e);
                        }
                    }
                }
            });
            recordingThread.start();

            WritableMap result = Arguments.createMap();
            result.putString("talkHandle", String.valueOf(talkHandle));
            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Start talk error", e);
            promise.reject("START_TALK_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopTalk(Promise promise) {
        try {
            isRecording = false;

            if (recordingThread != null) {
                recordingThread.join(500);
                recordingThread = null;
            }

            if (audioRecord != null) {
                if (audioRecord.getState() == AudioRecord.STATE_INITIALIZED) {
                    audioRecord.stop();
                }
                audioRecord.release();
                audioRecord = null;
            }

            if (talkSocket != null) {
                try {
                    talkSocket.close();
                    talkSocket = null;
                    talkAddress = null;
                    Log.d(TAG, "UDP socket closed");
                } catch (Exception e) {
                    Log.w(TAG, "Error closing UDP socket", e);
                }
            }

            talkHandle = -1;

            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Stop talk error", e);
            promise.reject("STOP_TALK_ERROR", e.getMessage());
        }
    }

    // G.711 A-Law encoding
    private byte linearToALaw(short pcm) {
        int pcmVal = pcm;
        int mask;

        if (pcmVal >= 0) {
            mask = 0xD5;
        } else {
            mask = 0x55;
            pcmVal = -pcmVal - 8;
        }

        if (pcmVal < 0)
            pcmVal = 0;
        if (pcmVal > 32767)
            pcmVal = 32767;

        int seg;
        if (pcmVal < 0x100)
            seg = 0;
        else if (pcmVal < 0x200)
            seg = 1;
        else if (pcmVal < 0x400)
            seg = 2;
        else if (pcmVal < 0x800)
            seg = 3;
        else if (pcmVal < 0x1000)
            seg = 4;
        else if (pcmVal < 0x2000)
            seg = 5;
        else if (pcmVal < 0x4000)
            seg = 6;
        else
            seg = 7;

        int aval;
        if (seg >= 8) {
            aval = 0x7F;
        } else {
            int v = (seg == 0) ? (pcmVal >> 4) : (pcmVal >> (seg + 3));
            aval = (seg << 4) | (v & 0x0F);
        }

        return (byte) (aval ^ mask);
    }

    @Override
    public boolean onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        return true;
    }
}
