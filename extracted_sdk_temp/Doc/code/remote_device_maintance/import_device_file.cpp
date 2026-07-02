#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>

void SetConfigFile()
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

    // Import configuration file
    CString fileName = "ConfigurationBackupFile.txt";
    bool isOk = NET_SDK_SetConfigFile(userid, fileName.GetBuffer());

    if (isOk)
    {
        cout << "Configuration file imported successfully" << endl;
    }
    else
    {
        cout << "Configuration file import failed" << endl;
    }

    // logout
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
}