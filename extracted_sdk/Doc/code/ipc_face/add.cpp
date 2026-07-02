#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>

using namespace std;

BOOL AddTargetFace()
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

    NET_SDK_IVE_FACE_MATCH_ADD_ALBUM_INFO *itemToAdd = (NET_SDK_IVE_FACE_MATCH_ADD_ALBUM_INFO *)tempBuf;

    itemToAdd->iType = 0; // strangerList
    memcpy(itemToAdd->szName, "test", sizeof(itemToAdd->szName));
    itemToAdd->iMale = 0; // female
    itemToAdd->iAge = 20;
    memcpy(itemToAdd->szIdentifyNum, "123456", sizeof(itemToAdd->szIdentifyNum));
    memcpy(itemToAdd->szTel, "123456", sizeof(itemToAdd->szTel));
    char *imgData = tempBuf + sizeof(NET_SDK_IVE_FACE_MATCH_ADD_ALBUM_INFO);
    // Face image is only supported in jpg format.
    FILE *fp = fopen("./face.jpg", "rb");
    path.ReleaseBuffer();
    int length = 0;
    if (fp)
    {
        fseek(fp, 0, SEEK_END);
        length = ftell(fp);
        fseek(fp, 0, SEEK_SET);
        int readLen = fread(imgData, length, 1, fp);
        fclose(fp);
    }

    itemToAdd->iPicSize = length;
    DWORD lpBytesReturned = 0;
    unsigned char *rret = new unsigned char[1024];
    BOOL ret = NET_SDK_FaceMatchOperate(m_userID, NET_SDK_ADD_FACE_IPC, tempBuf, sizeof(NET_SDK_IVE_FACE_MATCH_ADD_ALBUM_INFO) + length, rret, 1024, &lpBytesReturned);
    if (ret)
    {
        if (lpBytesReturned >= sizeof(NET_SDK_IVE_FACE_MATCH_ADD_FACE_REPLY_T))
        {
            NET_SDK_IVE_FACE_MATCH_ADD_FACE_REPLY_T *preply = (NET_SDK_IVE_FACE_MATCH_ADD_FACE_REPLY_T *)rret;
            cout << "NET_SDK_ADD_FACE_IPC success faceId=" << preply->iPersonId;
        }
    }
    else
    {
        cout << " NET_SDK_ADD_FACE_IPC faild!";
    }
    delete[] rret;
    delete[] tempBuf;
    rret = NULL;
    tempBuf = NULL;
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
    return FALSE;
}