#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>

void TransparentConfig()
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

    // adjust interface and parameters according to actual needs.
    CString sendURL = "faceImgStatistic_v2";
    CString sendXML = R"(<?xml version: "1.0" encoding="utf-8" ?><BR><request version="1.0"   systemType="NVMS-9000" clientType="WEB"><BR><resultLimit>150000</resultLimit>  <BR><condition>    <BR><startTime>2023-04-19 00:00:00</startTime>    <BR><endTime>2023-04-19 23:59:59</endTime>    <BR><timeQuantum>24</timeQuantum>    <BR><deduplicate>false</deduplicate>    <BR><chls type="list"><BR><item id="{00000001-0000-0000-0000-000000000000}"></item><BR><item id="{00000002-0000-0000-0000-000000000000}"></item><BR><item id="{00000004-0000-0000-0000-000000000000}"></item><BR><item id="{00000005-0000-0000-0000-000000000000}"></item><BR><item id="{00000006-0000-0000-0000-000000000000}"></item><BR><item id="{00000000-0000-0000-0000-000000000000}"></item><BR></chls><BR><events type="list"><BR><item>passLine</item><BR></events><BR><vehicle type="list"><BR> <item>car</item><BR> <item>motor</item><BR></vehicle><BR></condition><BR></request>)";
    const int bufSize = 100 * 1024;
    char *tempOutBuf = new char[bufSize];
    memset(tempOutBuf, 0, bufSize);
    DWORD tmplpBytesReturned = 0;
    bool tran = NET_SDK_TransparentConfig(userid, sendXML.GetBuffer(), sendURL.GetBuffer(), tempOutBuf, bufSize, &tmplpBytesReturned);

    if (tran)
    {
        cout << "Request sent successfully: " << tran << endl;
        cout << tempOutBuf << endl;
        // Parse XML to process data.
        // Follow-up business processing.
    }
    else
    {
        cout << "Request failed: " << tran << endl;
    }

    // logout
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
}