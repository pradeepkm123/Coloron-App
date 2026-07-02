#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>

/* Register Alarm Callback Functions */
void CALLBACK SubscribCallBack(LONG lUserID, DWORD dwCommand, char *pBuf, DWORD dwBufLen, void *pUser)
{
    // device info
    CString username = "admin";
    CString password = "123456";
    CString device_ip = "10.80.1.138";
    DWORD device_port = 9008;
    // init sdk
    NET_SDK_Init();
    // device login
    NET_SDK_DEVICEINFO device_info;
    memset(&device_info, 0, sizeof(NET_SDK_DEVICEINFO));
    int userid = NET_SDK_Login(device_ip.GetBuffer(), device_port, username.GetBuffer(), password.GetBuffer(), &device_info);

    if (userid > 0)
    {
        cout << "Login successful: " << userid << endl;
    }
    else
    {
        cout << "Login failed: " << userid << endl;
        return;
    }

    // dwCommand Different values represent different types of intelligent alarm information, and pBuf is the structure that the alarm content needs to be transformed into
    switch (dwCommand)
    {
    case NET_SDK_SMART_EVENT_TYPE_VFD:
    {
        break; // face detection event,here the specific business processing is omitted
    }

    // video issue detection event,here the specific business processing is omitted
    case NET_SDK_SMART_EVENT_TYPE_AVD:
    {
        break;
    }
    // face comparison event,here the specific business processing is omitted
    case NET_SDK_SMART_EVENT_TYPE_FACE_MATCH:
    {
        break;
    }

    case NET_SDK_SMART_EVENT_TYPE_FACE_MATCH_FOR_IPC:
    {
        // when dwCommand is NET_SDK_SMART_EVENT_TYPE_FACE_MATCH_FOR_IPC ，pBuf structure like this:
        /*  ----------------------
        |   NET_SDK_IVE_BASE_INFO   |
        -------------------------
        |   NET_SDK_IVE_PICTURE_INFO    |
        -------------------------
        |   Picture data(live time)     |
        -------------------------
        |   NET_SDK_IVE_PICTURE_INFO    |
        -------------------------
        |   picture data (album)        |
        -------------------------*/
        NET_SDK_IVE_BASE_INFO *baseInfo = (NET_SDK_IVE_BASE_INFO *)pBuf;
        NET_SDK_IVE_PICTURE_INFO *pictureInfo = (NET_SDK_IVE_PICTURE_INFO *)(pBuf + sizeof(NET_SDK_IVE_BASE_INFO));
        TRACE("iHeight=%d, iWidth=%d, iPicSize=%d, iPicFormat=%d, \n", pictureInfo->iHeight, pictureInfo->iWidth, pictureInfo->iPicSize, pictureInfo->iPicFormat);

        if (dwBufLen >= (sizeof(NET_SDK_IVE_BASE_INFO) + sizeof(NET_SDK_IVE_PICTURE_INFO) + pictureInfo->iPicSize))
        {
            if (pictureInfo->iPicSize > 0)
            {
                /*FILE* backfp = fopen("./testback.jpg", "wb");
                if (backfp)
                {
                    int fret = fwrite(pBuf + (sizeof(NET_SDK_IVE_BASE_INFO) + sizeof(NET_SDK_IVE_PICTURE_INFO)), pictureInfo->iPicSize, 1, backfp);
                    fclose(backfp);
                }*/
            }
        }
    }
    break;
    // cross boundary detection and regional intrusion detection for IPC ,here the specific business processing is omitted
    case NET_SDK_SMART_EVENT_TYPE_PEA_FOR_IPC:
    {
        break;
    }
    // cross boundary detection and regional intrusion detection, with target capture related information ,here the specific business processing is omitted
    case NET_SDK_SMART_EVENT_TYPE_PEA_TARGET:
    {
        break;
    }
    // object Abandoned/Missing event ,here the specific business processing is omitted
    case NET_SDK_SMART_EVENT_TYPE_OSC:
    {
        break;
    }
    // people counting event,here the specific business processing is omitted
    case NET_SDK_SMART_EVENT_TYPE_CPC:
    {
        break;
    }
    // crowdy density event  ,here the specific business processing is omitted
    case NET_SDK_SMART_EVENT_TYPE_CDD:
    {
        break;
    }
    // people intrusion event ,here the specific business processing is omitted
    case NET_SDK_SMART_EVENT_TYPE_IPD:
    {
        break;
    }
    // target tracking trajectory  event ,here the specific business processing is omitted
    case NET_SDK_SMART_EVENT_TYPE_TRAJECT:
    {
        break;
    }
    // license plate for ipc  event ,here the specific business processing is omitted
    case NET_SDK_SMART_EVENT_TYPE_VEHICLE:
    {
        break;
    }
    // passline event ,here the specific business processing is omitted
    case NET_SDK_SMART_EVENT_TYPE_PASSLINE:
    {
        break;
    }
    // traffic event ,here the specific business processing is omitted
    case NET_SDK_SMART_EVENT_TYPE_TRAFFIC:
    {
    }

        // logout
        NET_SDK_Logout(userid);
        NET_SDK_Cleanup();
    }
}
void SubscribProcess()
{
    // device info
    CString username = "admin";
    CString password = "123456";
    CString device_ip = "10.80.1.138";
    DWORD device_port = 9008;
    // init sdk
    NET_SDK_Init();
    // device login
    NET_SDK_DEVICEINFO device_info;
    memset(&device_info, 0, sizeof(NET_SDK_DEVICEINFO));
    int userid = NET_SDK_Login(device_ip.GetBuffer(), device_port, username.GetBuffer(), password.GetBuffer(), &device_info);

    if (userid > 0)
    {
        cout << "Login successful: " << userid << endl;
    }
    else
    {
        cout << "Login failed: " << userid << endl;
        return;
    }
    // subscrib callback function
    bool isOk = NET_SDK_SetSubscribCallBack(SubscribCallBack, NULL);

    if (isOk)
    {
        cout << "Set callback successfully" << endl;
    }
    else
    {
        cout << "Set callback failed" << endl;
    }
    // logout
    NET_SDK_Logout(userid);

    NET_SDK_Cleanup();
}