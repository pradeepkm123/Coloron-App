#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>

using namespace std;

BOOL EditTargetFace()
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

    char *tempBuf = new char[1024 * 1024];
    memset(tempBuf, 0, 1024 * 1024);

    NET_SDK_IVE_FACE_MATCH_MODIFY_ALBUM_INFO_T *modiFyInfo = (NET_SDK_IVE_FACE_MATCH_MODIFY_ALBUM_INFO_T *)tempBuf;
    modiFyInfo->iKey = 1722898532;
    modiFyInfo->stBaseInfo.iType = 1; // whiteList
    modiFyInfo->stBaseInfo.iAge = 28;
    memcpy(modiFyInfo->stBaseInfo.szIdentifyNum, "111111", sizeof(modiFyInfo->stBaseInfo.szIdentifyNum));
    memcpy(modiFyInfo->stBaseInfo.szTel, "155456456456", sizeof(modiFyInfo->stBaseInfo.szTel));
    modiFyInfo->stBaseInfo.iMale = 1; // male
    memcpy(modiFyInfo->stBaseInfo.szName, "test01", sizeof(modiFyInfo->stBaseInfo.szName));
    DWORD lpBytesReturned = 0;

    char *imgData = tempBuf + sizeof(NET_SDK_IVE_FACE_MATCH_MODIFY_ALBUM_INFO_T);

    // Face image is only supported in jpg format. If you don't modify the face image, you don't need to pass this。
    FILE *fp = fopen("./face.jpg", "rb");
    int length = 0;
    if (fp)
    {
        fseek(fp, 0, SEEK_END);
        length = ftell(fp);
        fseek(fp, 0, SEEK_SET);
        int readLen = fread(imgData, length, 1, fp);
        fclose(fp);
    }

    modiFyInfo->stBaseInfo.iPicSize = length;
    NET_SDK_NET_REPLY_RESULT res = {};

    BOOL ret = NET_SDK_FaceMatchOperate(m_userID, NET_SDK_EDIT_FACE_IPC, tempBuf, sizeof(NET_SDK_IVE_FACE_MATCH_MODIFY_ALBUM_INFO_T) + length, &res, sizeof(NET_SDK_NET_REPLY_RESULT), &lpBytesReturned);
    if (!ret)
    {
        cout << " NET_SDK_EDIT_FACE_IPC faild!";
    }
    else
    {
        cout << "NET_SDK_EDIT_FACE_IPC success!";
    }
    delete[] tempBuf;
    tempBuf = nullptr;

    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
    return FALSE;
}