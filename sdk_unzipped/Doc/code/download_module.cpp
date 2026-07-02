#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>

using namespace std;

/*
    Transform string time to CTime
*/
CTime parseStrTimeToCTime(string_view intime)
{
    tm tm = {};
    istringstream ss(intime.data());
    // Parse string time
    ss >> get_time(& tm, "%Y-%m-%d %H:%M:%S");
    // Transform tm to time_t
    time_t tt = mktime(& tm);
    // Transform time_t to CTime
    CTime ctime(tt);
    return ctime;
}

void DownloadRecord()
{
    // Initial
    NET_SDK_Init();
    // Device information
    const std::string device_ip = "10.80.1.177";
    const DWORD decice_port = 6036;
    const std::string username = "admin";
    const std::string password = "123456";
    // Login
    NET_SDK_DEVICEINFO device_info = { 0 };
    LONG userid = NET_SDK_Login(const_cast<char*>(device_ip.c_str()), decice_port, const_cast<char*>(username.c_str()), const_cast<char*>(password.c_str()), & device_info);

    if(userid > 0) {
        cout << "Login successfully: " << userid << endl;

    } else {
        cout << "Failed to login: " << userid << endl;
        return;
    }

    // Find record file
    LONG chnn = 0;
    CTime startTime = parseStrTimeToCTime("2023-05-09 00:00:00");
    CTime endTime = parseStrTimeToCTime("2023-05-09 23:59:59");
    DD_TIME start = { startTime.GetSecond(), startTime.GetMinute(), startTime.GetHour(), 3, startTime.GetDay(), startTime.GetMonth() - 1, startTime.GetYear() - 1900 };
    DD_TIME end = { endTime.GetSecond(), endTime.GetMinute(), endTime.GetHour(), 3, endTime.GetDay(), endTime.GetMonth() - 1, endTime.GetYear() - 1900 };
    LONG ffHandle = NET_SDK_FindFile(userid, chnn, & start, & end);

    if(ffHandle == -1) {
        DWORD err1 = NET_SDK_GetLastError();
        cout << "Failed to find record file! Error code: " << err1 << endl;

    } else {
        cout << "Find record file successfully!" << endl;
        // Get file information (filename, size, startTime and stopTime)
        NET_SDK_REC_FILE searchFile;
        LONG result = NET_SDK_FindNextFile(ffHandle, & searchFile);
        HWND hWnd = GetConsoleWindow();

        if(result != NET_SDK_FILE_SUCCESS) {
            DWORD err4 = NET_SDK_GetLastError();
            cout << "Failed to get file information! Error code: " << err4 << endl;

        } else {
            cout << "Get file information successfully!" << endl;
            NET_SDK_REC_FILE downloadFile;
            CString fname;
            CString savePath = "D:\\\\";
            SYSTEMTIME time = { 0 };
            ::GetLocalTime(& time);
            fname.Format("%sbackup_%d%02d%02d%02d%02d%02d.avi", savePath.GetBuffer(0), time.wYear, time.wMonth, time.wDay, time.wHour, time.wMinute, time.wSecond);
            LONG dlHandle = NET_SDK_GetFileByTimeExV2(userid, chnn, &searchFile.startTime, &searchFile.stopTime, fname.GetBuffer(), FALSE, 0, FALSE, NULL, 0);
            // Waiting for downloading
            Sleep(10000);

            if(dlHandle == -1) {
                DWORD err4 = NET_SDK_GetLastError();
                cout << "Failed to download! error code: " << err4 << endl;

            } else {
                cout << "Download successfully!" << endl;
            }
        }

        // Stop to Find record file
        NET_SDK_FindClose(ffHandle);
    }

    // Logout
    NET_SDK_Logout(userid);
    // Clean up the data
    NET_SDK_Cleanup();
}