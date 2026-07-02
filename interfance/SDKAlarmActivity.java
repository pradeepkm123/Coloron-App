package com.sdk.interfance;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.os.Environment;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.RadioGroup;
import android.widget.RadioGroup.OnCheckedChangeListener;
import android.widget.TextView;
import android.widget.Toast;

import com.sdk.interfance.bean.N9000SmartASDContainer;
import com.sdk.interfance.bean.N9000SmartCommonContainer;
import com.sdk.interfance.bean.N9000SmartVSDContainer;
import com.sdk.interfance.bean.N900AlarmFaceIPCContainer;
import com.sdk.interfance.bean.N900AlarmVFDContainer;
import com.sdk.interfance.bean.NET_DVR_SUBSCRIBE_REPLY;
import com.sdk.interfance.bean.NET_SDK_AUDIO_ABNORMAL_INFO_T;
import com.sdk.interfance.bean.NET_SDK_DEV_SUPPORT;
import com.sdk.interfance.bean.NET_SDK_IVE_AVD_T;
import com.sdk.interfance.bean.NET_SDK_IVE_FACE_MATCH_T;
import com.sdk.interfance.bean.NET_SDK_IVE_VSD_TARGET_BIKE;
import com.sdk.interfance.bean.NET_SDK_IVE_VSD_TARGET_CAR;
import com.sdk.interfance.bean.NET_SDK_IVE_VSD_TARGET_PERSON;
import com.sdk.interfance.bean.NET_SDK_SMART_EVENT_TYPE;
import com.sdk.test.app.SDKApplication;
import com.sdk.test.utils.PushThreadPool;
import com.sdk.test.view.SDKProgressDialog;

import com.switchbee.technician.R;

import org.w3c.dom.Text;

import java.io.File;
import java.io.FileOutputStream;
import java.util.HashMap;

public class SDKAlarmActivity extends BaseActivity implements OnClickListener {
    private static final String TAG = "SDKAlarmActivity";
    private RadioGroup mRadioGroup;
    private EditText etChannelIndex;
    private int alarmType = 0x00;
    private SDKProgressDialog mProgressDialog;
    private nvrsdk mNVRSDK = null;
    private HashMap<String, NET_DVR_SUBSCRIBE_REPLY> replyHashMap = new HashMap<>();
    private int channleIndex = 0;
    private NET_DVR_SUBSCRIBE_REPLY subReply = null;
    private String msg = "";
    private int msgcout = 0;
    private NET_SDK_DEVICEINFO deviceinfo;

    public static void startInstance(Context context) {
        context.startActivity(new Intent(context, SDKAlarmActivity.class));
    }

    private OnCheckedChangeListener mOnCheckedChangeListener = new OnCheckedChangeListener() {
        @Override
        public void onCheckedChanged(RadioGroup radioGroup, int id) {
            switch (id) {
                case R.id.rbAVD: {//视频异常诊断功能检测
                    alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_AVD;
                    break;
                }
                case R.id.rbVFD: {//人脸检测
                    alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_VFD;
                    break;
                }
                case R.id.rbVFD_MATCH: {//人脸比对
                    if (deviceinfo.deviceType == NET_SDK_DEVICE_TYPE.NET_SDK_NVR) {
                        alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_FACE_MATCH;
                    } else if (deviceinfo.deviceType == NET_SDK_DEVICE_TYPE.NET_SDK_IPCAMERA) {
                        alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_FACE_MATCH_FOR_IPC;
                    }
                    break;
                }
                case R.id.rbPEA: {//区域入侵
                    if (deviceinfo.deviceType == NET_SDK_DEVICE_TYPE.NET_SDK_NVR) {
                        alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_FACE_MATCH;
                    } else if (deviceinfo.deviceType == NET_SDK_DEVICE_TYPE.NET_SDK_IPCAMERA) {
                        alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_PEA_FOR_IPC;
                    }
                    alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_PEA_FOR_IPC;
                    break;
                }
                case R.id.rbOSC: {//物品遗留及丢失
                    alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_OSC;
                    break;
                }
                case R.id.rbCPC: {//人流量统计
                    alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_CPC;
                    break;
                }
                case R.id.rbCDD: {//人群密度检测
                    alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_CDD;
                    break;
                }
                case R.id.rbIPD: {//人员入侵侦测
                    alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_IPD;
                    break;
                }
                case R.id.rbASD: {//声音异常
                    alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_ASD;
                    break;
                }
                case R.id.rbAOIENTRY: {//区域进入
                    if (deviceinfo.deviceType == NET_SDK_DEVICE_TYPE.NET_SDK_NVR) {
                        alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_NVR_AOIENTRY;
                    } else if (deviceinfo.deviceType == NET_SDK_DEVICE_TYPE.NET_SDK_IPCAMERA) {
                        alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_AOIENTRY;
                    }
                    break;
                }
                case R.id.rbAOILEAVE: {//区域进入
                    if (deviceinfo.deviceType == NET_SDK_DEVICE_TYPE.NET_SDK_NVR) {
                        alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_NVR_AOILEAVE;
                    } else if (deviceinfo.deviceType == NET_SDK_DEVICE_TYPE.NET_SDK_IPCAMERA) {
                        alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_AOILEAVE;
                    }
                    break;
                }
                case R.id.rbPVD: {//违停检测
                    alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_PVD;
                    break;
                }
                case R.id.rbLoiter: {//徘徊检测
                    alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_LOITER;
                    break;
                }
                case R.id.rbVSD: {//二级结构化
                    alarmType = NET_SDK_SMART_EVENT_TYPE.NET_SDK_SMART_EVENT_TYPE_VSD;
                    break;
                }
                default:
                    break;
            }
        }
    };
    private int mUserID1 = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        this.getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        setContentView(R.layout.activity_alarm);
        mNVRSDK = SDKApplication.getInstance().getNvrSdk();
        if (mNVRSDK == null) {
            return;
        }

