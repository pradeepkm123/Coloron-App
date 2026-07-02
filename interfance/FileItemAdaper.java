package com.sdk.interfance;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Color;
import android.text.TextUtils.TruncateAt;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AbsoluteLayout;
import android.widget.AbsoluteLayout.LayoutParams;
import android.widget.BaseAdapter;
import android.widget.TextView;

import com.sdk.network.StoragePath;
import com.switchbee.technician.R;

import java.text.SimpleDateFormat;
import java.util.ArrayList;

public class FileItemAdaper extends BaseAdapter
{
	private Context m_iContext = null;
	int iItemHeight = 0;
	int iItemWidth = 0;
	int itextwidth = 0;
	private ArrayList<NET_SDK_REC_FILE> m_fileList = null;
	public int m_RecordType = 0;

	public FileItemAdaper(Context context,ArrayList<NET_SDK_REC_FILE> fileList)
	{
		m_iContext = context;
		m_fileList = fileList;
		iItemWidth = StoragePath.m_iScreenWidth;
		iItemHeight = 160;
		itextwidth = iItemWidth/4;
	}
	
	public void MyNotifyDataSetChanged(int iRecordType)
	{
		m_RecordType = iRecordType;
		notifyDataSetChanged();
	}
	public int getCount()
	{
		int icount = 0;
		if (m_fileList != null)
		{
			icount = m_fileList.size();
		}
		return icount;
	}

	public Object getItem(int position)
	{
		if (m_fileList != null && position < m_fileList.size())
		{
			return m_fileList.get(position);
		}
		else
		{
			return null;
		}
	}

	public long getItemId(int position)
	{
		return position;
	}


	@SuppressLint("NewApi")
	public View getView(int position, View convertView, ViewGroup parent)
	{
		if (convertView == null)
		{
			AbsoluteLayout iNewLayout = new AbsoluteLayout(m_iContext);
			ChildTag tag = new ChildTag();

			tag.tvindex = new TextView(m_iContext);
			tag.tvindex.setTextSize(15);
			tag.tvindex.setTextColor(Color.BLACK);
			tag.tvindex.setGravity(Gravity.CENTER);
			tag.tvindex.setSingleLine();
			tag.tvindex.setEllipsize(TruncateAt.END);
			LayoutParams params = new LayoutParams(itextwidth/2, iItemHeight, 0, 0);
			iNewLayout.addView(tag.tvindex, params);

			tag.tvchannel = new TextView(m_iContext);
			tag.tvchannel.setTextSize(15);
			tag.tvchannel.setTextColor(Color.BLACK);
			tag.tvchannel.setGravity(Gravity.CENTER);
			tag.tvchannel.setSingleLine();
			tag.tvchannel.setEllipsize(TruncateAt.END);
			tag.tvchannel.setLayoutParams(new LayoutParams(itextwidth/2, iItemHeight, itextwidth/2, 0));
			iNewLayout.addView(tag.tvchannel);
			
			tag.tvstarttime = new TextView(m_iContext);
			tag.tvstarttime.setTextSize(15);
			tag.tvstarttime.setTextColor(Color.BLACK);
			tag.tvstarttime.setGravity(Gravity.CENTER);
			tag.tvstarttime.setSingleLine();
			tag.tvstarttime.setEllipsize(TruncateAt.END);
			params = new LayoutParams(itextwidth, iItemHeight, itextwidth, 0);
			iNewLayout.addView(tag.tvstarttime, params);

			tag.tvendtime = new TextView(m_iContext);
			tag.tvendtime.setTextSize(15);
			tag.tvendtime.setTextColor(Color.BLACK);
			tag.tvendtime.setGravity(Gravity.CENTER);
			tag.tvendtime.setSingleLine();
			tag.tvendtime.setEllipsize(TruncateAt.END);
			tag.tvendtime.setLayoutParams(new LayoutParams(itextwidth, iItemHeight, itextwidth*2, 0));
			iNewLayout.addView(tag.tvendtime);
			
			tag.tvtype = new TextView(m_iContext);
			tag.tvtype.setTextSize(15);
			tag.tvtype.setTextColor(Color.BLACK);
			tag.tvtype.setGravity(Gravity.CENTER);
			tag.tvtype.setSingleLine();
			tag.tvtype.setEllipsize(TruncateAt.END);
			params = new LayoutParams(itextwidth, iItemHeight, itextwidth*3, 0);
			iNewLayout.addView(tag.tvtype, params);			
			
			convertView = iNewLayout; 
			convertView.setTag(tag);
		}
		convertView.setBackgroundResource(R.drawable.cfg_btn_click1);
		ChildTag tag = (ChildTag) convertView.getTag();	
		if(m_fileList != null)
		{
			NET_SDK_REC_FILE file = m_fileList.get(position);
			if(file != null)
			{
				if(m_RecordType == 0)
				{
					tag.tvindex.setText(String.valueOf(file.dwFileIndex));
					tag.tvchannel.setText(String.valueOf(file.dwChannel+1));
					
					SimpleDateFormat sdf=new SimpleDateFormat("HH:mm:ss");  
					String strstarttime=sdf.format(file.startTime);  
					String strendttime=sdf.format(file.stopTime); 
					
					tag.tvstarttime.setText(strstarttime);
					tag.tvendtime.setText(strendttime);
					
					tag.tvtype.setText(String.valueOf(file.dwRecType));
				}
				else if(m_RecordType == 1)
				{
					tag.tvindex.setText("");
					tag.tvchannel.setText(String.valueOf(file.dwChannel+1));
					
					SimpleDateFormat sdf=new SimpleDateFormat("HH:mm:ss");  
					String strstarttime=sdf.format(file.startTime);  
					String strendttime=sdf.format(file.stopTime); 
					
					tag.tvstarttime.setText(strstarttime);
					tag.tvendtime.setText(strendttime);
					
					tag.tvtype.setText(String.valueOf(file.dwRecType));
				}
				else if(m_RecordType == 2)
				{
					tag.tvindex.setText("");
					tag.tvchannel.setText(String.valueOf(file.dwChannel+1));
					
					SimpleDateFormat sdf= new SimpleDateFormat("HH:mm:ss");
					String strstarttime=sdf.format(file.startTime);  
					String strendttime=sdf.format(file.stopTime); 
					
					tag.tvstarttime.setText(strstarttime);
					tag.tvendtime.setText(strendttime);
					
					tag.tvtype.setText("");
				}
				else if(m_RecordType == 3)
				{
					tag.tvindex.setText("");
					tag.tvchannel.setText("");
					
					SimpleDateFormat sdf=new SimpleDateFormat("yyyy-MM-dd");  
					String strstarttime=sdf.format(file.startTime);  
					
					tag.tvstarttime.setText(strstarttime);
					tag.tvendtime.setText("");
					
					tag.tvtype.setText("");
				}
			}		
		}	
		return convertView;
	}

	class ChildTag
	{
		TextView tvindex;
		TextView tvchannel;
		TextView tvstarttime;
		TextView tvendtime;
		TextView tvtype;

		LayoutParams tvdividerparams;
	}

}
