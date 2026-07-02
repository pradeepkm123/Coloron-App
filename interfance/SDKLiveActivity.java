package com.sdk.interfance;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.hardware.SensorManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Message;
import android.provider.Settings;
import android.text.InputType;
import android.text.TextUtils;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.View.OnTouchListener;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.AbsoluteLayout;
import android.widget.AdapterView;
import android.widget.AdapterView.OnItemSelectedListener;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CompoundButton;
import android.widget.CompoundButton.OnCheckedChangeListener;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.RadioButton;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;

import com.sdk.dialog.FishTypeSelectDialog;
import com.sdk.interfance.bean.N9000SmartASDContainer;
import com.sdk.interfance.bean.N9000SmartCommonContainer;
import com.sdk.interfance.bean.N9000SmartVSDContainer;
import com.sdk.interfance.bean.N900AlarmFaceIPCContainer;
import com.sdk.interfance.bean.N900AlarmVFDContainer;
import com.sdk.interfance.bean.NET_SDK_AUDIO_ABNORMAL_INFO_T;
import com.sdk.interfance.bean.NET_SDK_IVE_AVD_T;
import com.sdk.interfance.bean.NET_SDK_IVE_FACE_MATCH_T;
import com.sdk.network.CFrameData;
import com.sdk.network.GyroScope;
import com.sdk.network.State;
import com.sdk.network.StoragePath;
import com.sdk.network.VideoPlayer;
import com.sdk.network.VideoViewCallback;
import com.sdk.test.app.SDKApplication;
import com.sdk.test.utils.FileOperation;
import com.sdk.test.utils.PushThreadPool;
import com.switchbee.technician.R;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;

public class SDKLiveActivity extends BaseActivity implements VideoViewCallback, NVRSDKCallback/*, ReadCFrameDataInterface*/, PushThreadPool.PushThreadPoolCallback
{

    private static final String TAG = "SDKLiveActivity";
    public static final int UP = 0x101;
    public static final int DOWN = 0x102;
    public static final int LEFT = 0x103;
    public static final int RIGHT = 0x104;
    public static final int LEFT_UP = 0x105;
    public static final int LEFT_DOWN = 0x106;
    public static final int RIGHT_UP = 0x107;
    public static final int RIGHT_DOWN = 0x108;
    public static final int FOCUS_ADD = 0x109;
    public static final int FOCUS_SUB = 0x10a;
    public static final int ZOOM_ADD = 0x10b;
    public static final int ZOOM_SUB = 0x10c;
    public static final int APERTURE_ADD = 0x10d;
    public static final int APERTURE_SUB = 0x10e;
    public static final int CLOSE_CHANNEL = 0x10f;
    private static final int MSG_CAPTURE_SUCC = 2;
    private static final int MSG_CAPTURE_FAIL = 3;

    private long playHandle1 = -1;
    private long playHandle2 = -1;
    private long playHandle3 = -1;
    private long playHandle4 = -1;

    private int m_ilivechannel1 = 0;
    private int m_ilivechannel2 = 1;
    private int m_ilivechannel3 = 2;
    private int m_ilivechannel4 = 3;

    private int channel = 0;
    private AbsoluteLayout m_LiveLayout;
    private int SCREENWIDTH, SCREENHEIGHT;
    private VideoPlayer mVideoView1;
    private VideoPlayer mVideoView2;
    private VideoPlayer mVideoView3;
    private VideoPlayer mVideoView4;

    private Button m_btnOpenAudio = null;
    private Button m_btnStartRecord = null;
    private RadioButton m_rbMainCodeStream = null;
    private RadioButton m_rbSubCodeStream = null;
    private nvrsdk mNVRSDK = null;
    private EditText m_etChannel = null;
    private EditText m_etChannel1 = null;
    private EditText m_etChannel2 = null;
    private EditText m_etChannel3 = null;
    private int m_iChannelCount1 = 0;
//    private int m_iChannelCount2 = 0;
    private int m_iViewType = ViewType.LiveView;
    private int m_iChannelMode = 4;
    //	private ScrollView m_PTZScrollView = null;
    private AbsoluteLayout m_PTZLayout;
    private Spinner m_spSpeed = null;
    private ArrayList<String> m_SpeedList = null;
    private Spinner m_spPreset = null;
    private ArrayList<String> m_PresetList = null;
    private Spinner m_spCruise = null;
    private ArrayList<String> m_CruiseList = null;
    private int mUserID1 = 0;
//    private int mUserID2 = 0;
    //	private ScrollView m_SetScrollView = null;
    private AbsoluteLayout m_SetLayout;
    private EditText m_etBright = null;
    private EditText m_etSaturation = null;
    private EditText m_etContrast = null;
    private EditText m_etHue = null;
    private long getfilebytimeHandle = -1;
    private long m_lVoiceComHandle = 0;
    Spinner m_spSubStreamResolution = null;
    private ArrayList<String> m_SubStreamResolutionList = null;
    ArrayAdapter m_SubStreamResolutionAdapter = null;
    private ArrayList<DD_ENCODE_CONFIG_N9000_Ex> m_EncodeInfoList = null;
    private ArrayList<DD_ENCODE_CONFIG_N9000_Ex> m_EncodeInfoList1 = null;
    private ArrayList<DD_ENCODE_CONFIG_N9000_Ex> m_EncodeInfoList2 = null;
    private ArrayList<DD_ENCODE_CONFIG_N9000_Ex> m_EncodeInfoList3 = null;


    private static final int REQUEST_EXTERNAL_STORAGE = 1;
    private static String[] PERMISSIONS_STORAGE = {
            "android.permission.READ_EXTERNAL_STORAGE",
            "android.permission.WRITE_EXTERNAL_STORAGE" };


    private HashMap<Integer, String> m_ResolutionMap = new HashMap<Integer, String>();
    private int m_PreStreamtype = 0;
    private FileOperation m_fileoperation = null;
    ScrollView m_scrollview = null;
    private int m_irecordChannel = -1;
    private boolean m_bRecord = false;
    private boolean m_bStartLive = false;
    private GyroScope mFishGyroScope;//鱼眼VR模式监听
    private TextView tvfirstdevice;
    private Context mContext;

    @Override
    public void onRequestLive(int streamtype, int iichannel)
    {
        RequestLive(streamtype, iichannel, false);
    }

    @Override
    public void onGetSubStreamEncodeInfos()
    {
        GetSubStreamEncodeInfo(channel);
        GetSubStreamEncodeInfo(m_ilivechannel2);
        GetSubStreamEncodeInfo(m_ilivechannel3);
        GetSubStreamEncodeInfo(m_ilivechannel4);
    }

    class ViewType
    {
        public final static int LiveView = 1;
        public final static int SetView = 2;
        public final static int PTZView = 3;
    }


   private Handler mHandler = new Handler()
    {
        long time;
        int i =0;
        public void handleMessage(Message msg)
        {
            switch (msg.what)
            {
                case MSG_CAPTURE_SUCC:
                    i++;
                    ToolCommon.LOGD(TAG,i+" Capture success work time ms : "+(System.currentTimeMillis()-time));
                    ToolCommon.LOGD(TAG,i+" Capture path : "+msg.obj);
                    time= System.currentTimeMillis();
                    scanFile(mContext,msg.obj.toString());
                    Toast.makeText(SDKLiveActivity.this, "Capture success! 保存位置："+ msg.obj, Toast.LENGTH_SHORT).show();
                    break;
                case MSG_CAPTURE_FAIL:
                    i++;
                    ToolCommon.LOGD(TAG,i+" Capture fail work time ms : "+(System.currentTimeMillis()-time));
                    ToolCommon.LOGD(TAG,i+" Capture path : "+msg.obj);
                    time= System.currentTimeMillis();
                    Toast.makeText(SDKLiveActivity.this, "Capture fail", Toast.LENGTH_SHORT).show();
                    break;
                case 4:
                    Toast.makeText(SDKLiveActivity.this, "-----StartVoiceComMR,m_lVoiceComHandle = " + msg.obj, Toast.LENGTH_SHORT).show();
                    break;
                case 5:
                    Toast.makeText(SDKLiveActivity.this, "-----StopVoiceCom res=  " + msg.obj, Toast.LENGTH_SHORT).show();
                    break;
                case 6:
                    mVideoView1.setPermissionDenied(true);
                    mVideoView2.setPermissionDenied(true);
                    mVideoView3.setPermissionDenied(true);
                    mVideoView4.setPermissionDenied(true);

                    Toast.makeText(SDKLiveActivity.this, "-----device offline--------- ", Toast.LENGTH_SHORT).show();
                    break;
                case 7:
                    mVideoView1.setPermissionDenied(false);
                    mVideoView2.setPermissionDenied(false);
                    mVideoView3.setPermissionDenied(false);
                    mVideoView4.setPermissionDenied(false);

                    Toast.makeText(SDKLiveActivity.this, "-----device online--------", Toast.LENGTH_SHORT).show();
                    break;
                case 8:
                    int ichannel = msg.arg1;
                    SetSubStreamEncodeInfo(ichannel);
                    break;
                case 9:
                    int iEncodeType = msg.arg1;
                    long liveHandle = (Long) msg.obj;
                    int channel = -1;
                    if (mVideoView1 != null && mVideoView1.getLiveHandle() == liveHandle)
                    {
                        mVideoView1.setPermissionDenied(false);
                        mVideoView1.playVideoDataFormatHead(liveHandle, iEncodeType);
                        channel = mVideoView1.GetChannelID();
                    }
                    else if (mVideoView2 != null && mVideoView2.getLiveHandle() == liveHandle)
                    {
                        mVideoView2.setPermissionDenied(false);
                        mVideoView2.playVideoDataFormatHead(liveHandle, iEncodeType);
                        channel = mVideoView2.GetChannelID();
                    }
                    else if (mVideoView3 != null && mVideoView3.getLiveHandle() == liveHandle)
                    {
                        mVideoView3.setPermissionDenied(false);
                        mVideoView3.playVideoDataFormatHead(liveHandle, iEncodeType);
                        channel = mVideoView3.GetChannelID();
                    }
                    else if (mVideoView4 != null && mVideoView4.getLiveHandle() == liveHandle)
                    {
                        mVideoView4.setPermissionDenied(false);
                        mVideoView4.playVideoDataFormatHead(liveHandle, iEncodeType);
                        channel = mVideoView4.GetChannelID();
                    }

                    //					Toast.makeText(SDKLiveActivity.this, "---------onVideoDataFormatHead m_iCurEncodeType = " + msg.arg1 + ",channel = " + channel, Toast
                    // .LENGTH_SHORT).show();
                    break;
                case 10:
                    Toast.makeText(SDKLiveActivity.this, "-----GetDVRConfigSubStreamEncodeInfoEx success----encodeinfodata.length = " + msg.arg1 + ",channel = " + msg.arg2, Toast
                            .LENGTH_SHORT)
                            .show();
                    break;
                case 11:
                    Toast.makeText(SDKLiveActivity.this, "-----GetDVRConfigSubStreamEncodeInfoEx----encodeinfodata is null ,channel = " + msg.arg1, Toast.LENGTH_SHORT)
                            .show();
                    break;
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);
        mContext = this;
        this.getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        SCREENWIDTH = StoragePath.m_iScreenWidth;
        SCREENHEIGHT = StoragePath.m_iScreenHeight;
        mNVRSDK = SDKApplication.getInstance().getNvrSdk();
        if (mNVRSDK == null)
        {
            return;
        }

        mNVRSDK.SetCallback(this);
        mNVRSDK.SetID(111);

        mUserID1 = SDKApplication.getInstance().getUserId1();
        m_iChannelCount1 = SDKApplication.getInstance().getChannelCount1();
//        mUserID2 = SDKApplication.getInstance().getUserId2();
//        m_iChannelCount2 = SDKApplication.getInstance().getChannelCount2();

        m_scrollview = new ScrollView(this);
        m_scrollview.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT, 0, 0));

        SetupLiveUI();
        setContentView(m_scrollview);

        m_ResolutionMap.put(0x0001, "640x480"); // VGA
        m_ResolutionMap.put(0x0002, "720x480"); // NTSC
        m_ResolutionMap.put(0x0004, "720x576"); // EDTV
        m_ResolutionMap.put(0x0008, "800x600"); // SVGA
        m_ResolutionMap.put(0x0010, "1024x768"); //
        m_ResolutionMap.put(0x0020, "1280x960");
        m_ResolutionMap.put(0x0040, "1280x1024");
        m_ResolutionMap.put(0x0080, "1920x1080");
        m_ResolutionMap.put(0x0100, "320x240"); // QVGA
        m_ResolutionMap.put(0x0200, "352x240"); // SIF
        m_ResolutionMap.put(0x0400, "480x240"); // HVGA
        m_ResolutionMap.put(0x0800, "704x480"); // 4SIF
        m_ResolutionMap.put(0x1000, "704x576"); // D1
        m_ResolutionMap.put(0x2000, "960x480");
        m_ResolutionMap.put(0x4000, "960x576");
        m_ResolutionMap.put(0x8000, "960x1080");
        m_ResolutionMap.put(0x00010000, "1280x720");
        m_ResolutionMap.put(0x00020000, "1600x1200");
        m_ResolutionMap.put(0x00040000, "1920x1536");
        m_ResolutionMap.put(0x00080000, "2048x1536");
        m_ResolutionMap.put(0x00100000, "2304x1296");
        m_ResolutionMap.put(0x00200000, "2592x1520");
        m_ResolutionMap.put(0x00400000, "2560x1440");
        m_ResolutionMap.put(0x00800000, "2592x1944");
        m_ResolutionMap.put(0x01000000, "3840x2160");
        m_ResolutionMap.put(0x02000000, "352x288");// CIF

        if (m_fileoperation == null)
        {
            //写入本地记录文件
            m_fileoperation = new FileOperation(this, null);
        }

