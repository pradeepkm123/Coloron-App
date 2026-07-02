#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>
#include <iostream>

using namespace std;

void SubscribCallBack1(LONG lUserID, DWORD dwCommand, char *pBuf, DWORD dwBufLen, void *pUser)
{
    cout << "recive command: " << dwCommand << endl;
    // NET_SDK_SMART_EVENT_TYPE
    // According to different commands, do different processing
}

void DeviceAlarmProcess()
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

    // Setup alarm
    LONG handle = NET_SDK_SetupAlarmChan(userid);

    if (handle > 0)
    {
        cout << "Setup alarm handle: " << handle << endl;
    }
    else
    {
        DWORD error_code = NET_SDK_GetLastError();
        cout << "Setup alarm fail: " << error_code << endl;
    }

    NET_SDK_SetSubscribCallBack(SubscribCallBack1, NULL);
    // wait for alarm
    Sleep(100000);
    // Close alarm
    NET_SDK_CloseAlarmChan(handle);
    // logout
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
}