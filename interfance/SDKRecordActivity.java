package com.sdk.interfance;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Message;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.view.View.OnClickListener;
import android.view.View.OnTouchListener;
import android.widget.AbsoluteLayout;
import android.widget.AdapterView;
import android.widget.AdapterView.OnItemClickListener;
import android.widget.Button;
import android.widget.CompoundButton;
import android.widget.EditText;
import android.widget.ListView;
import android.widget.RadioButton;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

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
import com.sdk.network.VideoViewCallback;
import com.sdk.test.app.SDKApplication;
import com.sdk.interfance.SDKDefs.*;

public class SDKRecordActivity extends BaseActivity implements VideoViewCallback, NVRSDKCallback
{
	private static final String TAG = "SDKRecordActivity";
	private Context context;
	private long recordhandle = -1;

	private nvrsdk mNVRSDK = null;
	private AbsoluteLayout m_PlaybackLayout;
	private AbsoluteLayout m_PlayLayout;
	private int SCREENWIDTH, SCREENHEIGHT;
	private VideoPlayer mVideoView;
	private EditText m_etChannel = null;
	private EditText m_etYear = null;
	private EditText m_etMonth = null;
	private EditText m_etDay = null;
	private int m_iChannelCount = 0;
	private RadioButton m_rbFileType = null;
	private RadioButton m_rbEventType = null;
	private RadioButton m_rbTimeType = null;
	private RadioButton m_rbDateType = null;
	private int mUserID = 0;
	private ArrayList<NET_SDK_REC_FILE> m_fileList = new ArrayList<NET_SDK_REC_FILE>();
	private FileItemAdaper m_FileItemAdaper = null;
	private long playbackHandle = -1;
	private TextView m_tvEndTime = null;
	private TextView m_PlayingTime = null;
	private Button m_btnPlay = null;
	private Button m_btnStop = null;
	private Button m_btnFastForward = null;
	private Button m_btnSingleFrame = null;
	private Button m_btnRewind = null;
	private int m_iPlayPosition = 0;
	private Button btnSave = null;
	private Button btnAudio = null;
//	ScrollView m_scrollview = null;
    long m_changetime1 = 0 ;
	long m_changetime2 = 0 ;

	Handler mHandler = new Handler()
	{
		public void handleMessage(Message msg)
		{
			switch (msg.what)
			{
				case 0:
					if (m_PlayingTime != null)
					{
						m_PlayingTime.setText(msg.obj.toString());
						Log.d(TAG, "handleMessage: playingtime is:"+msg.obj.toString());
					}
					if (msg.arg1 == DD_FRAME_TYPE.DD_FRAME_TYPE_END)// ���Ž���
					{
						m_btnPlay.setText("play");
						m_btnPlay.setTag(false);
					}
					break;
			}
		}
	};

	@Override
	protected void onCreate(Bundle savedInstanceState)
	{
		super.onCreate(savedInstanceState);
		this.getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
		context =this;
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
		setContentView(m_PlaybackLayout);
	}

	@Override
	protected void onDestroy()
	{
		super.onDestroy();
		if (recordhandle != -1)
		{
			mNVRSDK.StopPlayBack(recordhandle);
		}
		mNVRSDK.SetCallback(null);
		mNVRSDK = null;
	}

	public void SetupUI()
	{
		if (m_PlaybackLayout == null)
		{
			int itextheight = 160;//160;
			int ihdistance = 10;//20;
			int itextwidth = (SCREENWIDTH - ihdistance * 5) / 4;
			int ieditwidth = SCREENWIDTH - ihdistance * 2 - itextwidth;

			m_PlaybackLayout = new AbsoluteLayout(this);
			m_PlaybackLayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT*2, 0, 0));
			m_PlaybackLayout.setBackgroundColor(Color.WHITE);

