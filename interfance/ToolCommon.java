package com.sdk.interfance;

import android.app.Activity;
import android.content.Context;
import android.os.Environment;
import android.os.Looper;
import android.util.Log;
import android.widget.Toast;

import com.sdk.network.StoragePath;
import java.io.File;
import java.io.FileOutputStream;
import java.util.List;

/**
 * Created by hyt on 2018/9/5.
 */


public class ToolCommon
{
    public static boolean isForceSoftCodec = false;

    private static final String TAG = "androidLog";
    private static long lastClickTime = 0;


    public static boolean isFastDoubleClick() {
        long time = System.currentTimeMillis();
        if(time - lastClickTime < 800L) {
            return true;
        } else {
            lastClickTime = time;
            return false;
        }
    }
    public static boolean isListEmpty(List<?> listIsEmpty) {
        return null == listIsEmpty || listIsEmpty.isEmpty();
    }
    public static boolean isEmpty(String strIsEmpty) {
        return null == strIsEmpty || "".equals(strIsEmpty.trim())
                || "null".equals(strIsEmpty);
    }

    public static int getColorId(Context context, int resId) {
        if (null != context) {
            return context.getResources().getColor(resId);
        }
        return -1;
    }
    public static void toastShow(final Activity activity, final String msg)
    {
        if (Looper.myLooper() == Looper.getMainLooper())
        {//判断是否是在主线程
            Toast.makeText(activity, msg, Toast.LENGTH_SHORT).show();
        }
        else
        {
            activity.runOnUiThread(new Runnable()
            {
                @Override
                public void run()
                {
                    Toast.makeText(activity, msg, Toast.LENGTH_SHORT).show();
                }
            });
        }
    }
    public static void LOGD(String TAG,String msg)
    {
        if(true) {
            Log.d(TAG, msg);
        }
    }

    public static String getFileName(Context context, String filename, String type) {
        if (!externalMemoryAvailable()) {
            StoragePath.STORAGE_PATH = context.getFilesDir().getAbsolutePath();
        } else {
            StoragePath.STORAGE_PATH = context.getExternalFilesDir(Environment.DIRECTORY_PICTURES).getAbsolutePath();
        }
        String strPath = StoragePath.STORAGE_PATH;
        if (!creatDirectory(strPath)) {
            return null;
        }
        strPath += "/";
        strPath += filename;
        if (!creatDirectory(strPath)) {
            return null;
        }
        strPath += "/";
        strPath += type;
        if (!creatDirectory(strPath)) {
            return null;
        }
        strPath += "/";
        strPath += StoragePath.getCurrentDate("-") + "-" + StoragePath.getCurrentTime("-");
        strPath += "." + type;
        return strPath;
    }

    public static String getFileName(Context context) {
        if (!externalMemoryAvailable()) {
            StoragePath.STORAGE_PATH = context.getFilesDir().getAbsolutePath();
        } else {
             StoragePath.STORAGE_PATH = context.getExternalFilesDir(Environment.DIRECTORY_MOVIES).getAbsolutePath();
        }
        String strPath = StoragePath.STORAGE_PATH;
        if (!creatDirectory(strPath)) {
            return null;
        }
        strPath += "/";
        String time = StoragePath.getCurrentDate("-") + "-" + StoragePath.getCurrentTime("-");
        strPath += time;
        strPath += ".avi";
        return strPath;
    }

    public static boolean bytesToImageFile(byte[] bytes,String filepath){
        boolean ret = false;
        try {
            File file = new File(filepath);
            FileOutputStream fos = new FileOutputStream(file);
            fos.write(bytes, 0, bytes.length);
            fos.flush();
            fos.close();
            ret = true;

        } catch (Exception e) {
            LOGD(TAG, "bytesToImageFile: "+e.getMessage());

            e.printStackTrace();
        }
        return ret;
    }

    public static boolean externalMemoryAvailable() {
        return Environment.getExternalStorageState().equals(Environment.MEDIA_MOUNTED);
    }

    public static boolean creatDirectory(String strPath) {
        File pFileDir = new File(strPath);
        if (!pFileDir.exists()) {
            if (!pFileDir.mkdir()) {
                return false;
            }
            return true;
        }
        return true;
    }
}
