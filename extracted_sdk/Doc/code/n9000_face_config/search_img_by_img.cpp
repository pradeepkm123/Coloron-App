#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>
using namespace std;

void searchImgByImg()
{
    // The id of the channel to be queried
    int channel = 1;
    // search source would be FROM_ALBUM or FROM_SNAP
    unsigned int m_imgSource = FROM_ALBUM;
    unsigned int snapImgId = 1;
    unsigned int faceId = 1;
    DD_TIME_EX frameTime;
    memset(&frameTime, 0, sizeof(DD_TIME_EX));
    frameTime.year = 1990;
    frameTime.month = 7;
    frameTime.mday = 7;
    frameTime.hour = 0;
    frameTime.minute = 0;
    frameTime.second = 0;
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

    CList<NET_SDK_FACE_IMG_INFO_CH> m_searchResultList;
    char *tempBuf = new char[100 * 1024];
    memset(tempBuf, 0, 100 * 1024);
    NET_SDK_SEARCH_IMAGE_BY_IMAGE_V2 pSEARCH_IMAGE_BY_IMAGE;
    memset(&pSEARCH_IMAGE_BY_IMAGE, 0, sizeof(NET_SDK_SEARCH_IMAGE_BY_IMAGE_V2));
    DWORD lpBytesReturned = 0;
    // init search information
    if (m_imgSource == FROM_SNAP)
    {
        pSEARCH_IMAGE_BY_IMAGE.limitNum = 10000;
        pSEARCH_IMAGE_BY_IMAGE.startTime.year = 1990;
        pSEARCH_IMAGE_BY_IMAGE.startTime.month = 7;
        pSEARCH_IMAGE_BY_IMAGE.startTime.mday = 7;
        pSEARCH_IMAGE_BY_IMAGE.endTime.year = 1990;
        pSEARCH_IMAGE_BY_IMAGE.endTime.month = 7;
        pSEARCH_IMAGE_BY_IMAGE.endTime.mday = 7;
        pSEARCH_IMAGE_BY_IMAGE.endTime.hour = 23;
        pSEARCH_IMAGE_BY_IMAGE.endTime.minute = 59;
        pSEARCH_IMAGE_BY_IMAGE.endTime.second = 59;
        pSEARCH_IMAGE_BY_IMAGE.similarity = 75;
        pSEARCH_IMAGE_BY_IMAGE.searchType = SEARCH_IMAGE_BY_IMAGE;
        pSEARCH_IMAGE_BY_IMAGE.imgSourceType = FROM_SNAP;
        pSEARCH_IMAGE_BY_IMAGE.sfaceImgsNum = 1;
        pSEARCH_IMAGE_BY_IMAGE.sfaceImgs = new NET_SDK_FACE_IMG_INFO_CH[1];
        pSEARCH_IMAGE_BY_IMAGE.sfaceImgs[0].chl = channel;
        pSEARCH_IMAGE_BY_IMAGE.sfaceImgs[0].snapImgId = snapImgId;
        pSEARCH_IMAGE_BY_IMAGE.sfaceImgs[0].frameTime = frameTime;
    }
    else
    {
        pSEARCH_IMAGE_BY_IMAGE.limitNum = 10000;
        pSEARCH_IMAGE_BY_IMAGE.startTime.year = 1990;
        pSEARCH_IMAGE_BY_IMAGE.startTime.month = 7;
        pSEARCH_IMAGE_BY_IMAGE.startTime.mday = 7;
        pSEARCH_IMAGE_BY_IMAGE.endTime.year = 1990;
        pSEARCH_IMAGE_BY_IMAGE.endTime.month = 7;
        pSEARCH_IMAGE_BY_IMAGE.endTime.mday = 7;
        pSEARCH_IMAGE_BY_IMAGE.endTime.hour = 23;
        pSEARCH_IMAGE_BY_IMAGE.endTime.minute = 59;
        pSEARCH_IMAGE_BY_IMAGE.endTime.second = 59;
        pSEARCH_IMAGE_BY_IMAGE.similarity = 75;
        pSEARCH_IMAGE_BY_IMAGE.searchType = SEARCH_IMAGE_BY_IMAGE;
        pSEARCH_IMAGE_BY_IMAGE.imgSourceType = FROM_ALBUM;
        pSEARCH_IMAGE_BY_IMAGE.imgNum = 1;
        pSEARCH_IMAGE_BY_IMAGE.imgId = new unsigned int[1];
        pSEARCH_IMAGE_BY_IMAGE.imgId[0] = faceId;
    }
    // search Image By Image in:NET_SDK_SEARCH_IMAGE_BY_IMAGE out:NET_SDK_SEARCH_IMAGE_BY_IMAGE_LIST
    BOOL ret = NET_SDK_FaceMatchOperate(userid, NET_SDK_SEARCH_IMAGE_BY_IMG_V2, &pSEARCH_IMAGE_BY_IMAGE,
                                        sizeof(NET_SDK_SEARCH_IMAGE_BY_IMAGE_V2), tempBuf, 100 * 1024, &lpBytesReturned);

    if (pSEARCH_IMAGE_BY_IMAGE.imgId)
    {
        delete[] pSEARCH_IMAGE_BY_IMAGE.imgId;
        pSEARCH_IMAGE_BY_IMAGE.imgId = NULL;
    }

    if (pSEARCH_IMAGE_BY_IMAGE.sfaceImgs)
    {
        delete[] pSEARCH_IMAGE_BY_IMAGE.sfaceImgs;
        pSEARCH_IMAGE_BY_IMAGE.sfaceImgs = NULL;
    }

    if (!ret)
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
            m_searchResultList.AddTail(sFACE_IMG_INFO_CH);
            CString temp;
            temp.Format(_T("%d-%d-%d %d:%d:%d:%d"), sFACE_IMG_INFO_CH.frameTime.year, sFACE_IMG_INFO_CH.frameTime.month, sFACE_IMG_INFO_CH.frameTime.mday,
                        sFACE_IMG_INFO_CH.frameTime.hour, sFACE_IMG_INFO_CH.frameTime.minute, sFACE_IMG_INFO_CH.frameTime.second, sFACE_IMG_INFO_CH.frameTime.nMicrosecond);
        }

        NET_SDK_Logout(userid);
        NET_SDK_Cleanup();
    }

    delete[] tempBuf;
    tempBuf = NULL;
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
}