			Button btnLogout = new Button(this);
			btnLogout.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ihdistance, ihdistance));
			btnLogout.setTextColor(Color.BLACK);
			btnLogout.setTextSize(15);
			btnLogout.setText("Return");
			m_PlaybackLayout.addView(btnLogout);
			btnLogout.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					startActivity(new Intent(SDKRecordActivity.this,SDKMainActivity.class));
					SDKRecordActivity.this.finish();
				}
			});

			btnLogout = new Button(this);
			btnLogout.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ihdistance * 2 + itextwidth, ihdistance));
			btnLogout.setTextColor(Color.BLACK);
			btnLogout.setTextSize(15);
			btnLogout.setText("Play1");
			m_PlaybackLayout.addView(btnLogout);
			btnLogout.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					int position = 0;
					if (mNVRSDK != null && m_fileList != null && m_fileList.size() > position && !mVideoView.getDecodeState())
					{
						m_iPlayPosition = position;
						NET_SDK_REC_FILE file = m_fileList.get(position);
						int[] channel = { file.dwChannel };
//						playbackHandle = mNVRSDK.PlayBackByTime(mUserID, channel,1,file.getStartTime(),file.getStopTime());

						int starttime[] = file.getStopTime();
						int stoptime[] = file.getStopTime();
						starttime[2] += 4;
						stoptime[2] += 4;

						playbackHandle = mNVRSDK.PlayBackByTime(mUserID, channel, 1, starttime, stoptime);
//						playbackHandle = mNVRSDK.PlayBackByTime(mUserID, file);
						if (playbackHandle != -1)
						{
							mNVRSDK.SetPlayerBufNumber(playbackHandle, 150);
							1.LOGD(TAG,"---------PlayBackByTime success,playbackHandle = " + playbackHandle);
							Toast.makeText(SDKRecordActivity.this, "PlayBackByTime success,playbackHandle = " + playbackHandle, Toast.LENGTH_SHORT).show();
							mVideoView.setLiveHandle(playbackHandle);
							mVideoView.start();
							mVideoView.setChannelID(file.dwChannel);
							mVideoView.setPermissionDenied(false);

							SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
							String strstarttime = sdf.format(file.stopTime);
							m_tvEndTime.setText(strstarttime);
						}
						else
						{
							long errorcode = mNVRSDK.GetLastError();
							ToolCommon.LOGD(TAG,"---------PlayBackByTime fail,errorcode = " + errorcode);
							Toast.makeText(SDKRecordActivity.this, "PlayBackByTime fail,errorcode = " + errorcode, Toast.LENGTH_SHORT).show();
						}
					}
				}
			});

			btnLogout = new Button(this);
			btnLogout.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ihdistance * 3 + itextwidth * 2, ihdistance));
			btnLogout.setTextColor(Color.BLACK);
			btnLogout.setTextSize(15);
			btnLogout.setText("Play2");
			m_PlaybackLayout.addView(btnLogout);
			btnLogout.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					int position = 0;
					if (mNVRSDK != null && m_fileList != null && m_fileList.size() > position && !mVideoView.getDecodeState())
					{
						m_iPlayPosition = position;
						NET_SDK_REC_FILE file = m_fileList.get(position);
						int[] channel = { file.dwChannel };
						playbackHandle = mNVRSDK.PlayBackByTime(mUserID, channel,1,file.getStartTime(),file.getStopTime());

//						int starttime[] = file.getStopTime();
//						int stoptime[] = file.getStopTime();
//						stoptime[3] += 1;

//						playbackHandle = mNVRSDK.PlayBackByTime(mUserID, channel, 1, starttime, stoptime);
//						playbackHandle = mNVRSDK.PlayBackByTime(mUserID, file);
						if (playbackHandle != -1)
						{
							mNVRSDK.SetPlayerBufNumber(playbackHandle, 150);
							1.LOGD(TAG,"---------PlayBackByTime success,playbackHandle = " + playbackHandle);
							Toast.makeText(SDKRecordActivity.this, "PlayBackByTime success,playbackHandle = " + playbackHandle, Toast.LENGTH_SHORT).show();
							mVideoView.setLiveHandle(playbackHandle);
							mVideoView.start();
							mVideoView.setChannelID(file.dwChannel);
							mVideoView.setPermissionDenied(false);

							SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
							String strstarttime = sdf.format(file.stopTime);
							m_tvEndTime.setText(strstarttime);
						}
						else
						{
							long errorcode = mNVRSDK.GetLastError();
							ToolCommon.LOGD(TAG,"---------PlayBackByTime fail,errorcode = " + errorcode);
							Toast.makeText(SDKRecordActivity.this, "PlayBackByTime fail,errorcode = " + errorcode, Toast.LENGTH_SHORT).show();
						}
					}
				}
			});

			btnLogout = new Button(this);
			btnLogout.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ihdistance * 4 + itextwidth * 3, ihdistance));
			btnLogout.setTextColor(Color.BLACK);
			btnLogout.setTextSize(15);
			btnLogout.setText("Stop");
			m_PlaybackLayout.addView(btnLogout);
			btnLogout.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					CloseChannel();
				}
			});

			int itopposition = itextheight;

			TextView tvtime = new TextView(this);
			tvtime.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH - ihdistance * 2, itextheight, ihdistance, itopposition));
			tvtime.setGravity(Gravity.CENTER);
			tvtime.setTextColor(Color.RED);
			tvtime.setTextSize(15);
			tvtime.setText("(*):this function dose not support n9000 devices.");
			m_PlaybackLayout.addView(tvtime);

			itopposition += itextheight;
			TextView btnChangeCH = new TextView(this);
			btnChangeCH.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, itextheight, 0, itopposition));
			btnChangeCH.setGravity(Gravity.CENTER);
			btnChangeCH.setTextColor(Color.BLACK);
			btnChangeCH.setTextSize(15);
			btnChangeCH.setText("Record search mode selection");
			m_PlaybackLayout.addView(btnChangeCH);

			itopposition += itextheight;
			m_rbFileType = new RadioButton(this);
			m_rbFileType.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 4, itextheight, 0, itopposition));
			m_rbFileType.setText("file");
			m_rbFileType.setTextColor(Color.BLACK);
			m_rbFileType.setChecked(true);
			m_PlaybackLayout.addView(m_rbFileType);

			m_rbFileType.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener()
			{
				public void onCheckedChanged(CompoundButton buttonView, boolean isChecked)
				{
					if (isChecked)
					{
						m_rbEventType.setChecked(false);
						m_rbTimeType.setChecked(false);
						m_rbDateType.setChecked(false);
					}
				}
			});

			m_rbEventType = new RadioButton(this);
			m_rbEventType.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 4, itextheight, SCREENWIDTH / 4, itopposition));
			m_rbEventType.setText("event");
			m_rbEventType.setTextColor(Color.BLACK);
			m_rbEventType.setChecked(false);
			m_PlaybackLayout.addView(m_rbEventType);
			m_rbEventType.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener()
			{
				public void onCheckedChanged(CompoundButton buttonView, boolean isChecked)
				{
					if (isChecked)
					{
						m_rbFileType.setChecked(false);
						m_rbTimeType.setChecked(false);
						m_rbDateType.setChecked(false);
					}
				}
			});
			m_rbTimeType = new RadioButton(this);
			m_rbTimeType.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 4, itextheight, SCREENWIDTH / 2, itopposition));
			m_rbTimeType.setText("time");
			m_rbTimeType.setTextColor(Color.BLACK);
			m_rbTimeType.setChecked(false);
			m_PlaybackLayout.addView(m_rbTimeType);
			m_rbTimeType.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener()
			{
				public void onCheckedChanged(CompoundButton buttonView, boolean isChecked)
				{
					if (isChecked)
					{
						m_rbFileType.setChecked(false);
						m_rbEventType.setChecked(false);
						m_rbDateType.setChecked(false);
					}
				}
			});

			m_rbDateType = new RadioButton(this);
			m_rbDateType.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 4, itextheight, SCREENWIDTH * 3 / 4, itopposition));
			m_rbDateType.setText("date(*)");
			m_rbDateType.setTextColor(Color.BLACK);
			m_rbDateType.setChecked(false);
			m_PlaybackLayout.addView(m_rbDateType);
			m_rbDateType.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener()
			{
				public void onCheckedChanged(CompoundButton buttonView, boolean isChecked)
				{
					if (isChecked)
					{
						m_rbFileType.setChecked(false);
						m_rbEventType.setChecked(false);
						m_rbTimeType.setChecked(false);
					}
				}
			});

			itopposition += ihdistance + itextheight;
			int ibtnwidth = (SCREENWIDTH - ihdistance * 4) / 3;
			m_etChannel = new EditText(this);
			m_etChannel.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance, itopposition));
			m_etChannel.setGravity(Gravity.CENTER);
			m_etChannel.setTextSize(15);
			m_etChannel.setText("1");
			m_PlaybackLayout.addView(m_etChannel);

			btnChangeCH = new TextView(this);
			btnChangeCH.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance * 2 + ibtnwidth, itopposition));
			btnChangeCH.setGravity(Gravity.CENTER);
			btnChangeCH.setTextColor(Color.BLACK);
			btnChangeCH.setTextSize(15);
			btnChangeCH.setText("channel choose");
			m_PlaybackLayout.addView(btnChangeCH);

			TextView tvChRange = new TextView(this);
			tvChRange.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance * 3 + ibtnwidth * 2, itopposition));
			tvChRange.setGravity(Gravity.CENTER);
			tvChRange.setTextColor(Color.BLACK);
			tvChRange.setTextSize(15);
			tvChRange.setText("range 1-" + m_iChannelCount);
			m_PlaybackLayout.addView(tvChRange);

			Calendar c = Calendar.getInstance();
			int year = c.get(Calendar.YEAR);
			itopposition += ihdistance + itextheight;
			ibtnwidth = (SCREENWIDTH * 2 / 3 - ihdistance * 3) / 4;
			m_etYear = new EditText(this);
			m_etYear.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth * 2, itextheight, ihdistance, itopposition));
			m_etYear.setGravity(Gravity.CENTER);
			m_etYear.setTextSize(15);
			m_etYear.setText(String.valueOf(year));
			m_PlaybackLayout.addView(m_etYear);

			tvChRange = new TextView(this);
			tvChRange.setLayoutParams(new AbsoluteLayout.LayoutParams(ihdistance, itextheight, ibtnwidth * 2 + ihdistance, itopposition));
			tvChRange.setGravity(Gravity.CENTER);
			tvChRange.setTextColor(Color.BLACK);
			tvChRange.setTextSize(15);
			tvChRange.setText("-");
			m_PlaybackLayout.addView(tvChRange);
			int month = c.get(Calendar.MONTH);
			m_etMonth = new EditText(this);
			m_etMonth.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance * 2 + ibtnwidth * 2, itopposition));
			m_etMonth.setGravity(Gravity.CENTER);
			m_etMonth.setTextSize(15);
			m_etMonth.setText(String.valueOf(month +1));
			m_PlaybackLayout.addView(m_etMonth);

			tvChRange = new TextView(this);
			tvChRange.setLayoutParams(new AbsoluteLayout.LayoutParams(ihdistance, itextheight, ibtnwidth * 3 + ihdistance * 2, itopposition));
			tvChRange.setGravity(Gravity.CENTER);
			tvChRange.setTextColor(Color.BLACK);
			tvChRange.setTextSize(15);
			tvChRange.setText("-");
			m_PlaybackLayout.addView(tvChRange);
			int day = c.get(Calendar.DATE);
			m_etDay = new EditText(this);
			m_etDay.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance * 3 + ibtnwidth * 3, itopposition));
			m_etDay.setGravity(Gravity.CENTER);
			m_etDay.setTextSize(15);
			m_etDay.setText(String.valueOf(day));
			m_PlaybackLayout.addView(m_etDay);

			ibtnwidth = SCREENWIDTH / 3 - ihdistance * 2;
			Button btnSearch = new Button(this);
			btnSearch.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, SCREENWIDTH - ibtnwidth - ihdistance, itopposition));
			btnSearch.setGravity(Gravity.CENTER);
			btnSearch.setTextColor(Color.BLACK);
			btnSearch.setTextSize(15);
			btnSearch.setText("search");
			m_PlaybackLayout.addView(btnSearch);
			btnSearch.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					if (mNVRSDK != null)
					{
						int[] starttime = new int[6];
						starttime[0] = Integer.valueOf(m_etYear.getText().toString().trim()) - 1900;
						starttime[1] = Integer.valueOf(m_etMonth.getText().toString().trim()) - 1;
						starttime[2] = Integer.valueOf(m_etDay.getText().toString().trim());
						starttime[3] = 0;
						starttime[4] = 0;
						starttime[5] = 0;

						int[] stoptime = new int[6];
						stoptime[0] = Integer.valueOf(m_etYear.getText().toString().trim()) - 1900;
						stoptime[1] = Integer.valueOf(m_etMonth.getText().toString().trim()) - 1;
						stoptime[2] = Integer.valueOf(m_etDay.getText().toString().trim());
						stoptime[3] = 23;
						stoptime[4] = 59;
						stoptime[5] = 59;

						int channel = Integer.valueOf(m_etChannel.getText().toString().trim()) - 1;

						int irecordtype = 0;

						m_fileList.clear();
						m_FileItemAdaper.notifyDataSetChanged();
						long filehandle = -1;
						if (m_rbFileType.isChecked())
						{
							irecordtype = 0;
							filehandle = mNVRSDK.FindFile(mUserID, channel, starttime, stoptime);
							if (filehandle != -1)
							{
								while (true)
								{
									NET_SDK_REC_FILE file = null;
									file = mNVRSDK.FindNextFile(filehandle);

									if (file == null)
									{
										ToolCommon.LOGD(TAG,"no more file");
										break;
									}
									m_fileList.add(file);
								}
								mNVRSDK.FindClose(filehandle);
							}
						}
						else if (m_rbEventType.isChecked())
						{
							irecordtype = 1;
							filehandle = mNVRSDK.FindEvent(mUserID, channel, DD_RECORD_TYPE.DD_RECORD_TYPE_INTELLIGENT, starttime, stoptime);
							if (filehandle != -1)
							{
								while (true)
								{
									NET_SDK_REC_FILE file = null;
									file = mNVRSDK.FindNextEvent(filehandle);

									if (file == null)
									{
										ToolCommon.LOGD(TAG,"no more file");
										break;
									}
									m_fileList.add(file);

//									SimpleDateFormat sdf=new SimpleDateFormat("HH:mm:ss");  
//									String strstarttime=sdf.format(file.startTime);  
//									String strendttime=sdf.format(file.stopTime); 
//									ToolCommon.LOGD("------index = "+file.dwFileIndex+",CH = "+(file.dwChannel+1)+",starttime = "+strstarttime+",endtime = "+strendttime+",eventtype = "+file.dwRecType);
								}
								mNVRSDK.FindEventClose(filehandle);
							}
						}
						else if (m_rbTimeType.isChecked())
						{
							irecordtype = 2;
							filehandle = mNVRSDK.FindTime(mUserID, channel, starttime, stoptime);
							if (filehandle != -1)
							{
								while (true)
								{
									NET_SDK_REC_FILE file = null;
									file = mNVRSDK.FindNextTime(filehandle);

									if (file == null)
									{
										ToolCommon.LOGD(TAG,"no more file");
										break;
									}
									m_fileList.add(file);
								}
								mNVRSDK.FindTimeClose(filehandle);
							}
						}
						else if (m_rbDateType.isChecked())
						{
							irecordtype = 3;
							filehandle = mNVRSDK.FindRecDate(mUserID);
							if (filehandle != -1)
							{
								while (true)
								{
									NET_SDK_REC_FILE file = null;
									file = mNVRSDK.FindNextRecDate(filehandle);

									if (file == null)
									{
										ToolCommon.LOGD(TAG,"no more file");
										break;
									}
									m_fileList.add(file);
								}
								mNVRSDK.FindRecDateClose(filehandle);
							}
						}

						if (filehandle == -1)
						{
							Toast.makeText(SDKRecordActivity.this, "no file", Toast.LENGTH_SHORT).show();
							m_FileItemAdaper.notifyDataSetChanged();
						}
						else
						{

							ToolCommon.LOGD(TAG,"file count = " + m_fileList.size());
							m_FileItemAdaper.MyNotifyDataSetChanged(irecordtype);
							Toast.makeText(SDKRecordActivity.this, "findfile success,filehandle = " + filehandle + ",filecount = " + m_fileList.size(), Toast.LENGTH_SHORT).show();
						}
					}
				}
			});

			itopposition += itextheight + ihdistance;

			AbsoluteLayout resultlayout = new AbsoluteLayout(this);
			resultlayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT - itopposition - ihdistance, 0, itopposition));
			m_PlaybackLayout.addView(resultlayout);

			AbsoluteLayout headerlayout = new AbsoluteLayout(this);
			headerlayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, itextheight, 0, 0));
			resultlayout.addView(headerlayout);
			headerlayout.setBackgroundColor(Color.GRAY);

			itextwidth = SCREENWIDTH / 4;
			btnChangeCH = new TextView(this);
			btnChangeCH.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth / 2, itextheight, 0, 0));
			btnChangeCH.setGravity(Gravity.CENTER);
			btnChangeCH.setTextColor(Color.BLACK);
			btnChangeCH.setTextSize(15);
			btnChangeCH.setText("index");
			headerlayout.addView(btnChangeCH);

			btnChangeCH = new TextView(this);
			btnChangeCH.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth / 2, itextheight, itextwidth / 2, 0));
			btnChangeCH.setGravity(Gravity.CENTER);
			btnChangeCH.setTextColor(Color.BLACK);
			btnChangeCH.setTextSize(15);
			btnChangeCH.setText("CH");
			headerlayout.addView(btnChangeCH);

			btnChangeCH = new TextView(this);
			btnChangeCH.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, itextwidth, 0));
			btnChangeCH.setGravity(Gravity.CENTER);
			btnChangeCH.setTextColor(Color.BLACK);
			btnChangeCH.setTextSize(15);
			btnChangeCH.setText("starttime");
			headerlayout.addView(btnChangeCH);

			btnChangeCH = new TextView(this);
			btnChangeCH.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, itextwidth * 2, 0));
			btnChangeCH.setGravity(Gravity.CENTER);
			btnChangeCH.setTextColor(Color.BLACK);
			btnChangeCH.setTextSize(15);
			btnChangeCH.setText("endtime");
			headerlayout.addView(btnChangeCH);

			btnChangeCH = new TextView(this);
			btnChangeCH.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, itextwidth * 3, 0));
			btnChangeCH.setGravity(Gravity.CENTER);
			btnChangeCH.setTextColor(Color.BLACK);
			btnChangeCH.setTextSize(15);
			btnChangeCH.setText("event type");
			headerlayout.addView(btnChangeCH);

			ListView m_FileListView = new ListView(this);
			m_FileListView.setCacheColorHint(Color.WHITE);
			m_FileListView.setDivider(null);
			m_FileListView.setSelector(new ColorDrawable(Color.WHITE));
			m_FileListView.setVerticalScrollBarEnabled(true);
			m_FileListView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
			m_FileListView.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT-itextheight-ihdistance-itopposition, 0, itextheight));
			resultlayout.addView(m_FileListView);

			m_FileItemAdaper = new FileItemAdaper(this, m_fileList);
			m_FileListView.setAdapter(m_FileItemAdaper);

			m_FileListView.setOnItemClickListener(new OnItemClickListener()
			{
				@Override
				public void onItemClick(AdapterView<?> parent, View view, int position, long id)
				{
					if (!m_rbDateType.isChecked())
					{
						SetupPlayUI(position);
					}
				}
			});

