#include <afx.h>
#include <string>
#include <stdio.h>
#include <iostream>
#include "DVR_NET_SDK.h"

void CaptureJPEGData()
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

    // Get the screenshot data and save it to the local disk.
    DWORD dwRetLen = 0;
    const int nJpgBufLen = 1024 * 1024 * 5;
    char *pJpegBuf = new char[nJpgBufLen];
    memset(pJpegBuf, 0x00, nJpgBufLen);
    char imgName[512]{0};
    sprintf_s(imgName, "D:/test.jpg");
    BOOL captureStatus = NET_SDK_CaptureJPEGData_V2(userid, 0, pJpegBuf, nJpgBufLen, &dwRetLen);

    if (!captureStatus)
    {
        errCode = NET_SDK_GetLastError();
        std::cout << "Screenshot failed!" << "Error code:" << errCode << std::endl;
    }
    else
    {
        FILE *file;
        errno_t err = fopen_s(&file, imgName, "wb");

        if (err = 0 || file != NULL)
        {
            fwrite(pJpegBuf, sizeof(char), dwRetLen, file);
            fclose(file);
            std::cout << "Screenshot successful!" << std::endl;
        }
        else
        {
            std::cout << "Screenshot failed! write file failed!" << std::endl;
        }
    }

    // Logout.
    NET_SDK_Logout(userid);
    // Release SDK resources.
    NET_SDK_Cleanup();
    return;
}