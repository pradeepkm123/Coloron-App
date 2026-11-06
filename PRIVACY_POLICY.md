# Privacy Policy for ColorOn VMS Mobile Application

**Effective Date:** August 3, 2026  
**Last Updated:** August 3, 2026

**ColorOn** ("we," "us," or "our") is committed to protecting your privacy and ensuring the security of your personal data. This Privacy Policy describes how we collect, use, disclose, and safeguard your information when you use our mobile application, **ColorOn VMS** (the "App"), available on Android and iOS platforms.

Please read this Privacy Policy carefully. By downloading, installing, or using the ColorOn VMS App, you agree to the collection and use of information in accordance with this policy. If you do not agree with any part of this policy, please do not use the application.

---

## 1. Overview & Purpose of the App

**ColorOn VMS** is a professional Video Management System (VMS) mobile application designed to enable users to view live CCTV camera streams, manage NVR/DVR/IP Camera hardware devices, control PTZ (Pan-Tilt-Zoom) functionality, review stored video playback, listen to audio streams, and send two-way audio talkback commands.

We prioritize your security and data privacy. **Your video feeds, live camera streams, and stored surveillance recordings remain private to you and your connected hardware.**

---

## 2. Information We Collect and App Permissions

To provide the core features of a Video Management System, the App requires access to specific hardware capabilities and permissions on your mobile device.

### A. Device Permissions Requested

1. **Camera Permission (`android.permission.CAMERA`)**
   * **Purpose:** Allows the App to scan QR codes on NVR/DVR/Camera labels for rapid device addition and setup.
   * **Usage:** Used solely when you manually initiate a device scan or capture a snapshot within the App.

2. **Microphone Permission (`android.permission.RECORD_AUDIO`)**
   * **Purpose:** Enables real-time two-way audio talkback between your mobile device and supported CCTV/NVR devices.
   * **Usage:** Active only when you manually press and hold the intercom/audio talkback button in Live View or Playback.

3. **Storage and Media Access (`READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`)**
   * **Purpose:** Enables saving video clips, manual recordings, and camera snapshots directly to your device's local gallery or file system.
   * **Usage:** Accessed only when you trigger a manual record or snapshot action in the App.

4. **Network State and Wi-Fi Access (`ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `CHANGE_WIFI_MULTICAST_STATE`, `INTERNET`)**
   * **Purpose:** Required to establish high-definition RTSP, WebSockets, and P2P streaming connections between your mobile phone and your surveillance hardware.
   * **Usage:** Used to detect network changes (Wi-Fi ↔ Cellular Data) and discover local camera hardware on your LAN.

5. **Notifications Permission (`POST_NOTIFICATIONS`)**
   * **Purpose:** Delivers real-time push notifications for motion detection events, tripwire alarms, sensor triggers, and device status alerts.

---

## 3. How We Process and Use Your Information

All data collected or processed by ColorOn VMS is used strictly for technical performance and functional operations:

* **Live Streaming & Playback:** Transmitting video and audio streams directly between your surveillance hardware (NVR/DVR/IP Camera) and your mobile device.
* **Device Management:** Storing device connection parameters (IP addresses, domain names, port numbers, device serial numbers, usernames, and encrypted access credentials).
* **Push Notifications:** Sending motion and alarm notifications via Google Firebase Cloud Messaging (FCM) or Apple Push Notification Service (APNs).
* **App Stability & Analytics:** Diagnostic logs for troubleshooting connection or decoder failures (without accessing video content).

---

## 4. Video Stream Privacy & Data Security

### A. Direct Stream Architecture
* **No Video Harvesting:** ColorOn does **NOT** collect, store, record, analyze, or stream your camera footage to our servers. Your surveillance video remains strictly between your local hardware and your mobile device.
* **Local Credential Storage:** Device passwords and credentials are saved directly on your mobile device in protected local storage.

### B. Encryption & Transport Security
* Streams are transmitted using industry-standard RTSP, HTTPS, and encrypted P2P channels to prevent unauthorized interception.

---

## 5. Data Sharing and Third-Party Disclosures

We do **NOT** sell, rent, trade, or share your personal data, stream details, or camera information with any third-party advertisers or data brokers.

We may integrate trusted third-party SDKs strictly to ensure functional operation:
* **Google Play Services & Firebase Cloud Messaging (FCM):** For push notifications delivery. [Google Privacy Policy](https://policies.google.com/privacy)
* **Expo & React Native Core Modules:** For app lifecycle and system execution.

---

## 6. Data Retention and Account / Data Deletion Rights

### A. Data Control
You have full control over all data saved within the ColorOn VMS App:
* You can add, edit, or delete any NVR, DVR, or IP Camera profile from the device list at any time.
* Deleting a device immediately removes its connection details and saved credentials from your mobile phone.

### B. App Data Clear & Uninstall
You can erase all locally stored data, credentials, and app preferences at any time by:
1. Clearing the App Data in your device settings (`Settings > Apps > ColorOn > Storage > Clear Data`).
2. Uninstalling the ColorOn VMS App from your device.

---

## 7. Children's Privacy

The ColorOn VMS App is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13.

---

## 8. International Compliance (GDPR, CCPA, India IT Act)

* **GDPR (European Union):** Users have the right to access, rectify, or erase local device configuration data and revoke device permissions at any time via Android settings.
* **CCPA / CPRA (California):** We do not sell personal information or surveillance data.
* **Information Technology Act (India):** Data is processed in compliance with reasonable security practices.

---

## 9. Changes to This Privacy Policy

We may update our Privacy Policy from time to time. Any changes will be updated on this page with a revised "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.

---

## 10. Contact Us

If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us:

* **App Name:** ColorOn VMS
* **Package Name:** `com.vms`
* **Email:** support@coloron.in
* **Website:** [https://coloron.in](https://coloron.in)
