#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>

using namespace std;

CTime parseStrTimeToCTime1(string_view intime)
{
    tm tm = {};
    istringstream ss(intime.data());
    ss >> get_time(&tm, "%Y-%m-%d %H:%M:%S");
    time_t tt = mktime(&tm);
    CTime ctime(tt);

    return ctime;
}

void FindDVRLog()
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

    // Search time period for alarm logs.
    CTime startTime = parseStrTimeToCTime1("2023-04-13 00:00:00");
    CTime endTime = parseStrTimeToCTime1("2023-04-13 23:59:59");

    DD_TIME start = {startTime.GetSecond(), startTime.GetMinute(), startTime.GetHour(), 0, startTime.GetDay(), startTime.GetMonth() - 1, startTime.GetYear() - 1900};
    DD_TIME end = {endTime.GetSecond(), endTime.GetMinute(), endTime.GetHour(), 0, endTime.GetDay(), endTime.GetMonth() - 1, endTime.GetYear() - 1900};

    // Start searching for alarm logs   LOG_ALARM_ALL
    int loghandle = NET_SDK_FindDVRLog(userid, LOG_ALARM_ALL, &start, &end);

    // Search for specific content
    NET_SDK_LOG log;
    long result = 0;
    while (true)
    {
        result = NET_SDK_FindNextLog(loghandle, &log);
        if (result == NET_SDK_NOMOREFILE)
        {
            break;
        }

        // You can process only the required minor types
        // if (log.dwMinorType == LOG_ALARM_INTELLIGENT) {
        //  cout << log.sContent << endl;
        //}

        cout << "Log main type: " << log.dwMajorType << " Log sub type: " << log.dwMinorType << " Log content: " << log.sContent << endl;
    }

    // Close the search
    NET_SDK_FindLogClose(loghandle);

    // logout
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
}