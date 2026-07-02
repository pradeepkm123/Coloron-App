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
    support face and unsupport
*/
BOOL IsSupportTargetFace()
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
        return FALSE;
    }

    DWORD SUPPORT = 0;
    DWORD lpBytesReturned = 0;
    BOOL ret = NET_SDK_FaceMatchOperate(m_userID, NET_SDK_GET_FACE_MATCH_SUPPORT, NULL, 0, &SUPPORT, sizeof(DWORD), &lpBytesReturned);

    if (ret && SUPPORT == 1)
    {
        cout << " support vfd " << endl;
        NET_SDK_Logout(userid);
        NET_SDK_Cleanup();
        return TRUE;
    }
    else
    {
        cout << " unsupport vfd " << endl;
        NET_SDK_Logout(userid);
        NET_SDK_Cleanup();
        return FALSE;
    }
}