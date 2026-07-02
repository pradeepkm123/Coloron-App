#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>
#include <iostream>

using namespace std;
int m_userid1 = -1;

void CALLBACK AcceptRegisterProc1(LONG lUserID, LONG lRegisterID, LPNET_SDK_DEVICEINFO pDeviceInfo, void *pUser)
{
    m_userid1 = lUserID;
    cout << "lUserID: " << lUserID << endl;
    cout << "lRegisterID: " << lRegisterID << endl;
    cout << "deviceName: " << pDeviceInfo->deviceName << endl;
}

void my_LIVE_DATA_CALLBACK1(POINTERHANDLE lLiveHandle, NET_SDK_FRAME_INFO frameInfo, BYTE *pBuffer, void *pUser)
{
    cout << "deviceID: " << frameInfo.deviceID << endl;
    cout << "channel: " << frameInfo.channel << endl;
    cout << "length: " << frameInfo.length << endl;
}

void RegisterDevice()
{
    // init sdk
    NET_SDK_Init();
    NET_SDK_SetConnectTime(5000, 1);
    NET_SDK_SetReconnect();

    // Register the device.
    REG_LOGIN_INFO regInfo;
    regInfo.deviceId = 95272; // The reporting ID should be consistent with the device's registration.
    strcpy_s(regInfo.m_szUserName, "admin");
    strcpy_s(regInfo.m_szPasswd, "123456");

    NET_SDK_AddRegisterDeviceInfo(&regInfo, 1);

    // Initiate a report
    bool isOk = NET_SDK_SetRegisterPort(2009);
    cout << "NET_SDK_SetRegisterPort: " << isOk << endl;
    isOk = NET_SDK_SetRegisterCallback(AcceptRegisterProc1, NULL);
    cout << "NET_SDK_SetRegisterCallback: " << isOk << endl;

    while (true)
    {
        if (m_userid1 != -1)
        {
            cout << "login success!" << endl;
            break;
        }

        Sleep(1000);
        cout << "wait for login..." << endl;
    }

    // Open live display
    NET_SDK_CLIENTINFO lpClientInfo = {0};
    lpClientInfo.hPlayWnd = GetConsoleWindow();
    lpClientInfo.lChannel = 0;
    lpClientInfo.streamType = NET_SDK_MAIN_STREAM;
    lpClientInfo.bNoDecode = 0;
    LONG lhandle = NET_SDK_LivePlay(m_userid1, &lpClientInfo, NULL, NULL);
    if (lhandle == -1)
    {
        DWORD err1 = NET_SDK_GetLastError();
        cout << "Failed to preview！error code: " << err1 << endl;
        return;
    }
    else
    {
        NET_SDK_SetLiveDataCallBack(lhandle, my_LIVE_DATA_CALLBACK1, NULL);
    }
    cout << "Preview successful!" << endl;
    // Waiting for live display
    Sleep(100000);

    // Login
    NET_SDK_Logout(m_userid1);
    NET_SDK_Cleanup();
}