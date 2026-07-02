package com.sdk.interfance;

import android.app.Activity;
import android.app.ActivityManager;
import android.os.Bundle;
import android.util.Log;
import com.sdk.test.app.SDKApplication;

import java.util.List;

public class BaseActivity extends Activity {
    public SDKApplication Application;
    private static final String TAG = "BaseActivity";
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Application =(SDKApplication)this.getApplication();
        //每新建一个activity旧增加一个activity
        Application.addActivity(this);
        //输出栈里面存有的activity数量和顶层activity
        ToolCommon.LOGD( TAG,getTopActivity(this));

    }

    /**
     * 获取栈顶activity
     * @param context
     * @return
     */
    protected String getTopActivity(Activity context)
    {
        ActivityManager manager = (ActivityManager)context.getSystemService(ACTIVITY_SERVICE) ;
        List<ActivityManager.RunningTaskInfo> runningTaskInfos = manager.getRunningTasks(1) ;

        if(runningTaskInfos != null){
            return "栈数量:"+runningTaskInfos.size()+
                    "  栈顶Activity:"+runningTaskInfos.get(0).topActivity+
                    "  总Activity数:"+runningTaskInfos.get(0).numActivities;
        }
        else{
            return null ;
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        Application.removeActivity(this);
    }
}
