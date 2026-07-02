#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>

using namespace std;

BOOL GetTargetFace()
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

    NET_SDK_IVE_FACE_MATCH_QUERY_ALBUM_INFO albumInfo = {};

    albumInfo.iPageNum = 0;
    albumInfo.iPageSize = 10;
    albumInfo.bUseTypeFilter = true;
    albumInfo.iType = 1;

    const int BUF_SIZE = 1000 * 1024;
    unique_ptr<char[]> buffer = make_unique<char[]>(BUF_SIZE);

    DWORD lpBytesReturned = 0;
    BOOL ret = NET_SDK_FaceMatchOperate(m_userID, NET_SDK_GET_FACE_IPC_LIST, &albumInfo, sizeof(NET_SDK_IVE_FACE_MATCH_QUERY_ALBUM_INFO), buffer.get(), BUF_SIZE, &lpBytesReturned);

    if (ret && lpBytesReturned > 0)
    {
        char *realOutBuf = buffer.get();
        int *totalNum = (int *)realOutBuf;
        realOutBuf += sizeof(int);
        int *currentNum = (int *)realOutBuf;
        realOutBuf += sizeof(int);
        for (int i = 0; i < *currentNum; i++)
        {
            NET_SDK_IVE_FACE_MATCH_QUERY_ALBUM_REPLY_INFO *pReplyAlbum = (NET_SDK_IVE_FACE_MATCH_QUERY_ALBUM_REPLY_INFO *)realOutBuf;
            realOutBuf += sizeof(NET_SDK_IVE_FACE_MATCH_QUERY_ALBUM_REPLY_INFO);
            realOutBuf += pReplyAlbum->stBaseInfo.iPicSize;
            cout << "albumINfo: key:" << pReplyAlbum.iKey;
        }
    }
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
    return FALSE;
}