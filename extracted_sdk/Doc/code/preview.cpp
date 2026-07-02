#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"

using namespace std;

void LivePlay()
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

    // Open live display
    NET_SDK_CLIENTINFO lpClientInfo = {0};
    AllocConsole();
    lpClientInfo.hPlayWnd = GetConsoleWindow();
    lpClientInfo.lChannel = 0;
    lpClientInfo.streamType = NET_SDK_MAIN_STREAM;
    lpClientInfo.bNoDecode = 0;
    LONG lhandle = NET_SDK_LivePlay(userid, &lpClientInfo, NULL, NULL);

    if (lhandle == -1)
    {
        DWORD err1 = NET_SDK_GetLastError();
        cout << "Failed to preview! error code: " << err1 << endl;
        return;
    }

    cout << "Preview successful!" << endl;
    // Waiting for live display
    Sleep(1000);
    // Open sound
    BOOL open = NET_SDK_OpenSound(lhandle);

    if (open == true)
    {
        cout << "Sound opened successfully!" << endl;
    }
    else
    {
        cout << "Failed to open the sound!" << endl;
    }

    // Close sound
    BOOL close = NET_SDK_OpenSound(lhandle);

    if (close == true)
    {
        cout << "Sound closed successfully!" << endl;
    }
    else
    {
        cout << "Failed to close the sound!" << endl;
    }

    // Stop live display
    NET_SDK_StopLivePlay(lhandle);
    // Logout
    NET_SDK_Logout(userid);
    // Clean up the data
    NET_SDK_Cleanup();
}