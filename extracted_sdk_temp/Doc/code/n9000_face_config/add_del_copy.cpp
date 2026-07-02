#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>
using namespace std;

BOOL AddFace()
{
    // init face information
    CString m_facePicPath = "./face_1.jpg";
    CString m_editFaceName = "Peter";
    CString m_editFaceMobile = "13999999999";
    CString m_editFaceNativePlace = "guangdong";
    CString m_editFaceCertificateNum = "440300199009099999";
    CString m_editFaceNumber = "1";
    CString m_editFaceBirthday = "19900707";
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

    char *tempBuf = new char[1024 * 1024];
    memset(tempBuf, 0, 1024 * 1024);
    // put face information to structure pFACE_INFO_ADD
    NET_SDK_FACE_INFO_ADD *pFACE_INFO_ADD = (NET_SDK_FACE_INFO_ADD *)tempBuf;
    strcpy(pFACE_INFO_ADD->sFaceInfoItem.name, GbkToUtf8(m_editFaceName.GetBuffer()).c_str());
    m_editFaceName.ReleaseBuffer();
    strcpy(pFACE_INFO_ADD->sFaceInfoItem.mobile, m_editFaceMobile.GetBuffer());
    m_editFaceMobile.ReleaseBuffer();
    strcpy(pFACE_INFO_ADD->sFaceInfoItem.nativePlace, GbkToUtf8(m_editFaceNativePlace.GetBuffer()).c_str());
    m_editFaceNativePlace.ReleaseBuffer();
    strcpy(pFACE_INFO_ADD->sFaceInfoItem.certificateNum, m_editFaceCertificateNum.GetBuffer());
    m_editFaceCertificateNum.ReleaseBuffer();
    strcpy(pFACE_INFO_ADD->sFaceInfoItem.mobile, m_editFaceMobile.GetBuffer());
    m_editFaceMobile.ReleaseBuffer();
    strcpy(pFACE_INFO_ADD->sFaceInfoItem.number, m_editFaceNumber.GetBuffer());
    m_editFaceNumber.ReleaseBuffer();
    pFACE_INFO_ADD->sFaceInfoItem.birthday = atoi(m_editFaceBirthday.GetBuffer());
    m_editFaceBirthday.ReleaseBuffer();
    strcpy((char *)pFACE_INFO_ADD->sFaceInfoItem.groups[0].guid, "{00000000-0000-0000-0000-000000000000}");
    pFACE_INFO_ADD->imgNum = 1;
    pFACE_INFO_ADD->haveImgData = 1;
    /*sFACE_INFO_ADD.sFaceImgInfo[0].chl = 1;
    sFACE_INFO_ADD.sFaceImgInfo[0].imgId = 1837;
    sFACE_INFO_ADD.sFaceImgInfo[0].frameTime.year = 2018;
    sFACE_INFO_ADD.sFaceImgInfo[0].frameTime.month = 5;
    sFACE_INFO_ADD.sFaceImgInfo[0].frameTime.mday = 22;
    sFACE_INFO_ADD.sFaceImgInfo[0].frameTime.hour = 23;
    sFACE_INFO_ADD.sFaceImgInfo[0].frameTime.minute = 48;
    sFACE_INFO_ADD.sFaceImgInfo[0].frameTime.second = 49;
    sFACE_INFO_ADD.sFaceImgInfo[0].frameTime.nMicrosecond = 1277790;*/
    pFACE_INFO_ADD->imgData = (unsigned char *)tempBuf + sizeof(NET_SDK_FACE_INFO_ADD);
    // FILE *fp = fopen("./face_1.jpg", "rb");
    FILE *fp = fopen(m_facePicPath.GetBuffer(), "rb");
    m_facePicPath.ReleaseBuffer();
    int length = 0;

    if (fp)
    {
        fseek(fp, 0, SEEK_END);
        length = ftell(fp);
        fseek(fp, 0, SEEK_SET);
        int readLen = fread((char *)pFACE_INFO_ADD->imgData, length, 1, fp);
        fclose(fp);
    }

    // GetSize((char *)pFACE_INFO_ADD->imgData , length);
    pFACE_INFO_ADD->imgWidth = 440;
    pFACE_INFO_ADD->imgHeight = 620;
    pFACE_INFO_ADD->imgLen = length;
    DWORD lpBytesReturned = 0;
    int len = sizeof(NET_SDK_FACE_INFO_ADD);
    unsigned int faceId = 0;
    // create Face Personnal Info in:NET_SDK_FACE_INFO_ADD out:DWORD
    BOOL ret = NET_SDK_FaceMatchOperate(userid, NET_SDK_ADD_FACE_INFO, tempBuf, sizeof(NET_SDK_FACE_INFO_ADD) + length, &faceId, sizeof(unsigned int), &lpBytesReturned);
    if (!ret)
    {
        cout << " add face error" << endl;
    }
    else
    {
        cout << " add face success" << endl;
    }
    delete[] tempBuf;
    tempBuf = NULL;
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
    return ret;
}
BOOL EditFace()
{
    // The ID of the face to be modified
    unsigned int faceId = 1;
    // Initialize the new face information to be modified
    CString m_facePicPath = "./face_1.jpg";
    CString m_editFaceName = "Peter";
    CString m_editFaceMobile = "13999999999";
    CString m_editFaceNativePlace = "guangdong";
    CString m_editFaceCertificateNum = "440300199009099999";
    CString m_editFaceNumber = "1";
    CString m_editFaceBirthday = "19900707";
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

    unsigned int groupId = 1;
    char groupGuid[48] = {0};
    strcpy(groupGuid, "{00000000-0000-0000-0000-000000000000}");
    char *tempBuf = new char[100 * 1024];
    memset(tempBuf, 0, 100 * 1024);
    // put face information to structure pFACE_INFO_EDIT
    NET_SDK_FACE_INFO_EDIT *pFACE_INFO_EDIT = (NET_SDK_FACE_INFO_EDIT *)tempBuf;
    pFACE_INFO_EDIT->sFaceInfoItem.sFaceInfoItem.groups[0].groupId = groupId;
    strcpy((char *)pFACE_INFO_EDIT->sFaceInfoItem.sFaceInfoItem.groups[0].guid, groupGuid);
    pFACE_INFO_EDIT->sFaceInfoItem.sFaceInfoItem.itemId = faceId;
    pFACE_INFO_EDIT->delFaceImgs[0] = 1;
    strcpy(pFACE_INFO_EDIT->sFaceInfoItem.sFaceInfoItem.name, m_editFaceName.GetBuffer());
    m_editFaceName.ReleaseBuffer();
    strcpy(pFACE_INFO_EDIT->sFaceInfoItem.sFaceInfoItem.mobile, m_editFaceMobile.GetBuffer());
    m_editFaceMobile.ReleaseBuffer();
    strcpy(pFACE_INFO_EDIT->sFaceInfoItem.sFaceInfoItem.nativePlace, m_editFaceNativePlace.GetBuffer());
    m_editFaceNativePlace.ReleaseBuffer();
    strcpy(pFACE_INFO_EDIT->sFaceInfoItem.sFaceInfoItem.certificateNum, m_editFaceCertificateNum.GetBuffer());
    m_editFaceCertificateNum.ReleaseBuffer();
    strcpy(pFACE_INFO_EDIT->sFaceInfoItem.sFaceInfoItem.mobile, m_editFaceMobile.GetBuffer());
    m_editFaceMobile.ReleaseBuffer();
    strcpy(pFACE_INFO_EDIT->sFaceInfoItem.sFaceInfoItem.number, m_editFaceNumber.GetBuffer());
    m_editFaceNumber.ReleaseBuffer();
    pFACE_INFO_EDIT->sFaceInfoItem.sFaceInfoItem.birthday = atoi(m_editFaceBirthday.GetBuffer());
    m_editFaceBirthday.ReleaseBuffer();
    pFACE_INFO_EDIT->sFaceInfoItem.sFaceInfoItem.faceImgCount = 1;
    pFACE_INFO_EDIT->sFaceInfoItem.imgNum = 1;
    pFACE_INFO_EDIT->sFaceInfoItem.haveImgData = 1;
    pFACE_INFO_EDIT->sFaceInfoItem.imgWidth = 256;
    pFACE_INFO_EDIT->sFaceInfoItem.imgHeight = 256;
    pFACE_INFO_EDIT->sFaceInfoItem.imgData = (unsigned char *)tempBuf + sizeof(NET_SDK_FACE_INFO_EDIT);
    int length = 0;
    FILE *fp = fopen(m_facePicPath, "rb");
    // the modified face image
    // FILE *fp = fopen("./face.jpg", "rb");
    if (fp)
    {
        fseek(fp, 0, SEEK_END);
        length = ftell(fp);
        fseek(fp, 0, SEEK_SET);
        int fret = fread(pFACE_INFO_EDIT->sFaceInfoItem.imgData, length, 1, fp);
        fclose(fp);
    }

    pFACE_INFO_EDIT->sFaceInfoItem.imgLen = length;
    /*FACE_INFO_EDIT->sFaceInfoItem.sFaceImgInfo[0].chl = 16;
    pFACE_INFO_EDIT->sFaceInfoItem.sFaceImgInfo[0].imgId = 226;
    pFACE_INFO_EDIT->sFaceInfoItem.sFaceImgInfo[0].frameTime.year = 2018;
    pFACE_INFO_EDIT->sFaceInfoItem.sFaceImgInfo[0].frameTime.month = 5;
    pFACE_INFO_EDIT->sFaceInfoItem.sFaceImgInfo[0].frameTime.mday = 24;
    pFACE_INFO_EDIT->sFaceInfoItem.sFaceImgInfo[0].frameTime.hour = 0;
    pFACE_INFO_EDIT->sFaceInfoItem.sFaceImgInfo[0].frameTime.minute = 48;
    pFACE_INFO_EDIT->sFaceInfoItem.sFaceImgInfo[0].frameTime.second = 39;
    pFACE_INFO_EDIT->sFaceInfoItem.sFaceImgInfo[0].frameTime.nMicrosecond = 8483680;*/
    DWORD lpBytesReturned = 0;
    // edit Face Personnal Info in:NET_SDK_FACE_INFO_EDIT out:NULL
    BOOL ret = NET_SDK_FaceMatchOperate(userid, NET_SDK_SET_FACE_INFO, tempBuf, length + sizeof(NET_SDK_FACE_INFO_EDIT), NULL, 0, &lpBytesReturned);
    if (!ret)
    {
        cout << " edit face error" << endl;
    }
    else
    {
        cout << " edit face success" << endl;
    }
    delete[] tempBuf;
    tempBuf = NULL;
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
    return ret;
}

