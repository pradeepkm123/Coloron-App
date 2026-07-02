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
    face group and face database manage process
*/
/*
    support face and unsupport
*/
BOOL IsSupportFace()
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
        return FALSE;
    }

    DWORD SUPPORT = 0;
    DWORD lpBytesReturned = 0;
    // get face match support status - in:NULL, out:DWORD
    BOOL ret = NET_SDK_FaceMatchOperate(userid, NET_SDK_GET_FACE_MATCH_SUPPORT, NULL, 0, &SUPPORT, sizeof(DWORD), &lpBytesReturned);
    if (SUPPORT == 0)
    {
        cout << "Unsupport face match " << endl;
        return FALSE;
    }
    else
    {
        cout << "Support face match " << endl;
        return TRUE;
    }

    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
    return TRUE;
}