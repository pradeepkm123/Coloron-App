#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>
using namespace std;

string GbkToUtf8(const char *src_str)
{
    int len = MultiByteToWideChar(CP_ACP, 0, src_str, -1, NULL, 0);
    wchar_t *wstr = new wchar_t[len + 1];
    memset(wstr, 0, len + 1);
    MultiByteToWideChar(CP_ACP, 0, src_str, -1, wstr, len);
    len = WideCharToMultiByte(CP_UTF8, 0, wstr, -1, NULL, 0, NULL, NULL);
    char *str = new char[len + 1];
    memset(str, 0, len + 1);
    WideCharToMultiByte(CP_UTF8, 0, wstr, -1, str, len, NULL, NULL);
    string strTemp = str;

    if (wstr)
        delete[] wstr;

    if (str)
        delete[] str;

    return strTemp;
}
string Utf8ToGbk(const char *src_str)
{
    int len = MultiByteToWideChar(CP_UTF8, 0, src_str, -1, NULL, 0);
    wchar_t *wszGBK = new wchar_t[len + 1];
    memset(wszGBK, 0, len * 2 + 2);
    MultiByteToWideChar(CP_UTF8, 0, src_str, -1, wszGBK, len);
    len = WideCharToMultiByte(CP_ACP, 0, wszGBK, -1, NULL, 0, NULL, NULL);
    char *szGBK = new char[len + 1];
    memset(szGBK, 0, len + 1);
    WideCharToMultiByte(CP_ACP, 0, wszGBK, -1, szGBK, len, NULL, NULL);
    string strTemp(szGBK);

    if (wszGBK)
        delete[] wszGBK;

    if (szGBK)
        delete[] szGBK;

    return strTemp;
}

BOOL AddGroups()
{
    // init new group name
    CString m_addGroupName = "groupname_test";
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

    DWORD lpBytesReturned = 0;
    NET_SDK_FACE_INFO_GROUP_ADD sFACE_INFO_GROUP_ADD;
    // Initialize the structure sFACE_INFO_GROUP_ADD
    memset(&sFACE_INFO_GROUP_ADD, 0, sizeof(NET_SDK_FACE_INFO_GROUP_ADD));
    // copy m_addGroupName to sFACE_INFO_GROUP_ADD.name
    strcpy_s(sFACE_INFO_GROUP_ADD.name, GbkToUtf8(m_addGroupName.GetBuffer()).c_str());
    m_addGroupName.ReleaseBuffer();
    sFACE_INFO_GROUP_ADD.property = NET_SDK_FACE_INFO_GROUP_PROPERTY_LIMITED;
    // create Face Personnal Info Group in:NET_SDK_FACE_INFO_GROUP_ADD out:NULL
    BOOL ret = NET_SDK_FaceMatchOperate(userid, NET_SDK_ADD_FACE_INFO_GROUP, &sFACE_INFO_GROUP_ADD, sizeof(NET_SDK_FACE_INFO_GROUP_ADD), NULL, 0, &lpBytesReturned);
    if (!ret)
    {
        cout << " add group error" << endl;
    }
    else
    {
        cout << " add group success" << endl;
    }
    // logout
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
    return ret;
}
BOOL EditGroups()
{
    // Modify group by groupid
    int groupId = 1;
    // Initialize the contents of the modified group
    CString m_editGroupName = "groupname_test";
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

    if (m_editGroupName.GetLength() == 0)
    {
        return FALSE;
    }

    if (groupId < 0)
    {
        return FALSE;
    }
    // Initialize the structure NET_SDK_FACE_INFO_GROUP_ITEM and assign the new group information to it
    NET_SDK_FACE_INFO_GROUP_ITEM item;
    memset(&item, 0, sizeof(NET_SDK_FACE_INFO_GROUP_ITEM));
    strcpy(item.name, GbkToUtf8(m_editGroupName.GetBuffer()).c_str());
    item.groupId = groupId;
    m_editGroupName.ReleaseBuffer();
    DWORD lpBytesReturned = 0;
    // edit Face Personnal Info Group.  in:NET_SDK_FACE_INFO_GROUP_ITEM  out:NULL
    BOOL ret = NET_SDK_FaceMatchOperate(userid, NET_SDK_SET_FACE_INFO_GROUP, &item, sizeof(NET_SDK_FACE_INFO_GROUP_ITEM), NULL, 0, &lpBytesReturned);
    if (!ret)
    {
        cout << " edit group error" << endl;
    }
    else
    {
        cout << " edit group success" << endl;
    }
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
    return ret;
}
BOOL DelGroups()
{
    // delete group by groupid
    int groupId = 1;
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

    if (groupId < 0)
    {
        return FALSE;
    }
    // Initialize the structure sFACE_INFO_GROUP_DEL and assign the group id to it
    NET_SDK_FACE_INFO_GROUP_DEL_EX sFACE_INFO_GROUP_DEL;
    memset(&sFACE_INFO_GROUP_DEL, 0, sizeof(NET_SDK_FACE_INFO_GROUP_DEL));
    sFACE_INFO_GROUP_DEL.groupId = groupId;
    DWORD lpBytesReturned = 0;
    // delete Face Personnal Info Groups in:NET_SDK_FACE_INFO_GROUP_DEL  out:NULL
    BOOL ret = NET_SDK_FaceMatchOperate(userid, NET_SDK_DEL_FACE_INFO_GROUP, &sFACE_INFO_GROUP_DEL, sizeof(NET_SDK_FACE_INFO_GROUP_DEL_EX), NULL, 0, &lpBytesReturned);
    if (!ret)
    {
        cout << " delete group error" << endl;
    }
    else
    {
        cout << " delete group success" << endl;
    }
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
    return ret;
}
void GetGroups()
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
        return;
    }

    CList<NET_SDK_FACE_INFO_GROUP_ITEM> m_faceGroupList;
    char *tempBuf = new char[100 * 1024];
    memset(tempBuf, 0, 100 * 1024);
    DWORD lpBytesReturned = 0;
    // query Face Personnal Info GroupList in:NULL, out:NET_SDK_FACE_INFO_GROUP_ITEM list
    BOOL ret = NET_SDK_FaceMatchOperate(userid, NET_SDK_GET_FACE_INFO_GROUP_LIST, NULL, 0, tempBuf, 100 * 1024, &lpBytesReturned);

    if (ret)
    {
        // Place the returned groups information into LIST
        int number = lpBytesReturned / sizeof(NET_SDK_FACE_INFO_GROUP_ITEM);
        NET_SDK_FACE_INFO_GROUP_ITEM *pFACE_INFO_GROUP_ITEM = (NET_SDK_FACE_INFO_GROUP_ITEM *)tempBuf;

        for (int i = 0; i < number; i++)
        {
            // Get each group item and add them to the new LIST
            NET_SDK_FACE_INFO_GROUP_ITEM sFACE_INFO_GROUP_ITEM;
            memcpy(&sFACE_INFO_GROUP_ITEM, pFACE_INFO_GROUP_ITEM + i, sizeof(NET_SDK_FACE_INFO_GROUP_ITEM));
            int groupId = sFACE_INFO_GROUP_ITEM.groupId;
            unsigned char *guid = sFACE_INFO_GROUP_ITEM.guid;
            CString name = Utf8ToGbk(sFACE_INFO_GROUP_ITEM.name).c_str();
            m_faceGroupList.AddTail(sFACE_INFO_GROUP_ITEM);
        }
    }
    else
    {
        cout << " get groups fail" << endl;
    }

    delete[] tempBuf;
    tempBuf = NULL;
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
}