        mNVRSDK.SetID(111);
        mUserID1 = SDKApplication.getInstance().getUserId1();
        deviceinfo = SDKApplication.getInstance().getLoginDeviceInfo();

        initUI();
    }

    private void initUI() {
        mRadioGroup = findViewById(R.id.alam_radiogroup);
        mRadioGroup.setOnCheckedChangeListener(mOnCheckedChangeListener);
        etChannelIndex = findViewById(R.id.etChannelIndex);

        mProgressDialog = new SDKProgressDialog(this, "loading...");

        Button btReturn = findViewById(R.id.btReturn);
        btReturn.setOnClickListener(this);
        Button Subscrib = findViewById(R.id.Subscrib);
        Subscrib.setOnClickListener(this);
        Button unSubscrib = findViewById(R.id.unSubscrib);
        unSubscrib.setOnClickListener(this);
//        Button btCheckFaceSupport = findViewById(R.id.btCheckFaceSupport);
//        btCheckFaceSupport.setOnClickListener(this);
        Button btSupportFun = findViewById(R.id.btSupportFun);
        btSupportFun.setOnClickListener(this);
        if (deviceinfo.deviceType == NET_SDK_DEVICE_TYPE.NET_SDK_IPCAMERA) {
            findViewById(R.id.channelLabel).setVisibility(View.GONE);
            etChannelIndex.setVisibility(View.GONE);
        }
        Button btnClear = findViewById(R.id.btnClear);
        btnClear.setOnClickListener(this);

    }


    @Override
    protected void onResume() {
        super.onResume();
        mNVRSDK.SetCallback(new NVRSDKCallback.Default() {
            @Override
            public void onAlarmTypeVFD(N900AlarmVFDContainer vfdContainer) {
                ToolCommon.LOGD(TAG, "null != onAlarmTypeVFD ? " + (null != vfdContainer));
                if (vfdContainer == null) {
                    Log.d(TAG, "onAlarmTypeVFD: is null");
                    return;
                }
                if (vfdContainer.head.faceCnt >= 1) {       //当有人脸时
                    String unit = "";
                    if (vfdContainer.faces[0].tempUnitsType == 0) {
                        unit = "℃";
                    } else {
                        unit = "℉";
                    }
                    if (msgcout <= 10) {
                        msg += "face id:" + vfdContainer.faces[0].faceId + ",age: " + vfdContainer.faces[0].age + ",temperature： "
                                + vfdContainer.faces[0].temperature / 100.0 + unit + "\n";
                        msgcout++;
                    } else {
                        msg = "face id:" + vfdContainer.faces[0].faceId + ",age: " + vfdContainer.faces[0].age + ",temperature： "
                                + vfdContainer.faces[0].temperature / 100.0 + unit + "\n";
                        msgcout = 0;
                    }
                    showAlarm(msg, null, null);

                    Log.d(TAG, "all msg:" + vfdContainer.toString());
                }
            }

            @Override
            public void onAlarmTypeAVD(NET_SDK_IVE_AVD_T avd) {
                ToolCommon.LOGD(TAG, "null != onAlarmTypeAVD ? " + (null != avd));

            }

            @Override
            public void onAlarmTypeFaceMatch(NET_SDK_IVE_FACE_MATCH_T faceMatch) {
                ToolCommon.LOGD(TAG, "null != onAlarmTypeFaceMatch ? " + (null != faceMatch));

            }

            @Override
            public void onAlarmTypeFaceMatchForIPC(N900AlarmFaceIPCContainer faceMatch) {
                ToolCommon.LOGD(TAG, "null != onAlarmTypeFaceMatchForIPC ? " + (null != faceMatch));
                Log.d(TAG, "onAlarmTypeFaceMatchForIPC: baseinfo: " + faceMatch.baseInfo.toString());
                String unit = "";
                if (faceMatch.baseInfo.tempUnitsType == 0) {
                    unit = "℃";
                } else {
                    unit = "℉";
                }
                if (msgcout <= 10) {
                    msg += "name:" + faceMatch.baseInfo.szName + ",iSimilarity:" + faceMatch.baseInfo.iSimilarity + ",is succes:" +
                            faceMatch.baseInfo.comparisonRes + ",wearmask:" + faceMatch.baseInfo.temperature / 100.0 + unit + "\n";
                    msgcout++;
                } else {
                    msg = "name:" + faceMatch.baseInfo.szName + ",iSimilarity:" + faceMatch.baseInfo.iSimilarity + ",is succes:" +
                            faceMatch.baseInfo.comparisonRes + ",wearmask:" + faceMatch.baseInfo.temperature / 100.0 + unit + " \n";
                    msgcout = 0;
                }
                showAlarm(msg, null, null);
            }

            @Override
            public void AcceptRegisterCallback(int lUserID, int lRegisterID, NET_SDK_DEVICEINFO[] pDeviceInfo) {
                ToolCommon.LOGD(TAG, "AcceptRegisterCallback");
            }

            @Override
            public void onAlarmASD(N9000SmartASDContainer container) {
                msg = "Channel: " + container.event.chnn + " occurred audio exception alarm:\n";
                for (int i = 0; i < container.audioInfo.length; i++) {
                    msg += "soundLevel: " + container.audioInfo[i].soundLevel + ",triggered alarm: " + (container.audioInfo[i].alarm == 0 ? "no.\n" : "yes.\n");
                }
                showAlarm(msg, null, null);
            }

            @Override
            public void onAlarmIpcAOIENTRY(N9000SmartCommonContainer container) {
                String msg = "Channel: " + (container.event.chnn + 1) + " occurred region entrance event:\n";
                for (int i = 0; i < container.snapPicInfo.length; i++) {
                    showAlarm(msg, container.snapPicInfo[i].img, container.fullPicInfo.img);
                }
            }

            @Override
            public void onAlarmIpcAOILEAVE(N9000SmartCommonContainer container) {
                String msg = "Channel: " + (container.event.chnn + 1) + " occurred region exit event:\n";
                for (int i = 0; i < container.snapPicInfo.length; i++) {
                    showAlarm(msg, container.snapPicInfo[i].img, container.fullPicInfo.img);
                }
            }

            @Override
            public void onAlarmNvrAOIENTRY(N9000SmartCommonContainer container) {
                String msg = "Channel: " + (container.event.chnn + 1) + " occurred region entrance event:\n";
                for (int i = 0; i < container.snapPicInfo.length; i++) {
                    showAlarm(msg, container.snapPicInfo[i].img, container.fullPicInfo.img);
                }
            }
            @Override
            public void onAlarmVSD(N9000SmartVSDContainer container) {
                for (int i = 0; i < container.targetInfo.length; i++) {
                    String msg = "Channel: " + (container.head.channel + 1) + " occurred video metadata event:\ntarget id is "+ container.targetInfo[i].targetId + "\n";
                    if (container.targetInfo[i].targetUnion instanceof NET_SDK_IVE_VSD_TARGET_PERSON) {
                        NET_SDK_IVE_VSD_TARGET_PERSON target = (NET_SDK_IVE_VSD_TARGET_PERSON) container.targetInfo[i].targetUnion;
                        msg +="target is person, target gender:" + target.gender + ",age:" + target.age;
                    } else if (container.targetInfo[i].targetUnion instanceof NET_SDK_IVE_VSD_TARGET_CAR) {
                        NET_SDK_IVE_VSD_TARGET_CAR target = (NET_SDK_IVE_VSD_TARGET_CAR) container.targetInfo[i].targetUnion;
                        msg +="target is car, target year:" + target.year;
                    }else if (container.targetInfo[i].targetUnion instanceof NET_SDK_IVE_VSD_TARGET_BIKE) {
                        NET_SDK_IVE_VSD_TARGET_BIKE target = (NET_SDK_IVE_VSD_TARGET_BIKE) container.targetInfo[i].targetUnion;
                        msg +="target is bike, target type:" + target.bikeType;
                    }
                    showAlarm(msg, container.targetInfo[i].img, container.fullPicInfo.img);
                }
            }
        });
    }


