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
    ss >> get_time(&tm, "%Y-%m-%d %H:%M:%S");
    // Transform tm to time_t
    time_t tt = mktime(&tm);
    // Transform time_t to CTime
    CTime ctime(tt);
    return ctime;
}
void Playback()
{
    // Initial
    NET_SDK_Init();
    // Device information
    const std::string device_ip = "10.80.1.177";
    const DWORD decice_port = 6036;
    const std::string username = "admin";
    const std::string password = "123456";
    // Login
    NET_SDK_DEVICEINFO device_info = {0};
    LONG userid = NET_SDK_Login(const_cast<char *>(device_ip.c_str()), decice_port, const_cast<char *>(username.c_str()), const_cast<char *>(password.c_str()), &device_info);

    if (userid > 0)
    {
        cout << "Login successfully: " << userid << endl;
    }
    else
    {
        cout << "Failed to login: " << userid << endl;
        return;
    }

    // Find record file
    LONG chnn = 0;
    CTime startTime = parseStrTimeToCTime("2023-05-05 00:00:00");
    CTime endTime = parseStrTimeToCTime("2023-05-05 23:59:59");
    DD_TIME start = {startTime.GetSecond(), startTime.GetMinute(), startTime.GetHour(), 3, startTime.GetDay(), startTime.GetMonth() - 1, startTime.GetYear() - 1900};
    DD_TIME end = {endTime.GetSecond(), endTime.GetMinute(), endTime.GetHour(), 3, endTime.GetDay(), endTime.GetMonth() - 1, endTime.GetYear() - 1900};
    LONG ffHandle = NET_SDK_FindFile(userid, chnn, &start, &end);

    if (ffHandle == -1)
    {
        DWORD err1 = NET_SDK_GetLastError();
        cout << "Failed to find record file! Error code: " << err1 << endl;
    }
    else
    {
        cout << "Find record file successfully!" << endl;
        // Get file information (filename, size, startTime and stopTime)
        NET_SDK_REC_FILE file;
        LONG result = NET_SDK_FindNextFile(ffHandle, &file);
        HWND hWnd = GetConsoleWindow();

        if (result != NET_SDK_FILE_SUCCESS)
        {
            DWORD err4 = NET_SDK_GetLastError();
            cout << "Failed to get file information! Error code: " << err4 << endl;
        }
        else
        {
            cout << "Get file information successfully!" << endl;
            // Playback by time
            LONG plHandle = NET_SDK_PlayBackByTime(userid, &chnn, 1, &file.startTime, &file.stopTime, &hWnd);
            // Waiting for playback
            Sleep(3000);

            if (plHandle == -1)
            {
                DWORD err3 = NET_SDK_GetLastError();
                cout << "Pailed to playback! error code: " << err3 << endl;
            }
            else
            {
                cout << "Playback successfully!" << endl;
                // Control the status of playback
                BOOL control = NET_SDK_PlayBackControl(plHandle, NET_SDK_PLAYCTRL_PAUSE, NET_SDK_RPB_SPEED_1_32X, NULL);

                if (control != true)
                {
                    DWORD err2 = NET_SDK_GetLastError();
                    cout << "Failed to pause playback! " << err2 << endl;
                }
                else
                {
                    cout << "Pause playback successfully! " << endl;
                }

                // Stop to playback
                NET_SDK_StopPlayBack(plHandle);
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