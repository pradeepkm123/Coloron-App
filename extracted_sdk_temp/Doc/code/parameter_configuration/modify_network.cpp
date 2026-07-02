#include <string>
#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"
#include <iomanip>
#include <sstream>
#include <ctime>
#include <afx.h>

void ModifyDeviceNetInfo()
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

    // set device info
    NET_SDK_DEVICE_IP_INFO pDeviceIPInfo;
    memset(&pDeviceIPInfo, 0, sizeof(NET_SDK_DEVICE_IP_INFO));
    strcpy_s(pDeviceIPInfo.szMac, mBase->convertMacAddr(device_info.deviceMAC)); // Current MAC address of the device
    strcpy_s(pDeviceIPInfo.szIpAddr, "10.80.1.178");
    strcpy_s(pDeviceIPInfo.szMark, "255.255.255.0");
    strcpy_s(pDeviceIPInfo.szGateway, "10.80.1.1");
    strcpy_s(pDeviceIPInfo.szDdns1, "223.6.6.6");
    strcpy_s(pDeviceIPInfo.szDdns2, "8.8.8.8");
    strcpy_s(pDeviceIPInfo.szPassword, "123456");
    pDeviceIPInfo.ucIPMode = 0;
    bool isOk = NET_SDK_ModifyDeviceNetInfo(&pDeviceIPInfo);

    if (isOk)
    {
        cout << "Device information setting successful: " << isOk << endl;
    }
    else
    {
        cout << "Device information setting failed: " << isOk << endl;
    }

    // logout
    NET_SDK_Logout(userid);
    NET_SDK_Cleanup();
}