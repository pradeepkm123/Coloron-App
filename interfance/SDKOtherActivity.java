package com.sdk.interfance;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;

import com.sdk.interfance.bean.N9000SmartASDContainer;
import com.sdk.interfance.bean.N9000SmartCommonContainer;
import com.sdk.interfance.bean.N9000SmartVSDContainer;
import com.sdk.interfance.bean.N900AlarmFaceIPCContainer;
import com.sdk.interfance.bean.N900AlarmVFDContainer;
import com.sdk.interfance.bean.NET_SDK_AUDIO_ABNORMAL_INFO_T;
import com.sdk.interfance.bean.NET_SDK_IVE_AVD_T;
import com.sdk.interfance.bean.NET_SDK_IVE_FACE_MATCH_T;
import com.sdk.network.StoragePath;
import com.sdk.test.app.SDKApplication;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.View.OnClickListener;
import android.widget.AbsoluteLayout;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

public class SDKOtherActivity extends BaseActivity implements NVRSDKCallback
{
	private static final String TAG = "NVRNDK";
	private nvrsdk mNVRSDK = null;
	private AbsoluteLayout m_ToolLayout;
	private int SCREENWIDTH, SCREENHEIGHT;
	private int mUserID = 0;
	private CheckBox m_rbSystem = null;
	private CheckBox m_rbBackup = null;
	private CheckBox m_rbError = null;
	private CheckBox m_rbConfig = null;
	private CheckBox m_rbSearch = null;
	private CheckBox m_rbPlayback = null;
	private CheckBox m_rbInformation = null;
	private EditText m_etSysTime = null;
	private ScrollView m_scLayout = null;
	private ArrayList<NET_SDK_LOG> m_fileList = new ArrayList<NET_SDK_LOG>();
	private String reqStr ;
	private EditText m_etconfigReq  = null;

	@Override
	protected void onCreate(Bundle savedInstanceState)
	{
		super.onCreate(savedInstanceState);
		this.getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
		SCREENWIDTH = StoragePath.m_iScreenWidth;
		SCREENHEIGHT = StoragePath.m_iScreenHeight;		
		Log.d(TAG,"--2----width = "+StoragePath.m_iScreenWidth+",height = "+StoragePath.m_iScreenHeight);
		mNVRSDK = SDKApplication.getInstance().getNvrSdk();
		if (mNVRSDK == null)
		{
			return;
		}

		mNVRSDK.SetCallback(this);
		mNVRSDK.SetID(111);

		mUserID = SDKApplication.getInstance().getUserId1();
		SetupUI();
		setContentView(m_scLayout);
	}

	@Override
	protected void onDestroy()
	{
		mNVRSDK.SetCallback(null);
		mNVRSDK = null;
		super.onDestroy();
	}

	public void SetupUI()
	{
		if (m_ToolLayout == null)
		{
			int itextwidth = SCREENWIDTH / 3;
			int itextheight = 160;
			int ihdistance = 20;
			int ieditwidth = SCREENWIDTH - ihdistance * 2 - itextwidth;

			m_scLayout = new ScrollView(this);
			m_scLayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT, 0, 0));

