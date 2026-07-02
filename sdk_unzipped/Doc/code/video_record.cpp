#include <afx.h>
#include <string>
#include <stdio.h>
#include <iostream>
#include "DVR_NET_SDK.h"

void StartRecord()
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

    // Manually recording.
    BOOL ret = NET_SDK_StartDVRRecord(userid, 0, 0);

    if (ret)
    {
        std::cout << "Manual recording successful!" << std::endl;
    }
    else
    {
        errCode = NET_SDK_GetLastError();
        std::cout << "Manual recording failed!" << "Error code:" << errCode << std::endl;
    }

    // Logout.
    NET_SDK_Logout(userid);
    // Release SDK resources.
    NET_SDK_Cleanup();
    return;
}