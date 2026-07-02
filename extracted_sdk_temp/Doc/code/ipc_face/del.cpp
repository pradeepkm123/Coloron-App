#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>

using namespace std;

BOOL DelTargetFace()
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

    NET_SDK_IVE_FACE_MATCH_DELE_ALBUM_INFO delInfo = {};
    delInfo.bUseKeyFilter = true;
    delInfo.iKey = 1722898532;

    DWORD lpBytesReturned = 0;
    BOOL ret = NET_SDK_FaceMatchOperate(m_userID, NET_SDK_DEL_FACE_IPC, &delInfo, sizeof(NET_SDK_IVE_FACE_MATCH_DELE_ALBUM_INFO), NULL, 0, &lpBytesReturned);
    if (!ret)
    {
        cout << " faild!";
    }
    else
    {
        cout << "NET_SDK_DEL_FACE_IPC success!";
    }
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
    return FALSE;
}