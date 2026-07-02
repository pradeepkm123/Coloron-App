#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>
using namespace std;
void RemoteUpgrade()
{
    // device info
    CString username = "admin";
    CString password = "123456";
    CString device_ip = "10.80.1.177";
    DWORD device_port = 6036;

    // init sdk
    NET_SDK_Init();
    NET_SDK_SetConnectTime(6000, 1);
    NET_SDK_SetReconnect();

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

    // nvr upgrade
    // NET_SDK_Upgrade   tar package
    // NET_SDK_UpgradeEx     firmware package

    CString filename = "D:\\N0N_UI1A_230522_148_59579.release.fls"; // firmware package path
    long lUpgradeHandle = NET_SDK_Upgrade(userid, filename.GetBuffer(0));
    if (lUpgradeHandle != -1)
    {
        cout << "Firmware package uploaded successfully." << endl;
        // check upgrade status
        while (true)
        {
            int nState = NET_SDK_GetUpgradeState(lUpgradeHandle);
            if (nState == 3)
            {
                cout << "Upgrade fail 3" << endl;
                break;
            }
            else if (nState == 4)
            {
                cout << "Upgrade fail 4" << endl;
                break;
            }
            else if (nState == 5)
            {
                cout << "Upgrade fail 5" << endl;
                break;
            }

            int nPos = NET_SDK_GetUpgradeProgress(lUpgradeHandle);
            if (nPos >= 100)
            {
                cout << "Upgrade successful." << endl;
                NET_SDK_CloseUpgradeHandle(lUpgradeHandle);
                break;
            }
            cout << "Upgrading: " << nState << "  " << nPos << "%" << endl;
            Sleep(500);
        }
    }
    else
    {
        cout << "firmware package upload failed: " << lUpgradeHandle << endl;
        DWORD LastError = NET_SDK_GetLastError();
        if (LastError == NET_SDK_BUSY)
        {
            cout << "device busy!" << endl;
        }
        else if (LastError == NET_SDK_FILE_NOT_MATCH_PRODUCT)
        {
            cout << "same version!" << endl;
        }
        else
        {
            cout << "Faild :" << LastError << endl;
        }
    }

    // logout
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
}