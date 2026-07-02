#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>

void excertionCallback(DWORD dwType, LONG lUserID, LONG lHandle, void *pUser)
{
    if (NETWORK_DISCONNECT == dwType)
    {
        cout << "type: " << dwType << " userID: " << lUserID << " channel: " << lHandle << "-----NETWORK_DISCONNECT" << endl;
    }
    else if (NETWORK_RECONNECT == dwType)
    {
        cout << "type: " << dwType << " userID: " << lUserID << " channel: " << lHandle << "-----NETWORK_RECONNECT" << endl;
    }
    else if (NETWORK_CH_DISCONNECT == dwType)
    {
        cout << "type: " << dwType << " userID: " << lUserID << " channel: " << lHandle << "-----NETWORK_CH_DISCONNECT" << endl;
    }
    else if (NETWORK_CH_RECONNECT == dwType)
    {
        cout << "type: " << dwType << " userID: " << lUserID << " channel: " << lHandle << "-----NETWORK_CH_RECONNECT" << endl;
    }
    else
    {
        cout << "Unknow error code: " << dwType << endl;
    }
}

void AbnormalAlarmProcess()
{
    // device info
    CString username = "admin";
    CString password = "123456";
    CString device_ip = "10.80.1.177";
    DWORD device_port = 6036;
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

    // SDK operation abnormal callback function
    bool isOk = NET_SDK_SetSDKMessageCallBack(0, 0, excertionCallback, NULL);

    if (isOk)
    {
        cout << "Set message callback successfully" << endl;
    }
    else
    {
        cout << "Set message callback failed" << endl;
    }

    Sleep(100000);
    // logout
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
}