//			itopposition += (itextheight + ihdistance)*5;			
//			AbsoluteLayout resultlayout1 = new AbsoluteLayout(this);
//			resultlayout1.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT, 0, itopposition));
//			m_PlaybackLayout.addView(resultlayout1);
		}
	}

	public void SetupPlayUI(int position)
	{
		if (m_PlayLayout == null)
		{
			int itextheight = 160;
			int ihdistance = 20;
			int itextwidth = SCREENWIDTH / 3;
			int ieditwidth = SCREENWIDTH - ihdistance * 2 - itextwidth;

			m_PlayLayout = new AbsoluteLayout(this);
			m_PlayLayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT, 0, 0));
			m_PlayLayout.setBackgroundColor(Color.WHITE);
			m_PlaybackLayout.addView(m_PlayLayout);
			m_PlayLayout.setOnTouchListener(new OnTouchListener()
			{
				public boolean onTouch(View v, MotionEvent event)
				{
					return true;
				}
			});

			Button btnLogout = new Button(this);
			btnLogout.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ihdistance, ihdistance));
			btnLogout.setTextColor(Color.BLACK);
			btnLogout.setTextSize(15);
			btnLogout.setText("Return");
			m_PlayLayout.addView(btnLogout);
			btnLogout.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					CloseChannel();
					m_PlayLayout.setVisibility(View.INVISIBLE);
				}
			});

			mVideoView = VideoPlayer.getVideoView(this);
			if (mVideoView != null)
			{
				mVideoView.setCallback(this);
				//mVideoView.setDropState(false);
				mVideoView.setPrintLog(true);//看日志
				mVideoView.setMediaCodecType(ToolCommon.isForceSoftCodec);//是否强制软解
				mVideoView.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENWIDTH * 2 / 3, 0, ihdistance + itextheight));
				mVideoView.SetupLayout("permission denied", StoragePath.m_iScreenWidth, StoragePath.m_iScreenHeight);
				m_PlayLayout.addView(mVideoView);
			}
			int itopposition = ihdistance * 2 + itextheight + SCREENWIDTH * 2 / 3;

			ScrollView scrollview = new ScrollView(this);
			scrollview.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT - itopposition, 0, itopposition));
			m_PlayLayout.addView(scrollview);

			AbsoluteLayout bottomlayout = new AbsoluteLayout(this);
			bottomlayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT - itopposition, 0, 0));
			scrollview.addView(bottomlayout);

			itopposition = 0;
			TextView btnChangeCH = new TextView(this);
			btnChangeCH.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2, itextheight, 0, itopposition));
			btnChangeCH.setGravity(Gravity.CENTER);
			btnChangeCH.setTextColor(Color.BLACK);
			btnChangeCH.setTextSize(15);
			btnChangeCH.setText("playing time");
			bottomlayout.addView(btnChangeCH);

			m_PlayingTime = new TextView(this);
			m_PlayingTime.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2, itextheight, SCREENWIDTH / 2, itopposition));
			m_PlayingTime.setGravity(Gravity.CENTER);
			m_PlayingTime.setTextColor(Color.BLACK);
			m_PlayingTime.setTextSize(15);
			m_PlayingTime.setText("2017-1-6 21:31:53");
			bottomlayout.addView(m_PlayingTime);

			itopposition += itextheight;
			btnChangeCH = new TextView(this);
			btnChangeCH.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2, itextheight, 0, itopposition));
			btnChangeCH.setGravity(Gravity.CENTER);
			btnChangeCH.setTextColor(Color.BLACK);
			btnChangeCH.setTextSize(15);
			btnChangeCH.setText("end time");
			bottomlayout.addView(btnChangeCH);

			m_tvEndTime = new TextView(this);
			m_tvEndTime.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2, itextheight, SCREENWIDTH / 2, itopposition));
			m_tvEndTime.setGravity(Gravity.CENTER);
			m_tvEndTime.setTextColor(Color.BLACK);
			m_tvEndTime.setTextSize(15);
			m_tvEndTime.setText("2017-1-6 21:31:54");
			bottomlayout.addView(m_tvEndTime);

			itopposition += itextheight;
			itextwidth = (SCREENWIDTH - ihdistance * 5) / 4;
			m_btnPlay = new Button(this);
			m_btnPlay.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ihdistance, itopposition));
			m_btnPlay.setTextColor(Color.BLACK);
			m_btnPlay.setTextSize(15);
			m_btnPlay.setText("pause");
			m_btnPlay.setTag(true);
			bottomlayout.addView(m_btnPlay);
			m_btnPlay.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					if (mNVRSDK != null)
					{
						if ((Boolean) m_btnPlay.getTag())
						{
							boolean res = mNVRSDK.PlayBackControl(playbackHandle, NET_SDK_PLAYCTRL_TYPE.NET_SDK_PLAYCTRL_PAUSE, 0);
							if (res)
							{
								m_btnPlay.setText("play");
								m_btnPlay.setTag(false);
								m_btnFastForward.setText("fast forward");
								m_btnFastForward.setTag(false);
								m_btnRewind.setText("fast rewind");
								m_btnRewind.setTag(false);

								SetBtnStatues(true, false);
								mVideoView.pause();
							}
						}
						else
						{
							if ((Boolean) m_btnStop.getTag())
							{
								NET_SDK_REC_FILE file = m_fileList.get(m_iPlayPosition);

								int[] channel = { file.dwChannel };

								playbackHandle = mNVRSDK.PlayBackByTime(mUserID, channel, 1, file.getStartTime(), file.getStopTime());

								if (playbackHandle != -1)
								{
									mNVRSDK.SetPlayerBufNumber(playbackHandle, 150);
									Toast.makeText(SDKRecordActivity.this, "PlayBackByTime success", Toast.LENGTH_SHORT).show();
									mVideoView.start();
									mVideoView.setChannelID(file.dwChannel);
									mVideoView.setPermissionDenied(false);

									SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
									String strstarttime = sdf.format(file.stopTime);
									m_tvEndTime.setText(strstarttime);

									m_btnStop.setTag(false);
									m_btnPlay.setText("pause");
									m_btnPlay.setTag(true);
									SetBtnStatues(false, false);
									mVideoView.play();
								}
							}
							else
							{
								boolean res = mNVRSDK.PlayBackControl(playbackHandle, NET_SDK_PLAYCTRL_TYPE.NET_SDK_PLAYCTRL_RESUME, 0);
								ToolCommon.LOGD(TAG,"------NET_SDK_PLAYCTRL_RESUME-----------");
								if (res)
								{
									m_btnPlay.setText("pause");
									m_btnPlay.setTag(true);
									SetBtnStatues(false, false);
									mVideoView.play();
								}
							}
						}
					}
				}
			});

			m_btnStop = new Button(this);
			m_btnStop.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ihdistance * 2 + itextwidth, itopposition));
			m_btnStop.setTextColor(Color.BLACK);
			m_btnStop.setTextSize(15);
			m_btnStop.setText("stop");
			m_btnStop.setTag(false);
			bottomlayout.addView(m_btnStop);
			m_btnStop.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					if (mNVRSDK != null)
					{
						boolean res = CloseChannel();
						if (res)
						{
							m_btnPlay.setText("play");
							m_btnPlay.setTag(false);
							m_btnStop.setTag(true);
							SetBtnStatues(false, true);
						}
					}
				}
			});

			m_btnFastForward = new Button(this);
			m_btnFastForward.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ihdistance * 3 + itextwidth * 2, itopposition));
			m_btnFastForward.setTextColor(Color.BLACK);
			m_btnFastForward.setTextSize(15);
			m_btnFastForward.setText("fast forward");
			m_btnFastForward.setTag(false);
			bottomlayout.addView(m_btnFastForward);
			m_btnFastForward.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					if (mNVRSDK != null)
					{
						if ((Boolean) m_btnFastForward.getTag())
						{
							boolean res = mNVRSDK.PlayBackControl(playbackHandle, NET_SDK_PLAYCTRL_TYPE.NET_SDK_PLAYCTRL_RESUME, NET_SDK_RPB_SPEED.NET_SDK_RPB_SPEED_1X);
							ToolCommon.LOGD(TAG,"----1------PlayBackControl.res = " + res);
							if (res)
							{
								mVideoView.ClearFrame();
								m_btnFastForward.setText("fast forward");
								m_btnFastForward.setTag(false);
							}
						}
						else
						{
							boolean res = mNVRSDK.PlayBackControl(playbackHandle, NET_SDK_PLAYCTRL_TYPE.NET_SDK_PLAYCTRL_FF, NET_SDK_RPB_SPEED.NET_SDK_RPB_SPEED_8X);
							ToolCommon.LOGD(TAG,"----2------PlayBackControl.res = " + res);
							if (res)
							{
								m_btnFastForward.setText("resume");
								m_btnFastForward.setTag(true);
							}else{
								Toast.makeText(SDKRecordActivity.this, "forward fail",Toast.LENGTH_SHORT).show();
							}
						}

						//--------------------


//						boolean res = mNVRSDK.PlayBackControl(playbackHandle, NET_SDK_PLAYCTRL_TYPE.NET_SDK_PLAYCTRL_SETPOS, m_changetime1/1000);
//						ToolCommon.LOGD("----5------PlayBackControl.res = "+res);

					}
				}
			});

			m_btnRewind = new Button(this);
			m_btnRewind.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, ihdistance * 4 + itextwidth * 3, itopposition));
			m_btnRewind.setTextColor(Color.BLACK);
			m_btnRewind.setTextSize(15);
			m_btnRewind.setText("fast rewind");
			m_btnRewind.setTag(false);
			bottomlayout.addView(m_btnRewind);
			m_btnRewind.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					if (mNVRSDK != null)
					{
						if((Boolean) m_btnRewind.getTag())
						{
							boolean res = mNVRSDK.PlayBackControl(playbackHandle, NET_SDK_PLAYCTRL_TYPE.NET_SDK_PLAYCTRL_RESUME, NET_SDK_RPB_SPEED.NET_SDK_RPB_SPEED_1X);
							ToolCommon.LOGD(TAG,"----3------PlayBackControl.res = "+res);
							if (res)
							{
								mVideoView.ClearFrame();
								m_btnRewind.setText("fast rewind");
								m_btnRewind.setTag(false);
							}
						}
						else
						{
							boolean res = mNVRSDK.PlayBackControl(playbackHandle, NET_SDK_PLAYCTRL_TYPE.NET_SDK_PLAYCTRL_REW, NET_SDK_RPB_SPEED.NET_SDK_RPB_SPEED_4X);
							ToolCommon.LOGD(TAG,"----4------PlayBackControl.res = "+res);
							if (res)
							{
								m_btnRewind.setText("resume");
								m_btnRewind.setTag(true);
							}else{
								Toast.makeText(SDKRecordActivity.this, "rewind fail",Toast.LENGTH_SHORT).show();
							}
						}
						//---------

//						boolean res = mNVRSDK.PlayBackControl(playbackHandle, NET_SDK_PLAYCTRL_TYPE.NET_SDK_PLAYCTRL_SETPOS, m_changetime2/1000);
//						ToolCommon.LOGD(TAG,.LOGD("----6------PlayBackControl.res = "+res);
					}
				}
			});

			itopposition += ihdistance + itextheight;
			int iHDisatance = (SCREENWIDTH - itextwidth * 2) / 3;
			m_btnSingleFrame = new Button(this);
			m_btnSingleFrame.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, iHDisatance, itopposition));
			m_btnSingleFrame.setTextColor(Color.BLACK);
			m_btnSingleFrame.setTextSize(15);
			m_btnSingleFrame.setText("single frame");
			m_btnSingleFrame.setTag(false);
			bottomlayout.addView(m_btnSingleFrame);
			m_btnSingleFrame.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					if (!(Boolean) m_btnPlay.getTag())
					{
						if (mNVRSDK != null && !(Boolean) m_btnSingleFrame.getTag())
						{
							boolean res = mNVRSDK.PlayBackControl(playbackHandle, NET_SDK_PLAYCTRL_TYPE.NET_SDK_PLAYCTRL_FRAME, 0);
						}
						mVideoView.PlaySingleFrame();
					}
				}
			});

