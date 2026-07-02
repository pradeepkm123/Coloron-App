package com.sdk.interfance;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.content.ContextCompat;

import com.sdk.test.app.SDKApplication;
import com.sdk.test.view.SDKProgressDialog;
import com.switchbee.technician.R;

import java.io.ByteArrayInputStream;
import java.io.DataInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;

//import me.rosuh.filepicker.config.FilePickerManager;

public class SDKMainActivity extends BaseActivity {
	private static final String TAG = "SDKMainActivity";
	private SDKProgressDialog mProgressDialog;
	private nvrsdk mNVRSDK = null;

	private OnClickListener mOnClickListener = new OnClickListener() {
		@Override
		public void onClick(View view) {
			int id = view.getId();
			switch (id) {
				case R.id.main_search_device: {
					mProgressDialog.setMessage("===searching!!!!!");
					mProgressDialog.show();

					new Thread(new Runnable() {
						@Override
						public void run() {
							NET_SDK_DEVICE_DISCOVERY_INFO[] devices = new NET_SDK_DEVICE_DISCOVERY_INFO[100];
							final long result = mNVRSDK.SearchDevice(20, devices, 100);
							mProgressDialog.dismiss();

							// 输出搜索结果
							System.out.println("Search result: " + result);
							// 处理搜索到的设备信息
							for(int i=0; i<result; i++)
							{
								System.out.println("Device Type: " + devices[i].deviceType);
								System.out.println("IP Address: " + devices[i].ipAddress);
							}
							runOnUiThread(new Runnable() {
								public void run() {
									mProgressDialog.dismiss();
									Toast.makeText(SDKMainActivity.this, "find device " + result, Toast.LENGTH_LONG).show();
								}
							});

//							for (NET_SDK_DEVICE_DISCOVERY_INFO device : devices) {
//								try{
//									// 输出设备信息，这里只是示例，实际情况可能需要根据具体字段进行处理
//									System.out.println("Device Type: " + device.deviceType);
//									System.out.println("IP Address: " + device.ipAddress);
//								}catch (Exception ignored)
//								{
//
//								}
//
//							}


//							final long ret = SDKDeviceSearch.NET_SDK_DiscoverDevice(data, 30, SDKMainActivity.this);
//							runOnUiThread(new Runnable() {
//								public void run() {
//									mProgressDialog.dismiss();
//									if(data.size()>0)
//									{
//
//										Toast.makeText(SDKMainActivity.this, "find device " + ret + "; ip: "+ data.get(0).m_strIP + "; MAC: " + data.get(0).m_strMAC, Toast.LENGTH_SHORT).show();
//									}
//									else{
//										Toast.makeText(SDKMainActivity.this, "find device " + ret, Toast.LENGTH_SHORT).show();
//									}
//
//									System.out.println("----------find device  " + ret);
//								}
//							});
						}
					}).start();
					break;
				}
				case R.id.main_device_live:
					startActivity(new Intent(SDKMainActivity.this, SDKLiveActivity.class));
					break;
				case R.id.main_one_device_live:
					startActivity(new Intent(SDKMainActivity.this, SDKLiveOneBigActivity.class));
					break;
				case R.id.main_device_other:
					startActivity(new Intent(SDKMainActivity.this, SDKOtherActivity.class));
					break;
				case R.id.main_device_record:
					startActivity(new Intent(SDKMainActivity.this, SDKRecordActivity.class));

					break;
				case R.id.main_device_local_record://play video record file when you record file in LiveView module.
					startActivity(new Intent(SDKMainActivity.this, SDKLocalRecordActivity.class));
					break;
				case R.id.main_SDKAlarmActivity://alarm
					SDKAlarmActivity.startInstance(SDKMainActivity.this);
					break;
				case R.id.main_SDKFaceActivity://face
					SDKFaceActivity.startInstance(SDKMainActivity.this);
					break;
				case R.id.main_device_logOut:
					if (mNVRSDK == null) {
						return;
					}
					SDKApplication.getInstance().logout();
					mNVRSDK.Cleanup();
//				LogcatHelper.getInstance(SDKMainActivity.this).stop();
					startActivity(new Intent(SDKMainActivity.this, SDKLoginTypeActivity.class));
					finish();
					break;
				case R.id.tvMediaCodecType://face
					ToolCommon.isForceSoftCodec = !ToolCommon.isForceSoftCodec;
					if (ToolCommon.isForceSoftCodec) {
						tvMediaCodecType.setText("soft");
					} else {
						tvMediaCodecType.setText("hard");
					}
					break;
				case R.id.main_ipc_upgrade:
					if (ContextCompat.checkSelfPermission(SDKMainActivity.this, Manifest.permission.READ_EXTERNAL_STORAGE) ==
							PackageManager.PERMISSION_GRANTED) {
						// You can use the API that requires the permission.
						openFile();
					} else {
						// You can directly ask for the permission.
						requestPermissions(new String[]{Manifest.permission.READ_EXTERNAL_STORAGE},
								PERMISSION_REQUEST_CODE);
					}
					break;
				default:
					break;
			}
		}
	};