			m_ToolLayout = new AbsoluteLayout(this);
			m_ToolLayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT, 0, 0));
			m_ToolLayout.setBackgroundColor(Color.WHITE);
			m_scLayout.addView(m_ToolLayout);

			Button btnLogout = new Button(this);
			btnLogout.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ihdistance, ihdistance));
			btnLogout.setTextColor(Color.BLACK);
			btnLogout.setTextSize(15);
			btnLogout.setText("Return");
			m_ToolLayout.addView(btnLogout);
			btnLogout.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					startActivity(new Intent(SDKOtherActivity.this, SDKMainActivity.class));
					SDKOtherActivity.this.finish();
				}
			});

			int itopposition = ihdistance * 2 + itextheight;
			int ileft = ihdistance;
			itextwidth = (SCREENWIDTH - ihdistance * 3) / 2;
			
			TextView tvtime = new TextView(this);
			tvtime.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH-ihdistance*2, itextheight, ileft, itopposition));
			tvtime.setGravity(Gravity.CENTER);
			tvtime.setTextColor(Color.BLACK);
			tvtime.setTextSize(15);
			tvtime.setText("(*):this function dose not support n9000 devices.");
			m_ToolLayout.addView(tvtime);
			
			itopposition +=itextheight;
			tvtime = new TextView(this);
			tvtime.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH-ihdistance*2, itextheight, ileft, itopposition));
			tvtime.setGravity(Gravity.CENTER);
			tvtime.setTextColor(Color.BLACK);
			tvtime.setTextSize(15);
			tvtime.setText("(**):The maximum number of this function's return value is 100.");
			m_ToolLayout.addView(tvtime);
			
			itopposition +=itextheight;
			tvtime = new TextView(this);
			tvtime.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ileft, itopposition));
			tvtime.setGravity(Gravity.CENTER);
			tvtime.setTextColor(Color.BLACK);
			tvtime.setTextSize(15);
			tvtime.setText("Dvr System Time : ");
			m_ToolLayout.addView(tvtime);

			ileft += ihdistance + itextwidth;
			m_etSysTime = new EditText(this);
			m_etSysTime.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ileft, itopposition));
			m_etSysTime.setGravity(Gravity.CENTER);
			m_etSysTime.setTextSize(15);
			m_etSysTime.setText("2017-01-06 11:29:30");
			m_ToolLayout.addView(m_etSysTime);

			itopposition += ihdistance + itextheight;
			ileft = ihdistance;
			Button btnGetTime = new Button(this);
			btnGetTime.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ileft, itopposition));
			btnGetTime.setTextColor(Color.BLACK);
			btnGetTime.setTextSize(15);
			btnGetTime.setText("Get Dvr System Time");
			m_ToolLayout.addView(btnGetTime);
			btnGetTime.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					if (mNVRSDK != null)
					{
						String time = mNVRSDK.GetDeviceTime(mUserID);
						if (time != null)
						{
							time = time.substring(time.indexOf(":") + 1, time.length());
							m_etSysTime.setText(time.trim());
							Toast.makeText(SDKOtherActivity.this, "Time is " + time, Toast.LENGTH_SHORT).show();
						}
						else
						{
							long res = mNVRSDK.GetLastError();
							Toast.makeText(SDKOtherActivity.this, "dvr system time is null,errorcode is " + res, Toast.LENGTH_SHORT).show();
						}
					}
				}
			});

			ileft += itextwidth + ihdistance;
			Button btnSetTime = new Button(this);
			btnSetTime.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ileft, itopposition));
			btnSetTime.setTextColor(Color.BLACK);
			btnSetTime.setTextSize(15);
			btnSetTime.setText("Set Dvr System Time");
			m_ToolLayout.addView(btnSetTime);
			btnSetTime.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					if (mNVRSDK != null)
					{
						try
						{
							String dateTime = m_etSysTime.getText().toString().trim();
							Calendar c = Calendar.getInstance();
							c.setTime(new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").parse(dateTime));
							long time = c.getTimeInMillis() / 1000;


							boolean res = mNVRSDK.ChangTime(mUserID, time);
							if (res)
							{
								Toast.makeText(SDKOtherActivity.this, "set time succeed", Toast.LENGTH_SHORT).show();
							}
						}
						catch (ParseException e)
						{
							e.printStackTrace();
							Toast.makeText(SDKOtherActivity.this, "time is wrong", Toast.LENGTH_SHORT).show();
						}
					}
				}
			});

			itopposition += ihdistance * 3 + itextheight;
			ileft = ihdistance;
			final Button btnRecord = new Button(this);
			btnRecord.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ileft, itopposition));
			btnRecord.setTextColor(Color.BLACK);
			btnRecord.setTextSize(15);
			btnRecord.setText("Start DVR Manual Record(*)");
			btnRecord.setTag(false);
			m_ToolLayout.addView(btnRecord);
			btnRecord.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					if ((Boolean) v.getTag())
					{
						if (mNVRSDK != null)
						{
							boolean res = mNVRSDK.StopDVRRecord(mUserID, 0);
							if (res)
							{
								Toast.makeText(SDKOtherActivity.this, "Stop DVR Record success", Toast.LENGTH_SHORT).show();
								btnRecord.setText("Start DVR Manual Record");
								btnRecord.setTag(false);
							}
							else
							{
								long errorcode = mNVRSDK.GetLastError();
								Toast.makeText(SDKOtherActivity.this, "Stop DVR Record failure,errorcode = "+errorcode, Toast.LENGTH_SHORT).show();
							}
						}
					}
					else
					{
						if (mNVRSDK != null)
						{
							boolean res = mNVRSDK.StartDVRRecord(mUserID, 0, 0);
							if (res)
							{
								Toast.makeText(SDKOtherActivity.this, "Start DVR Record success", Toast.LENGTH_SHORT).show();
								btnRecord.setText("Stop DVR Record");
								btnRecord.setTag(true);
							}
							else
							{
								long errorcode = mNVRSDK.GetLastError();
								Toast.makeText(SDKOtherActivity.this, "Start DVR Record failure,errorcode = "+errorcode, Toast.LENGTH_SHORT).show();
							}
						}
					}
				}
			});

			ileft += itextwidth + ihdistance;
			final Button btnAlarm = new Button(this);
			btnAlarm.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ileft, itopposition));
			btnAlarm.setTextColor(Color.BLACK);
			btnAlarm.setTextSize(15);
			btnAlarm.setText("Start Manual Alarm");
			btnAlarm.setTag(false);
			m_ToolLayout.addView(btnAlarm);
			btnAlarm.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					if ((Boolean) v.getTag())
					{
						if (mNVRSDK != null)
						{
							boolean res = setDeviceManualAlarm(false);
							if (res)
							{
								Toast.makeText(SDKOtherActivity.this, "Stop Manual Alarm success", Toast.LENGTH_SHORT).show();
								btnAlarm.setText("Start Manual Alarm");
								btnAlarm.setTag(false);
							}
							else
							{
								Toast.makeText(SDKOtherActivity.this, "Stop Manual Alarm false", Toast.LENGTH_SHORT).show();
							}
						}
					}
					else
					{
						if (mNVRSDK != null)
						{
							boolean res = setDeviceManualAlarm(true);
							if (res)
							{
								Toast.makeText(SDKOtherActivity.this, "Start Manual Alarm success", Toast.LENGTH_SHORT).show();
								btnAlarm.setText("Stop Manual Alarm");
								btnAlarm.setTag(true);
							}
							else
							{
								Toast.makeText(SDKOtherActivity.this, "Start Manual Alarm false", Toast.LENGTH_SHORT).show();
							}
						}
					}
				}
			});

			itopposition += ihdistance * 3 + itextheight;
			ileft = ihdistance;
			itextwidth = SCREENWIDTH / 2;

			TextView tvstarttime = new TextView(this);
			tvstarttime.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, 0, itopposition));
			tvstarttime.setGravity(Gravity.CENTER);
			tvstarttime.setTextColor(Color.BLACK);
			tvstarttime.setTextSize(15);
			tvstarttime.setText("Start Time : ");
			m_ToolLayout.addView(tvstarttime);

			final EditText m_etStarttime = new EditText(this);
			m_etStarttime.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, itextwidth, itopposition));
			m_etStarttime.setGravity(Gravity.CENTER);
			m_etStarttime.setTextSize(15);
			m_etStarttime.setText("2017-04-01");
			m_ToolLayout.addView(m_etStarttime);

			itopposition += ihdistance + itextheight;
			TextView tvendtime = new TextView(this);
			tvendtime.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, 0, itopposition));
			tvendtime.setGravity(Gravity.CENTER);
			tvendtime.setTextColor(Color.BLACK);
			tvendtime.setTextSize(15);
			tvendtime.setText("End Time : ");
			m_ToolLayout.addView(tvendtime);

			final EditText m_etEndTime = new EditText(this);
			m_etEndTime.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, itextwidth, itopposition));
			m_etEndTime.setGravity(Gravity.CENTER);
			m_etEndTime.setTextSize(15);
			m_etEndTime.setText("2017-06-01");
			m_ToolLayout.addView(m_etEndTime);

			itopposition += ihdistance + itextheight;
			itextwidth = SCREENWIDTH - ihdistance * 2;
			Button btnSearchLog = new Button(this);
			btnSearchLog.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ihdistance, itopposition));
			btnSearchLog.setGravity(Gravity.CENTER);
			btnSearchLog.setTextColor(Color.BLACK);
			btnSearchLog.setTextSize(15);
			btnSearchLog.setText("Search Log(**)");
			m_ToolLayout.addView(btnSearchLog);
			btnSearchLog.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					if (mNVRSDK != null)
					{
						int type = 0;
						if(m_rbSystem.isChecked())
						{
							type |= (0x1) << 0;							
						}
						if(m_rbConfig.isChecked())
						{
							type |= (0x1) << 1;							
						}
						if(m_rbPlayback.isChecked())
						{
							type |= (0x1) << 2;							
						}
						if(m_rbBackup.isChecked())
						{
							type |= (0x1) << 3;							
						}
						if(m_rbSearch.isChecked())
						{
							type |= (0x1) << 4;							
						}
						if(m_rbInformation.isChecked())
						{
							type |= (0x1) << 5;							
						}
						if(m_rbError.isChecked())
						{
							type |= (0x1) << 6;							
						}
						
						System.out.println("type = "+type);

						String strstarttime = m_etStarttime.getText().toString();
						String[] starttime = strstarttime.split("-");
						int startyear = Integer.parseInt(starttime[0]) - 1900;
						int startmonth = Integer.parseInt(starttime[1]) - 1;
						int startday = Integer.parseInt(starttime[2]);
						int[] starttime1 = new int[6];
						starttime1[0] = startyear;
						starttime1[1] = startmonth;
						starttime1[2] = startday;
						
						
						String strendtime = m_etEndTime.getText().toString();
						String[] endtime = strendtime.split("-");
						int endyear = Integer.parseInt(endtime[0]) - 1900;
						int endmonth = Integer.parseInt(endtime[1]) - 1;
						int endday = Integer.parseInt(endtime[2]);
						int[] endtime1 = new int[6];
						endtime1[0] = endyear;
						endtime1[1] = endmonth;
						endtime1[2] = endday;	
						endtime1[3] = 23;
						endtime1[4] = 59;
						endtime1[5] = 59;	

						m_fileList.clear();
						type = 1;
						long filehandle = mNVRSDK.FindDVRLog(mUserID, type, starttime1,endtime1);
						if (filehandle != -1)
						{
							while (true)
							{
								NET_SDK_LOG file = null;
								file = mNVRSDK.FindNextLog(filehandle);

								if (file == null)
								{
									System.out.println("no more file");
									break;
								}
								m_fileList.add(file);
							}
							mNVRSDK.FindClose(filehandle);
						}						
						int filecount = m_fileList.size();
						if(filehandle == -1)
						{
							long res = mNVRSDK.GetLastError();
							Toast.makeText(SDKOtherActivity.this, "Search fail,error code is " + res, Toast.LENGTH_SHORT).show();
						}
						else if (filecount >= 0)
						{
							Toast.makeText(SDKOtherActivity.this, "Search success file count is " + filecount, Toast.LENGTH_SHORT).show();
						}
					}
				}
			});

			itopposition += ihdistance + itextheight;
			itextwidth = (SCREENWIDTH - ihdistance * 2) / 3;
			m_rbSystem = new CheckBox(this);
			m_rbSystem.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ihdistance, itopposition));
			m_rbSystem.setText("System");
			m_rbSystem.setTextColor(Color.BLACK);
			m_rbSystem.setTextSize(15);
			m_rbSystem.setChecked(true);
			m_ToolLayout.addView(m_rbSystem);


			m_rbConfig = new CheckBox(this);
			m_rbConfig.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, itextwidth + ihdistance, itopposition));
			m_rbConfig.setText("Config");
			m_rbConfig.setTextColor(Color.BLACK);
			m_rbConfig.setTextSize(15);
			m_rbConfig.setChecked(false);
			m_ToolLayout.addView(m_rbConfig);

			m_rbPlayback = new CheckBox(this);
			m_rbPlayback.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, itextwidth * 2 + ihdistance, itopposition));
			m_rbPlayback.setText("Playback");
			m_rbPlayback.setTextColor(Color.BLACK);
			m_rbPlayback.setTextSize(15);
			m_rbPlayback.setChecked(false);
			m_ToolLayout.addView(m_rbPlayback);

			itopposition += itextheight;
			m_rbBackup = new CheckBox(this);
			m_rbBackup.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ihdistance, itopposition));
			m_rbBackup.setText("Backup");
			m_rbBackup.setTextColor(Color.BLACK);
			m_rbBackup.setTextSize(15);
			m_rbBackup.setChecked(false);
			m_ToolLayout.addView(m_rbBackup);

			m_rbSearch = new CheckBox(this);
			m_rbSearch.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, itextwidth + ihdistance, itopposition));
			m_rbSearch.setText("Search");
			m_rbSearch.setTextColor(Color.BLACK);
			m_rbSearch.setTextSize(15);
			m_rbSearch.setChecked(false);
			m_ToolLayout.addView(m_rbSearch);
			
			m_rbInformation = new CheckBox(this);
			m_rbInformation.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, itextwidth * 2 + ihdistance, itopposition));
			m_rbInformation.setText("Information");
			m_rbInformation.setTextColor(Color.BLACK);
			m_rbInformation.setChecked(false);
			m_ToolLayout.addView(m_rbInformation);

			itopposition += itextheight;
			m_rbError = new CheckBox(this);
			m_rbError.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ihdistance, itopposition));
			m_rbError.setText("Error");
			m_rbError.setTextColor(Color.BLACK);
			m_rbError.setTextSize(15);
			m_rbError.setChecked(false);
			m_ToolLayout.addView(m_rbError);

			itopposition += ihdistance + itextheight;
			itextwidth = (SCREENWIDTH - ihdistance * 3) / 2;
			ileft = ihdistance;
			final EditText m_etconfig = new EditText(this);
			m_etconfig.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight*2, ileft, itopposition));
			m_etconfig.setTextSize(15);
			m_etconfig.setHint("输入XML指令");
			m_ToolLayout.addView(m_etconfig);

			final EditText m_etconfigurl = new EditText(this);
			ileft += itextwidth + ihdistance;
			m_etconfigurl.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight *2 , ileft, itopposition));
			m_etconfigurl.setTextSize(15);
			m_etconfigurl.setHint("URL");
			m_etconfigurl.setText("GetDeviceInfo");
			m_ToolLayout.addView(m_etconfigurl);


			itopposition += ihdistance + itextheight*2 ;
			Button btransconfig = new Button(this);

			btransconfig.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ihdistance, itopposition));
			btransconfig.setGravity(Gravity.CENTER);
			btransconfig.setTextColor(Color.BLACK);
			btransconfig.setTextSize(15);
			btransconfig.setText("TransparentConfig");
			m_ToolLayout.addView(btransconfig);
			btransconfig.setOnClickListener(new OnClickListener() {
				@Override
				public void onClick(View v) {
					String xml = m_etconfig.getText().toString();
					String url = m_etconfigurl.getText().toString();
					reqStr = mNVRSDK.transparentConfig(mUserID,xml,url);
					m_etconfigReq.setText(reqStr);
					Log.d(TAG,"ReqStr: "+ reqStr);
				}
			});
			Button btclear = new Button(this);
			btclear.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight,  itextwidth + ihdistance , itopposition));
			btclear.setGravity(Gravity.CENTER);
			btclear.setTextColor(Color.BLACK);
			btclear.setTextSize(15);
			btclear.setText("clear");
			m_ToolLayout.addView(btclear);
			btclear.setOnClickListener(new OnClickListener() {
				@Override
				public void onClick(View v) {
					m_etconfigReq.setText("");

				}
			});

			itopposition += ihdistance + itextheight ;
			itextwidth = SCREENWIDTH - ihdistance * 2;
			ileft = ihdistance;
			m_etconfigReq = new EditText(this);
			m_etconfigReq.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, ViewGroup.LayoutParams.WRAP_CONTENT , ileft, itopposition));
			m_etconfigReq.setTextSize(14);
			m_etconfigReq.setHint("configReq");
			m_ToolLayout.addView(m_etconfigReq);
		}
	}

	/**
	 * demo演示是打开或者关闭所有报警的手动报警
	 * pValue数组的值代表打开或者关闭手动报警
	 * channelList数组的值对应的是报警通道号，报警通道号对应报警个数 eg： 报警1 对应通道号为0,报警2对应通道号为1
	 * sensorOutputNum 为设备总传感器数 ,需要控制多少个报警,manualChlCount就传多少
	 * @return
	 */
	private boolean setDeviceManualAlarm(boolean isAlarmOpen)
	{
		Log.d(TAG,"isAlarmOpen = "+isAlarmOpen);
		int manualChlCount = SDKApplication.getInstance().getLoginDeviceInfo().sensorOutputNum;
		int[] channelList = new int[manualChlCount];
		int[] pValue = new int[manualChlCount];
		for (int i = 0; i < manualChlCount; i++)
		{
			channelList[i] = i;
			pValue[i] = isAlarmOpen? 1:0; ;//            1 or 0
		}
		//if slowly,please use other thread.
		return mNVRSDK.SetDeviceManualAlarm(mUserID, channelList, pValue, manualChlCount);
	}

	@Override
	public void onVideoData(long livehandle,int iNodeID, byte[] data, int frameLen, long timeStamp, boolean isKeyFrame, int width, int height, int frameIndex, int encodeType, int frameType)
	{
		// TODO Auto-generated method stub

	}

	@Override
	public void onAudioData(long livehandle,int iNodeID, byte[] data, int frameLen, long timeStamp, int iSampleRateInHz, int b8BitWidth, int bMono, int encodeType)
	{
		// TODO Auto-generated method stub

	}

	@Override
	public void onTalkData(int byAudioFlag, int dwBufSize, byte[] pRecvDataBuffer)
	{
		// TODO Auto-generated method stub
		
	}

	@Override
	public void ExceptionCallback(int dwType,int lUserID, int lHandle)
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
	public void onVideoDataFormatHead(long liveHandle, int iEncodeType)
	{
		// TODO Auto-generated method stub
		
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

}