//			itopposition += ihdistance + itextheight;
//			itextwidth = SCREENWIDTH / 3;
			btnSave = new Button(this);
			btnSave.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight, iHDisatance * 2 + itextwidth, itopposition));
			btnSave.setTextColor(Color.BLACK);
			btnSave.setTextSize(15);
			btnSave.setText("start save");
			btnSave.setTag(false);
			bottomlayout.addView(btnSave);
			btnSave.setOnClickListener(new OnClickListener()
			{
				@Override
				public void onClick(View v)
				{
					if ((Boolean) btnSave.getTag())
					{
						if (mNVRSDK != null)
						{
							NET_SDK_REC_FILE file = m_fileList.get(m_iPlayPosition);
							boolean res = mNVRSDK.StopPlayBackSave(playbackHandle, file.dwChannel);
							if (res)
							{
								Toast.makeText(SDKRecordActivity.this, "stop save success", Toast.LENGTH_SHORT).show();
								btnSave.setText("start save");
								btnSave.setTag(false);
							}
							else
							{
								Toast.makeText(SDKRecordActivity.this, "stop save fail", Toast.LENGTH_SHORT).show();
							}
						}
					}
					else
					{
						if (mNVRSDK != null)
						{
							String fileName = ToolCommon.getFileName(context, "demo", "file");
							NET_SDK_REC_FILE file = m_fileList.get(m_iPlayPosition);
							boolean res = mNVRSDK.PlayBackSaveData(playbackHandle, file.dwChannel, fileName);
							if (res)
							{
								Toast.makeText(SDKRecordActivity.this, "start save success", Toast.LENGTH_SHORT).show();
								btnSave.setText("stop save");
								btnSave.setTag(true);
							}
							else
							{
								int ierrorcode = mNVRSDK.GetLastError();
								Toast.makeText(SDKRecordActivity.this, "start save fail,ierrorcode = " + ierrorcode, Toast.LENGTH_SHORT).show();
							}
						}
					}
				}
			});

            itopposition += ihdistance + itextheight;
            btnAudio = new Button(this);
            btnAudio.setLayoutParams(new AbsoluteLayout.LayoutParams(itextwidth, itextheight,  ihdistance, itopposition));
            btnAudio.setTextColor(Color.BLACK);
            btnAudio.setTextSize(15);
            btnAudio.setText("open Audio");
            btnAudio.setTag(false);
            bottomlayout.addView(btnAudio);
			btnAudio.setOnClickListener(new OnClickListener() {
				@Override
				public void onClick(View v) {
					if (mNVRSDK != null && mVideoView != null) {
						if (!(Boolean) btnAudio.getTag()) {
							btnAudio.setTag(true);
							mVideoView.startAudio();
							btnAudio.setText("close Audio");
						} else {
							btnAudio.setTag(false);
							mVideoView.stopAudio();
							btnAudio.setText("start Audio");
						}
					}
				}
			});


			SetBtnStatues(false, false);
		} else {
			m_PlayLayout.setVisibility(View.VISIBLE);
		}

		if (mNVRSDK != null && m_fileList != null && m_fileList.size() > position && !mVideoView.getDecodeState())
		{
			m_iPlayPosition = position;
			NET_SDK_REC_FILE file = m_fileList.get(position);
			int[] channel = { file.dwChannel };
//			playbackHandle = mNVRSDK.PlayBackByTime(mUserID, channel,1,file.getStartTime(),file.getStopTime());

			int starttime[] = file.getStartTime();
			int stoptime[] = file.getStopTime();
//			starttime[2] += 9;
//			stoptime[2] += 9;

			playbackHandle = mNVRSDK.PlayBackByTime(mUserID, channel, 1, starttime, stoptime);
//			playbackHandle = mNVRSDK.PlayBackByTime(mUserID, file);

			m_changetime1 = (file.stopTime.getTime()-file.startTime.getTime())/4+file.startTime.getTime();//millisecond
			m_changetime2 = (file.stopTime.getTime()-file.startTime.getTime())/2+file.startTime.getTime();
			ToolCommon.LOGD(TAG,"---------file.startTime.getTime() = "+file.startTime.getTime()+",file.stopTime.getTime() = "+file.stopTime.getTime()+"," +
					"m_changetime1 = "+m_changetime1+",m_changetime2 = "+m_changetime2);

			if (playbackHandle != -1)
			{
				mNVRSDK.SetPlayerBufNumber(playbackHandle, 150);
				ToolCommon.LOGD(TAG,"---------PlayBackByTime success,playbackHandle = " + playbackHandle);
				mVideoView.setLiveHandle(playbackHandle);
				mVideoView.start();
				mVideoView.setChannelID(file.dwChannel);
				mVideoView.setPermissionDenied(false);

				Toast.makeText(SDKRecordActivity.this, "PlayBackByTime success,playbackHandle = " + playbackHandle, Toast.LENGTH_SHORT).show();

				SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
				String strstarttime = sdf.format(file.stopTime);
				m_tvEndTime.setText(strstarttime);

				// test capture
				boolean ret = mNVRSDK.PlayBackCaptureFile(playbackHandle, file.dwChannel, "captuerPic.jpg");
				Log.d("=== PlayBackCaptureFile Chanle ===", String.valueOf(file.dwChannel));
				Log.d("=== PlayBackCaptureFile ===", String.valueOf(ret));
			}
			else
			{
				long errorcode = mNVRSDK.GetLastError();
				ToolCommon.LOGD(TAG,"---------PlayBackByTime fail,errorcode = " + errorcode);
				Toast.makeText(SDKRecordActivity.this, "PlayBackByTime fail,errorcode = " + errorcode, Toast.LENGTH_SHORT).show();
			}
		}

	}

	public void SetBtnStatues(boolean bpause, boolean bstop)
	{
		if (!bpause)
		{
			m_btnFastForward.setEnabled(true);
//			m_btnRewind.setEnabled(true);
			m_btnSingleFrame.setEnabled(false);
			m_btnStop.setEnabled(true);
		}
		else if (bpause && !bstop)
		{
			m_btnFastForward.setEnabled(false);
//			m_btnRewind.setEnabled(false);
			m_btnSingleFrame.setEnabled(true);
			m_btnStop.setEnabled(true);
		}
		else if (bstop)
		{
			m_btnFastForward.setEnabled(false);
//			m_btnRewind.setEnabled(false);
			m_btnSingleFrame.setEnabled(false);
			m_btnStop.setEnabled(false);
		}
	}

	@Override
	public void onCaptureRet(boolean bSucc, String path)
	{
		// TODO Auto-generated method stub
		int channel = Integer.valueOf(m_etChannel.getText().toString().trim()) - 1;
		Log.d("=== PlayBackCaptureFile Chanle ===", String.valueOf(channel));
		boolean ret = mNVRSDK.PlayBackCaptureFile(playbackHandle, channel, path);
		Log.d("=== PlayBackCaptureFile ===", String.valueOf(ret));
	}

	@Override
	public void onDecodeFrameTime(boolean bKeyFrame, long frameTime, int frameIndex)
	{
//		ToolCommon.LOGD(TAG,"--------onDecodeFrameTime---------");
		Date d = new Date(frameTime);
		SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
		String time = sdf.format(d);

		Message msg = mHandler.obtainMessage();
		msg.what = 0;
		msg.obj = time;
		msg.arg1 = 0;
		mHandler.sendMessage(msg);
	}

	long time1 = 0;
	long time2 = 0;
	long dwLowDateTime1 = 0;
	long dwLowDateTime2 = 0;

	@Override
	public void onVideoData(long livehandle, int iNodeID, byte[] data, int frameLen, long timeStamp, boolean isKeyFrame, int width, int height, int frameIndex, int encodeType,
			int frameType)
	{

		//ToolCommon.LOGD(TAG,"-----playback----onVideoData---timeStamp = "+timeStamp+",isKeyFrame = "+isKeyFrame+",frameLen = "+frameLen);
		CFrameData mVideoFrameData = new CFrameData();
		mVideoFrameData.bFrameData = new byte[frameLen];
		System.arraycopy(data, 0, mVideoFrameData.bFrameData, 0, frameLen);
		data = null;
		mVideoFrameData.dwLowDateTime = timeStamp / 1000;
		mVideoFrameData.iFrameLen = frameLen;
		mVideoFrameData.isKeyFrame = isKeyFrame;
		mVideoFrameData.iNodeID = iNodeID;
		mVideoFrameData.iFrameWidth = width;
		mVideoFrameData.iFrameHeight = height;
		mVideoFrameData.iFrameIndex = frameIndex;
		mVideoFrameData.iEncodeType = encodeType;
		long time2 = System.currentTimeMillis();
		long dtime = time2 - time1;
		time1 = time2;
		ToolCommon.LOGD(TAG,"------------onVideoData space dtime = " + dtime  );
//		mVideoFrameData.bFrameData = null;

		if (mVideoView != null && livehandle == mVideoView.getLiveHandle())
		{
			ToolCommon.LOGD(TAG,"TEST1 " + dtime );
			mVideoView.playVideoData(mVideoFrameData);
		}

		ToolCommon.LOGD(TAG,"TEST2 " + dtime );
//		Date d = new Date(timeStamp / 1000);
//		SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
//		String time = sdf.format(d);
//
//		Message msg = mHandler.obtainMessage();
//		msg.what = 0;
//		msg.obj = time;
//		msg.arg1 = 0;
//		mHandler.sendMessage(msg);

		if (frameType == DD_FRAME_TYPE.DD_FRAME_TYPE_END)
		{
			Message msg = mHandler.obtainMessage();
			msg.what = 0;
			msg.obj = 0;
			msg.arg1 = frameType;
			mHandler.sendMessage(msg);
		}

	}

	@Override
	public void onAudioData(long livehandle, int iNodeID, byte[] data, int frameLen, long timeStamp, int iSampleRateInHz, int b8BitWidth, int bMono, int encodeType)
	{
		ToolCommon.LOGD(TAG,"-----playback----onAudioData---timeStamp = "+timeStamp+",livehandle = "+livehandle+",frameLen = "+frameLen);


		CFrameData mAudioFrameData = new CFrameData();
		mAudioFrameData.iNodeID = iNodeID;
		mAudioFrameData.bFrameData = new byte[frameLen];
		System.arraycopy(data, 0, mAudioFrameData.bFrameData, 0, frameLen);
		data = null;
		mAudioFrameData.iFrameLen = frameLen;
		mAudioFrameData.dwLowDateTime = timeStamp;
		mAudioFrameData.b8BitWidth = b8BitWidth;
		mAudioFrameData.bMono = bMono;
		mAudioFrameData.iSampleRateInHz = iSampleRateInHz;
		mAudioFrameData.iEncodeType = encodeType;

		if (mVideoView != null)
		{
			mVideoView.playAudioData(mAudioFrameData);
		}
	}

	public boolean CloseChannel()
	{
		boolean res = false;
		if (mNVRSDK != null && playbackHandle != -1)
		{
			res = mNVRSDK.StopPlayBack(playbackHandle);
		}
		if (mVideoView != null)
		{
			mVideoView.stop();
			mVideoView.RestoreVideoSize();
		}
		return res;
	}

	@Override
	public void onRequestSingleFrameData()
	{
		if (m_btnSingleFrame != null)
		{
			m_btnSingleFrame.setTag(false);
		}
	}

	@Override
	public void onTalkData(int byAudioFlag, int dwBufSize, byte[] pRecvDataBuffer)
	{

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
	public void onVideoDataFormatHead(long liveHandle, int iEncodeType)
	{
		ToolCommon.LOGD(TAG,"--------onVideoDataFormatHead----------liveHandle = "+liveHandle+",mVideoView.getLiveHandle() = "+mVideoView.getLiveHandle());
		if (mVideoView != null && liveHandle == mVideoView.getLiveHandle())
		{
			ToolCommon.LOGD(TAG,"--------onVideoDataFormatHead----------iEncodeType = "+iEncodeType);

			mVideoView.playVideoDataFormatHead(liveHandle, iEncodeType);
		}
	}

	@Override
	public void onPlaybackEnd()
	{
		ToolCommon.LOGD(TAG,"--------------onPlaybackEnd()----------");
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

