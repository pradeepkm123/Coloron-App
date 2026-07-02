package com.sdk.interfance;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;

import com.sdk.test.app.SDKApplication;
import com.sdk.test.utils.PushThreadPool;
import com.sdk.xml.FaceUrl;
import com.sdk.xml.XmlHelper;
import com.switchbee.technician.R;

import java.util.concurrent.CountDownLatch;

public class SDKFaceActivity extends BaseActivity
{
    private static final String TAG = "SDKFaceActivity";
    private nvrsdk mNVRSDK = null;
    private Button btnSearchFaceId, btnSearchDetailById, btnDeleteFace, btnAddFace;
    private EditText etShowSearchResult, etSearchDetailByIdResult;
    private EditText etChannelId,etInputFaceId;

    public static void startInstance(Context context)
    {
        context.startActivity(new Intent(context, SDKFaceActivity.class));
    }

    private int mUserID1 = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);
        this.getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        setContentView(R.layout.activity_face);
        mNVRSDK = SDKApplication.getInstance().getNvrSdk();
        if (mNVRSDK == null)
        {
            return;
        }

        mNVRSDK.SetID(111);

        mUserID1 = SDKApplication.getInstance().getUserId1();


        mNVRSDK = SDKApplication.getInstance().getNvrSdk();
        btnSearchFaceId = findViewById(R.id.btnSearchFaceId);
        etShowSearchResult = findViewById(R.id.etShowSearchResult);
//        etShowSearchResult.setMovementMethod(ScrollingMovementMethod.getInstance());
        btnSearchDetailById = findViewById(R.id.btnSearchDetailById);
        etSearchDetailByIdResult = findViewById(R.id.etSearchDetailByIdResult);
//        etSearchDetailByIdResult.setMovementMethod(ScrollingMovementMethod.getInstance());
        btnDeleteFace = findViewById(R.id.btnDeleteFace);
        btnAddFace = findViewById(R.id.btnAddFace);
        etChannelId = findViewById(R.id.etChannelIndex);
        etInputFaceId = findViewById(R.id.etInputFaceId);

        initListener();
    }


    private void initListener()
    {
        findViewById(R.id.btReturn).setOnClickListener(new OnClickListener()
        {
            @Override
            public void onClick(View view)
            {
                finish();
            }
        });

        btnSearchFaceId.setOnClickListener(new OnClickListener()
        {
            @Override
            public void onClick(View view)
            {//查询目标库人脸ID
                String result = sendApiInterface(XmlHelper.queryFaceIdByNameListType(), FaceUrl.GetTargetFace);
                ToolCommon.LOGD(TAG,"btnSearchFaceId result : "+result);
                etShowSearchResult.setText(result);
            }
        });
        btnSearchDetailById.setOnClickListener(new OnClickListener()
        {
            @Override
            public void onClick(View view)
            {//按目标库人脸ID获取详细信息
                String faceId = etInputFaceId.getText().toString();
                if (!ToolCommon.isEmpty(faceId))
                {
                    String result = sendApiInterface(XmlHelper.queryFaceDetailByFaceId(faceId), FaceUrl.GetTargetFace);
                    ToolCommon.LOGD(TAG,"btnSearchDetailById result : " + result);
                    etSearchDetailByIdResult.setText(result);
                }
            }
        });
        btnDeleteFace.setOnClickListener(new OnClickListener()
        {
            @Override
            public void onClick(View view)
            {
                String faceId = etInputFaceId.getText().toString();
                if (!ToolCommon.isEmpty(faceId))
                {
                    String result = sendApiInterface(XmlHelper.deleteMemberByFaceId(faceId), FaceUrl.DeleteTargetFace);
                    ToolCommon.LOGD(TAG,"btnDeleteFace result : " + result);
                    ToolCommon.toastShow(SDKFaceActivity.this, "delete tips :" + result);
                }
            }
        });
        btnAddFace.setOnClickListener(new OnClickListener()
        {
            @Override
            public void onClick(View view)
            {
                String addFaceXml = etSearchDetailByIdResult.getText().toString();
                System.out.println("addFaceXml : " + addFaceXml);
                if (!ToolCommon.isEmpty(addFaceXml))
                {
                    String result = sendApiInterface(addFaceXml, FaceUrl.AddTargetFace);
                    ToolCommon.LOGD(TAG,"btnAddFace result : " + result);
                    ToolCommon.toastShow(SDKFaceActivity.this, "add tips :" + result);
                }
            }
        });
    }

    private String sendApiInterface(final String xmlSend, final String url)
    {
        final StringBuilder sbResult = new StringBuilder();
        //等待子线程同步执行
        final CountDownLatch parserCtl = new CountDownLatch(1);
        PushThreadPool.executeOnThread(new Runnable()
        {
            @Override
            public void run()
            {
                int channleId = 1;//默认1
                String chlStr = etChannelId.getText().toString();
                if (!ToolCommon.isEmpty(chlStr))
                {
                    channleId = Integer.parseInt(chlStr);
                }
                String resultContent = mNVRSDK.apiInterface(mUserID1, xmlSend, url + "/" + channleId);
                //ToolCommon.LOGD(TAG，" resultContent ? " + resultContent);
                sbResult.append(resultContent);
                parserCtl.countDown();
            }
        });
        try
        {
            parserCtl.await();
        }
        catch (InterruptedException e)
        {
            e.printStackTrace();
        }
        finally
        {
            return sbResult.toString();
        }
    }


    @Override
    protected void onDestroy()
    {
        super.onDestroy();
    }

}