BOOL DelFace()
{
    // The ID and groupid of the face to be deleted
    unsigned int faceGroupId = 1;
    unsigned int faceId = 1;
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

    NET_SDK_FACE_INFO_DEL sFACE_INFO_DEL;
    memset(&sFACE_INFO_DEL, 0, sizeof(NET_SDK_FACE_INFO_DEL));
    sFACE_INFO_DEL.faceInfoListItemId = faceId;
    sFACE_INFO_DEL.groupsId[0] = faceGroupId;
    DWORD lpBytesReturned = 0;
    // delete Face Personnal Info in:NET_SDK_FACE_INFO_DEL  out:NULL
    BOOL ret = NET_SDK_FaceMatchOperate(userid, NET_SDK_DEL_FACE_INFO, &sFACE_INFO_DEL, sizeof(NET_SDK_FACE_INFO_DEL), NULL, 0, &lpBytesReturned);
    if (!ret)
    {
        cout << " delete face error" << endl;
    }
    else
    {
        cout << " delete face success" << endl;
    }
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
    return ret;
}

void GetFaceInfoList()
{
    // The ID and groupid of the face to get
    unsigned int faceGroupId = 1;
    unsigned int faceId = 1;
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

    CList<NET_SDK_FACE_INFO_LIST_ITEM> m_faceInfoList;
    NET_SDK_FACE_INFO_LIST_GET sFACE_INFO_LIST_GET;
    memset(&sFACE_INFO_LIST_GET, 0, sizeof(NET_SDK_FACE_INFO_LIST_GET));
    sFACE_INFO_LIST_GET.groupId = faceGroupId;
    sFACE_INFO_LIST_GET.pageIndex = 1;
    sFACE_INFO_LIST_GET.pageSize = 10;
    // strcpy(sFACE_INFO_LIST_GET.certificateNum, "123456789");
    char *tempBuf = new char[100 * 1024];
    memset(tempBuf, 0, 100 * 1024);
    DWORD lpBytesReturned = 0;
    // query Face Personnal Info List in:NET_SDK_FACE_INFO_LIST_GET, out:NET_SDK_FACE_INFO_LIST
    BOOL ret = NET_SDK_FaceMatchOperate(userid, NET_SDK_GET_FACE_INFO_LIST, &sFACE_INFO_LIST_GET, sizeof(NET_SDK_FACE_INFO_LIST_GET), tempBuf, 100 * 1024, &lpBytesReturned);

    if (ret)
    {
        // Place the returned faces information into LIST
        NET_SDK_FACE_INFO_LIST *pFACE_INFO_LIST = (NET_SDK_FACE_INFO_LIST *)tempBuf;
        TRACE("listNum =%d , pFACE_INFO_LIST->totalNum =%d lpBytesReturned=%d \n", pFACE_INFO_LIST->listNum, pFACE_INFO_LIST->totalNum, lpBytesReturned);
        NET_SDK_FACE_INFO_LIST_ITEM *pFACE_INFO_LIST_ITEM = pFACE_INFO_LIST->pFaceInfoListItem;

        for (int i = 0; i < pFACE_INFO_LIST->listNum; i++)
        {
            TRACE("itemId =%d , name =%s birthday=%d\n", pFACE_INFO_LIST_ITEM[i].itemId, pFACE_INFO_LIST_ITEM[i].name, pFACE_INFO_LIST_ITEM[i].birthday);
            NET_SDK_FACE_INFO_LIST_ITEM sFACE_INFO_LIST_ITEM;
            memcpy(&sFACE_INFO_LIST_ITEM, pFACE_INFO_LIST_ITEM + i, sizeof(NET_SDK_FACE_INFO_LIST_ITEM));
            m_faceInfoList.AddTail(sFACE_INFO_LIST_ITEM);
        }

        NET_SDK_Logout(userid);
        NET_SDK_Cleanup();
    }
    else
    {
        cout << " get face info list error" << endl;
    }

    delete[] tempBuf;
    tempBuf = NULL;
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
}

