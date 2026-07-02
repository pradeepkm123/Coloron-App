#include "PTZ.h"
#include <afx.h>
#include <string>
#include <stdio>
#include <iostream>
#include "DVR_NET_SDK.h"

void PTZControl()
{
    // Device information.
    const std::string device_ip = "10.80.1.177";
    const DWORD decice_port = 6036;
    const std::string username = "admin";
    const std::string password = "123456";
    // Initialize SDK.
    NET_SDK_Init();
    NET_SDK_DEVICEINFO device_info{0};
    DWORD errCode = 0;
    // Device login.
    int userid = NET_SDK_Login(const_cast<char *>(device_ip.c_str()), decice_port, const_cast<char *>(username.c_str()), const_cast<char *>(password.c_str()), &device_info);

    if (userid > 0)
    {
        std::cout << "Login successful!" << std::endl;
    }
    else
    {
        errCode = NET_SDK_GetLastError();
        std::cout << "Login failed!" << "Error code:" << errCode << std::endl;
        NET_SDK_Cleanup();
        return;
    }

    // Live Play.
    NET_SDK_CLIENTINFO clientInfo{0};
    clientInfo.hPlayWnd = GetConsoleWindow();
    // Channel number, starting from 0.
    clientInfo.lChannel = 0;
    /*
    Video stream type, including:
        NET_SDK_MAIN_STREAM、
        NET_SDK_SUB_STREAM、
        NET_SDK_THIRD_STREAM、
        NET_SDK_FOURTH_STREAM，
    Depends on the device's support.
    */
    clientInfo.streamType = NET_SDK_MAIN_STREAM;
    // Whether to decode.
    // 0: Decoding;
    // 1: Non-decoding, only for the Windows platform, default 0.
    clientInfo.bNoDecode = 0;
    // Start Live Play.
    LONG playHandle = NET_SDK_LivePlay(userid, &clientInfo, NULL, NULL);

    if (playHandle != -1)
    {
        std::cout << "Live Play successful!" << std::endl;
        // PTZ control operation.
        // Control the PTZ to tilt up.
        BOOL ptzStatus = NET_SDK_PTZControl(playHandle, PTZ_CMD_UP, PTZ_SPEED_1);

        if (ptzStatus)
        {
            std::cout << "PTZ control successful!" << std::endl;
        }
        else
        {
            errCode = NET_SDK_GetLastError();
            std::cout << "PTZ control failed!" << "Error code:" << errCode << std::endl;
        }

        // The PTZ stops after continuously rotating for 5 seconds.
        Sleep(5000);
        BOOL stopStatus = NET_SDK_PTZControl(playHandle, PTZ_CMD_STOP, PTZ_SPEED_1);

        if (!stopStatus)
        {
            errCode = NET_SDK_GetLastError();
            std::cout << "PTZ stop failed!" << "Error code:" << errCode << std::endl;
        }

        // Stop Live Play.
        NET_SDK_StopLivePlay(playHandle);
    }
    else
    {
        errCode = NET_SDK_GetLastError();
        std::cout << "Live Play failed!" << "Error code:" << errCode << std::endl;
    }

    // Logout.
    NET_SDK_Logout(userid);
    // Release SDK resources.
    NET_SDK_Cleanup();
    return;
}