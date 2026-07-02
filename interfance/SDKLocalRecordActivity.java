package com.sdk.interfance;

import com.sdk.interfance.bean.N9000SmartASDContainer;
import com.sdk.interfance.bean.N9000SmartCommonContainer;
import com.sdk.interfance.bean.N9000SmartVSDContainer;
import com.sdk.interfance.bean.N900AlarmFaceIPCContainer;
import com.sdk.interfance.bean.N900AlarmVFDContainer;
import com.sdk.interfance.bean.NET_SDK_AUDIO_ABNORMAL_INFO_T;
import com.sdk.interfance.bean.NET_SDK_IVE_AVD_T;
import com.sdk.interfance.bean.NET_SDK_IVE_FACE_MATCH_T;
import com.sdk.network.CFrameData;
import com.sdk.network.StoragePath;
import com.sdk.network.VideoPlayer;
import com.sdk.test.app.SDKApplication;
import com.sdk.test.utils.FileOperation;
import com.sdk.test.utils.ReadCFrameDataInterface;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.view.View.OnClickListener;
import android.widget.AbsoluteLayout;
import android.widget.Button;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;

import com.sdk.interfance.SDKDefs.*;

import java.util.logging.Logger;

/**
 * It's just an example.you can do it yourself.
 * play video record file when you record file in LiveView module.
 * @author Administrator
 *
 */
