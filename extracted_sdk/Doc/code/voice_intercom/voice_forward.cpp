#include <iostream>
#include <string>
#include "stdafx.h"
#include "DVR_NET_SDK.h"

using namespace std;

void VoiceForward()
{
    // Initial
    NET_SDK_Init();
    // Device information
    const std::string device_ip = "10.80.1.177";
    const DWORD decice_port = 6036;
    const std::string username = "admin";
    const std::string password = "123456";
    //  Login
    NET_SDK_DEVICEINFO device_info = {0};
    int userid = NET_SDK_Login(const_cast<char *>(device_ip.c_str()), decice_port, const_cast<char *>(username.c_str()), const_cast<char *>(password.c_str()), &device_info);

    if (userid > 0)
    {
        cout << "Login successfully: " << userid << endl;
    }
    else
    {
        cout << "Failed to login: " << userid << endl;
        return;
    }

    std::string fname = "./voice.pcm";

    LONG lChannel = -1;
    if (reinterpret_cast<CButton*>(GetDlgItem(IDC_CHECK_TALK_TO_CHANNEL))->GetCheck())
    {
        lChannel = m_comChannel.GetCurSel();
    }

    POINTERHANDLE handle = NET_SDK_StartVoiceCom_MR(m_userID, TRUE, nullptr, this, lChannel);
    if (handle == -1) {
        return;
    }

    FILE* hStreamFile = fopen(fname.c_str(), "rb+");
    if (NULL == hStreamFile)
    {
        return;
    }


    const int SAMPLE_RATE = 8000;   /* sample rate */
    const int CHANNELS = 1;			/* number of channels (i.e. mono, stereo...) */
    const int BITS_PER_SAMPLE = 16; /* Number of bits per sample of mono data */
    const size_t BUFFER_SIZE = 3200;  
    char buffer[BUFFER_SIZE];  
    size_t bytesRead;
    int sleepTime = 0;
    while ((bytesRead = fread(buffer, sizeof(char), BUFFER_SIZE, hStreamFile)) > 0) {
        NET_SDK_VoiceComSendData(handle, buffer, bytesRead);
        sleepTime = bytesRead *1000/ (SAMPLE_RATE* BITS_PER_SAMPLE* CHANNELS /8);
        Sleep(sleepTime);
    }

    fclose(hStreamFile);

    // Stop voice forwarding
    NET_SDK_StopVoiceCom(handle);
    // Logout
    NET_SDK_Logout(userid);
    // Clean up the data
    NET_SDK_Cleanup();
}