	// Request code for selecting a PDF document.
	private static final int PICK_PDF_FILE = 2;
	private static final int PERMISSION_REQUEST_CODE = 1;

	private void openFile() {


		Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
		intent.addCategory(Intent.CATEGORY_OPENABLE);
		intent.setType("*/*");

		// Optionally, specify a URI for the file that should appear in the
		// system file picker when it loads.
//        intent.putExtra(DocumentsContract.EXTRA_INITIAL_URI, pickerInitialUri);

		startActivityForResult(intent, PICK_PDF_FILE);
	}

	Button tvMediaCodecType;


	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		this.getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
		mNVRSDK = SDKApplication.getInstance().getNvrSdk();
		setContentView(R.layout.activity_main);
		findViewById(R.id.main_search_device).setOnClickListener(mOnClickListener);
		findViewById(R.id.main_device_live).setOnClickListener(mOnClickListener);
		findViewById(R.id.main_device_other).setOnClickListener(mOnClickListener);
		findViewById(R.id.main_device_record).setOnClickListener(mOnClickListener);
		findViewById(R.id.main_device_logOut).setOnClickListener(mOnClickListener);
		findViewById(R.id.main_device_local_record).setOnClickListener(mOnClickListener);
		findViewById(R.id.main_SDKAlarmActivity).setOnClickListener(mOnClickListener);
		findViewById(R.id.main_SDKFaceActivity).setOnClickListener(mOnClickListener);
		findViewById(R.id.main_one_device_live).setOnClickListener(mOnClickListener);
		Button button = findViewById(R.id.main_ipc_upgrade);
		button.setOnClickListener(mOnClickListener);
		tvMediaCodecType = findViewById(R.id.tvMediaCodecType);
		tvMediaCodecType.setOnClickListener(mOnClickListener);
		findViewById(R.id.upgrade_progress).setVisibility(View.INVISIBLE);
		NET_SDK_DEVICEINFO deviceInfo = SDKApplication.getInstance().getLoginDeviceInfo();

