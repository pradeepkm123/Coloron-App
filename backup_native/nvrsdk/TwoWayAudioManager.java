package com.vms.nvrsdk;

import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.util.Log;
import com.sdk.interfance.nvrsdk;

public class TwoWayAudioManager {
    private static final String TAG = "TwoWayAudioManager";
    private final nvrsdk sdk;

    private AudioRecord audioRecord;
    private boolean isTalking = false;
    private Thread talkThread;
    private long talkHandle = -1;
    private String lastError = "";

    // Audio settings: 8kHz Mono 16bit (Standard for most VMS/NVRs)
    private static final int SAMPLE_RATE = 8000;
    private static final int CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO;
    private static final int AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT;
    private static final int READ_SIZE = 320; // 320 bytes = 160 samples = 20ms

    public TwoWayAudioManager(nvrsdk sdk) {
        this.sdk = sdk;
    }

    public void setInternalFallback(String ip, int port) {
        // This can be used for direct UDP fallback if SDK fails,
        // but for now we focus on SDK implementation.
        Log.d(TAG, "Fallback IP set: " + ip + ":" + port);
    }

    public String getLastError() {
        return lastError;
    }

    public long startTalking(int userId, int channelId) {
        if (isTalking)
            return talkHandle;

        try {
            int minBufSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT);
            audioRecord = new AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    SAMPLE_RATE,
                    CHANNEL_CONFIG,
                    AUDIO_FORMAT,
                    Math.max(minBufSize, READ_SIZE * 4));

            if (audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
                lastError = "AudioRecord init failed";
                return -1;
            }

            // Start SDK Voice session
            try {
                talkHandle = sdk.StartVoiceCom(userId, false);
            } catch (UnsatisfiedLinkError jniErr) {
                Log.e(TAG, "JNI startVoiceCom method missing: " + jniErr.getMessage());
                lastError = "JNI Method Mismatch";
                return -10; // Special code for JNI failure
            }

            if (talkHandle <= 0) {
                lastError = "SDK Error: " + talkHandle;
                Log.e(TAG, "StartVoiceCom failed, handle: " + talkHandle);
                if (audioRecord != null) {
                    audioRecord.release();
                    audioRecord = null;
                }
                return (int) talkHandle;
            }

            audioRecord.startRecording();
            isTalking = true;

            talkThread = new Thread(new Runnable() {
                @Override
                public void run() {
                    byte[] pcmBuffer = new byte[READ_SIZE];
                    byte[] g711Buffer = new byte[READ_SIZE / 2];

                    while (isTalking) {
                        int read = audioRecord.read(pcmBuffer, 0, READ_SIZE);
                        if (read > 0) {
                            // Convert to G.711 A-Law (PCMA)
                            // or G.711 mu-Law (PCMU) if needed.
                            // TVT Standard is A-Law.
                            for (int i = 0; i < read / 2; i++) {
                                int low = pcmBuffer[i * 2] & 0xFF;
                                int high = pcmBuffer[i * 2 + 1] << 8;
                                short sample = (short) (high | low);
                                g711Buffer[i] = linearToALaw(sample);
                            }

                            // Send to SDK
                            long startTime = System.currentTimeMillis();
                            boolean ok = sdk.VoiceComSendData(talkHandle, g711Buffer, g711Buffer.length);
                            if (!ok) {
                                Log.e(TAG, "VoiceComSendData failed");
                            }

                            // SUPERLIVEPLUS FLOW: Maintain 20ms pace
                            long elapsed = System.currentTimeMillis() - startTime;
                            if (elapsed < 20) {
                                try {
                                    Thread.sleep(20 - elapsed);
                                } catch (Exception ignored) {
                                }
                            }
                        }
                    }
                }
            });
            talkThread.start();

            return talkHandle;

        } catch (Exception e) {
            lastError = e.getMessage();
            Log.e(TAG, "StartTalking Error: " + e.getMessage());
            return -4;
        }
    }

    public void stopTalking() {
        isTalking = false;
        if (talkThread != null) {
            try {
                talkThread.interrupt();
                talkThread.join(200);
            } catch (Exception ignored) {
            }
            talkThread = null;
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

        if (talkHandle > 0) {
            sdk.StopVoiceCom(talkHandle);
            talkHandle = -1;
        }
    }

    // Standard PCM (Linear) to G.711 A-Law conversion (PCMA)
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

    // Standard PCM to mu-Law conversion (PCMU) - Alternative if A-Law fails
    private byte linearToULaw(short pcm) {
        int pcmVal = pcm;
        int mask = 0xFF;
        if (pcmVal < 0) {
            pcmVal = -pcmVal;
            mask = 0x7F;
        }
        pcmVal += 33 << 2; // Bias
        if (pcmVal > 32767)
            pcmVal = 32767;

        int seg;
        if (pcmVal < 0x200)
            seg = 0;
        else if (pcmVal < 0x400)
            seg = 1;
        else if (pcmVal < 0x800)
            seg = 2;
        else if (pcmVal < 0x1000)
            seg = 3;
        else if (pcmVal < 0x2000)
            seg = 4;
        else if (pcmVal < 0x4000)
            seg = 5;
        else if (pcmVal < 0x8000)
            seg = 6;
        else
            seg = 7;

        int uval = (seg << 4) | ((pcmVal >> (seg + 3)) & 0x0F);
        return (byte) (~uval & mask);
    }
}
