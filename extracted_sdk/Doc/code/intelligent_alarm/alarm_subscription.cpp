/* Subscrib and Unsubscrib */
#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>
using namespace std;

/*
    Alarm subscription process
*/
/*
    Subscribe and unsubscribe
*/
char m_serverAddressPassLine[256];
void SmartSubscribAndUnSubscribPassline()
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

    BOOL bret;

    NET_DVR_SUBSCRIBE_REPLY sSmartSubscrib;
    // Subscribe the passline alarm event, the information of the event will be put into &sSmartSubscrib
    bret = NET_SDK_SmartSubscrib(userid, NET_IPC_SMART_PASSLINE, 0, &sSmartSubscrib);
    if (!bret)
    {
        cout << " NET_SDK_SmartSubscrib  error" << endl;
    }
    else
    {
        cout << " NET_SDK_SmartSubscrib  success" << endl;
        // Copy the subscription server address information to the variable m_serverAddressPassLine
        memcpy(m_serverAddressPassLine, sSmartSubscrib.serverAddress, sizeof(sSmartSubscrib.serverAddress));
    }

    int dwResult = 0;
    // Unsubscribe passline statistics event
    bret = NET_SDK_UnSmartSubscrib(userid, NET_IPC_SMART_PASSLINE, 0, m_serverAddressPassLine, &dwResult);
    if (!bret)
    {

        cout << " NET_SDK_UnSmartSubscrib  error" << endl;
    }
    else
    {
        cout << " NET_SDK_UnSmartSubscrib  success" << endl;
    }

    // logout
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
}