public class SDKLocalRecordActivity extends BaseActivity implements NVRSDKCallback, ReadCFrameDataInterface
{
	private int SCREENWIDTH, SCREENHEIGHT;
	private VideoPlayer mVideoView;
	private nvrsdk mNVRSDK = null;
	private int mUserID = 0;
	private int m_iChannelCount = 0;
	private AbsoluteLayout m_PlayLayout;
	private FileOperation m_fileoperation = null;
	private void checkPermission() {//小米手机4w即使在手机打开应用权限之后也无法使用权限，需要调用这个方法动态申请权限
		//检查权限（NEED_PERMISSION）是否被授权 PackageManager.PERMISSION_GRANTED表示同意授权
		if (ActivityCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
				!= PackageManager.PERMISSION_GRANTED) {
			//用户已经拒绝过一次，再次弹出权限申请对话框需要给用户一个解释
			if (ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission
					.WRITE_EXTERNAL_STORAGE)) {
//				Toast.makeText(this, "请开通相关权限，否则无法正常使用本应用！", Toast.LENGTH_SHORT).show();
			}
			//申请权限
			ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, 123);

		} else {
//			Toast.makeText(this, "授权成功！", Toast.LENGTH_SHORT).show();
		}
	}
	//当应用请求权限时，系统将向用户显示一个对话框。当用户响应时，系统将调用应用的 onRequestPermissionsResult() 方法，向其传递用户响应。您的应用必须替换该方法，以了解是否已获得相应权限。回调会将您传递的相同请求代码传递给 requestPermissions()。
	@Override
	public void onRequestPermissionsResult(int requestCode,
										   String permissions[], int[] grantResults)
	{
		switch (requestCode)
		{
			case 123:
			{
				// If request is cancelled, the result arrays are empty.
				if (null != grantResults && grantResults.length > 0
						&& grantResults[0] == PackageManager.PERMISSION_GRANTED)
				{
					//这里的两句语句是我写的创建文件的语句，在授权成功是时候会调用这里的语句。
//					String fileName = m_fileoperation.getFileName("test", "test_file", this);
					Log.d("===permission","===permission permit====");

//					Toast.makeText(this, "文件目录已经创建好了", Toast.LENGTH_SHORT).show();
					// permission was granted, yay! Do the
					// contacts-related task you need to do.

				}
				else
				{
					Log.d("===permission","===permission denied====");
					// permission denied, boo! Disable the
					// functionality that depends on this permission.
				}
				return;
			}

			// other 'case' lines to check for other
			// permissions this app might request
		}
	}
	@Override
	protected void onCreate(Bundle savedInstanceState)
	{
		super.onCreate(savedInstanceState);
		this.getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
		checkPermission();
		SCREENWIDTH = StoragePath.m_iScreenWidth;
		SCREENHEIGHT = StoragePath.m_iScreenHeight;
		mNVRSDK = SDKApplication.getInstance().getNvrSdk();
		if (mNVRSDK == null)
		{
			return;
		}
		mNVRSDK.SetCallback(this);
		mNVRSDK.SetID(111);

		mUserID = SDKApplication.getInstance().getUserId1();
		m_iChannelCount = SDKApplication.getInstance().getChannelCount1();

		SetupUI();
		setContentView(m_PlayLayout);

		if (m_fileoperation == null)
		{
			m_fileoperation = new FileOperation(this, this);
		}
		m_fileoperation.StartReadFileThread();
	}

	@Override
	protected void onDestroy()
	{
		super.onDestroy();
		if(m_fileoperation != null)
		{
			m_fileoperation.StopReadFile();
		}
		if (mVideoView != null)
		{
			mVideoView.stopAudio();
			mVideoView.stopRecord();
			mVideoView.setPermissionDenied(true);						
			mVideoView.stop();
			mVideoView.RestoreVideoSize();
		}
		mNVRSDK.SetCallback(null);
		mNVRSDK =null;
	}

	public void SetupUI()
	{
		if (m_PlayLayout == null)
		{
			int itextwidth = SCREENWIDTH / 3;
			int itextheight = 120;
			int ihdistance = 20;
			int ieditwidth = SCREENWIDTH - ihdistance * 2 - itextwidth;

			m_PlayLayout = new AbsoluteLayout(this);
			m_PlayLayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT, 0, 0));
			m_PlayLayout.setBackgroundColor(Color.WHITE);

			Button btnReturn = new Button(this);
			btnReturn.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ihdistance, ihdistance));
			btnReturn.setTextColor(Color.BLACK);
			btnReturn.setTextSize(15);
			btnReturn.setText("Return");
			m_PlayLayout.addView(btnReturn);
			btnReturn.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					if(m_fileoperation != null)
					{
						m_fileoperation.StopReadFile();
					}
					if (mVideoView != null)
					{
						mVideoView.stopAudio();
						mVideoView.stopRecord();
						mVideoView.setPermissionDenied(true);						
						mVideoView.stop();
						mVideoView.RestoreVideoSize();
					}
					
					startActivity(new Intent(SDKLocalRecordActivity.this,SDKMainActivity.class));
					SDKLocalRecordActivity.this.finish();
				}
			});

			mVideoView = VideoPlayer.getVideoView(this);
			if (mVideoView != null)
			{
				mVideoView.setCallback(null);
				mVideoView.setDropState(false);
				mVideoView.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH - 2, SCREENWIDTH * 2 / 3, 1, ihdistance + itextheight * 2));
				mVideoView.SetupLayout("Device Offline", StoragePath.m_iScreenWidth, StoragePath.m_iScreenHeight);
				m_PlayLayout.addView(mVideoView);
			}

		}
	}

	@Override
	public void onVideoData(long liveHandle, int iNodeID, byte[] data, int frameLen, long timeStamp, boolean isKeyFrame, int width, int height, int frameIndex, int encodeType,
			int frameType)
	{
		// TODO Auto-generated method stub

	}

	@Override
	public void onVideoDataFormatHead(long liveHandle, int iEncodeType)
	{
		// TODO Auto-generated method stub

	}

	@Override
	public void onAudioData(long liveHandle, int iNodeID, byte[] data, int frameLen, long timeStamp, int iSampleRateInHz, int b8BitWidth, int bMono, int encodeType)
	{
		// TODO Auto-generated method stub

	}

	@Override
	public void onTalkData(int byAudioFlag, int dwBufSize, byte[] pRecvDataBuffer)
	{
		// TODO Auto-generated method stub

	}

	@Override
	public void ExceptionCallback(int dwType, int lUserID, int lHandle)
	{
		// TODO Auto-generated method stub

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

	long dwLowDateTime1 = 0;
	long dwLowDateTime2 = 0;
	boolean bfirstframe = true;
	int iframecount = 0;


	@Override
	public void PlayCFrameData(CFrameData iCFrameData)
	{
		if (iCFrameData == null)
		{
			return;
		}
		if (mVideoView != null && iCFrameData != null)
		{
//			long time = 0;
//			dwLowDateTime2 = iCFrameData.dwLowDateTime;
//			if (dwLowDateTime1 != 0)
//			{
//				time = dwLowDateTime2 - dwLowDateTime1;
////				System.out.println("-----2-------onVideoData space Time = "+time+",dwLowDateTime2 = "+dwLowDateTime2+",dwLowDateTime1 = "+dwLowDateTime1);
//			}
//			dwLowDateTime1 = dwLowDateTime2;

//			iframecount++;
//			System.out.println("--------------PlayCFrameData().iCFrameData is not null-----------iCFrameData.width = " + iCFrameData.iFrameWidth + ",iCFrameData.height = "
//					+ iCFrameData.iFrameHeight + ",time = " + iCFrameData.dwLowDateTime + ",encodetype = " + iCFrameData.iEncodeType + ",iskeyframe = " + iCFrameData.isKeyFrame
//					+ ",GetStructSize = " + iCFrameData.GetStructSize() + ",icount = " + iframecount + ",space time = " + time + ",index = " + iCFrameData.iFrameIndex);

			if (bfirstframe)
			{
				mVideoView.playVideoDataFormatHead(0, iCFrameData.iEncodeType);
				bfirstframe = false;
				mVideoView.setLiveHandle(0);
				mVideoView.start();
				mVideoView.setChannelID(iCFrameData.iNodeID);
				mVideoView.setPermissionDenied(false);
				mVideoView.setDropState(false);
			}
			if (dwLowDateTime1 == 0L) {
				dwLowDateTime1 = iCFrameData.dwLowDateTime ;
			}else {
				dwLowDateTime2 = iCFrameData.dwLowDateTime ;
				SystemClock.sleep(dwLowDateTime2 - dwLowDateTime1);
				dwLowDateTime1 = dwLowDateTime2;
			}

			//do it like in SDKLiveActivity of onVideoData()
			mVideoView.playVideoData(iCFrameData);
		}
	}
}
