package com.sdk.interfance;

import android.content.Context;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.AudioTrack;
import android.media.MediaRecorder;
import android.util.Log;


import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.ByteBuffer;

import java.nio.CharBuffer;
import java.nio.charset.Charset;


import static com.sdk.interfance.SDKLiveOneBigActivity.mNVRSDK;

public class VoiceManager {
    private static final String TAG = "VoiceManager";

    private boolean isRecording = false ;
    private boolean isTracking = false ;
    private long m_lVoiceComHandle = 0;   //句柄值
    /**
     * 采样率，现在能够保证在所有设备上使用的采样率是44100Hz, 但是其他的采样率（22050, 16000, 11025）在一些设备上也可以使用，
     * 8000针对低质量的音频设备使用；使用前请查询判断设备支持的采样率！
     */
    private static final int SAMPLE_RATE_INHZ = 8000;

    /**
     * 声道数。CHANNEL_IN_MONO and CHANNEL_IN_STEREO. 其中CHANNEL_IN_MONO是可以保证在所有设备能够使用的。
     */
    private static final int CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO;
    /**
     * 返回的音频数据的格式。 ENCODING_PCM_8BIT, ENCODING_PCM_16BIT, and ENCODING_PCM_FLOAT.
     */
    private static final int AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT;

    final int minBufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE_INHZ, CHANNEL_CONFIG, AUDIO_FORMAT);

    private AudioRecord audioRecord ;

    final byte data[] = new byte[minBufferSize];

    int bufferSizeInBytes = AudioTrack.getMinBufferSize(SAMPLE_RATE_INHZ, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT);

    private AudioTrack  player;

    byte[]  dataplay = new byte[bufferSizeInBytes];




    public void init() {
        audioRecord = new AudioRecord(MediaRecorder.AudioSource.MIC, SAMPLE_RATE_INHZ,
                CHANNEL_CONFIG, AUDIO_FORMAT, minBufferSize);
        //创建AudioTrack对象   依次传入 :流类型、采样率（与采集的要一致）、音频通道（采集是IN 播放时OUT）、量化位数、最小缓冲区、模式
        player = new AudioTrack(AudioManager.STREAM_MUSIC, SAMPLE_RATE_INHZ, AudioFormat.CHANNEL_OUT_MONO,
                AUDIO_FORMAT, dataplay.length, AudioTrack.MODE_STREAM);

        Log.d(TAG, "init: AudioTrack buffer:"+bufferSizeInBytes+",AudioRecord buffer:"+minBufferSize);
    }

    public void startRecord(final long m_lVoiceComHandle ) {
        if (audioRecord ==null){
            init();
        }
        audioRecord.startRecording();
        new Thread(new Runnable() {
            @Override
            public void run() {
                while (isRecording) {
                    int read = audioRecord.read(data, 0, minBufferSize);
                    if (AudioRecord.ERROR_INVALID_OPERATION != read) {
                        boolean res = mNVRSDK.VoiceComSendData(m_lVoiceComHandle, data, minBufferSize);
                        Log.d(TAG, "run: VoiceComSendData:" + res + "，length:" + data.length + ",minbuffer size:" + minBufferSize);
                        if (!res) {
                            Log.d(TAG, "run: error :" + mNVRSDK.GetLastError());
                        }
                    }
                }
            }
        }).start();
    }

    public void setRecordStatus(boolean isRecording) {
        this.isRecording = isRecording;
    }

    public void setTrackStatus(boolean isTracking) {
        this.isTracking = isTracking;
    }

    //播放音频（PCM）
    public void voicePlay(byte[] voicedata) {
        if (voicedata == null) {
            Log.d(TAG, "voicePlay: file is null");
            return;
        }
        if (player == null) {
            init();
            Log.d(TAG, "voicePlay: init");
        }
        if (!isTracking) {
            return;
        }
        player.play();//开始播放
        Log.d(TAG, "voicePlay: voiceData length:" + voicedata.length + ",dataPlay length:" + dataplay.length);
        if (player != null) {
            player.write(voicedata, 0, voicedata.length);
        }
    }

        public void writeBytesToFile(byte[] bs) throws IOException {
            try {
               File file = new File("/storage/emulated/0/DVRSDK_DEMO/testpcm"+".pcm");
                if (!file.exists()) {
                    file.getParentFile().mkdirs();
                    file.createNewFile();
                    Log.d(TAG, "writeBytesToFile: succ");
                }
            } catch (Exception e) {
                Log.e("TestFile", "Error on write File:" + e);
            }

            FileWriter writer = new FileWriter("/storage/emulated/0/DVRSDK_DEMO/testpcm"+".pcm", true);
            writer.write( getChars(bs));
            writer.close();
        }

    private char[] getChars (byte[] bytes) {
        Charset cs = Charset.forName ("UTF-8");
        ByteBuffer bb = ByteBuffer.allocate (bytes.length);
        bb.put (bytes);
        bb.flip ();
        CharBuffer cb = cs.decode (bb);
        return cb.array();
    }

//    public int getBestSampleRate() {
//        AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
//        String sampleRateString = am.getProperty(AudioManager.PROPERTY_OUTPUT_SAMPLE_RATE);
//        int sampleRate = sampleRateString == null ? 44100 : Integer.parseInt(sampleRateString);
//
//        return sampleRate;
//    }

    public void releaseRecord() {
        if (null != audioRecord) {
            audioRecord.stop();
            audioRecord.release();
            audioRecord = null;
        }
    }

    public void releasePlay() {
        if (null != player) {
            player.stop();//停止播放
            player.release();//释放资源
            player = null;
        }
    }

    public void release() {
        isRecording = false;
        isTracking = false;
        releaseRecord();
        releasePlay();
    }
}