        reqSupportFishEye(mUserID1,m_iChannelCount1);
        //The subcode flow resolution of the channel is obtained first, before the subcode flow resolution is set.
        //        PushThreadPool.getInstance().PoolExecuteGetSubStreamEncodeInfos(SDKLiveActivity.this);
        //鱼眼VR模式监听
        mFishGyroScope = new GyroScope(this, new GyroScope.GyroScopeCallback()
        {
            @Override
            public void onGyroScopeRotation(float[] rotation)
            {
                if (mVideoView1 != null || rotation != null)
                {
                    // 横屏模式下，需要转换旋转矩阵
                    if (getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE)
                    {
                        SensorManager.remapCoordinateSystem(rotation, SensorManager.AXIS_Y, SensorManager.AXIS_MINUS_X, rotation);
                    }
                    rotation[0] = -rotation[0];
                    rotation[1] = -rotation[1];
                    rotation[4] = -rotation[4];
                    rotation[5] = -rotation[5];
                    rotation[8] = -rotation[8];
                    rotation[9] = -rotation[9];
                    mVideoView1.onGyroRotation(rotation);
                }
            }
        });
        verifyStoragePermissions(this);
    }

    /**
     * 动态请求权限
     * @param activity
     */
    public static void verifyStoragePermissions(Activity activity) {

        try {
            //Android11存储 有需要了申请
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !Environment.isExternalStorageManager()) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                activity.startActivity(intent);
            }

            //检测是否有写的权限
            int permission = ActivityCompat.checkSelfPermission(activity,
                    "android.permission.WRITE_EXTERNAL_STORAGE");
            if (permission != PackageManager.PERMISSION_GRANTED) {
                // 没有写的权限，去申请写的权限
                ActivityCompat.requestPermissions(activity, PERMISSIONS_STORAGE,REQUEST_EXTERNAL_STORAGE);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private List<Integer> supportFishEyeChls = new ArrayList<>();
    /***是否支持鱼眼的通道请求*/
    private void reqSupportFishEye(final int userID1,final  int channelCount)
    {
        PushThreadPool.executeOnThread(new Runnable()
        {
            @Override
            public void run()
            {
                FishEye[] fishEyes = mNVRSDK.supportFishEye(userID1, channelCount);
                ToolCommon.LOGD(TAG,"null != fishEyes ? " + (null != fishEyes));
                if (null != fishEyes && fishEyes.length > 0)
                {
                    ToolCommon.LOGD(TAG,"fishEyes.length =  ? "+(fishEyes.length));
                    supportFishEyeChls.clear();
                    for (int i = 0; i < fishEyes.length; i++)
                    {
                        FishEye fishEye = fishEyes[i];
                        if(fishEye == null)
                        {
                            continue;
                        }
                        ToolCommon.LOGD(TAG,i + " supportFisheye : " + fishEye.supportFisheye+" fishEye.channel : "+fishEye.channel);
                        if (fishEye.supportFisheye)
                        {
                            supportFishEyeChls.add(fishEye.channel);
                        }
                    }
                    ToolCommon.LOGD(TAG,supportFishEyeChls.size()+" info : "+(supportFishEyeChls.toString()));
                }

            }
        });
    }

    //设置横竖屏:VR旋转方向
    public boolean setGyroScopeState(boolean start)
    {
        if (mFishGyroScope == null)
        {
            return false;
        }
        if (start)
        {
            if (getRequestedOrientation() == ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE)
            {
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
            }
            else if (getRequestedOrientation() == ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT)
            {
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
            }
            return mFishGyroScope.start();
        }
        else
        {
            mFishGyroScope.stop();
            if (getRequestedOrientation() == ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE)
            {
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
            }
            else if (getRequestedOrientation() == ActivityInfo.SCREEN_ORIENTATION_PORTRAIT)
            {
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT);
            }
        }
        return true;
    }
    public void setMyRequestedOrientation(int requestedOrientation)
    {
        if (mFishGyroScope != null && mFishGyroScope.isStart())
        {
            if (requestedOrientation == ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE)
            {
                requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE;
            }
            else if (requestedOrientation == ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT)
            {
                requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT;
            }
        }
       /* if (GlobalUnit.m_bOnlyLandscapeVersion)
        {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        }
        else
        {
            setRequestedOrientation(requestedOrientation);
        }*/
    }
    @Override
    protected void onDestroy()
    {
        super.onDestroy();
        CloseAllLiveChannel();
        mHandler.removeCallbacksAndMessages(null);
        mdecodeHandler.removeCallbacksAndMessages(null);
        if (null != mVideoView1)
        {
            mVideoView1.stopFishEye();
        }
        mNVRSDK.SetCallback(null);
        mNVRSDK = null;
    }

    public void SetupLiveUI()
    {
        if (m_LiveLayout == null)
        {
            int itextwidth = SCREENWIDTH / 3;
            int itextheight = 120;
            int ihdistance = 20;
            int ieditwidth = SCREENWIDTH - ihdistance * 2 - itextwidth;

            m_LiveLayout = new AbsoluteLayout(this);
            m_LiveLayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT, 0, 0));
            m_LiveLayout.setBackgroundColor(Color.WHITE);

            m_scrollview.addView(m_LiveLayout);

            final Button btnLogout = new Button(this);
            btnLogout.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ihdistance, ihdistance));
            btnLogout.setTextColor(Color.BLACK);
            btnLogout.setTextSize(15);
            btnLogout.setText("Return");
            m_LiveLayout.addView(btnLogout);
            btnLogout.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    if (m_iViewType == ViewType.LiveView)
                    {
                        CloseAllLiveChannel();
                        startActivity(new Intent(SDKLiveActivity.this, SDKMainActivity.class));
                        SDKLiveActivity.this.finish();
                    }
                    else if (m_iViewType == ViewType.PTZView)
                    {
                        if (m_PTZLayout != null)
                        {
                            m_PTZLayout.setVisibility(View.INVISIBLE);
                            m_iViewType = ViewType.LiveView;
                        }
                    }
                    else if (m_iViewType == ViewType.SetView)
                    {
                        if (m_SetLayout != null)
                        {
                            m_SetLayout.setVisibility(View.INVISIBLE);
                            m_iViewType = ViewType.LiveView;
                        }
                    }
                }
            });

            Button btnChangeMode = new Button(this);
            btnChangeMode.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, SCREENWIDTH / 2 + ihdistance, ihdistance));
            btnChangeMode.setTextColor(Color.BLACK);
            btnChangeMode.setTextSize(15);
            btnChangeMode.setText("Start Live");
            m_LiveLayout.addView(btnChangeMode);
            btnChangeMode.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    m_bStartLive = true;
                    //Request live video
                    PushThreadPool.getInstance().PoolExecuteRequestLive(1, channel, SDKLiveActivity.this);
                    PushThreadPool.getInstance().PoolExecuteRequestLive(1, m_ilivechannel2, SDKLiveActivity.this);
                    PushThreadPool.getInstance().PoolExecuteRequestLive(1, m_ilivechannel3, SDKLiveActivity.this);
                    PushThreadPool.getInstance().PoolExecuteRequestLive(1, m_ilivechannel4, SDKLiveActivity.this);
                    //获取码流信息
                    //Set the subcode flow resolution of the video channel at the request site.
                    //PushThreadPool.getInstance().PoolExecuteGetSubStreamEncodeInfos(SDKLiveActivity.this);
                }

            });

            tvfirstdevice = new TextView(this);
            tvfirstdevice.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - 1, itextheight, 0, ihdistance + itextheight));
            tvfirstdevice.setTextColor(Color.BLUE);
            tvfirstdevice.setTextSize(16);
            tvfirstdevice.setText("the first videoview");
            tvfirstdevice.setGravity(Gravity.LEFT | Gravity.BOTTOM);
            m_LiveLayout.addView(tvfirstdevice);

            mVideoView1 = VideoPlayer.getVideoView(this);
            if (mVideoView1 != null)
            {
                mVideoView1.setCallback(this);
                mVideoView1.setDropState(true);
                mVideoView1.setPrintLog(true);//看日志
                mVideoView1.setMediaCodecType(ToolCommon.isForceSoftCodec);//是否强制软解
                //				mVideoView1.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 3 - 2, SCREENWIDTH * 2 / 9, 0, ihdistance + itextheight * 2));
                mVideoView1.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - 1, SCREENWIDTH / 3, 0, ihdistance + itextheight * 2));
                mVideoView1.SetupLayout("Device Offline", StoragePath.m_iScreenWidth, StoragePath.m_iScreenHeight);
                m_LiveLayout.addView(mVideoView1);

                //播放鱼眼
                setupFishEyeUI(SCREENWIDTH / 2 - 1, SCREENWIDTH / 3, 0, ihdistance + itextheight * 2,1);

            }

            mVideoView2 = VideoPlayer.getVideoView(this);
            if (mVideoView2 != null)
            {
                mVideoView2.setCallback(this);
                mVideoView2.setDropState(true);
                //				mVideoView2.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 3 - 2, SCREENWIDTH * 2 / 9, SCREENWIDTH / 3 + 1, ihdistance + itextheight *
                // 2));
                mVideoView2.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - 1, SCREENWIDTH / 3, SCREENWIDTH / 2 + 1, ihdistance + itextheight * 2));
                mVideoView2.SetupLayout("Device Offline", StoragePath.m_iScreenWidth, StoragePath.m_iScreenHeight);
                m_LiveLayout.addView(mVideoView2);
            }

            int itopdistance = ihdistance + itextheight * 2 + SCREENWIDTH / 3 + 3;

            mVideoView3 = VideoPlayer.getVideoView(this);
            if (mVideoView3 != null)
            {
                mVideoView3.setCallback(this);
                mVideoView3.setDropState(true);
                //				mVideoView3.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 3 - 2, SCREENWIDTH * 2 / 9, SCREENWIDTH *2/ 3 + 2, ihdistance + itextheight *
                // 2));
                mVideoView3.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - 1, SCREENWIDTH / 3, 0, itopdistance));
                mVideoView3.SetupLayout("Device Offline", StoragePath.m_iScreenWidth, StoragePath.m_iScreenHeight);
                m_LiveLayout.addView(mVideoView3);
            }

            //			int itopdistance = ihdistance + itextheight * 2+SCREENWIDTH * 2 / 9+3;
            mVideoView4 = VideoPlayer.getVideoView(this);
            if (mVideoView4 != null)
            {
                mVideoView4.setCallback(this);
                mVideoView4.setDropState(true);
                //				mVideoView4.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 3 - 2, SCREENWIDTH * 2 / 9, 0, itopdistance));
                mVideoView4.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - 1, SCREENWIDTH / 3, SCREENWIDTH / 2 + 1, itopdistance));
                mVideoView4.SetupLayout("Device Offline", StoragePath.m_iScreenWidth, StoragePath.m_iScreenHeight);
                m_LiveLayout.addView(mVideoView4);
            }

            itopdistance += SCREENWIDTH / 3 + 1;

            //			itopdistance += SCREENWIDTH * 2 / 9 + 3;
            int ibtnwidth = (SCREENWIDTH - ihdistance * 8) / 2;


            AbsoluteLayout bottomlayout = new AbsoluteLayout(this);
            bottomlayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT * 2, 0, itopdistance));
            m_LiveLayout.addView(bottomlayout);

            ibtnwidth = (SCREENWIDTH - ihdistance * 4) / 3;
            m_etChannel = new EditText(this);
            m_etChannel.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth / 2, itextheight, ihdistance, ihdistance));
            m_etChannel.setTextSize(15);
            m_etChannel.setText("1");
            bottomlayout.addView(m_etChannel);

            Button btnChangeCH = new Button(this);
            btnChangeCH.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth * 3 / 2, itextheight, ihdistance * 2 + ibtnwidth / 2, ihdistance));
            btnChangeCH.setTextColor(Color.BLACK);
            btnChangeCH.setTextSize(14);
            btnChangeCH.setText("videoview1 Ch Change");
            bottomlayout.addView(btnChangeCH);
            btnChangeCH.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    try
                    {
                        int ichannel = Integer.valueOf(m_etChannel.getText().toString().trim());
                        if (ichannel >= 1 && ichannel <= m_iChannelCount1)// && ichannel != channel + 1)
                        {
                            channel = ichannel - 1;
                            CloseLiveChannel(1);
                            //                            CloseAllLiveChannel();
                            int userID = SDKApplication.getInstance().getUserId1();

                            m_SubStreamResolutionList.clear();
                            m_SubStreamResolutionList.add("Sub Stream");
                            m_SubStreamResolutionList.add("Main Stream");
                            m_SubStreamResolutionAdapter.notifyDataSetChanged();

                            ToolCommon.LOGD(TAG, "onClick: userID："+ userID+",channel:"+ channel);
                            playHandle1 = mNVRSDK.LivePlay(userID, channel, 1);//channel
                            if (playHandle1 == -1)
                            {
                                long errorcode = mNVRSDK.GetLastError();
                                Toast.makeText(SDKLiveActivity.this, "play fail,errorcode = " + errorcode, Toast.LENGTH_SHORT).show();

                            }
                            else
                            {
                                ToolCommon.LOGD(TAG,"liveplay success " + playHandle1 + ",channel = " + ichannel);
                                Toast.makeText(SDKLiveActivity.this, "play success " + playHandle1 + ",channel = " + ichannel, Toast.LENGTH_SHORT).show();
                                mVideoView1.setLiveHandle(playHandle1);
                                mVideoView1.start();
                                mVideoView1.setChannelID(channel);
                                mVideoView1.setPermissionDenied(false);
                            }
                        }
                        else
                        {
                            Toast.makeText(SDKLiveActivity.this, "Invalid channel number", Toast.LENGTH_SHORT).show();
                        }
                    }
                    catch (NumberFormatException e)
                    {
                        e.printStackTrace();
                    }

                }
            });

            TextView tvChRange = new TextView(this);
            tvChRange.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance * 3 + ibtnwidth * 2, ihdistance));
            tvChRange.setGravity(Gravity.CENTER);
            tvChRange.setTextColor(Color.BLACK);
            tvChRange.setTextSize(15);
            tvChRange.setText("Range1-" + m_iChannelCount1);
            bottomlayout.addView(tvChRange);


            int itopposition = ihdistance * 2 + itextheight;
            m_etChannel1 = new EditText(this);
            m_etChannel1.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth / 2, itextheight, ihdistance, ihdistance + itopposition));
            m_etChannel1.setTextSize(15);
            m_etChannel1.setText("2");
            bottomlayout.addView(m_etChannel1);

            btnChangeCH = new Button(this);
            btnChangeCH.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth * 3 / 2, itextheight, ihdistance * 2 + ibtnwidth / 2, ihdistance + itopposition));
            btnChangeCH.setTextColor(Color.BLACK);
            btnChangeCH.setTextSize(14);
            btnChangeCH.setText("videoview2 Ch Change");
            bottomlayout.addView(btnChangeCH);
            btnChangeCH.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    try
                    {
                        int ichannel = Integer.valueOf(m_etChannel1.getText().toString().trim());
                        if (ichannel >= 1 && ichannel <= m_iChannelCount1)// && ichannel != channel + 1)
                        {
                            CloseLiveChannel(2);
                            //                            CloseAllLiveChannel();
                            int userID = SDKApplication.getInstance().getUserId1();

                            playHandle2 = mNVRSDK.LivePlay(userID, ichannel - 1, 1);
                            if (playHandle2 == -1)
                            {
                                long errorcode = mNVRSDK.GetLastError();
                                Toast.makeText(SDKLiveActivity.this, "play fail,errorcode = " + errorcode, Toast.LENGTH_SHORT).show();

                            }
                            else
                            {
                                ToolCommon.LOGD(TAG,"liveplay success " + playHandle2 + ",channel = " + ichannel);
                                Toast.makeText(SDKLiveActivity.this, "play success " + playHandle2 + ",channel = " + ichannel, Toast.LENGTH_SHORT).show();
                                mVideoView2.setLiveHandle(playHandle2);
                                mVideoView2.start();
                                mVideoView2.setChannelID(ichannel - 1);
                                mVideoView2.setPermissionDenied(false);
                            }
                        }
                        else
                        {
                            Toast.makeText(SDKLiveActivity.this, "Invalid channel number", Toast.LENGTH_SHORT).show();
                        }
                    }
                    catch (NumberFormatException e)
                    {
                        e.printStackTrace();
                    }

                }
            });

            tvChRange = new TextView(this);
            tvChRange.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance * 3 + ibtnwidth * 2, ihdistance + itopposition));
            tvChRange.setGravity(Gravity.CENTER);
            tvChRange.setTextColor(Color.BLACK);
            tvChRange.setTextSize(15);
            tvChRange.setText("Range1-" + m_iChannelCount1);
            bottomlayout.addView(tvChRange);


            itopposition += ihdistance * 2 + itextheight;
            m_etChannel2 = new EditText(this);
            m_etChannel2.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth / 2, itextheight, ihdistance, ihdistance + itopposition));
            m_etChannel2.setTextSize(15);
            m_etChannel2.setText("3");
            bottomlayout.addView(m_etChannel2);

            btnChangeCH = new Button(this);
            btnChangeCH.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth * 3 / 2, itextheight, ihdistance * 2 + ibtnwidth / 2, ihdistance + itopposition));
            btnChangeCH.setTextColor(Color.BLACK);
            btnChangeCH.setTextSize(14);
            btnChangeCH.setText("videoview3 Ch Change");
            bottomlayout.addView(btnChangeCH);
            btnChangeCH.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    try
                    {
                        int ichannel = Integer.valueOf(m_etChannel2.getText().toString().trim());
                        if (ichannel >= 1 && ichannel <= m_iChannelCount1)// && ichannel != channel + 1)
                        {
                            //                            channel = ichannel - 1;
                            CloseLiveChannel(3);
                            int userID = SDKApplication.getInstance().getUserId1();

                            playHandle3 = mNVRSDK.LivePlay(userID, ichannel - 1, 1);
                            if (playHandle3 == -1)
                            {
                                long errorcode = mNVRSDK.GetLastError();
                                Toast.makeText(SDKLiveActivity.this, "play fail,errorcode = " + errorcode, Toast.LENGTH_SHORT).show();

                            }
                            else
                            {
                                ToolCommon.LOGD(TAG,"liveplay success " + playHandle3 + ",channel = " + ichannel);
                                Toast.makeText(SDKLiveActivity.this, "play success " + playHandle3 + ",channel = " + ichannel, Toast.LENGTH_SHORT).show();
                                mVideoView3.setLiveHandle(playHandle3);
                                mVideoView3.start();
                                mVideoView3.setChannelID(ichannel - 1);
                                mVideoView3.setPermissionDenied(false);
                            }
                        }
                        else
                        {
                            Toast.makeText(SDKLiveActivity.this, "Invalid channel number", Toast.LENGTH_SHORT).show();
                        }
                    }
                    catch (NumberFormatException e)
                    {
                        e.printStackTrace();
                    }

                }
            });

            tvChRange = new TextView(this);
            tvChRange.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance * 3 + ibtnwidth * 2, ihdistance + itopposition));
            tvChRange.setGravity(Gravity.CENTER);
            tvChRange.setTextColor(Color.BLACK);
            tvChRange.setTextSize(15);
            tvChRange.setText("Range1-" + m_iChannelCount1);
            bottomlayout.addView(tvChRange);


            itopposition += ihdistance * 2 + itextheight;
            m_etChannel3 = new EditText(this);
            m_etChannel3.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth / 2, itextheight, ihdistance, ihdistance + itopposition));
            m_etChannel3.setTextSize(15);
            m_etChannel3.setText("4");
            bottomlayout.addView(m_etChannel3);

            btnChangeCH = new Button(this);
            btnChangeCH.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth * 3 / 2, itextheight, ihdistance * 2 + ibtnwidth / 2, ihdistance + itopposition));
            btnChangeCH.setTextColor(Color.BLACK);
            btnChangeCH.setTextSize(14);
            btnChangeCH.setText("videoview4 Ch Change");
            bottomlayout.addView(btnChangeCH);
            btnChangeCH.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    try
                    {
                        int ichannel = Integer.valueOf(m_etChannel3.getText().toString().trim());
                        if (ichannel >= 1 && ichannel <= m_iChannelCount1)// && ichannel != channel + 1)
                        {
                            //                            channel = ichannel - 1;
                            CloseLiveChannel(4);
                            int userID = SDKApplication.getInstance().getUserId1();

                            playHandle4 = mNVRSDK.LivePlay(userID, ichannel - 1, 1);
                            if (playHandle4 == -1)
                            {
                                long errorcode = mNVRSDK.GetLastError();
                                Toast.makeText(SDKLiveActivity.this, "play fail,errorcode = " + errorcode, Toast.LENGTH_SHORT).show();

                            }
                            else
                            {
                                ToolCommon.LOGD(TAG,"liveplay success " + playHandle4 + ",channel = " + ichannel);
                                Toast.makeText(SDKLiveActivity.this, "play success " + playHandle4 + ",channel = " + ichannel, Toast.LENGTH_SHORT).show();
                                mVideoView4.setLiveHandle(playHandle4);
                                mVideoView4.start();
                                mVideoView4.setChannelID(ichannel - 1);
                                mVideoView4.setPermissionDenied(false);
                            }
                        }
                        else
                        {
                            Toast.makeText(SDKLiveActivity.this, "Invalid channel number", Toast.LENGTH_SHORT).show();
                        }
                    }
                    catch (NumberFormatException e)
                    {
                        e.printStackTrace();
                    }

                }
            });

            tvChRange = new TextView(this);
            tvChRange.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance * 3 + ibtnwidth * 2, ihdistance + itopposition));
            tvChRange.setGravity(Gravity.CENTER);
            tvChRange.setTextColor(Color.BLACK);
            tvChRange.setTextSize(15);
            tvChRange.setText("Range1-" + m_iChannelCount1);
            bottomlayout.addView(tvChRange);

            itopposition += ihdistance * 2 + itextheight;

            TextView tvdevice = new TextView(this);
            tvdevice.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, itextheight, 0, itopposition));
            tvdevice.setTextColor(Color.BLUE);
            tvdevice.setTextSize(16);
            tvdevice.setText("The following settings take effect on the first videoview !!!");
            tvdevice.setGravity(Gravity.CENTER);
            bottomlayout.addView(tvdevice);

            itopposition += itextheight;
            m_rbMainCodeStream = new RadioButton(this);
            m_rbMainCodeStream.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2, itextheight, 0, itopposition));
            m_rbMainCodeStream.setText("Main Stream");
            m_rbMainCodeStream.setTextColor(Color.BLACK);
            m_rbMainCodeStream.setChecked(false);
            //			bottomlayout.addView(m_rbMainCodeStream);

            m_rbMainCodeStream.setOnCheckedChangeListener(new OnCheckedChangeListener()
            {
                @Override
                public void onCheckedChanged(CompoundButton buttonView, boolean isChecked)
                {
                    m_rbSubCodeStream.setChecked(!isChecked);
                    CloseLiveChannel(1);
                    int userID = SDKApplication.getInstance().getUserId1();
                    playHandle1 = mNVRSDK.LivePlay(userID, channel, 0);
                    if (playHandle1 == -1)
                    {
                        long errorcode = mNVRSDK.GetLastError();
                        Toast.makeText(SDKLiveActivity.this, "play fail,errorcode = " + errorcode, Toast.LENGTH_SHORT).show();
                    }
                    else
                    {
                        Toast.makeText(SDKLiveActivity.this, "play success " + playHandle1, Toast.LENGTH_SHORT).show();
                        mVideoView1.setLiveHandle(playHandle1);
                        mVideoView1.start();
                        mVideoView1.setChannelID(channel);
                        mVideoView1.setPermissionDenied(false);
                    }
                }
            });

            m_rbSubCodeStream = new RadioButton(this);
            m_rbSubCodeStream.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2, itextheight, SCREENWIDTH / 2, itopposition));
            m_rbSubCodeStream.setText("Sub Stream");
            m_rbSubCodeStream.setTextColor(Color.BLACK);
            m_rbSubCodeStream.setChecked(true);
            //			bottomlayout.addView(m_rbSubCodeStream);
            m_rbSubCodeStream.setOnCheckedChangeListener(new OnCheckedChangeListener()
            {
                @Override
                public void onCheckedChanged(CompoundButton buttonView, boolean isChecked)
                {
                    m_rbMainCodeStream.setChecked(!isChecked);

                    CloseLiveChannel(1);
                    int userID = SDKApplication.getInstance().getUserId1();
                    playHandle1 = mNVRSDK.LivePlay(userID, channel, 1);
                    if (playHandle1 == -1)
                    {
                        long errorcode = mNVRSDK.GetLastError();
                        Toast.makeText(SDKLiveActivity.this, "play fail,errorcode = " + errorcode, Toast.LENGTH_SHORT).show();
                    }
                    else
                    {
                        Toast.makeText(SDKLiveActivity.this, "play success " + playHandle1, Toast.LENGTH_SHORT).show();
                        mVideoView1.setLiveHandle(playHandle1);
                        mVideoView1.start();
                        mVideoView1.setChannelID(channel);
                        mVideoView1.setPermissionDenied(false);
                    }

                }
            });

            ibtnwidth = (SCREENWIDTH - ihdistance * 4) / 3;
            //			itopposition = ihdistance * 3 + itextheight * 2;

            TextView btnSetResolution = new TextView(this);
            btnSetResolution.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance, itopposition));
            btnSetResolution.setTextColor(Color.BLACK);
            btnSetResolution.setTextSize(15);
            btnSetResolution.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
            btnSetResolution.setText("Modify Resolution:");
            bottomlayout.addView(btnSetResolution);

            m_spSubStreamResolution = new Spinner(this);
            m_spSubStreamResolution.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, SCREENWIDTH / 2, itopposition));
            bottomlayout.addView(m_spSubStreamResolution);
            m_spSubStreamResolution.setOnItemSelectedListener(new OnItemSelectedListener()
            {
                @Override
                public void onItemSelected(AdapterView<?> parent, View view, int position, long id)
                {
                    /*if (!m_bStartLive)
                    {
                        return;
                    }*/
                    String strResolution = m_SubStreamResolutionList.get(position);
                    ToolCommon.LOGD(TAG,"----------onItemSelected position = " + position + ",strResolution = " + strResolution + ",id = " + id);

                    if (strResolution.trim().equals("Main Stream"))
                    {
                        if (m_PreStreamtype == 1)
                        {
                            CloseLiveChannel(1);
                        }
                        RequestLive(0, channel, true);
                    }
                    else if (strResolution.trim().equals("Sub Stream"))// here will be called immediately when you just enter the live UI.
                    {
                        // if you want to change the channels of 9 videos windows ,please change the value of m_ilivechannel1 to m_ilivechannel9.
                        if (m_PreStreamtype == 0)
                        {
                            CloseLiveChannel(1);
                        }
                        RequestLive(1, channel, true);
                    }
                    else
                    {
                        int key = getKey(m_ResolutionMap, strResolution);
                        ToolCommon.LOGD(TAG,"----- resolution key = " + key);
                        int index = -1;
                        if (m_EncodeInfoList.size() > 0)
                        {
                            for (int i = 0; i < m_EncodeInfoList.size(); i++)
                            {
                                DD_ENCODE_CONFIG_N9000_Ex encodeitem = m_EncodeInfoList.get(i);
                                if (encodeitem.resolution == key)
                                {
                                    index = i;
                                    break;
                                }
                            }
                        }

                        try
                        {
                            if (m_PreStreamtype == 0)// main stream
                            {
                                CloseLiveChannel(1);
                                RequestLive(1, channel, true);
                                if (key != -1)
                                {
                                    DD_ENCODE_CONFIG_N9000_Ex encodeitem = m_EncodeInfoList.get(index);
                                    //									encodeitem.minBitrate = 512;
                                    //									encodeitem.maxBitrate = encodeitem.rate;

                                    boolean res = mNVRSDK.SetDVRConfigSubStreamEncodeInfo(mUserID1, channel, encodeitem.serialize());
                                    ToolCommon.LOGD(TAG,"--------SetDVRConfigSubStreamEncodeInfo res = " + res);
                                }
                            }
                            else if (m_PreStreamtype == 1)// sub stream
                            {
                                if (key != -1)
                                {
                                    DD_ENCODE_CONFIG_N9000_Ex encodeitem = m_EncodeInfoList.get(index);
                                    //									encodeitem.minBitrate = 512;
                                    //									encodeitem.maxBitrate = 512;

                                    boolean res = mNVRSDK.SetDVRConfigSubStreamEncodeInfo(mUserID1, channel, encodeitem.serialize());
                                    ToolCommon.LOGD(TAG,"---2-----SetDVRConfigSubStreamEncodeInfo res = " + res + ",channel = " + channel);
                                }
                            }
                        }
                        catch (IOException e)
                        {
                            // TODO Auto-generated catch block
                            e.printStackTrace();
                        }
                    }
                }

                @Override
                public void onNothingSelected(AdapterView<?> parent)
                {

                }
            });
            m_SubStreamResolutionList = new ArrayList<String>();
            m_SubStreamResolutionList.add("Sub Stream");
            m_SubStreamResolutionList.add("Main Stream");

            m_SubStreamResolutionAdapter = new ArrayAdapter<String>(this, android.R.layout.simple_spinner_item, m_SubStreamResolutionList);
            m_SubStreamResolutionAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            m_spSubStreamResolution.setAdapter(m_SubStreamResolutionAdapter);


            ibtnwidth = (SCREENWIDTH - ihdistance * 4) / 3;
            itopposition += ihdistance * 1 + itextheight * 1;
            Button btnCapture = new Button(this);
            btnCapture.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance, itopposition));
            btnCapture.setTextColor(Color.BLACK);
            btnCapture.setTextSize(15);
            btnCapture.setText("onCapture bmp");
            bottomlayout.addView(btnCapture);
            btnCapture.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    if (mVideoView1 != null)
                    {
                        if (!mVideoView1.getDecodeState())
                        {
                            Toast.makeText(SDKLiveActivity.this, "no video data", Toast.LENGTH_SHORT).show();
                            return;
                        }
                        String  path = ToolCommon.getFileName(mContext, "capture", "bmp");
                        ToolCommon.LOGD(TAG, "onClick:   path is:"+ path);
                        mVideoView1.onCapture(path);
                    }
                }
            });

            m_btnOpenAudio = new Button(this);
            m_btnOpenAudio.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance * 2 + ibtnwidth, itopposition));
            m_btnOpenAudio.setTextColor(Color.BLACK);
            m_btnOpenAudio.setTextSize(15);
            m_btnOpenAudio.setText("Open Audio");
            bottomlayout.addView(m_btnOpenAudio);
            m_btnOpenAudio.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    if (channel < 0)
                    {
                        return;
                    }
                    if (mVideoView1 != null)
                    {
                        if (!mVideoView1.getDecodeState())
                        {
                            Toast.makeText(SDKLiveActivity.this, "no video data", Toast.LENGTH_SHORT).show();
                            return;
                        }
                        // audio
                        if (!mVideoView1.getAudioState())
                        {
                            mVideoView1.startAudio();
                            m_btnOpenAudio.setTextColor(Color.GREEN);
                        }

                    }
                }
            });

            m_btnStartRecord = new Button(this);
            m_btnStartRecord.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance * 3 + ibtnwidth * 2, itopposition));
            m_btnStartRecord.setTextColor(Color.BLACK);
            m_btnStartRecord.setTextSize(15);
            m_btnStartRecord.setText("Start Record");
            bottomlayout.addView(m_btnStartRecord);
            m_btnStartRecord.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    if (!mVideoView1.getDecodeState())
                    {
                        Toast.makeText(SDKLiveActivity.this, "no video data", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    //					if (!mVideoView1.getRecordState())
                    if (!m_bRecord)
                    {
                        //will be used in WriteRecodeFile() and onVideoData() method.record start in onVideoData() method.
                        //you can play this record file in Play Local File module in Main UI.That is SDKLocalRecordActivity.
                        m_irecordChannel = mVideoView1.GetChannelID();
                        m_btnStartRecord.setTextColor(Color.GREEN);
                        m_bRecord = true;
                    }
                }
            });

            itopposition += ihdistance * 1 + itextheight * 1;
            Button btnPTZ = new Button(this);
            btnPTZ.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance, itopposition));
            btnPTZ.setTextColor(Color.BLACK);
            btnPTZ.setTextSize(15);
            btnPTZ.setText("PTZ");
            bottomlayout.addView(btnPTZ);
            btnPTZ.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    SetupPTZUI();
                }
            });

            Button btnCloseAudio = new Button(this);
            btnCloseAudio.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance * 2 + ibtnwidth, itopposition));
            btnCloseAudio.setTextColor(Color.BLACK);
            btnCloseAudio.setTextSize(15);
            btnCloseAudio.setText("Close Audio");
            bottomlayout.addView(btnCloseAudio);
            btnCloseAudio.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    if (channel < 0)
                    {
                        return;
                    }
                    if (mVideoView1 != null)
                    {
                        if (!mVideoView1.getDecodeState())
                        {
                            Toast.makeText(SDKLiveActivity.this, "no video data", Toast.LENGTH_SHORT).show();
                            return;
                        }
                        // audio
                        if (mVideoView1.getAudioState())
                        {
                            mVideoView1.stopAudio();
                            m_btnOpenAudio.setTextColor(Color.BLACK);
                        }

                    }
                }
            });

            Button btnStopRecord = new Button(this);
            btnStopRecord.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance * 3 + ibtnwidth * 2, itopposition));
            btnStopRecord.setTextColor(Color.BLACK);
            btnStopRecord.setTextSize(15);
            btnStopRecord.setText("Stop Record");
            bottomlayout.addView(btnStopRecord);
            btnStopRecord.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    if (!mVideoView1.getDecodeState())
                    {
                        Toast.makeText(SDKLiveActivity.this, "no video data", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    mVideoView1.stopRecord();
                    m_bRecord = false;
                    m_btnStartRecord.setTextColor(Color.BLACK);
                }
            });

            itopposition += ihdistance * 1 + itextheight * 1;
            Button btnSet = new Button(this);
            btnSet.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH - ihdistance * 2, itextheight, ihdistance, itopposition));
            btnSet.setTextColor(Color.BLACK);
            btnSet.setTextSize(15);
            btnSet.setText("Get and set video parameters");
            bottomlayout.addView(btnSet);
            btnSet.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    SetupSetUI();
                }
            });

            itopposition += ihdistance * 1 + itextheight * 1;
            TextView tvblank = new TextView(this);
            tvblank.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH - ihdistance * 2, itextheight, ihdistance, itopposition));
            bottomlayout.addView(tvblank);

            Button CaptureJpg = new Button(this);
            CaptureJpg.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance , itopposition));
            CaptureJpg.setTextColor(Color.BLACK);
            CaptureJpg.setTextSize(15);
            CaptureJpg.setText("capture jpg");
            bottomlayout.addView(CaptureJpg);
            CaptureJpg.setOnClickListener(new OnClickListener() {
                @Override
                public void onClick(View v) {
                    String  path = ToolCommon.getFileName(mContext, "capture", "jpg");
                    ToolCommon.LOGD(TAG, "onClick: jpg path :"+ path);
                    mVideoView1.onCapturejepg(path);
                }
            });

            Button CaptureJpgbg = new Button(this);
            CaptureJpgbg.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth*2 +  ihdistance, itextheight, ihdistance * 2 + ibtnwidth , itopposition));
            CaptureJpgbg.setTextColor(Color.BLACK);
            CaptureJpgbg.setTextSize(15);
            CaptureJpgbg.setText("capture jepg background");
            CaptureJpgbg.setEllipsize(TextUtils.TruncateAt.MARQUEE);
            bottomlayout.addView(CaptureJpgbg);
            CaptureJpgbg.setOnClickListener(new OnClickListener() {
                @Override
                public void onClick(View v) {
                    String  path = ToolCommon.getFileName(mContext, "capture", "jpg");
                    ToolCommon.LOGD(TAG, "onClick: jpg path :"+ path+ ",channel:"+channel);
                    byte [] image=  mNVRSDK.CaptureJEPGbg(mUserID1,channel);
                    boolean ret = ToolCommon.bytesToImageFile(image,path);
                    if (ret){
                        Toast.makeText(SDKLiveActivity.this, "capture success", Toast.LENGTH_SHORT).show();
                    }else Toast.makeText(SDKLiveActivity.this, "capture fail", Toast.LENGTH_SHORT).show();

                }
            });
            itopposition += ihdistance * 1 + itextheight * 1;
            final Button CloseChannel = new Button(this);
            CloseChannel.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth , itextheight, ihdistance  , itopposition));
            CloseChannel.setTextColor(Color.BLACK);
            CloseChannel.setTextSize(15);
            CloseChannel.setText("close live");
            bottomlayout.addView(CloseChannel);
            CloseChannel.setOnClickListener(new OnClickListener() {
                @Override
                public void onClick(View v) {
                    CloseAllLiveChannel();
                }
            });

            itopposition += ihdistance * 1 + itextheight * 1;
            final Button openDoorBtn = new Button(this);
            final EditText openDoorChannel= new EditText(this);
            openDoorChannel.setHint("access control channel");
            openDoorChannel.setInputType(InputType.TYPE_CLASS_NUMBER);
            openDoorChannel.setTextSize(15);
            openDoorChannel.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth*2 , itextheight, ihdistance  , itopposition));
            bottomlayout.addView(openDoorChannel);
            openDoorBtn.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth , itextheight + 5, ihdistance * 2 + ibtnwidth*2  , itopposition));
            openDoorBtn.setTextColor(Color.BLACK);
            openDoorBtn.setTextSize(15);
            openDoorBtn.setText("open door");
            bottomlayout.addView(openDoorBtn);
            openDoorBtn.setOnClickListener(new OnClickListener() {
                @Override
                public void onClick(View v) {
                    try {
                        long channel = Long.parseLong(openDoorChannel.getText().toString());
                        openDoor(channel - 1);
                    }catch (NumberFormatException e){
                        ToolCommon.toastShow( SDKLiveActivity.this, "please input channel number");
                    }
                }
            });

        } else {
            //			HideSubViews();
            m_LiveLayout.setVisibility(View.VISIBLE);
        }
    }

    private void setupFishEyeUI(int parentViewW, int parentViewH, int parentViewX, int parentViewY,final int videoIndex)
    {
        ImageView ivFish = new ImageView(this);
        ivFish.setLayoutParams(new AbsoluteLayout.LayoutParams(100, 100, parentViewW - 100, parentViewY));
        ivFish.setImageResource(R.drawable.fish_eye_selector);
        m_LiveLayout.addView(ivFish);
        ivFish.setOnClickListener(new OnClickListener()
        {
            @Override
            public void onClick(View v)
            {
                if (-1 == mVideoView1.GetChannelID())
                {
                    ToolCommon.toastShow(SDKLiveActivity.this, "Please playing Video before FishEye model");
                    return;
                }
                if (!supportFishEyeChls.contains(Integer.valueOf(mVideoView1.GetChannelID())))
                {
                    ToolCommon.toastShow(SDKLiveActivity.this, "The Chl is not support FishEye function");
                    return;
                }
                FishTypeSelectDialog fishTypeSelectDialog = FishTypeSelectDialog.createAndShow(SDKLiveActivity.this);
                fishTypeSelectDialog.setOnSelectTypeCallB(new FishTypeSelectDialog.OnSelectTypeCallB()
                {
                    @Override
                    public void onSelectType(int type, String selectText)
                    {
                        switch (videoIndex)
                        {
                            case 1:
                                if (type == State.RenderModel.RENDER_MODEL_FISH_EYE_VR)
                                {
                                    setGyroScopeState(true);
                                }
                                else
                                {
                                    setGyroScopeState(false);
                                }
                                mVideoView1.setRenderModel(type);
                                mVideoView1.playFishEye();
                                break;
                        }

                    }
                });
            }
        });

    }

    /**
     * 通知媒体库更新文件
     * @param context
     * @param filePath 文件全路径
     *
     * */
    public void scanFile(Context context, String filePath) {
        Intent scanIntent = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
        scanIntent.setData(Uri.fromFile(new File(filePath)));
        context.sendBroadcast(scanIntent);
    }

    @Override
    public void onCaptureRet(boolean bSucc, String path)
    {
        if (bSucc)
        {
            Message obtain = Message.obtain();
            obtain.what = MSG_CAPTURE_SUCC;
            obtain.obj = path;
            mHandler.sendMessage(obtain);
        }
        else
        {
            Message obtain = Message.obtain();
            obtain.what = MSG_CAPTURE_FAIL;
            obtain.obj = path;
            mHandler.sendMessage(obtain);
        }
    }

    @Override
    public void onDecodeFrameTime(boolean bKeyFrame, long frameTime, int frameIndex)
    {

    }

    long time1 =  System.currentTimeMillis();
    long time2 = 0;
    long dwLowDateTime1 = 0;
    long dwLowDateTime2 = 0;

    boolean btest = true;
    int m_iframecount = 0;
    boolean bWaitKeyFrame = true;

    boolean m_bSetSubStreamEncodeInfo1 = true;
    boolean m_bSetSubStreamEncodeInfo2 = true;
    boolean m_bSetSubStreamEncodeInfo3 = true;
    boolean m_bSetSubStreamEncodeInfo4 = true;
    long time0 = 0;
    int frameCount;
    @Override
    public void onVideoData(long livehandle, int iNodeID, byte[] data, int frameLen, long timeStamp, boolean isKeyFrame, int width, int height, int frameIndex, int encodeType,
                            int frameType)
    {

        if (0 == time0)
        {
            time0 = System.currentTimeMillis();
        }
        long timeCountter = System.currentTimeMillis() - time0;
        if (timeCountter < 1000)
        {
            frameCount++;
        }
        else
        {
            ToolCommon.LOGD(TAG,"------------onVideoData frameCount = " + frameCount);
            frameCount = 0;
            time0 = System.currentTimeMillis();
        }
        long time2 = System.currentTimeMillis();
        long dtime = time2 - time1;
        time1 = time2;
        ToolCommon.LOGD(TAG,"------------onVideoData space dtime = " + dtime + " frameCount = " + frameCount);


        CFrameData mVideoFrameData = new CFrameData();
//        mVideoFrameData.bFrameData = new byte[frameLen];
//        System.arraycopy(data, 0, mVideoFrameData.bFrameData, 0, frameLen);
        mVideoFrameData.bFrameData = data;
        mVideoFrameData.dwLowDateTime = timeStamp / 1000;//timeStamp是微秒
        mVideoFrameData.iFrameLen = frameLen;
        mVideoFrameData.isKeyFrame = isKeyFrame;
        mVideoFrameData.iNodeID = iNodeID;
        mVideoFrameData.iFrameWidth = width;
        mVideoFrameData.iFrameHeight = height;
        mVideoFrameData.iFrameIndex = frameIndex;
        mVideoFrameData.iEncodeType = encodeType;
       // mVideoFrameData.arriveDTime = dtime;

        if (mVideoView1 != null && mVideoView1.getLiveHandle() == livehandle)
        {
            if (mVideoView1.GetChannelID() == m_irecordChannel)//when channel match,will start record video data to file.
            {
                if (bWaitKeyFrame && !mVideoFrameData.isKeyFrame)//the first frame must be key frame ,here is waiting for key frame
                {
                }
                else
                {
                    bWaitKeyFrame = false;
                    WriteRecodeFile(mVideoFrameData);
                }
            }
            mVideoView1.playVideoData(mVideoFrameData);
            if (m_bSetSubStreamEncodeInfo1)
            {
                m_bSetSubStreamEncodeInfo1 = SetSubStreamEncodeInfo(channel);
            }
        }
        else if (mVideoView2 != null && mVideoView2.getLiveHandle() == livehandle)
        {
            mVideoView2.playVideoData(mVideoFrameData);
            if (mVideoView2.GetChannelID() == m_irecordChannel)
            {
                WriteRecodeFile(mVideoFrameData);
            }
            if (m_bSetSubStreamEncodeInfo2)
            {

                m_bSetSubStreamEncodeInfo2 = SetSubStreamEncodeInfo(m_ilivechannel2);
            }
        }
        else if (mVideoView3 != null && mVideoView3.getLiveHandle() == livehandle)
        {
            mVideoView3.playVideoData(mVideoFrameData);
            if (mVideoView3.GetChannelID() == m_irecordChannel)
            {
                WriteRecodeFile(mVideoFrameData);
            }
            if (m_bSetSubStreamEncodeInfo3)
            {

                m_bSetSubStreamEncodeInfo3 = SetSubStreamEncodeInfo(m_ilivechannel3);
            }
        }
        else if (mVideoView4 != null && mVideoView4.getLiveHandle() == livehandle)
        {
            mVideoView4.playVideoData(mVideoFrameData);
            if (mVideoView4.GetChannelID() == m_irecordChannel)
            {
                WriteRecodeFile(mVideoFrameData);
            }
            if (m_bSetSubStreamEncodeInfo4)
            {

                m_bSetSubStreamEncodeInfo4 = SetSubStreamEncodeInfo(m_ilivechannel4);
            }
        }
    }
    Handler mdecodeHandler = new Handler(){
        @Override
        public void dispatchMessage(Message msg)
        {
            if (null != tvfirstdevice)
            {
                tvfirstdevice.setText("decode Time : " + mVideoView1.getDecodeTime());
            }
            mdecodeHandler.sendEmptyMessageDelayed(1, 200);
        }
    };
    public void CloseAllLiveChannel()
    {
        ToolCommon.LOGD(TAG,"------------CloseAllLiveChannel----------");
        if (mVideoView1 != null)
        {
            mVideoView1.stopAudio();
            mVideoView1.stopRecord();
            mVideoView1.setPermissionDenied(true);
            m_btnOpenAudio.setTextColor(Color.BLACK);
            m_btnStartRecord.setTextColor(Color.BLACK);
        }
        if (mNVRSDK != null && playHandle1 != -1)
        {
            boolean res = mNVRSDK.StopLivePlay(playHandle1);
            ToolCommon.LOGD(TAG,"---1---StopLivePlay res= " + res + ",playHandle1 = " + playHandle1);
        }
        if (mVideoView1 != null)
        {
            mVideoView1.stop();
            mVideoView1.RestoreVideoSize();
        }

        if (mVideoView2 != null)
        {
            mVideoView2.stopAudio();
            mVideoView2.stopRecord();
            mVideoView2.setPermissionDenied(true);
            m_btnOpenAudio.setTextColor(Color.BLACK);
            m_btnStartRecord.setTextColor(Color.BLACK);
        }
        if (mNVRSDK != null && playHandle2 != -1)
        {
            boolean res = mNVRSDK.StopLivePlay(playHandle2);
            ToolCommon.LOGD(TAG,"---2---StopLivePlay res= " + res + ",playHandle2 = " + playHandle2);
        }
        if (mVideoView2 != null)
        {
            mVideoView2.stop();
            mVideoView2.RestoreVideoSize();
        }
        //
        if (mVideoView3 != null)
        {
            mVideoView3.stopAudio();
            mVideoView3.stopRecord();
            mVideoView3.setPermissionDenied(true);
            m_btnOpenAudio.setTextColor(Color.BLACK);
            m_btnStartRecord.setTextColor(Color.BLACK);
        }
        if (mNVRSDK != null && playHandle3 != -1)
        {
            boolean res = mNVRSDK.StopLivePlay(playHandle3);
            ToolCommon.LOGD(TAG,"---3---StopLivePlay res= " + res + ",playHandle3 = " + playHandle3);
        }
        if (mVideoView3 != null)
        {
            mVideoView3.stop();
            mVideoView3.RestoreVideoSize();
        }
        //
        if (mVideoView4 != null)
        {
            mVideoView4.stopAudio();
            mVideoView4.stopRecord();
            mVideoView4.setPermissionDenied(true);
            m_btnOpenAudio.setTextColor(Color.BLACK);
            m_btnStartRecord.setTextColor(Color.BLACK);
        }
        if (mNVRSDK != null && playHandle4 != -1)
        {
            boolean res = mNVRSDK.StopLivePlay(playHandle4);
            ToolCommon.LOGD(TAG,"---4---StopLivePlay res= " + res + ",playHandle4 = " + playHandle4);
        }
        if (mVideoView4 != null)
        {
            mVideoView4.stop();
            mVideoView4.RestoreVideoSize();
        }
        //
    }

    public void CloseLiveChannel(int bvideoviewindex)
    {
        ToolCommon.LOGD(TAG,"------------CloseLiveChannel----------bvideoviewindex = " + bvideoviewindex);
        if (bvideoviewindex == 1)
        {
            if (mVideoView1 != null)
            {
                mVideoView1.stopAudio();
                mVideoView1.stopRecord();
                mVideoView1.setPermissionDenied(true);
                m_btnOpenAudio.setTextColor(Color.BLACK);
                m_btnStartRecord.setTextColor(Color.BLACK);
            }
            if (mNVRSDK != null && playHandle1 != -1)
            {
                boolean res = mNVRSDK.StopLivePlay(playHandle1);
                ToolCommon.LOGD(TAG,"---1---StopLivePlay res= " + res + ",playHandle1 = " + playHandle1);
            }
            if (mVideoView1 != null)
            {
                mVideoView1.stop();
                mVideoView1.RestoreVideoSize();
            }
        }
        else if (bvideoviewindex == 2)
        {
            if (mVideoView2 != null)
            {
                mVideoView2.stopAudio();
                mVideoView2.stopRecord();
                mVideoView2.setPermissionDenied(true);
                m_btnOpenAudio.setTextColor(Color.BLACK);
                m_btnStartRecord.setTextColor(Color.BLACK);
            }
            if (mNVRSDK != null && playHandle2 != -1)
            {
                boolean res = mNVRSDK.StopLivePlay(playHandle2);
                ToolCommon.LOGD(TAG,"---2---StopLivePlay res= " + res + ",playHandle2 = " + playHandle2);
            }
            if (mVideoView2 != null)
            {
                mVideoView2.stop();
                mVideoView2.RestoreVideoSize();
            }
        }
        else if (bvideoviewindex == 3)
        {
            if (mVideoView3 != null)
            {
                mVideoView3.stopAudio();
                mVideoView3.stopRecord();
                mVideoView3.setPermissionDenied(true);
                m_btnOpenAudio.setTextColor(Color.BLACK);
                m_btnStartRecord.setTextColor(Color.BLACK);
            }
            if (mNVRSDK != null && playHandle3 != -1)
            {
                boolean res = mNVRSDK.StopLivePlay(playHandle3);
                ToolCommon.LOGD(TAG,"---3---StopLivePlay res= " + res + ",playHandle3 = " + playHandle3);
            }
            if (mVideoView3 != null)
            {
                mVideoView3.stop();
                mVideoView3.RestoreVideoSize();
            }
        }
        else if (bvideoviewindex == 4)
        {
            if (mVideoView4 != null)
            {
                mVideoView4.stopAudio();
                mVideoView4.stopRecord();
                mVideoView4.setPermissionDenied(true);
                m_btnOpenAudio.setTextColor(Color.BLACK);
                m_btnStartRecord.setTextColor(Color.BLACK);
            }
            if (mNVRSDK != null && playHandle4 != -1)
            {
                boolean res = mNVRSDK.StopLivePlay(playHandle4);
                ToolCommon.LOGD(TAG,"---4---StopLivePlay res= " + res + ",playHandle4 = " + playHandle4);
            }
            if (mVideoView4 != null)
            {
                mVideoView4.stop();
                mVideoView4.RestoreVideoSize();
            }
        }
    }

    public void openDoor(long channel){
        if (mNVRSDK != null){
            boolean ret =  mNVRSDK.UnlockAccessControl(mUserID1,channel);
            if(!ret){
                ToolCommon.toastShow(SDKLiveActivity.this, "open door failed");
            }else{
                ToolCommon.toastShow(SDKLiveActivity.this, "open door success");
            }
        }
    }
    @Override
    public void onAudioData(long livehandle, int iNodeID, byte[] data, int frameLen, long timeStamp, int iSampleRateInHz, int b8BitWidth, int bMono, int encodeType)
    {
        CFrameData mAudioFrameData = new CFrameData();
        mAudioFrameData.iNodeID = iNodeID;
//        mAudioFrameData.bFrameData = new byte[frameLen];
//        System.arraycopy(data, 0, mAudioFrameData.bFrameData, 0, frameLen);
        mAudioFrameData.bFrameData = data;
        mAudioFrameData.iFrameLen = frameLen;
        mAudioFrameData.dwLowDateTime = timeStamp;
        mAudioFrameData.b8BitWidth = b8BitWidth;
        mAudioFrameData.bMono = bMono;
        mAudioFrameData.iSampleRateInHz = iSampleRateInHz;
        mAudioFrameData.iEncodeType = encodeType;
//        		ToolCommon.LOGD(TAG,"------audio encodeType = "+encodeType+",b8BitWidth = "+b8BitWidth+",bMono = "+bMono+",iSampleRateInHz = "+iSampleRateInHz);

        if (mVideoView1 != null && mVideoView1.getLiveHandle() == livehandle)
        {
            mVideoView1.playAudioData(mAudioFrameData);
        }
        else if (mVideoView2 != null && mVideoView2.getLiveHandle() == livehandle)
        {
            mVideoView2.playAudioData(mAudioFrameData);
        }
    }

    public void SetupPTZUI()
    {
        if (m_LiveLayout == null)
        {
            return;
        }
        m_iViewType = ViewType.PTZView;
        if (m_PTZLayout == null)
        {
            int ihdistance = 10;
            int itextheight = 120;
            int iptzlayoutheight = SCREENHEIGHT - itextheight - ihdistance * 2 - SCREENWIDTH;
            int ibtnwidth1 = (SCREENWIDTH - ihdistance * 6) / 6;
            int ibtnwidth2 = (SCREENWIDTH / 2 - ihdistance * 4) / 3;
            int itextwidth = ((int) (SCREENWIDTH * 0.4) - ihdistance * 3) / 3;

            //			m_PTZScrollView = new ScrollView(this);
            //			m_PTZScrollView.setLayoutParams(
            //					new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT - ihdistance - itextheight - SCREENWIDTH * 2 / 3, 0, ihdistance + itextheight + SCREENWIDTH *
            // 2 / 3));
            //			m_PTZScrollView.setBackgroundColor(Color.WHITE);
            //			m_LiveLayout.addView(m_PTZScrollView);

            m_PTZLayout = new AbsoluteLayout(this);
            //			m_PTZLayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT - ihdistance - itextheight - SCREENWIDTH * 2 / 3, 0, 0));
            m_PTZLayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT, 0, ihdistance + itextheight * 2 + SCREENWIDTH * 2 / 3 + 3));
            m_PTZLayout.setBackgroundColor(Color.LTGRAY);
            m_LiveLayout.addView(m_PTZLayout);

            Button btnLeftUp = new Button(this);
            btnLeftUp.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, ihdistance, ihdistance));
            btnLeftUp.setTextColor(Color.BLACK);
            btnLeftUp.setTextSize(14);
            btnLeftUp.setText("leftup");
            btnLeftUp.setTag(LEFT_UP);
            btnLeftUp.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnLeftUp);

            Button btnUp = new Button(this);
            btnUp.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, ihdistance * 2 + ibtnwidth1, ihdistance));
            btnUp.setTextColor(Color.BLACK);
            btnUp.setTextSize(14);
            ;
            btnUp.setText("up");
            btnUp.setTag(UP);
            btnUp.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnUp);

            Button btnRightUp = new Button(this);
            btnRightUp.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, ihdistance * 3 + ibtnwidth1 * 2, ihdistance));
            btnRightUp.setTextColor(Color.BLACK);
            btnRightUp.setTextSize(14);
            ;
            btnRightUp.setText("rightup");
            btnRightUp.setTag(RIGHT_UP);
            btnRightUp.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnRightUp);

            Button btnLeft = new Button(this);
            btnLeft.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, ihdistance, ihdistance * 2 + itextheight));
            btnLeft.setTextColor(Color.BLACK);
            btnLeft.setTextSize(14);
            ;
            btnLeft.setText("left");
            btnLeft.setTag(LEFT);
            btnLeft.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnLeft);

            Button btnStop = new Button(this);
            btnStop.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, ihdistance * 2 + ibtnwidth1, ihdistance * 2 + itextheight));
            btnStop.setTextColor(Color.BLACK);
            btnStop.setTextSize(14);
            ;
            btnStop.setText("stop");
            m_PTZLayout.addView(btnStop);
            btnStop.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    PTZTouch(0, false);
                }
            });

            Button btnRight = new Button(this);
            btnRight.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, ihdistance * 3 + ibtnwidth1 * 2, ihdistance * 2 + itextheight));
            btnRight.setTextColor(Color.BLACK);
            btnRight.setTextSize(14);
            ;
            btnRight.setText("right");
            btnRight.setTag(RIGHT);
            btnRight.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnRight);

            Button btnLeftDown = new Button(this);
            btnLeftDown.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, ihdistance, ihdistance * 3 + itextheight * 2));
            btnLeftDown.setTextColor(Color.BLACK);
            btnLeftDown.setTextSize(14);
            ;
            btnLeftDown.setText("leftdown");
            btnLeftDown.setTag(LEFT_DOWN);
            btnLeftDown.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnLeftDown);

            Button btnDown = new Button(this);
            btnDown.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, ihdistance * 2 + ibtnwidth1, ihdistance * 3 + itextheight * 2));
            btnDown.setTextColor(Color.BLACK);
            btnDown.setTextSize(14);
            ;
            btnDown.setText("down");
            btnDown.setTag(DOWN);
            btnDown.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnDown);

            Button btnRightDown = new Button(this);
            btnRightDown.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, ihdistance * 3 + ibtnwidth1 * 2, ihdistance * 3 + itextheight * 2));
            btnRightDown.setTextColor(Color.BLACK);
            btnRightDown.setTextSize(14);
            ;
            btnRightDown.setText("rightdown");
            btnRightDown.setTag(RIGHT_DOWN);
            btnRightDown.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnRightDown);

            TextView tvAddFocus = new TextView(this);
            tvAddFocus.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH - ihdistance * 5 - ibtnwidth1 * 5, itextheight, (ihdistance + ibtnwidth1) * 3, ihdistance));
            tvAddFocus.setTextColor(Color.BLACK);
            tvAddFocus.setTextSize(14);
            ;
            tvAddFocus.setGravity(Gravity.CENTER);
            tvAddFocus.setText("focus");
            m_PTZLayout.addView(tvAddFocus);

            Button btnAddFocus = new Button(this);
            btnAddFocus.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, SCREENWIDTH - ihdistance * 2 - ibtnwidth1 * 2, ihdistance));
            btnAddFocus.setTextColor(Color.BLACK);
            btnAddFocus.setTextSize(14);
            ;
            btnAddFocus.setText("add");
            btnAddFocus.setTag(FOCUS_ADD);
            btnAddFocus.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnAddFocus);

            Button btnMinusFocus = new Button(this);
            btnMinusFocus.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, SCREENWIDTH - ihdistance - ibtnwidth1, ihdistance));
            btnMinusFocus.setTextColor(Color.BLACK);
            btnMinusFocus.setTextSize(14);
            ;
            btnMinusFocus.setText("minus");
            btnMinusFocus.setTag(FOCUS_SUB);
            btnMinusFocus.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnMinusFocus);

            TextView tvAddZoom = new TextView(this);
            tvAddZoom.setLayoutParams(
                    new AbsoluteLayout.LayoutParams(SCREENWIDTH - ihdistance * 5 - ibtnwidth1 * 5, itextheight, (ihdistance + ibtnwidth1) * 3, ihdistance * 2 + itextheight));
            tvAddZoom.setTextColor(Color.BLACK);
            tvAddZoom.setTextSize(14);
            ;
            tvAddZoom.setText("zoom");
            tvAddZoom.setGravity(Gravity.CENTER);
            m_PTZLayout.addView(tvAddZoom);

            Button btnAddZoom = new Button(this);
            btnAddZoom.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, SCREENWIDTH - ihdistance * 2 - ibtnwidth1 * 2, ihdistance * 2 + itextheight));
            btnAddZoom.setTextColor(Color.BLACK);
            btnAddZoom.setTextSize(14);
            ;
            btnAddZoom.setText("add");
            btnAddZoom.setTag(ZOOM_ADD);
            btnAddZoom.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnAddZoom);

            Button btnMinusZoom = new Button(this);
            btnMinusZoom.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, SCREENWIDTH - ihdistance - ibtnwidth1, ihdistance * 2 + itextheight));
            btnMinusZoom.setTextColor(Color.BLACK);
            btnMinusZoom.setTextSize(14);
            ;
            btnMinusZoom.setText("minus");
            btnMinusZoom.setTag(ZOOM_SUB);
            btnMinusZoom.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnMinusZoom);

            TextView tvAddIris = new TextView(this);
            tvAddIris.setLayoutParams(
                    new AbsoluteLayout.LayoutParams(SCREENWIDTH - ihdistance * 5 - ibtnwidth1 * 5, itextheight, (ihdistance + ibtnwidth1) * 3, ihdistance * 3 + itextheight * 2));
            tvAddIris.setTextColor(Color.BLACK);
            tvAddIris.setTextSize(14);
            ;
            tvAddIris.setGravity(Gravity.CENTER);
            tvAddIris.setText("iris");
            m_PTZLayout.addView(tvAddIris);

            Button btnAddIris = new Button(this);
            btnAddIris.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, SCREENWIDTH - ihdistance * 2 - ibtnwidth1 * 2, ihdistance * 3 + itextheight * 2));
            btnAddIris.setTextColor(Color.BLACK);
            btnAddIris.setTextSize(14);
            ;
            btnAddIris.setText("add");
            btnAddIris.setTag(APERTURE_ADD);
            btnAddIris.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnAddIris);

            Button btnMinusIris = new Button(this);
            btnMinusIris.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, SCREENWIDTH - ihdistance - ibtnwidth1, ihdistance * 3 + itextheight * 2));
            btnMinusIris.setTextColor(Color.BLACK);
            btnMinusIris.setTextSize(14);
            ;
            btnMinusIris.setText("minus");
            btnMinusIris.setTag(APERTURE_SUB);
            btnMinusIris.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnMinusIris);

            int iSpinnerWidth = (SCREENWIDTH - ihdistance * 3) / 4;
            TextView tvSpeed = new TextView(this);
            tvSpeed.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, 0, ihdistance * 4 + itextheight * 3));
            tvSpeed.setTextColor(Color.BLACK);
            tvSpeed.setTextSize(15);
            tvSpeed.setGravity(Gravity.CENTER);
            tvSpeed.setText("speed");
            m_PTZLayout.addView(tvSpeed);

            m_spSpeed = new Spinner(this);
            m_spSpeed.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, iSpinnerWidth, ihdistance * 4 + itextheight * 3));
            m_PTZLayout.addView(m_spSpeed);

            m_SpeedList = new ArrayList<String>();
            for (int i = 0; i < 8; i++)
            {
                m_SpeedList.add(String.valueOf(i + 1));
            }
            ArrayAdapter iSpeedAdapter = new ArrayAdapter<String>(this, android.R.layout.simple_spinner_item, m_SpeedList);
            iSpeedAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            m_spSpeed.setAdapter(iSpeedAdapter);

            TextView tvPreset = new TextView(this);
            tvPreset.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, 0, ihdistance * 5 + itextheight * 4));
            tvPreset.setTextColor(Color.BLACK);
            tvPreset.setTextSize(15);
            tvPreset.setGravity(Gravity.CENTER);
            tvPreset.setText("preset");
            m_PTZLayout.addView(tvPreset);

            m_spPreset = new Spinner(this);
            m_spPreset.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, iSpinnerWidth, ihdistance * 5 + itextheight * 4));
            m_PTZLayout.addView(m_spPreset);

            m_PresetList = new ArrayList<String>();
            for (int i = 0; i < 128; i++)
            {
                m_PresetList.add("Preset " + String.valueOf(i + 1));
            }
            ArrayAdapter iPresetAdapter = new ArrayAdapter<String>(this, android.R.layout.simple_spinner_item, m_PresetList);
            iPresetAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            m_spPreset.setAdapter(iPresetAdapter);

            Button btnGotoPreset = new Button(this);
            btnGotoPreset.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, iSpinnerWidth * 2 + ihdistance, ihdistance * 5 + itextheight * 4));
            btnGotoPreset.setTextColor(Color.BLACK);
            btnGotoPreset.setTextSize(15);
            btnGotoPreset.setText("go");
            m_PTZLayout.addView(btnGotoPreset);
            btnGotoPreset.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    int ipresetindex = 0;
                    if (m_spPreset.getSelectedItemPosition() >= 0 && m_spPreset.getSelectedItemPosition() < m_PresetList.size())
                    {
                        String strpreset = m_PresetList.get(m_spPreset.getSelectedItemPosition());
                        strpreset = strpreset.substring(7, strpreset.length());
                        ipresetindex = Integer.valueOf(strpreset) - 1;
                    }
                    PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_PRESET_GO, ipresetindex);
                }
            });

            TextView tvCruise = new TextView(this);
            tvCruise.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, 0, ihdistance * 6 + itextheight * 5));
            tvCruise.setTextColor(Color.BLACK);
            tvCruise.setTextSize(15);
            tvCruise.setGravity(Gravity.CENTER);
            tvCruise.setText("cruise");

            m_PTZLayout.addView(tvCruise);

            m_spCruise = new Spinner(this);
            m_spCruise.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, iSpinnerWidth, ihdistance * 6 + itextheight * 5));
            m_PTZLayout.addView(m_spCruise);

            m_CruiseList = new ArrayList<String>();
            for (int i = 0; i < 32; i++)
            {
                m_CruiseList.add("Cruise " + String.valueOf(i + 1));
            }
            ArrayAdapter iCruiseAdapter = new ArrayAdapter<String>(this, android.R.layout.simple_spinner_item, m_CruiseList);
            iCruiseAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            m_spCruise.setAdapter(iCruiseAdapter);

            Button btnCruiseStart = new Button(this);
            btnCruiseStart.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, iSpinnerWidth * 2 + ihdistance, ihdistance * 6 + itextheight * 5));
            btnCruiseStart.setTextColor(Color.BLACK);
            btnCruiseStart.setTextSize(15);
            btnCruiseStart.setText("run");
            m_PTZLayout.addView(btnCruiseStart);
            btnCruiseStart.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    int icruiseindex = 0;
                    if (m_spCruise.getSelectedItemPosition() >= 0 && m_spCruise.getSelectedItemPosition() < m_CruiseList.size())
                    {
                        String strcruise = m_CruiseList.get(m_spCruise.getSelectedItemPosition());
                        strcruise = strcruise.substring(7, strcruise.length());
                        icruiseindex = Integer.valueOf(strcruise) - 1;

                    }
                    PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_CRUISE_RUN, icruiseindex);
                }
            });

            Button btnCruiseStop = new Button(this);
            btnCruiseStop.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, SCREENWIDTH - ihdistance - iSpinnerWidth, ihdistance * 6 + itextheight * 5));
            btnCruiseStop.setTextColor(Color.BLACK);
            btnCruiseStop.setTextSize(15);
            btnCruiseStop.setText("stop");
            m_PTZLayout.addView(btnCruiseStop);
            btnCruiseStop.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    int icruiseindex = 0;
                    if (m_spCruise.getSelectedItemPosition() >= 0 && m_spCruise.getSelectedItemPosition() < m_CruiseList.size())
                    {
                        String strcruise = m_CruiseList.get(m_spCruise.getSelectedItemPosition());
                        strcruise = strcruise.substring(7, strcruise.length());
                        icruiseindex = Integer.valueOf(strcruise) - 1;
                    }
                    PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_CRUISE_STOP, icruiseindex);
                }
            });

            final Button tvCameraType = new Button(this);
            tvCameraType.setLayoutParams(new AbsoluteLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, itextheight, 0, ihdistance * 7 + itextheight * 6));
            tvCameraType.setTextColor(Color.BLACK);
            tvCameraType.setTextSize(15);
            tvCameraType.setPadding(tvCameraType.getPaddingLeft(), 10, tvCameraType.getPaddingRight(), 10);
            tvCameraType.setGravity(Gravity.CENTER);
            tvCameraType.setText("cameraType = ? ");
            m_PTZLayout.addView(tvCameraType);
            tvCameraType.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    int cameraType = mNVRSDK.GetPTZCameraType(mUserID1);
                    tvCameraType.setText("cameraType = " + cameraType);
                    ToolCommon.toastShow(SDKLiveActivity.this, "cameraType " + cameraType);
                }
            });
        }
        else
        {
            m_PTZLayout.setVisibility(View.VISIBLE);
        }
    }

    private OnTouchListener mTouchClick = new OnTouchListener()
    {
        @Override
        public boolean onTouch(View v, MotionEvent event)
        {
            if (!mVideoView1.getDecodeState())
            {
                return false;
            }
            int tag = (Integer) v.getTag();
            switch (event.getAction())
            {
                case MotionEvent.ACTION_DOWN:
                    PTZTouch(tag, true);
                    break;
                case MotionEvent.ACTION_UP:
                    PTZTouch(tag, false);
                    break;
                default:
                    break;
            }
            return false;
        }
    };

    private void PTZTouch(int tag, boolean isStart)
    {
        if (!isStart)
        {
            PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_STOP, -1);
            return;
        }
        switch (tag)
        {
            case UP:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_UP, -1);
                break;
            case DOWN:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_DOWN, -1);
                break;
            case LEFT:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_LEFT, -1);
                break;
            case RIGHT:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_RIGHT, -1);
                break;
            case LEFT_UP:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_LEFT_UP, -1);
                break;
            case LEFT_DOWN:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_LEFT_DOWN, -1);
                break;
            case RIGHT_UP:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_RIGHT_UP, -1);
                break;
            case RIGHT_DOWN:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_RIGHT_DOWN, -1);
                break;
            case FOCUS_ADD:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_FAR, -1);
                break;
            case FOCUS_SUB:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_NEAR, -1);
                break;
            case ZOOM_ADD:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_ZOOM_OUT, -1);
                break;
            case ZOOM_SUB:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_ZOOM_IN, -1);
                break;
            case APERTURE_ADD:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_IRIS_OPEN, -1);
                break;
            case APERTURE_SUB:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_IRIS_CLOSE, -1);
                break;
            default:
        }
    }

    public void PTZResponse(int iPtzCommand, int iIndex)
    {
        if (mNVRSDK != null)
        {
            int ichannelid = mVideoView1.GetChannelID();
            if (ichannelid > -1)
            {
                int ispeed = 4;
                if (m_spSpeed.getSelectedItemPosition() >= 0 && m_spSpeed.getSelectedItemPosition() < m_SpeedList.size())
                {
                    ispeed = Integer.valueOf(m_SpeedList.get(m_spSpeed.getSelectedItemPosition()));
                }
                if (iIndex <= -1)
                {
                    boolean res = mNVRSDK.PTZControlOther(mUserID1, ichannelid, iPtzCommand, ispeed);
                    ToolCommon.LOGD(TAG,"---PTZControlOther iPtzCommand = " + iPtzCommand + ",ichannelid = " + ichannelid + ",ispeed = " + ispeed + ",res = " + res);
                }
                else
                {
                    if (iPtzCommand == PTZ_CMD_TYPE.PTZ_CMD_PRESET_GO)
                    {
                        boolean res = mNVRSDK.PTZPresetOther(mUserID1, ichannelid, PTZ_CMD_TYPE.PTZ_CMD_PRESET_GO, iIndex);// (mUserID, ichannelid, iIndex, ispeed);
                        ToolCommon.LOGD(TAG,"---------PTZPresetOther res = " + res);
                    }
                    else if (iPtzCommand == PTZ_CMD_TYPE.PTZ_CMD_CRUISE_RUN)
                    {
                        //						mNVRSDK.PTZCruiseOther(mUserID, ichannelid, PTZ_CMD_TYPE.PTZ_CMD_CRUISE_RUN, iIndex);

                        boolean res = mNVRSDK.PTZCruise(playHandle1, PTZ_CMD_TYPE.PTZ_CMD_CRUISE_RUN, iIndex);
                        ToolCommon.LOGD(TAG,"--start--PTZCruise res = " + res);
                    }
                    else if (iPtzCommand == PTZ_CMD_TYPE.PTZ_CMD_CRUISE_STOP)
                    {
                        boolean res = mNVRSDK.PTZCruise(playHandle1, PTZ_CMD_TYPE.PTZ_CMD_CRUISE_STOP, iIndex);
                        ToolCommon.LOGD(TAG,"--stop--PTZCruise res = " + res);
                        //						mNVRSDK.PTZCruiseOther(mUserID, ichannelid, PTZ_CMD_TYPE.PTZ_CMD_CRUISE_STOP, iIndex);
                    }
                }
            }
        }
    }

    public void SetupSetUI()
    {
        m_iViewType = ViewType.SetView;
        if (m_SetLayout == null)
        {
            int itextwidth = SCREENWIDTH / 3;
            int itextheight = 120;
            int ihdistance = 20;
            int ieditwidth = SCREENWIDTH - ihdistance * 2 - itextwidth;

            //			m_SetScrollView = new ScrollView(this);
            //			m_SetScrollView.setLayoutParams(
            //					new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT - ihdistance - itextheight - SCREENWIDTH * 2 / 3, 0, ihdistance + itextheight + SCREENWIDTH *
            // 2 / 3));
            //			m_SetScrollView.setBackgroundColor(Color.WHITE);
            //			m_LiveLayout.addView(m_SetScrollView);

            m_SetLayout = new AbsoluteLayout(this);
            m_SetLayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT, 0, ihdistance + itextheight * 2 + SCREENWIDTH * 2 / 3 + 3));
            m_SetLayout.setBackgroundColor(Color.LTGRAY);
            m_LiveLayout.addView(m_SetLayout);

            int iTopPosition = 0;
            TextView tvSDKVersion = new TextView(this);
            tvSDKVersion.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, itextheight, 0, iTopPosition));
            tvSDKVersion.setTextColor(Color.BLACK);
            tvSDKVersion.setTextSize(15);
            tvSDKVersion.setGravity(Gravity.CENTER);
            tvSDKVersion.setText("Color Adjust(Range0-100)");
            m_SetLayout.addView(tvSDKVersion);

            iTopPosition += itextheight;
            TextView tvBright = new TextView(this);
            tvBright.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, ihdistance, iTopPosition));
            tvBright.setTextColor(Color.BLACK);
            tvBright.setTextSize(15);
            tvBright.setGravity(Gravity.CENTER_VERTICAL);
            tvBright.setText("Bright");
            m_SetLayout.addView(tvBright);

            m_etBright = new EditText(this);
            m_etBright.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, SCREENWIDTH / 2, iTopPosition));
            m_etBright.setTextColor(Color.BLACK);
            m_etBright.setTextSize(15);
            m_etBright.setText("0");
            m_SetLayout.addView(m_etBright);

            iTopPosition += itextheight + ihdistance;
            TextView tvSaturation = new TextView(this);
            tvSaturation.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, ihdistance, iTopPosition));
            tvSaturation.setTextColor(Color.BLACK);
            tvSaturation.setTextSize(15);
            tvSaturation.setGravity(Gravity.CENTER_VERTICAL);
            tvSaturation.setText("Saturation");
            m_SetLayout.addView(tvSaturation);

            m_etSaturation = new EditText(this);
            m_etSaturation.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, SCREENWIDTH / 2, iTopPosition));
            m_etSaturation.setTextColor(Color.BLACK);
            m_etSaturation.setTextSize(15);
            m_etSaturation.setText("0");
            m_SetLayout.addView(m_etSaturation);

            iTopPosition += itextheight + ihdistance;
            TextView tvContrast = new TextView(this);
            tvContrast.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, ihdistance, iTopPosition));
            tvContrast.setTextColor(Color.BLACK);
            tvContrast.setTextSize(15);
            tvContrast.setGravity(Gravity.CENTER_VERTICAL);
            tvContrast.setText("Contrast");
            m_SetLayout.addView(tvContrast);

            m_etContrast = new EditText(this);
            m_etContrast.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, SCREENWIDTH / 2, iTopPosition));
            m_etContrast.setTextColor(Color.BLACK);
            m_etContrast.setTextSize(15);
            m_etContrast.setText("0");
            m_SetLayout.addView(m_etContrast);

            iTopPosition += itextheight + ihdistance;
            TextView tvHue = new TextView(this);
            tvHue.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, ihdistance, iTopPosition));
            tvHue.setTextColor(Color.BLACK);
            tvHue.setTextSize(15);
            tvHue.setGravity(Gravity.CENTER_VERTICAL);
            tvHue.setText("Hue");
            m_SetLayout.addView(tvHue);

            m_etHue = new EditText(this);
            m_etHue.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, SCREENWIDTH / 2, iTopPosition));
            m_etHue.setTextColor(Color.BLACK);
            m_etHue.setTextSize(15);
            m_etHue.setText("0");
            m_SetLayout.addView(m_etHue);

            iTopPosition += itextheight + ihdistance;
            Button btnGetEffect = new Button(this);
            btnGetEffect.setLayoutParams(new AbsoluteLayout.LayoutParams((SCREENWIDTH - ihdistance * 5) / 4, itextheight, ihdistance, iTopPosition));
            btnGetEffect.setTextColor(Color.BLACK);
            btnGetEffect.setTextSize(15);
            btnGetEffect.setText("Get");
            m_SetLayout.addView(btnGetEffect);
            btnGetEffect.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    if (mNVRSDK != null && channel >= 0)
                    {
                        int[] m_iVideoEffectResult = mNVRSDK.GetVideoEffect(mUserID1, channel);
                        m_etBright.setText(String.valueOf(m_iVideoEffectResult[0]));
                        m_etContrast.setText(String.valueOf(m_iVideoEffectResult[1]));
                        m_etSaturation.setText(String.valueOf(m_iVideoEffectResult[2]));
                        m_etHue.setText(String.valueOf(m_iVideoEffectResult[3]));

                    }
                }
            });

            Button btnGetDefaultEffect = new Button(this);
            btnGetDefaultEffect.setLayoutParams(
                    new AbsoluteLayout.LayoutParams((SCREENWIDTH - ihdistance * 5) / 4, itextheight, ihdistance * 2 + (SCREENWIDTH - ihdistance * 5) / 4, iTopPosition));
            btnGetDefaultEffect.setTextColor(Color.BLACK);
            btnGetDefaultEffect.setTextSize(15);
            btnGetDefaultEffect.setText("Default");
            m_SetLayout.addView(btnGetDefaultEffect);
            btnGetDefaultEffect.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    if (mNVRSDK != null && channel >= 0)
                    {
                        int[] m_iVideoEffectResult = mNVRSDK.GetDefaultVideoEffect(mUserID1);
                        m_etBright.setText(String.valueOf(m_iVideoEffectResult[0]));
                        m_etContrast.setText(String.valueOf(m_iVideoEffectResult[1]));
                        m_etSaturation.setText(String.valueOf(m_iVideoEffectResult[2]));
                        m_etHue.setText(String.valueOf(m_iVideoEffectResult[3]));

                    }
                }
            });

            Button btnSetEffect = new Button(this);
            btnSetEffect.setLayoutParams(
                    new AbsoluteLayout.LayoutParams((SCREENWIDTH - ihdistance * 5) / 4, itextheight, ihdistance * 3 + (SCREENWIDTH - ihdistance * 5) * 2 / 4, iTopPosition));
            btnSetEffect.setTextColor(Color.BLACK);
            btnSetEffect.setTextSize(15);
            btnSetEffect.setText("Set");
            m_SetLayout.addView(btnSetEffect);
            btnSetEffect.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    try
                    {
                        if (mNVRSDK != null && channel >= 0)
                        {
                            int ibright = Integer.valueOf(m_etBright.getText().toString().trim());
                            int icontrast = Integer.valueOf(m_etContrast.getText().toString().trim());
                            int isaturation = Integer.valueOf(m_etSaturation.getText().toString().trim());
                            int ihue = Integer.valueOf(m_etHue.getText().toString().trim());

                            if (ibright >= 0 && ibright <= 255 && icontrast >= 0 && icontrast <= 255 && isaturation >= 0 && isaturation <= 255 && ihue >= 0 && ihue <= 255)
                            {
                                boolean res = mNVRSDK.SetVideoEffect(mUserID1, channel, ibright, icontrast, isaturation, ihue);
                                if (res)
                                {
                                    Toast.makeText(SDKLiveActivity.this, "set success", Toast.LENGTH_SHORT).show();
                                }
                                else
                                {
                                    Toast.makeText(SDKLiveActivity.this, "set fail", Toast.LENGTH_SHORT).show();
                                }
                            }
                            else
                            {
                                Toast.makeText(SDKLiveActivity.this, "invalid data", Toast.LENGTH_SHORT).show();
                            }
                        }
                    }
                    catch (NumberFormatException e)
                    {
                        e.printStackTrace();
                    }
                }
            });

            Button btnSaveEffect = new Button(this);
            btnSaveEffect.setLayoutParams(
                    new AbsoluteLayout.LayoutParams((SCREENWIDTH - ihdistance * 5) / 4, itextheight, ihdistance * 4 + (SCREENWIDTH - ihdistance * 5) * 3 / 4, iTopPosition));
            btnSaveEffect.setTextColor(Color.BLACK);
            btnSaveEffect.setTextSize(15);
            btnSaveEffect.setText("Save");
            m_SetLayout.addView(btnSaveEffect);
            btnSaveEffect.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    try
                    {
                        if (mNVRSDK != null && channel >= 0)
                        {
                            int ibright = Integer.valueOf(m_etBright.getText().toString().trim());
                            int icontrast = Integer.valueOf(m_etContrast.getText().toString().trim());
                            int isaturation = Integer.valueOf(m_etSaturation.getText().toString().trim());
                            int ihue = Integer.valueOf(m_etHue.getText().toString().trim());

                            if (ibright >= 0 && ibright <= 255 && icontrast >= 0 && icontrast <= 255 && isaturation >= 0 && isaturation <= 255 && ihue >= 0 && ihue <= 255)
                            {
                                boolean res = mNVRSDK.SaveVideoEffect(mUserID1, channel, ibright, icontrast, isaturation, ihue);
                                if (res)
                                {
                                    Toast.makeText(SDKLiveActivity.this, "Save success", Toast.LENGTH_SHORT).show();
                                }
                                else
                                {
                                    Toast.makeText(SDKLiveActivity.this, "save fail", Toast.LENGTH_SHORT).show();
                                }
                            }
                            else
                            {
                                Toast.makeText(SDKLiveActivity.this, "invalid data", Toast.LENGTH_SHORT).show();
                            }
                        }
                    }
                    catch (NumberFormatException e)
                    {
                        e.printStackTrace();
                    }
                }
            });
        }
        else
        {
            m_SetLayout.setVisibility(View.VISIBLE);
        }

    }

    @Override
    public void onRequestSingleFrameData()
    {
        // TODO Auto-generated method stub

    }

    @Override
    public void onTalkData(int byAudioFlag, int frameLen, byte[] data)
    {
        //		ToolCommon.LOGD(TAG,"-------------liveview onTalkData------------dwBufSize = " + frameLen+",byAudioFlag = "+byAudioFlag);
    }

    @Override
    public void ExceptionCallback(int dwType, int lUserID, int lHandle)
    {
        if (dwType == 1)
        {
            ToolCommon.LOGD(TAG,"-------------reconnect-----------lUserID = " + lUserID);
            mUserID1 = lUserID;
            mHandler.sendEmptyMessage(7);
        }
        else if (dwType == 0)
        {
            ToolCommon.LOGD(TAG,"-------------disconnect-----------");
            //			mVideoView1.setPermissionDenied(true);
            mHandler.sendEmptyMessage(6);
            //			CloseLiveChannel(true,true);
        }
    }

    /**
     * @param lUserID
     * @param lRegisterID
     * @param pDeviceInfo
     */
    @Override
    public void AcceptRegisterCallback(int lUserID, int lRegisterID, NET_SDK_DEVICEINFO[] pDeviceInfo) {

    }


    @Override
    public void onVideoDataFormatHead(long liveHandle, int iEncodeType)
    {
        long time = System.currentTimeMillis();
        ToolCommon.LOGD(TAG,"-----------liveview.onVideoDataFormatHead time = " + time);
        Message msg = mHandler.obtainMessage();
        msg.what = 9;
        msg.arg1 = iEncodeType;
        msg.obj = liveHandle;
        mHandler.sendMessage(msg);

    }

    @Override
    public void onPlaybackEnd()
    {
        // TODO Auto-generated method stub

    }

    @Override
    public void onAlarmTypeVFD(N900AlarmVFDContainer vfdContainer)
    {

    }

    @Override
    public void onAlarmTypeAVD(NET_SDK_IVE_AVD_T avd)
    {

    }

    @Override
    public void onAlarmTypeFaceMatch(NET_SDK_IVE_FACE_MATCH_T faceMatch)
    {

    }

    @Override
    public void onAlarmTypeFaceMatchForIPC(N900AlarmFaceIPCContainer faceMatch)
    {

    }

    @Override
    public void onAlarmASD(N9000SmartASDContainer container) {

    }

    @Override
    public void onAlarmIpcAOIENTRY(N9000SmartCommonContainer n9000SmartCommonContainer) {

    }

    @Override
    public void onAlarmNvrAOIENTRY(N9000SmartCommonContainer n9000SmartCommonContainer) {

    }

    @Override
    public void onAlarmIpcAOILEAVE(N9000SmartCommonContainer n9000SmartCommonContainer) {

    }

    @Override
    public void onAlarmNvrAOILEAVE(N9000SmartCommonContainer n9000SmartCommonContainer) {

    }

    @Override
    public void onAlarmPVD(N9000SmartCommonContainer n9000SmartCommonContainer) {

    }

    @Override
    public void onAlarmLoiter(N9000SmartCommonContainer n9000SmartCommonContainer) {

    }

    @Override
    public void onAlarmVSD(N9000SmartVSDContainer n9000SmartVSDContainer) {

    }

    public static int getKey(HashMap<Integer, String> map, String value)
    {
        int key = -1;
        for (int getKey : map.keySet())
        {
            if (map.get(getKey).equals(value))
            {
                key = getKey;
            }
        }
        return key;
    }

    public boolean RequestLive(int streamtype, int iichannel, boolean bChangeCHOnVideoView1)// 0:mainstram,1:sub stream
    {
        boolean res = false;
        if (mVideoView1.getDecodeState()|| mVideoView2.getDecodeState() || mVideoView3.getDecodeState() || mVideoView4.getDecodeState()){
            return true;
        }
        try
        {
            ToolCommon.LOGD(TAG, "RequestLive in; iichannel: "+ iichannel + ",m_ilivechannel1:"+ m_ilivechannel1);
            if (iichannel >= 0 && iichannel < m_iChannelCount1)// && ichannel != channel + 1)
            {
                //				CloseLiveChannel(false, false);
                int userID = SDKApplication.getInstance().getUserId1();

                m_PreStreamtype = streamtype;


                if (iichannel == m_ilivechannel1  || bChangeCHOnVideoView1)
                //if(true)
                {
                    channel = iichannel;
                    playHandle1 = mNVRSDK.LivePlay(userID, iichannel, m_PreStreamtype);
                    if (playHandle1 == -1)
                    {
                        long errorcode = mNVRSDK.GetLastError();
                        ToolCommon.LOGD(TAG,"liveplay fail,errorcode = " + errorcode + ",channel = " + (iichannel + 1) + ",m_Streamtype = " + m_PreStreamtype);
                        //                        Toast.makeText(SDKLiveActivity.this, "play fail,errorcode = " + errorcode + ",channel = " + (iichannel + 1), Toast.LENGTH_SHORT)
                        // .show();
                    }
                    else
                    {
                        ToolCommon.LOGD(TAG,"liveplay success " + playHandle1 + ",channel = " + (iichannel + 1) + ",m_Streamtype = " + m_PreStreamtype);
                        //                        Toast.makeText(SDKLiveActivity.this, "play success " + playHandle1 + ",channel = " + (iichannel + 1), Toast.LENGTH_SHORT).show();
                        mVideoView1.setLiveHandle(playHandle1);
                        mVideoView1.start();
                        mVideoView1.setChannelID(iichannel);
                        mdecodeHandler.sendEmptyMessageDelayed(1, 200);
                        //						mVideoView1.setPermissionDenied(false);
                        res = true;
                    }
                }
                else if (iichannel == m_ilivechannel2 )
                {
                    playHandle2 = mNVRSDK.LivePlay(userID, iichannel, m_PreStreamtype);
                    if (playHandle2 == -1)
                    {
                        long errorcode = mNVRSDK.GetLastError();
                        ToolCommon.LOGD(TAG,"liveplay fail,errorcode = " + errorcode + ",channel = " + (iichannel + 1) + ",m_Streamtype = " + m_PreStreamtype);
                        //                        Toast.makeText(SDKLiveActivity.this, "play fail,errorcode = " + errorcode + ",channel = " + (iichannel + 1), Toast.LENGTH_SHORT)
                        // .show();
                    }
                    else
                    {
                        ToolCommon.LOGD(TAG,"liveplay success " + playHandle2 + ",channel = " + (iichannel + 1) + ",m_Streamtype = " + m_PreStreamtype);
                        //                        Toast.makeText(SDKLiveActivity.this, "play success " + playHandle2 + ",channel = " + (iichannel + 1), Toast.LENGTH_SHORT).show();
                        mVideoView2.setLiveHandle(playHandle2);
                        mVideoView2.start();
                        mVideoView2.setChannelID(iichannel);
                        //						mVideoView2.setPermissionDenied(false);
                        res = true;
                    }
                }
                else if (iichannel == m_ilivechannel3 )
                {
                    playHandle3 = mNVRSDK.LivePlay(userID, iichannel, m_PreStreamtype);
                    if (playHandle3 == -1)
                    {
                        long errorcode = mNVRSDK.GetLastError();
                        ToolCommon.LOGD(TAG,"liveplay fail,errorcode = " + errorcode + ",channel = " + (iichannel + 1) + ",m_Streamtype = " + m_PreStreamtype);
                        //                        Toast.makeText(SDKLiveActivity.this, "play fail,errorcode = " + errorcode + ",channel = " + (iichannel + 1), Toast.LENGTH_SHORT)
                        // .show();
                    }
                    else
                    {
                        ToolCommon.LOGD(TAG,"liveplay success " + playHandle3 + ",channel = " + (iichannel + 1) + ",m_Streamtype = " + m_PreStreamtype);
                        //                        Toast.makeText(SDKLiveActivity.this, "play success " + playHandle3 + ",channel = " + (iichannel + 1), Toast.LENGTH_SHORT).show();
                        mVideoView3.setLiveHandle(playHandle3);
                        mVideoView3.start();
                        mVideoView3.setChannelID(iichannel);
                        //						mVideoView3.setPermissionDenied(false);
                        res = true;
                    }
                }
                else if (iichannel == m_ilivechannel4 )
                {
                    playHandle4 = mNVRSDK.LivePlay(userID, iichannel, m_PreStreamtype);
                    if (playHandle4 == -1)
                    {
                        long errorcode = mNVRSDK.GetLastError();
                        ToolCommon.LOGD(TAG,"liveplay fail,errorcode = " + errorcode + ",channel = " + (iichannel + 1) + ",m_Streamtype = " + m_PreStreamtype);
                        //                        Toast.makeText(SDKLiveActivity.this, "play fail,errorcode = " + errorcode + ",channel = " + (iichannel + 1), Toast.LENGTH_SHORT)
                        // .show();
                    }
                    else
                    {
                        ToolCommon.LOGD(TAG,"liveplay success " + playHandle4 + ",channel = " + (iichannel + 1) + ",m_Streamtype = " + m_PreStreamtype);
                        //                        Toast.makeText(SDKLiveActivity.this, "play success " + playHandle4 + ",channel = " + (iichannel + 1), Toast.LENGTH_SHORT).show();
                        mVideoView4.setLiveHandle(playHandle4);
                        mVideoView4.start();
                        mVideoView4.setChannelID(iichannel);
                        //						mVideoView4.setPermissionDenied(false);
                        res = true;
                    }
                }

            }
            else
            {
                //                Toast.makeText(SDKLiveActivity.this, "Invalid channel number,iichannel = " + iichannel + ",m_iChannelCount1 = " + m_iChannelCount1, Toast
                // .LENGTH_SHORT).show();
            }
        }
        catch (NumberFormatException e)
        {
            e.printStackTrace();
        }
        return res;
    }

    public boolean SetSubStreamEncodeInfo(int ichannel)
    {
        if (ichannel == 0)
        //					if (true)
        {
            if (m_EncodeInfoList != null && m_EncodeInfoList.size() > 0)
            {
                m_SubStreamResolutionList.clear();
                for (int i = 0; i < m_EncodeInfoList.size(); i++)
                {
                    DD_ENCODE_CONFIG_N9000_Ex encodeitem = m_EncodeInfoList.get(i);
                    String s = m_ResolutionMap.get(encodeitem.resolution);
                    m_SubStreamResolutionList.add(s);
                    ToolCommon.LOGD(TAG,"----resolution = " + s + ",ichannel = " + (ichannel + 1));
                }
                m_SubStreamResolutionList.add("Main Stream");
                //                m_SubStreamResolutionAdapter.notifyDataSetChanged();

                try
                {
                    DD_ENCODE_CONFIG_N9000_Ex encodeitem1 = m_EncodeInfoList.get(0);
                    encodeitem1.minBitrate = 512;// encodeitem1.bitrateRange[3];
                    encodeitem1.maxBitrate = 512;
                    boolean res = mNVRSDK.SetDVRConfigSubStreamEncodeInfo(mUserID1, ichannel, encodeitem1.serialize());
                    ToolCommon.LOGD(TAG,"----1------SetDVRConfigSubStreamEncodeInfo res = " + res + ",channel = " + (ichannel + 1) + ",encodeitem1.minBitrate = "
                            + encodeitem1.minBitrate);
                    Toast.makeText(SDKLiveActivity.this, "----1------SetDVRConfigSubStreamEncodeInfo res = " + res + ",channel = " + (ichannel + 1) + "," +
                            "encodeitem1.minBitrate = "
                            + encodeitem1.minBitrate, Toast.LENGTH_SHORT).show();
                    m_spSubStreamResolution.setSelection(0);
                    return true;
                }
                catch (Exception e)
                {
                    e.printStackTrace();
                }
            }
        }
        else if (ichannel == 1)
        {
            if (m_EncodeInfoList1 != null && m_EncodeInfoList1.size() > 0)
            {
                for (int i = 0; i < m_EncodeInfoList1.size(); i++)
                {
                    DD_ENCODE_CONFIG_N9000_Ex encodeitem = m_EncodeInfoList1.get(i);
                    String s = m_ResolutionMap.get(encodeitem.resolution);
                    ToolCommon.LOGD(TAG,"----resolution = " + s + ",ichannel = " + (ichannel + 1));
                }

                try
                {
                    DD_ENCODE_CONFIG_N9000_Ex encodeitem1 = m_EncodeInfoList1.get(0);
                    encodeitem1.minBitrate = encodeitem1.bitrateRange[3];
                    //								encodeitem1.maxBitrate = encodeitem1.rate;
                    boolean res = mNVRSDK.SetDVRConfigSubStreamEncodeInfo(mUserID1, ichannel, encodeitem1.serialize());
                    ToolCommon.LOGD(TAG,"----1------SetDVRConfigSubStreamEncodeInfo res = " + res + ",channel = " + (ichannel + 1) + ",encodeitem1.minBitrate = "
                            + encodeitem1.minBitrate);
                    Toast.makeText(SDKLiveActivity.this, "----1------SetDVRConfigSubStreamEncodeInfo res = " + res + ",channel = " + (ichannel + 1) + "," +
                            "encodeitem1.minBitrate = "
                            + encodeitem1.minBitrate, Toast.LENGTH_SHORT).show();
                    return true;
                }
                catch (Exception e)
                {
                    e.printStackTrace();
                }
            }
        }
        else if (ichannel == 2)
        {
            if (m_EncodeInfoList2 != null && m_EncodeInfoList2.size() > 0)
            {
                for (int i = 0; i < m_EncodeInfoList2.size(); i++)
                {
                    DD_ENCODE_CONFIG_N9000_Ex encodeitem = m_EncodeInfoList2.get(i);
                    String s = m_ResolutionMap.get(encodeitem.resolution);
                    ToolCommon.LOGD(TAG,"----resolution = " + s + ",ichannel = " + (ichannel + 1));
                }

                try
                {
                    DD_ENCODE_CONFIG_N9000_Ex encodeitem1 = m_EncodeInfoList2.get(0);
                    encodeitem1.minBitrate = encodeitem1.bitrateRange[3];
                    //								encodeitem1.maxBitrate = encodeitem1.rate;
                    boolean res = mNVRSDK.SetDVRConfigSubStreamEncodeInfo(mUserID1, ichannel, encodeitem1.serialize());
                    ToolCommon.LOGD(TAG,"----1------SetDVRConfigSubStreamEncodeInfo res = " + res + ",channel = " + (ichannel + 1) + ",encodeitem1.minBitrate = "
                            + encodeitem1.minBitrate);
                    Toast.makeText(SDKLiveActivity.this, "----1------SetDVRConfigSubStreamEncodeInfo res = " + res + ",channel = " + (ichannel + 1) + "," +
                            "encodeitem1.minBitrate = "
                            + encodeitem1.minBitrate, Toast.LENGTH_SHORT).show();
                    return true;
                }
                catch (Exception e)
                {
                    e.printStackTrace();
                }
            }
        }
        else if (ichannel == 3)
        {
            if (m_EncodeInfoList3 != null && m_EncodeInfoList3.size() > 0)
            {
                for (int i = 0; i < m_EncodeInfoList3.size(); i++)
                {
                    DD_ENCODE_CONFIG_N9000_Ex encodeitem = m_EncodeInfoList3.get(i);
                    String s = m_ResolutionMap.get(encodeitem.resolution);
                    ToolCommon.LOGD(TAG,"----resolution = " + s + ",ichannel = " + (ichannel + 1));
                }

                try
                {
                    DD_ENCODE_CONFIG_N9000_Ex encodeitem1 = m_EncodeInfoList3.get(0);
                    encodeitem1.minBitrate = encodeitem1.bitrateRange[3];
                    //								encodeitem1.maxBitrate = encodeitem1.rate;
                    boolean res = mNVRSDK.SetDVRConfigSubStreamEncodeInfo(mUserID1, ichannel, encodeitem1.serialize());
                    ToolCommon.LOGD(TAG,"----1------SetDVRConfigSubStreamEncodeInfo res = " + res + ",channel = " + (ichannel + 1) + ",encodeitem1.minBitrate = "
                            + encodeitem1.minBitrate);
                    Toast.makeText(SDKLiveActivity.this, "----1------SetDVRConfigSubStreamEncodeInfo res = " + res + ",channel = " + (ichannel + 1) + "," +
                            "encodeitem1.minBitrate = "
                            + encodeitem1.minBitrate, Toast.LENGTH_SHORT).show();
                    return true;
                }
                catch (Exception e)
                {
                    e.printStackTrace();
                }
            }
        }
        return false;
    }

    public void GetSubStreamEncodeInfo(int ichannel)
    {
        byte[] encodeinfodata = mNVRSDK.GetDVRConfigSubStreamEncodeInfoEx(mUserID1, ichannel);
        if (encodeinfodata != null)
        {
            ToolCommon.LOGD(TAG,"-----GetDVRConfigSubStreamEncodeInfoEx success----encodeinfodata.length = " + encodeinfodata.length);

            Message msg2 = new Message();
            msg2.what = 10;
            msg2.arg1 = encodeinfodata.length;
            msg2.arg2 = ichannel;
            mHandler.sendMessage(msg2);

            int icount = encodeinfodata.length / DD_ENCODE_CONFIG_N9000_Ex.GetStructSize();
            if (ichannel == m_ilivechannel1)
            //			if (true)
            {
                if (m_EncodeInfoList == null)
                {
                    m_EncodeInfoList = new ArrayList<DD_ENCODE_CONFIG_N9000_Ex>();
                }
                else
                {
                    m_EncodeInfoList.clear();
                }
                try
                {
                    for (int i = 0; i < icount; i++)
                    {
                        DD_ENCODE_CONFIG_N9000_Ex encodeinfoitem = DD_ENCODE_CONFIG_N9000_Ex.deserialize(encodeinfodata, i * DD_ENCODE_CONFIG_N9000_Ex.GetStructSize());
                        m_EncodeInfoList.add(encodeinfoitem);
                        ToolCommon.LOGD(TAG,"-----encodeinfoitem.resolution = " + encodeinfoitem.resolution + ",rate = " + encodeinfoitem.rate + ",minBitrate = "
                                + encodeinfoitem.minBitrate + ",maxBitrate = " + encodeinfoitem.maxBitrate + ",ichannel = " + (ichannel + 1) + ",encodeinfoitem.bitrateRange[0] = "
                                + encodeinfoitem.bitrateRange[0] + ",encodeinfoitem.bitrateRange[1] = " + encodeinfoitem.bitrateRange[1]);
                    }

                    m_EncodeInfoList = SortByResolution(m_EncodeInfoList);
                    Message msg1 = mHandler.obtainMessage();
                    msg1.arg1 = ichannel;
                    msg1.what = 8;
                    //                    mHandler.sendMessage(msg);
                }
                catch (IOException e)
                {
                    e.printStackTrace();
                }
            }
            else if (ichannel == m_ilivechannel2)
            {
                if (m_EncodeInfoList1 == null)
                {
                    m_EncodeInfoList1 = new ArrayList<DD_ENCODE_CONFIG_N9000_Ex>();
                }
                else
                {
                    m_EncodeInfoList1.clear();
                }
                try
                {
                    for (int i = 0; i < icount; i++)
                    {
                        DD_ENCODE_CONFIG_N9000_Ex encodeinfoitem = DD_ENCODE_CONFIG_N9000_Ex.deserialize(encodeinfodata, i * DD_ENCODE_CONFIG_N9000_Ex.GetStructSize());
                        m_EncodeInfoList1.add(encodeinfoitem);
                        ToolCommon.LOGD(TAG,"-----encodeinfoitem.resolution = " + encodeinfoitem.resolution + ",rate = " + encodeinfoitem.rate + ",minBitrate = "
                                + encodeinfoitem.minBitrate + ",maxBitrate = " + encodeinfoitem.maxBitrate + ",ichannel = " + (ichannel + 1) + ",encodeinfoitem.bitrateRange[0] = "
                                + encodeinfoitem.bitrateRange[0] + ",encodeinfoitem.bitrateRange[1] = " + encodeinfoitem.bitrateRange[1]);
                    }

                    m_EncodeInfoList1 = SortByResolution(m_EncodeInfoList1);
                    Message msg = mHandler.obtainMessage();
                    msg.arg1 = ichannel;
                    msg.what = 8;
                    //                    mHandler.sendMessage(msg);
                }
                catch (IOException e)
                {
                    e.printStackTrace();
                }
            }
            else if (ichannel == m_ilivechannel3)
            {
                if (m_EncodeInfoList2 == null)
                {
                    m_EncodeInfoList2 = new ArrayList<DD_ENCODE_CONFIG_N9000_Ex>();
                }
                else
                {
                    m_EncodeInfoList2.clear();
                }
                try
                {
                    for (int i = 0; i < icount; i++)
                    {
                        DD_ENCODE_CONFIG_N9000_Ex encodeinfoitem = DD_ENCODE_CONFIG_N9000_Ex.deserialize(encodeinfodata, i * DD_ENCODE_CONFIG_N9000_Ex.GetStructSize());
                        m_EncodeInfoList2.add(encodeinfoitem);
                        ToolCommon.LOGD(TAG,"-----encodeinfoitem.resolution = " + encodeinfoitem.resolution + ",rate = " + encodeinfoitem.rate + ",minBitrate = "
                                + encodeinfoitem.minBitrate + ",maxBitrate = " + encodeinfoitem.maxBitrate + ",ichannel = " + (ichannel + 1) + ",encodeinfoitem.bitrateRange[0] = "
                                + encodeinfoitem.bitrateRange[0] + ",encodeinfoitem.bitrateRange[1] = " + encodeinfoitem.bitrateRange[1]);
                    }

                    m_EncodeInfoList2 = SortByResolution(m_EncodeInfoList2);
                    Message msg = mHandler.obtainMessage();
                    msg.arg1 = ichannel;
                    msg.what = 8;
                    //                    mHandler.sendMessage(msg);
                }
                catch (IOException e)
                {
                    e.printStackTrace();
                }
            }
            else if (ichannel == m_ilivechannel4)
            {
                if (m_EncodeInfoList3 == null)
                {
                    m_EncodeInfoList3 = new ArrayList<DD_ENCODE_CONFIG_N9000_Ex>();
                }
                else
                {
                    m_EncodeInfoList3.clear();
                }
                try
                {
                    for (int i = 0; i < icount; i++)
                    {
                        DD_ENCODE_CONFIG_N9000_Ex encodeinfoitem = DD_ENCODE_CONFIG_N9000_Ex.deserialize(encodeinfodata, i * DD_ENCODE_CONFIG_N9000_Ex.GetStructSize());
                        m_EncodeInfoList3.add(encodeinfoitem);
                        ToolCommon.LOGD(TAG,"-----encodeinfoitem.resolution = " + encodeinfoitem.resolution + ",rate = " + encodeinfoitem.rate + ",minBitrate = "
                                + encodeinfoitem.minBitrate + ",maxBitrate = " + encodeinfoitem.maxBitrate + ",ichannel = " + (ichannel + 1) + ",encodeinfoitem.bitrateRange[0] = "
                                + encodeinfoitem.bitrateRange[0] + ",encodeinfoitem.bitrateRange[1] = " + encodeinfoitem.bitrateRange[1]);
                    }

                    m_EncodeInfoList3 = SortByResolution(m_EncodeInfoList3);
                    Message msg = mHandler.obtainMessage();
                    msg.arg1 = ichannel;
                    msg.what = 8;
                    //                    mHandler.sendMessage(msg);
                }
                catch (IOException e)
                {
                    e.printStackTrace();
                }
            }
        }
        else
        {
            ToolCommon.LOGD(TAG,"-----GetDVRConfigSubStreamEncodeInfoEx----encodeinfodata is null ,channel = " + (ichannel + 1));

            Message msg = mHandler.obtainMessage();
            msg.arg1 = ichannel;
            msg.what = 11;
            mHandler.sendMessage(msg);
        }
    }

    ArrayList<DD_ENCODE_CONFIG_N9000_Ex> m_TempEncodeInfoList = null;

    public ArrayList<DD_ENCODE_CONFIG_N9000_Ex> SortByResolution(ArrayList<DD_ENCODE_CONFIG_N9000_Ex> encodeInfoList)
    {
        if (encodeInfoList != null && encodeInfoList.size() > 1)
        {
            if (m_TempEncodeInfoList == null)
            {
                m_TempEncodeInfoList = new ArrayList<DD_ENCODE_CONFIG_N9000_Ex>();
            }
            else
            {
                m_TempEncodeInfoList.clear();
            }

            //			String StrResolutions[] = new String[encodeInfoList.size()];
            int resolutions[] = new int[encodeInfoList.size()];

            for (int i = 0; i < encodeInfoList.size(); i++)
            {
                DD_ENCODE_CONFIG_N9000_Ex item = encodeInfoList.get(i);
                String strresolution = m_ResolutionMap.get(item.resolution);
                if (strresolution != null)
                {
                    int a = Integer.valueOf(strresolution.substring(0, strresolution.indexOf("x")));
                    int b = Integer.valueOf(strresolution.substring(strresolution.indexOf("x") + 1, strresolution.length()));
                    resolutions[i] = a * b;
                }
            }
            Arrays.sort(resolutions);// ,String.CASE_INSENSITIVE_ORDER
            m_TempEncodeInfoList.addAll(encodeInfoList);

            for (int i = 0; i < resolutions.length; i++)
            {
                for (int j = 0; j < m_TempEncodeInfoList.size(); j++)
                {
                    DD_ENCODE_CONFIG_N9000_Ex item = m_TempEncodeInfoList.get(j);

                    String strresolution = m_ResolutionMap.get(item.resolution);
                    if (strresolution != null)
                    {
                        int a = Integer.valueOf(strresolution.substring(0, strresolution.indexOf("x")));
                        int b = Integer.valueOf(strresolution.substring(strresolution.indexOf("x") + 1, strresolution.length()));

                        int resolution = a * b;

                        if (resolution == resolutions[i])
                        {
                            encodeInfoList.set(i, item);
                        }
                    }
                }
            }
        }
        return encodeInfoList;
    }

    boolean bfirstframe = true;
    int iframecount = 0;

   /* @Override
    public void PlayCFrameData(CFrameData iCFrameData)
    {
        if (iCFrameData == null)
        {
            //			ToolCommon.LOGD(TAG,"--------------PlayCFrameData().iCFrameData == null-----------");
            return;
        }
        if (mVideoView1 != null && iCFrameData != null)
        {
            long time = 0;
            dwLowDateTime2 = iCFrameData.dwLowDateTime;
            if (dwLowDateTime1 != 0)
            {
                time = dwLowDateTime2 - dwLowDateTime1;
                //				ToolCommon.LOGD(TAG,"-----2-------onVideoData space Time = "+time+",dwLowDateTime2 = "+dwLowDateTime2+",dwLowDateTime1 = "+dwLowDateTime1);
            }
            dwLowDateTime1 = dwLowDateTime2;

            iframecount++;
            ToolCommon.LOGD(TAG,"--------------PlayCFrameData().iCFrameData is not null-----------iCFrameData.width = " + iCFrameData.iFrameWidth + ",iCFrameData.height = "
                    + iCFrameData.iFrameHeight + ",time = " + iCFrameData.dwLowDateTime + ",encodetype = " + iCFrameData.iEncodeType + ",iskeyframe = " + iCFrameData.isKeyFrame
                    + ",GetStructSize = " + iCFrameData.GetStructSize() + ",icount = " + iframecount + ",space time = " + time + ",index = " + iCFrameData.iFrameIndex);

            if (bfirstframe)
            {
                mVideoView1.playVideoDataFormatHead(0, iCFrameData.iEncodeType);
                bfirstframe = false;
                mVideoView1.setLiveHandle(playHandle1);
                mVideoView1.start();
                mVideoView1.setChannelID(channel);
                mVideoView1.setPermissionDenied(false);
                mVideoView1.setDropState(false);
            }
            mVideoView1.playVideoData(iCFrameData);
        }
    }*/

    public void WriteRecodeFile(CFrameData iVideoFrameData)//write video data to file
    {
        // write file
        try
        {
            if (m_fileoperation != null)
            {
                boolean bclose = false;
                if (!m_bRecord)
                {
                    bclose = true;
                    m_irecordChannel = -1;
                }
                m_fileoperation.WriterData(iVideoFrameData.serialize(), bclose);//write video data to file
                //				m_iframecount++;
                //					ToolCommon.LOGD(TAG,"---------m_iframecount = " + m_iframecount + ",mVideoFrameData.GetStructSize() = " + iVideoFrameData.GetStructSize());
            }
        }
        catch (Exception e)
        {
            e.printStackTrace();
        }
    }



}
