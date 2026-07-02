package com.sdk.interfance;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.InputType;
import android.util.Log;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.WindowManager;
import android.widget.EditText;
import android.widget.RadioGroup;
import android.widget.RadioGroup.OnCheckedChangeListener;
import android.widget.TextView;
import android.widget.Toast;

import com.sdk.test.app.SDKApplication;
import com.sdk.test.utils.NetworkUtils;
import com.sdk.test.utils.PrefUtil;
import com.sdk.test.view.SDKProgressDialog;

import com.switchbee.technician.R;

import java.io.IOException;

public class SDKLoginActivity extends BaseActivity {

    private static final String TAG = "SDKLoginActivity";
    public static final int NET_SDK_CONNECT_TCP = 0;
    public static final int NET_SDK_CONNECT_DOMIN = NET_SDK_CONNECT_TCP;
    public static final int NET_SDK_CONNECT_P2P = 1;
    public static final int NET_SDK_CONNECT_P2P2 = 2;

    private Context context;
    private final String DEVICE_SN = "N8EAD137G506";
    private final String DEVICE_IP = "192.168.250.72";
    private final String NAME = "admin";
    private final String PORT = "9008";
    private final String PASSWORD = "123456";
    private RadioGroup mRadioGroup;
    private EditText mAccountEdit;
    private EditText mPasswordEdit;
    private EditText mServiceEdit;
    private EditText mPortEdit;
    private EditText mSnEdit;
    private TextView button_log_onoff;
    private boolean logOn = false;
    private int mLoginType = 0;
    private int mPrefLoginType = NET_SDK_CONNECT_TCP;//用于保存登录类型
    private SDKProgressDialog mProgressDialog;
    private nvrsdk mNVRSDK = null;


    private int errorcode = 0;

    private boolean p2pret = false;

