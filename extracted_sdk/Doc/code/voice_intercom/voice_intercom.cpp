#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"

using namespace std;

void VoiceCom()
{
    // Initial
    NET_SDK_Init();
    // Device information
    const std::string device_ip = "10.80.1.177";
    const DWORD decice_port = 6036;
    const std::string username = "admin";
    const std::string password = "123456";
    //  Login
    NET_SDK_DEVICEINFO device_info = {0};
    int userid = NET_SDK_Login(const_cast<char *>(device_ip.c_str()), decice_port, const_cast<char *>(username.c_str()), const_cast<char *>(password.c_str()), &device_info);

    if (userid > 0)
    {
        cout << "Login successfully: " << userid << endl;
    }
    else
    {
        cout << "Failed to login: " << userid << endl;
        return;
    }

    // Start voice communication
    LONG lChannel = 0;
    LONG vchandle = NET_SDK_StartVoiceCom(userid, FALSE, NULL, NULL, lChannel);

    if (vchandle == -1)
    {
        DWORD err1 = NET_SDK_GetLastError();
        cout << "Failed to start voice communication! error code: " << err1 << endl;
    }
    else
    {
        cout << "Start voice communication successfully!" << endl;
    }

    // Stop voice communication
    NET_SDK_StopVoiceCom(vchandle);
    // Logout
    NET_SDK_Logout(userid);
    // Clean up the data
    NET_SDK_Cleanup();
}