		if (deviceInfo!=null && deviceInfo.deviceType == NET_SDK_DEVICE_TYPE.NET_SDK_IPCAMERA){
			button.setText("Upgrade IPC");
		} else if (deviceInfo!=null && deviceInfo.deviceType == NET_SDK_DEVICE_TYPE.NET_SDK_NVR) {
			button.setText("Upgrade NVR");
		}
		ToolCommon.LOGD(TAG, "MainActivity onCreate");
		mProgressDialog = new SDKProgressDialog(this, "loading...");

	}


	@Override
	public boolean onKeyDown(int keyCode, KeyEvent event) {
		switch (keyCode) {
			case KeyEvent.KEYCODE_BACK: {
				if (mNVRSDK != null) {
					mNVRSDK.Cleanup();
				}
				SDKApplication.getInstance().clearAllActivity();
			}
			default:
				break;
		}
		return true;
	}

	@Override
	public void onRequestPermissionsResult(int requestCode, String[] permissions,
										   int[] grantResults) {
		switch (requestCode) {
			case PERMISSION_REQUEST_CODE:
				// If request is cancelled, the result arrays are empty.
				if (grantResults.length > 0 &&
						grantResults[0] == PackageManager.PERMISSION_GRANTED) {
					openFile();
				}
				return;
		}
		// Other 'case' lines to check for other
		// permissions this app might request.
	}

	private void delay(int ms){
		try{
			Thread.currentThread();
			Thread.sleep(ms);
		}catch (InterruptedException e){
			e.printStackTrace();
		}
	}

	private void UpgradeIPC(String filepath)
	{
		// 升级IPC
		mNVRSDK = SDKApplication.getInstance().getNvrSdk();
		mNVRSDK.SetConnectTime(5000000, 3);
		mNVRSDK.SetReconnect(5000, true);
		int userid = SDKApplication.getInstance().getUserId1();
		Log.d("=== Upgrade IPC ===", String.valueOf(userid));
		long lUpgradeHandle = mNVRSDK.UpgradeIPC(userid, filepath, 0);
		Log.d("=== Upgrade IPC handle ===", String.valueOf(lUpgradeHandle));
		if(lUpgradeHandle != -1){
			while(true){
				int nState = mNVRSDK.GetUpgradeState(lUpgradeHandle);
				if(nState == 3 || nState == 4 || nState == 5){
					Log.d("=== Upgrade fail nState: ", String.valueOf(nState));
					break;
				}
				UpgradeResult ur = mNVRSDK.GetUpgradeProgress(lUpgradeHandle);

				if (ur.progress >= 100) {
					Log.d("=== Upgrade successful. ", String.valueOf(ur.progress));
					mNVRSDK.CloseUpgradeHandle(lUpgradeHandle);
					break;
				}
				Log.d("=== Upgrade nPos. ", String.valueOf(ur.progress));
				Log.d("=== Upgrade nState. ", String.valueOf(nState));
				Log.d("=== Upgrade errCode. ", String.valueOf(ur.codeRet));
				delay(1000);
			}
		}
	}

	private void UpgradeNVR(String filepath)
	{
		mNVRSDK = SDKApplication.getInstance().getNvrSdk();
		mNVRSDK.SetConnectTime(5000000, 3);
		mNVRSDK.SetReconnect(5000, true);
		int userid = SDKApplication.getInstance().getUserId1();
		Log.d("=== Upgrade NVR ===", String.valueOf(userid));
		final long lUpgradeHandle = mNVRSDK.Upgrade(userid, filepath);
		Log.d("=== Upgrade NVR handle ===", String.valueOf(lUpgradeHandle));
		HandlerThread handlerThread = new HandlerThread("MyHandlerThread");
		handlerThread.start();
		Handler backgroundHandler = new Handler(handlerThread.getLooper());
		backgroundHandler.post(new Runnable() {
			@Override
			public void run() {
				if(lUpgradeHandle != -1){
					final ProgressBar bar = findViewById(R.id.upgrade_progress);
					bar.setVisibility(View.VISIBLE);
					while(true){
						int nState = mNVRSDK.GetUpgradeState(lUpgradeHandle);
						if(nState == 3 || nState == 4 || nState == 5){
							Log.d("=== Upgrade fail nState: ", String.valueOf(nState));
							Toast.makeText(getBaseContext(), "Upgrade Failed.", Toast.LENGTH_SHORT).show();
							break;
						}
						final UpgradeResult ur = mNVRSDK.GetUpgradeProgress(lUpgradeHandle);

						if (ur.progress >= 100) {
							Log.d("=== Upgrade successful. ", String.valueOf(ur.progress));
							Toast.makeText(getBaseContext(), "Upgrade successful. ", Toast.LENGTH_SHORT).show();
							mNVRSDK.CloseUpgradeHandle(lUpgradeHandle);
							break;
						}
						if(ur.codeRet!=0){
							Log.d("Upgrade failed", "error code:  "+ ur.codeRet);
							Toast.makeText(getBaseContext(), "Upgrade Failed, Error code: "+ ur.codeRet, Toast.LENGTH_SHORT).show();
							mNVRSDK.CloseUpgradeHandle(lUpgradeHandle);
							break;
						}
						runOnUiThread(new Runnable() {
							@Override
							public void run() {
								// 这里进行UI更新
								bar.setProgress(ur.progress);
							}
						});

						Log.d("=== Upgrade nPos. ", String.valueOf(ur.progress));
						Log.d("=== Upgrade nState. ", String.valueOf(nState));
						Log.d("=== Upgrade errCode. ", String.valueOf(ur.codeRet));
						delay(2000);
					}
					runOnUiThread(new Runnable() {
						@Override
						public void run() {
							// 这里进行UI更新
							bar.setVisibility(View.INVISIBLE);
						}
					});


				}else{
					int errCode = mNVRSDK.GetLastError();
					Log.d("=== Upgrade NVR error code", String.valueOf(errCode));
					Toast.makeText(getBaseContext(), "Upgrade Failed, Error code: " + errCode, Toast.LENGTH_SHORT).show();
				}
			}
		});

	}

	public static String restoreMacAddress(byte[] macBytes) {
		StringBuilder macAddress = new StringBuilder();
		for (int i = 0; i < macBytes.length; i++) {
			macAddress.append(String.format("%02X", macBytes[i] & 0xFF));
			if (i < macBytes.length - 1) {
				macAddress.append(":");
			}
		}
		return macAddress.toString();
	}

	@Override
	protected void onActivityResult(int requestCode, int resultCode, Intent data) {
		super.onActivityResult(requestCode, resultCode, data);
		if (requestCode == PICK_PDF_FILE && resultCode == RESULT_OK && data != null) {
			Uri uri = data.getData();
            assert uri != null;
            String filePath = uri.getPath();
//			String path = FileUtils.getPath(this, uri);
			String path = FileUtils.copyUriToFile(this, uri);
            assert filePath != null;
            assert path != null;
            Log.d("=== file path ===", path);
			this.<TextView>findViewById(R.id.tv_data).setText("Path:" + path );
	//		 //升级IPC
	//		UpgradeIPC(path);

			// 升级NVR
			NET_SDK_DEVICEINFO deviceInfo = SDKApplication.getInstance().getLoginDeviceInfo();

			if (deviceInfo.deviceType == NET_SDK_DEVICE_TYPE.NET_SDK_IPCAMERA){

			} else if (deviceInfo.deviceType == NET_SDK_DEVICE_TYPE.NET_SDK_NVR) {
				UpgradeNVR(path);
			}

		}

		// 显示MAC地址  NVR
//		int userid = SDKApplication.getInstance().getUserId1();
//		String xml = "<?xml version: \"1.0\" encoding=\"utf-8\" ?><request version=\"1.0\"  systemType=\"NVMS-9000\" clientType=\"WEB\"></request>";
//		String url = "queryNetStatus";
//		String resp = mNVRSDK.transparentConfig(userid, xml, url);
//		Log.d("=== transparentConfig ===", resp);


		// GetDeviceInfo  IPC
//		int userid = SDKApplication.getInstance().getUserId1();
//		String xml = "<?xml version: \"1.0\" encoding=\"utf-8\" ?><request version=\"1.0\"  systemType=\"NVMS-9000\" clientType=\"WEB\"></request>";
//		String url = "GetDeviceInfo";
//		String resp = mNVRSDK.transparentConfig(userid, xml, url);
//		Log.d("=== transparentConfig ===", resp);

		// 通过接口获取mac地址
//		int userid = SDKApplication.getInstance().getUserId1();
//		byte[] deviceInfoBytes = mNVRSDK.GetDeviceInfo(userid);
//		try {
//			final NET_SDK_DEVICEINFO deviceinfo2 = NET_SDK_DEVICEINFO.deserialize(deviceInfoBytes, 0);
//			Log.d("=== mac ===", restoreMacAddress(deviceinfo2.deviceMAC));
//		} catch (IOException e) {
//			throw new RuntimeException(e);
//		}

		// 测试导出日志
		//bool ret = NET_SDK_GetConfigFile(userid, m_exportPath.GetBuffer());
//		Uri uri = data.getData();
//		String path = FileUtils.getPath(this, uri);
//		Log.d("=== file path ===", path);
//		String ttt = "/storage/emulated/0/SDK_NVR/config.dat";
//		boolean ret = mNVRSDK.GetConfigFile(userid, ttt);
//		Log.d("=== GetConfigFile === ", String.valueOf(ret));

		// 导入日志
//		boolean tmp = mNVRSDK.UserManage(userid, 2, "admin", 1, "Aa123456!", "", true, "admin", false);
//		Log.d("=== UserManage ===", String.valueOf(tmp));
//		int ttt =  mNVRSDK.GetLastError();
//		Log.d("=== UserManage GetLastError ===", String.valueOf(ttt));
	}


}