    private OnCheckedChangeListener mOnCheckedChangeListener = new OnCheckedChangeListener() {
        @Override
        public void onCheckedChanged(RadioGroup radioGroup, int id) {
            if (id == R.id.login_device_ip) {
                mPrefLoginType = NET_SDK_CONNECT_TCP;
                mLoginType = NET_SDK_CONNECT_TYPE.NET_SDK_CONNECT_TCP;
                mServiceEdit.setText(DEVICE_IP);
                mPortEdit.setText("6036");
                mSnEdit.setText(DEVICE_SN);
                mSnEdit.setEnabled(false);
                mSnEdit.setTextColor(getResources().getColor(R.color.text_tip_color));
            } else if (id == R.id.login_device_domair) {
                mPrefLoginType = NET_SDK_CONNECT_DOMIN;
                mLoginType = NET_SDK_CONNECT_TYPE.NET_SDK_CONNECT_TCP;
                mServiceEdit.setText("nat.autonat.com");
                mPortEdit.setText("6036");
                mSnEdit.setText(DEVICE_SN);
                mSnEdit.setEnabled(false);
                mSnEdit.setTextColor(getResources().getColor(R.color.text_tip_color));
            } else if (id == R.id.login_device_p2p) {
                mPrefLoginType = NET_SDK_CONNECT_P2P;
                mLoginType = NET_SDK_CONNECT_P2P;
                mServiceEdit.setText("c2.autonat.com");
                mPortEdit.setText("40002");
                mSnEdit.setText(DEVICE_SN);
                mSnEdit.setEnabled(true);
                mSnEdit.setTextColor(getResources().getColor(R.color.text_normal_color));
            } else if (id == R.id.login_device_p2p2) {
                mPrefLoginType = NET_SDK_CONNECT_P2P2;
                mLoginType = NET_SDK_CONNECT_P2P2;
                mServiceEdit.setText("c2020.autonat.com");
                mPortEdit.setText("7968");
                mSnEdit.setText(DEVICE_SN);
                mSnEdit.setEnabled(true);
                mSnEdit.setTextColor(getResources().getColor(R.color.text_normal_color));
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        this.getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        setContentView(R.layout.activity_login);
        context = this;
        mNVRSDK = SDKApplication.getInstance().getNvrSdk();
        mRadioGroup = findViewById(R.id.login_radiogroup);
        mRadioGroup.setOnCheckedChangeListener(mOnCheckedChangeListener);
        mAccountEdit = findViewById(R.id.login_edit_username);
        mPasswordEdit = findViewById(R.id.login_edit_password);
        mServiceEdit = findViewById(R.id.login_edit_service);
        mPortEdit = findViewById(R.id.login_edit_port);
        mSnEdit = findViewById(R.id.login_edit_sn);
        button_log_onoff = findViewById(R.id.log_onoff);

//        mServiceEdit.setText(DEVICE_IP);
        setDefaultRadioGroupLoginType();
        mServiceEdit.setText(PrefUtil.getString(PrefUtil.Key.KEY_IP, DEVICE_IP));
        mPasswordEdit.setText(PrefUtil.getString(PrefUtil.Key.KEY_PWD, PASSWORD));
        mPortEdit.setText(PrefUtil.getString(PrefUtil.Key.KEY_PORT, PORT));
        mSnEdit.setText(PrefUtil.getString(PrefUtil.Key.KEY_DEVICE_SN, DEVICE_SN));
        mAccountEdit.setText(PrefUtil.getString(PrefUtil.Key.KEY_NAME, NAME));
        mProgressDialog = new SDKProgressDialog(this, "loading...");
        mProgressDialog.setListener(new SDKProgressDialog.OnTimeOutListener() {
            @Override
            public void OnBack() {
                isCancel = true;
                Toast.makeText(context, "取消登陆", Toast.LENGTH_SHORT).show();

            }
        });
        findViewById(R.id.btnSeePwd).setOnClickListener(new OnClickListener() {
            private boolean isPwdHide = true;

            @Override
            public void onClick(View view) {
                if (isPwdHide) {
                    //查看密码
                    mPasswordEdit.setInputType(InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
                } else {
                    //隐藏
                    mPasswordEdit.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
                }
                isPwdHide = !isPwdHide;
            }
        });
        button_log_onoff.setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View v) {
                if (!logOn) {
                    logOn = true;
                    button_log_onoff.setText("NativeLog on");
                    mNVRSDK.SetNativelog(true);

                } else {
                    logOn = false;
                    mNVRSDK.SetNativelog(false);
                    button_log_onoff.setText("NativeLog off");
                }
            }
        });
        findViewById(R.id.login_next).setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View view) {
                mProgressDialog.show();

                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        String account = mAccountEdit.getText().toString();
                        String password = mPasswordEdit.getText().toString();
                        String server = mServiceEdit.getText().toString().trim();
                        String portStr = mPortEdit.getText().toString();
                        int port = 0;
                        if (!ToolCommon.isEmpty(portStr)) {
                            port = Integer.parseInt(portStr);
                        }
                        String sn = mSnEdit.getText().toString();
                        isCancel = false;
                        if (mLoginType == NET_SDK_CONNECT_P2P2) {
                            mNVRSDK.CleanNat2();
                            p2pret = mNVRSDK.SetNat2Addr(server, port);
                            int no = mNVRSDK.GetLastError();
                            ToolCommon.LOGD(TAG, "run: set p2p 2.0:" + p2pret + ",error:" + no);
                        }
                        ToolCommon.LOGD(TAG, "server = " + server + " port = " + port + ",account = " + account + ",password = " + password + ",sn = " + sn + ",mLoginType = " +
                                mLoginType);
                        byte[] data;
                        if (mNVRSDK != null) {
                            boolean isWifi = false;
                            //此处使用p2p 登陆的时候需要传入当前网络是否为wifi ，不需要
                            if (mLoginType != NET_SDK_CONNECT_TCP) {
                                isWifi = NetworkUtils.isWifi(context);
                            }
                            Log.e(TAG, "run: isWifi :" + isWifi);
                            int userid = mNVRSDK.LoginEx(server, port, account, password, mLoginType, sn, isWifi);
                            if (userid == -1) {
                                runOnUiThread(new Runnable() {
                                    public void run() {
                                        mProgressDialog.dismiss();
                                        errorcode = mNVRSDK.GetLastError();
                                        Toast.makeText(SDKLoginActivity.this, "error :" + errorcode, Toast.LENGTH_SHORT).show();
                                    }
                                });
                            } else {
                                data = mNVRSDK.GetDeviceInfo(userid);
                                ToolCommon.LOGD(TAG, "run: userid :" + userid);

                                if (data == null) {
                                    runOnUiThread(new Runnable() {
                                        public void run() {
                                            mProgressDialog.dismiss();
                                            long errorcode = 0;
                                            if (mNVRSDK != null) {
                                                errorcode = mNVRSDK.GetLastError();
                                                ToolCommon.LOGD(TAG, "error no = " + errorcode);
                                            }
                                            if (errorcode == 91) {
                                                Toast.makeText(SDKLoginActivity.this, "error code 0x00000001", Toast.LENGTH_SHORT).show();
                                            } else {
                                                Toast.makeText(SDKLoginActivity.this, "login fail,errorcode = " + errorcode, Toast.LENGTH_SHORT).show();
                                            }
                                        }
                                    });
                                } else {
                                    if (SDKApplication.getInstance().getUserId1() == -1) {
                                        SDKApplication.getInstance().setUserId1(userid);
                                        SDKApplication.getInstance().setServerAddr1(server);
                                        ToolCommon.LOGD(TAG, "1userid1 :" + SDKApplication.getInstance().getUserId1() + " ,userid2:" + SDKApplication.getInstance().getUserId2() + ",serveraddr1 = " + server);
                                    } else if (SDKApplication.getInstance().getUserId2() == -1) {
                                        SDKApplication.getInstance().setUserId2(userid);
                                        SDKApplication.getInstance().setServerAddr2(server);
                                        ToolCommon.LOGD(TAG, "2userid1 :" + SDKApplication.getInstance().getUserId1() + " ,userid2:" + SDKApplication.getInstance().getUserId2() + ",serveraddr2 = " + server);
                                    }
                                    try {
                                        final NET_SDK_DEVICEINFO deviceinfo = NET_SDK_DEVICEINFO.deserialize(data, 0);
                                        String firmwareVersionEx = new String(deviceinfo.firmwareVersionEx);
                                        String deviceProduct = new String(deviceinfo.deviceProduct);
                                        ToolCommon.LOGD(TAG, "run:----deviceinfo:" + deviceinfo.toString());
                                        runOnUiThread(new Runnable() {
                                            public void run() {
                                                if (SDKApplication.getInstance() == null) {
                                                    return;
                                                }
//                                                if (SDKApplication.getInstance().getChannelCount1() == 0) {
                                                SDKApplication.getInstance().setChannelCount1(deviceinfo.videoInputNum);
                                                SDKApplication.getInstance().setLoginDeviceInfo(deviceinfo);
//                                                } else if (SDKApplication.getInstance().getChannelCount2() == 0) {
                                                SDKApplication.getInstance().setChannelCount2(deviceinfo.videoInputNum);
//                                                }
                                                mProgressDialog.dismiss();
                                                Toast.makeText(SDKApplication.getInstance(), "Login success", Toast.LENGTH_SHORT).show();


                                                //										Toast.makeText(SDKLoginActivity.this, "Please Log in to the second device.", Toast.LENGTH_SHORT).show();
                                                //										m_tvTip.setText("Log in to the second device:");
                                                //										if(SDKApplication.getInstance().getUserId2() != -1)// Log in two devices at the same time, and if you just want to log on to one device, just comment on these three lines.
                                                {
                                                    PrefUtil.saveString(PrefUtil.Key.KEY_IP, mServiceEdit.getText().toString());
                                                    PrefUtil.saveString(PrefUtil.Key.KEY_PWD, mPasswordEdit.getText().toString());
                                                    PrefUtil.saveString(PrefUtil.Key.KEY_PORT, mPortEdit.getText().toString());
                                                    PrefUtil.saveString(PrefUtil.Key.KEY_NAME, mAccountEdit.getText().toString());
                                                    PrefUtil.saveString(PrefUtil.Key.KEY_DEVICE_SN, mSnEdit.getText().toString());
                                                    PrefUtil.saveInt(PrefUtil.Key.KEY_LOGIN_TYPE, mPrefLoginType);
                                                    GoMainActivity();
                                                }
                                            }
                                        });
                                    } catch (IOException e) {
                                        e.printStackTrace();
                                    }
                                }
                            }
                        } else {
                            Toast.makeText(SDKLoginActivity.this, "Perimission denied", Toast.LENGTH_SHORT).show();
                        }
                    }
                }).start();
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (mLoginType == NET_SDK_CONNECT_P2P2 && mNVRSDK != null) {
            String server = mServiceEdit.getText().toString().trim();
            String portStr = mPortEdit.getText().toString();
            int port = 0;
            if (portStr != null && !portStr.isEmpty()) {
                try {
                    port = Integer.parseInt(portStr);
                } catch (NumberFormatException e) {
                    e.printStackTrace();
                }
            }
            mNVRSDK.CleanNat2();
            p2pret = mNVRSDK.SetNat2Addr(server, port);
            ToolCommon.LOGD(TAG, "onResume: reset p2p 2.0:" + p2pret);
        }
    }

    private void setDefaultRadioGroupLoginType() {
        int loginType = PrefUtil.getInt(PrefUtil.Key.KEY_LOGIN_TYPE, NET_SDK_CONNECT_TCP);
        if (NET_SDK_CONNECT_TCP == loginType) {
            mRadioGroup.check(R.id.login_device_ip);
        } else if (NET_SDK_CONNECT_DOMIN == loginType) {
            mRadioGroup.check(R.id.login_device_domair);
        } else if (NET_SDK_CONNECT_P2P == loginType) {
            mRadioGroup.check(R.id.login_device_p2p);
        } else if (NET_SDK_CONNECT_P2P2 == loginType) {
            mRadioGroup.check(R.id.login_device_p2p2);
        }
    }


    @Override
    public void onBackPressed() {
        super.onBackPressed();
        ToolCommon.LOGD(TAG, "onBackPressed");

    }

    private boolean isCancel = false;

    private void GoMainActivity() {
        if (isCancel) {
            ToolCommon.LOGD(TAG, "GoMainActivity: return");
            return;
        }
        this.startActivity(new Intent(SDKLoginActivity.this, SDKMainActivity.class));
        finish();
    }

    @Override
    protected void onDestroy() {
        mNVRSDK = null;
        super.onDestroy();
    }

}