BOOL CopyFace()
{
    // The ID of the face to copy
    unsigned int faceId = 1;
    unsigned int sex = 1;             // 0:male 1:female
    unsigned int certificateType = 0; // 0:idCard
    CString m_facePicPath = "./face_1.jpg";
    CString m_editFaceName = "Peter";
    CString m_editFaceMobile = "13999999999";
    CString m_editFaceNativePlace = "guangdong";
    CString m_editFaceCertificateNum = "440300199009099999";
    CString m_editFaceNumber = "1";
    CString m_editFaceBirthday = "19900707"; // eg:19900707
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

    unsigned int groupId = 1;
    char groupGuid[48] = {0};
    strcpy(groupGuid, "{00000000-0000-0000-0000-000000000000}");
    char *tempBuf = new char[100 * 1024];
    memset(tempBuf, 0, 100 * 1024);
    // put face information to structure pFACE_INFO_COPY
    NET_SDK_FACE_INFO_COPY *pFACE_INFO_COPY = (NET_SDK_FACE_INFO_COPY *)tempBuf;
    pFACE_INFO_COPY->birthday = atoi(m_editFaceBirthday.GetBuffer());
    memcpy(pFACE_INFO_COPY->certificateNum, m_editFaceCertificateNum, DD_MAX_CERTIFICATE_NUM);
    pFACE_INFO_COPY->certificateType = certificateType;
    strcpy((char *)(pFACE_INFO_COPY->guid), groupGuid);
    pFACE_INFO_COPY->itemId = faceId;
    strcpy(pFACE_INFO_COPY->mobile, m_editFaceMobile);
    strcpy(pFACE_INFO_COPY->name, m_editFaceName);
    strcpy(pFACE_INFO_COPY->nativePlace, m_editFaceNativePlace);
    strcpy(pFACE_INFO_COPY->number, m_editFaceNumber);
    pFACE_INFO_COPY->sex = sex;
    DWORD lpBytesReturned = 0;
    BOOL ret = NET_SDK_FaceMatchOperate(userid, NET_SDK_COPY_FACE_INFO, tempBuf, sizeof(NET_SDK_FACE_INFO_COPY), &faceId, sizeof(unsigned int), &lpBytesReturned);
    if (!ret)
    {
        cout << " copy face error" << endl;
    }
    else
    {
        cout << " copy face success" << endl;
    }
    delete[] tempBuf;
    tempBuf = NULL;
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
    return ret;
}