//    /**
//     * 是否支持人脸抓拍和对比
//     * @return
//     */
//    private boolean bIpcFaceSupport(){
//        boolean bIpcFaceSupport = false;
//        NET_SDK_DEVICEINFO deviceinfo = SDKApplication.getInstance().getLoginDeviceInfo();
//        if (deviceinfo.deviceType != 2){
//            return bIpcFaceSupport;
//        }
//        int function = deviceinfo.function[0];          //此int的位域对应的IPC支持能力,能力集见 NET_SDK_DEVICEINFO：1支持 0不支持
//        Log.d(TAG, "funtion int：" + function);
//        char[] chs = new char[Integer.SIZE];
//        for (int i = 0; i < Integer.SIZE; i++) {
//            chs[Integer.SIZE - 1 - i] = (char) (((function >> i) & 1) + '0');
//            System.out.println(chs[Integer.SIZE - 1 - i]);
//        }
//        Log.d(TAG, "funtion string :" + new String(chs));
//
//        NET_SDK_DEVICEINFO.funtionlist funtionlist = new NET_SDK_DEVICEINFO.funtionlist();
//
//        int index = 8;					     //对应funtionlist中第9位
//        if ((function & (1 << index)) >> index == 1) {
//            funtionlist.intelist_Vfd = 1;
//        }
//        index = 9; 						//对应funtionlist值中的第10位
//        if ((function & (1 << index)) >> index == 1) {
//            funtionlist.intelist_Vfd_Match = 1;
//        }
//        if (funtionlist.intelist_Vfd == 1 && funtionlist.intelist_Vfd_Match == 1 ){
//            bIpcFaceSupport =  true;
//        }
//        return bIpcFaceSupport;
//    }

    //判断设备是否支持体温与口罩检测
    private void bSupportFun() {
        NET_SDK_DEV_SUPPORT support = mNVRSDK.GetDeviceSupportFunction(mUserID1);
        int thermometry = support.supportThermometry;    //支持口罩跟体温
        int vfd = support.supportVfd;             //人脸检测
        int vfdMatch = support.supportVfdMatch;         //人脸比对
        int thermal = support.supportThermal;          // 热成像
        String msg = "人脸检测:" + (vfd == 1) + ",支持口罩和体温:" + (thermometry == 1) + ",人脸比对:" + (vfdMatch == 1) + ",热成像:" + (thermal == 1);
        Log.d(TAG, msg);
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    private void showAlarm(String msg, byte[] snapImg, byte[] fullImg) {
        final LinearLayout containerLayout = findViewById(R.id.alarmLayout);
        float density = getResources().getDisplayMetrics().density;
        final LinearLayout columnLayout;
        ImageView fullImageView = null;
        ImageView snapImageView = null;
        if (snapImg != null) {
            LinearLayout.LayoutParams snapLayoutParams = new LinearLayout.LayoutParams(
                    (int) (100 * density),
                    (int) (134 * density));
            Bitmap snapBitmap = BitmapFactory.decodeByteArray(snapImg, 0, snapImg.length);
            snapImageView = new ImageView(this);
            snapImageView.setLayoutParams(snapLayoutParams);
            snapImageView.setAdjustViewBounds(true);
            snapImageView.setScaleType(ImageView.ScaleType.FIT_XY);
            snapImageView.setImageBitmap(snapBitmap);
            snapImageView.setPadding(0, 0, 10, 0);
        }

        if (fullImg != null) {
            LinearLayout.LayoutParams fullLayoutParams = new LinearLayout.LayoutParams(
                    (int) (250 * density),
                    (int) (134 * density));
            Bitmap fullBitmap = BitmapFactory.decodeByteArray(fullImg, 0, fullImg.length);
            fullImageView = new ImageView(this);
            fullImageView.setLayoutParams(fullLayoutParams);
            fullImageView.setAdjustViewBounds(true);
            fullImageView.setScaleType(ImageView.ScaleType.FIT_XY);
            fullImageView.setImageBitmap(fullBitmap);

        }

        columnLayout = new LinearLayout(this);
        columnLayout.setOrientation(LinearLayout.VERTICAL);
        columnLayout.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        final LinearLayout imgLayout = new LinearLayout(this);
        imgLayout.setOrientation(LinearLayout.HORIZONTAL);
        imgLayout.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        final TextView textView = new TextView(this);
        textView.setText(msg);

        if (snapImageView != null) {
            imgLayout.addView(snapImageView);
        }
        if (fullImageView != null) {
            imgLayout.addView(fullImageView);
        }
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                columnLayout.addView(textView);
                columnLayout.addView(imgLayout);
                addViewToLinearLayout(containerLayout, columnLayout, 10);
            }
        });
    }

    private void addViewToLinearLayout(LinearLayout layout, View newView, int maxViews) {
        // 如果当前视图数量已达到最大数量
        if (layout.getChildCount() >= maxViews) {
            // 移除最后一个（最旧的）视图
            layout.removeViewAt(layout.getChildCount() - 1);
        }
        // 添加新的视图到末尾
        layout.addView(newView, 0); // 添加到第一个位置，使最新的视图在顶部显示
    }


    @Override
    protected void onDestroy() {
        super.onDestroy();
        mNVRSDK.SetCallback(null);
        mNVRSDK = null;
    }

    @Override
    public void onClick(View v) {
        int id = v.getId();
        switch (id) {
            case R.id.btReturn:
                finish();
                break;
            case R.id.Subscrib:
                PushThreadPool.executeOnThread(new Runnable() {
                    @Override
                    public void run() {
                        String chlStr = etChannelIndex.getText().toString();
                        if (!ToolCommon.isEmpty(chlStr)) {
                            channleIndex = Integer.parseInt(chlStr);
                        }
                        //订阅 alarmType代表要订阅的事件,如果需要订阅多个类型,需要多次调用
                        subReply = mNVRSDK.smartSubscrib(mUserID1, alarmType, channleIndex);
                        ToolCommon.LOGD(TAG, "channleIndex : " + channleIndex + " null != subReply ? " + (null != subReply));
                        replyHashMap.put(chlStr + alarmType, subReply);
                    }
                });
                break;
            case R.id.unSubscrib:
                String chlStr = etChannelIndex.getText().toString();
                if (!ToolCommon.isEmpty(chlStr)) {
                    channleIndex = Integer.parseInt(chlStr);
                }
                //取消订阅对应订阅过的alarmType多次取消
                if (replyHashMap.containsKey(chlStr + alarmType)) {
                    subReply = replyHashMap.get(chlStr + alarmType);
                    int dwResult = mNVRSDK.unSmartSubscrib(mUserID1, alarmType, channleIndex, subReply.serverAddress);
                    ToolCommon.LOGD(TAG, "channleIndex : " + channleIndex + "dwResult: " + dwResult);
                    if (dwResult > 0) {
                        subReply = null;
                        showAlarm("", null, null);
                        ToolCommon.LOGD(TAG, "channleIndex : " + channleIndex + "unSmartSubscrib success ");
                    }
                }
                break;
//            case R.id.btCheckFaceSupport:
//                  if (bIpcFaceSupport()){
//                      Toast.makeText(this,"当前设备支持人脸抓拍和人脸对比",Toast.LENGTH_LONG).show();
//                  }else {
//                      Toast.makeText(this, "当前设备不支持人脸抓拍和人脸对比", Toast.LENGTH_LONG).show();
//                  }
//                  break;
            case R.id.btSupportFun:
                bSupportFun();
                break;
            case R.id.btnClear:
                LinearLayout containerLayout = findViewById(R.id.alarmLayout);
                containerLayout.removeAllViews();
                break;
        }
    }
}
