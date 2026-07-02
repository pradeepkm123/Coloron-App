package com.sdk.interfance;

import android.content.Context;
import android.content.Intent;
import android.net.wifi.WifiManager;
import android.net.wifi.WifiManager.MulticastLock;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.WindowManager;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.RadioGroup;
import android.widget.RadioGroup.OnCheckedChangeListener;
import android.widget.TableLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.sdk.interfance.Util.LOG;
import com.sdk.network.StoragePath;
import com.sdk.test.app.SDKApplication;
import com.sdk.test.view.SDKProgressDialog;

import com.switchbee.technician.R;

public class SDKLoginTypeActivity extends BaseActivity
{
	private static final String TAG = "SDKLoginTypeActivity";
	private final int DEVICE_TYPE = 0;
	private final int SERVICE_TYPE = 1;
	private RadioGroup mRadioGroup;
	private int type = DEVICE_TYPE;
	private LinearLayout mRegisterLayout;
	private EditText mRegisterTimeEditText;
	private SDKProgressDialog mProgressDialog;
	private nvrsdk mNVRSDK = null;

	@Override
	protected void onCreate(Bundle savedInstanceState)
	{
		super.onCreate(savedInstanceState);
		this.getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
		WindowManager wm = this.getWindowManager();
//		LogcatHelper.getInstance(this).start();
		
		StoragePath.m_iScreenWidth = wm.getDefaultDisplay().getWidth();
		StoragePath.m_iScreenHeight = wm.getDefaultDisplay().getHeight();
		Log.d(TAG, "onCreate:---width = " + StoragePath.m_iScreenWidth + ",height = " + StoragePath.m_iScreenHeight);
		setContentView(R.layout.activity_login_type);

		String cpuarch = CheckCPU.getArchType(this);
		if (null == cpuarch)
		{
			cpuarch ="";
		}

		boolean res = CheckCPU.isCPUInfo64();

		boolean res1 = CheckCPU.isLibc64();
		TextView tvCpuArch = findViewById(R.id.tvCpuArch);
		String strInfo = "cpuarch=" + cpuarch + " isCPUInfo64=" + res + " isLibc64=" + res1+ " version= "+ Build.VERSION.SDK_INT;
		tvCpuArch.setText(strInfo);

		mRegisterLayout = (TableLayout) findViewById(R.id.register_form);
		mRegisterLayout.setVisibility(View.GONE);
		mRegisterTimeEditText = (EditText) findViewById(R.id.register_port);
		mRadioGroup = (RadioGroup) findViewById(R.id.login_type_radiogroup);
		mRadioGroup.setOnCheckedChangeListener(new OnCheckedChangeListener()
		{
			@Override
			public void onCheckedChanged(RadioGroup group, int checkedId)
			{
				if (checkedId == R.id.login_type_device)
				{
					type = DEVICE_TYPE;
					mRegisterLayout.setVisibility(View.GONE);
				}
				else if (checkedId == R.id.login_type_service)
				{
					type = SERVICE_TYPE;
					mRegisterLayout.setVisibility(View.VISIBLE);
				}
			}
		});

		findViewById(R.id.login_type_next).setOnClickListener(new OnClickListener()
		{
			@Override
			public void onClick(View arg0)
			{
				if (type == DEVICE_TYPE)
				{
					if (mNVRSDK == null)
					{
						Toast.makeText(SDKLoginTypeActivity.this, "Permission denied", Toast.LENGTH_SHORT).show();
						return;
					}
					startActivity(new Intent(SDKLoginTypeActivity.this, SDKLoginActivity.class));
					finish();
				}
				else if (type == SERVICE_TYPE)
				{
					mProgressDialog.show();
					new Thread(new Runnable()
					{
						@Override
						public void run()
						{
							if (mNVRSDK == null)
							{
								return;
							}
							int port = Integer.parseInt(mRegisterTimeEditText.getText().toString());
							final int userId = (int) mNVRSDK.SetRegisterPort(port);
							if (userId == -1)
							{
								runOnUiThread(new Runnable()
								{
									public void run()
									{
										mProgressDialog.dismiss();
										Toast.makeText(SDKLoginTypeActivity.this, "No device register", Toast.LENGTH_SHORT).show();
									}
								});
							}
							else
							{
								runOnUiThread(new Runnable()
								{
									public void run()
									{
										mProgressDialog.dismiss();
										startActivity(new Intent(SDKLoginTypeActivity.this, SDKMainActivity.class));
										SDKApplication.getInstance().setUserId1(userId);
										Toast.makeText(SDKLoginTypeActivity.this, "device register", Toast.LENGTH_SHORT).show();
										finish();
									}
								});

							}
						}
					}).start();

				}
			}
		});
		mProgressDialog = new SDKProgressDialog(this, "loading");

		mNVRSDK = null;
		LOG.setLogSwitch(true);
		SDKApplication.getInstance().setNvrSdk(null);
		init();
	}

	public void init()
	{
		mNVRSDK = nvrsdk.getInstance(this);
		SDKApplication.getInstance().setNvrSdk(mNVRSDK);

//		WifiManager wifiManager = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
//		MulticastLock multicastLock = wifiManager.createMulticastLock("multicast.test");
//		multicastLock.acquire();
	}

	@Override
	protected void onDestroy()
	{
		super.onDestroy();
	}


	@Override
	public boolean onKeyDown(int keyCode, KeyEvent event)
	{
		switch (keyCode)
		{
			case KeyEvent.KEYCODE_BACK:
			{
				if (mNVRSDK != null)
				{
					mNVRSDK.Cleanup();
				}
				this.finish();
				System.exit(0);
			}
			default:
				break;
		}
		return true;
	}
}
