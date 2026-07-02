#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>
using namespace std;

void GetCHSnapFace()
{
    // The id of the channel to be queried
    int channel = 1;
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
        return;
    }

    CList<NET_SDK_FACE_IMG_INFO_CH> m_chSnapFaceList;
    char *tempBuf = new char[100 * 1024];
    memset(tempBuf, 0, 100 * 1024);
    NET_SDK_CH_SNAP_FACE_IMG_LIST_SEARCH sCH_SNAP_FACE_IMG_LIST_SEARCH;
    memset(&sCH_SNAP_FACE_IMG_LIST_SEARCH, 0, sizeof(NET_SDK_CH_SNAP_FACE_IMG_LIST_SEARCH));
    sCH_SNAP_FACE_IMG_LIST_SEARCH.dwChannel = channel;
    sCH_SNAP_FACE_IMG_LIST_SEARCH.pageIndex = 1;
    sCH_SNAP_FACE_IMG_LIST_SEARCH.pageSize = 10;
    sCH_SNAP_FACE_IMG_LIST_SEARCH.startTime.year = 1990;
    sCH_SNAP_FACE_IMG_LIST_SEARCH.startTime.month = 7;
    sCH_SNAP_FACE_IMG_LIST_SEARCH.startTime.mday = 7;
    sCH_SNAP_FACE_IMG_LIST_SEARCH.endTime.year = 1990;
    sCH_SNAP_FACE_IMG_LIST_SEARCH.endTime.month = 7;
    sCH_SNAP_FACE_IMG_LIST_SEARCH.endTime.mday = 7;
    sCH_SNAP_FACE_IMG_LIST_SEARCH.endTime.hour = 23;
    sCH_SNAP_FACE_IMG_LIST_SEARCH.endTime.minute = 59;
    sCH_SNAP_FACE_IMG_LIST_SEARCH.endTime.second = 59;
    DWORD lpBytesReturned = 0;
    // query channel SnapFace Image List in:NET_SDK_CH_SNAP_FACE_IMG_LIST_SEARCH out:NET_SDK_CH_SNAP_FACE_IMG_LIST
    BOOL ret = NET_SDK_FaceMatchOperate(userid, NET_SDK_SEARCH_CH_SNAP_FACE_IMG_LIST, &sCH_SNAP_FACE_IMG_LIST_SEARCH, sizeof(NET_SDK_CH_SNAP_FACE_IMG_LIST_SEARCH), tempBuf, 100 * 1024, &lpBytesReturned);

    if (ret)
    {
        // Place the returned faces information into LIST
        NET_SDK_CH_SNAP_FACE_IMG_LIST *pCH_SNAP_FACE_IMG_LIST = (NET_SDK_CH_SNAP_FACE_IMG_LIST *)tempBuf;
        TRACE("listNum=%d, bEnd=%d \n", pCH_SNAP_FACE_IMG_LIST->listNum, pCH_SNAP_FACE_IMG_LIST->bEnd);
        NET_SDK_FACE_IMG_INFO_CH *pFACE_IMG_INFO_CH = pCH_SNAP_FACE_IMG_LIST->pCHFaceImgItem;

        for (int i = 0; i < pCH_SNAP_FACE_IMG_LIST->listNum; i++)
        {
            TRACE("%d:%d:%d ----- %d\n", pFACE_IMG_INFO_CH[i].frameTime.hour, pFACE_IMG_INFO_CH[i].frameTime.minute, pFACE_IMG_INFO_CH[i].frameTime.second, pFACE_IMG_INFO_CH[i].snapImgId);
            NET_SDK_FACE_IMG_INFO_CH sFACE_IMG_INFO_CH;
            memcpy(&sFACE_IMG_INFO_CH, pFACE_IMG_INFO_CH + i, sizeof(NET_SDK_FACE_IMG_INFO_CH));
            m_chSnapFaceList.AddTail(sFACE_IMG_INFO_CH);
            CString temp;
            temp.Format(_T("%d-%d-%d %d:%d:%d:%d"), sFACE_IMG_INFO_CH.frameTime.year, sFACE_IMG_INFO_CH.frameTime.month, sFACE_IMG_INFO_CH.frameTime.mday,
                        sFACE_IMG_INFO_CH.frameTime.hour, sFACE_IMG_INFO_CH.frameTime.minute, sFACE_IMG_INFO_CH.frameTime.second, sFACE_IMG_INFO_CH.frameTime.nMicrosecond);
        }

        cout << " Get channel SnapFace success" << endl;
    }
    else
    {
        cout << " Get channel SnapFace error" << endl;
    }

    delete[] tempBuf;
    tempBuf = NULL;
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
}