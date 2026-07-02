# Reverse Engineering Two-Way Audio Protocol

## Goal
Capture and analyze SuperLivePlus network traffic to understand the exact protocol for two-way audio.

## Required Tools

### 1. Wireshark
Download from: https://www.wireshark.org/download.html
- Install on your Windows PC
- This will capture network packets

### 2. SuperLivePlus App
- Install on your Android phone
- Make sure it can do two-way audio with your camera

### 3. Your Phone and Camera on Same Network
- Connect phone to WiFi
- Camera should be on same network
- Note the camera IP address

## Step-by-Step Process

### Phase 1: Capture SuperLivePlus Traffic

1. **Start Wireshark on PC**
   - Open Wireshark
   - Select your network interface (WiFi adapter)
   - Click "Start Capturing"

2. **Use SuperLivePlus Audio**
   - Open SuperLivePlus on phone
   - Connect to camera
   - Press the talk/intercom button
   - Speak for 5-10 seconds
   - Release the button
   - Stop Wireshark capture

3. **Filter the Packets**
   In Wireshark filter box, enter:
   ```
   ip.addr == [CAMERA_IP]
   ```
   Replace [CAMERA_IP] with your camera's IP (e.g., 192.168.1.100)

### Phase 2: Analyze the Protocol

Look for:

1. **Initial Handshake**
   - What packets are sent BEFORE audio starts?
   - TCP or UDP?
   - What port numbers?
   - What's in the payload?

2. **Audio Packets**
   - What port is used for audio? (likely 9000, 8000, or 6666)
   - Packet size?
   - Any headers before audio data?
   - Packet rate (packets per second)?

3. **Authentication**
   - Are there any login/auth packets?
   - Session IDs or tokens?

### Phase 3: Document Findings

Create a document with:

```
=== HANDSHAKE ===
1. Client sends: [packet details]
2. Server responds: [packet details]
3. Client confirms: [packet details]

=== AUDIO STREAM ===
- Protocol: UDP/TCP
- Port: [number]
- Packet format:
  [Header bytes] + [Audio data]
- Packet size: [bytes]
- Rate: [packets/second]

=== TERMINATION ===
- How does it end the session?
```

### Phase 4: Implementation

Once we know the protocol, I'll implement it in Java exactly as SuperLivePlus does.

## Alternative: Android Packet Capture

If you can't use Wireshark on PC:

1. **Install Packet Capture app** on Android
   - App: "Packet Capture" by Grey Shirts
   - No root required
   - Can capture app-specific traffic

2. **Capture SuperLivePlus**
   - Start Packet Capture
   - Select SuperLivePlus
   - Use the audio feature
   - Stop capture
   - Export PCAP file
   - Open in Wireshark on PC

## What We're Looking For

### Example of what we might find:

```
Packet 1: TCP to port 34599
  Data: LOGIN|username|password|

Packet 2: TCP response
  Data: OK|session_id_12345|

Packet 3: UDP to port 9000
  Data: [12 byte header] + [160 bytes G.711 audio]
  
Header format:
  Byte 0-3: Magic number (0x54565400)
  Byte 4-7: Sequence number
  Byte 8-11: Timestamp
```

Once we know this, we can replicate it EXACTLY.

## Timeline

- **Packet Capture**: 15 minutes
- **Analysis**: 30-60 minutes
- **Implementation**: 1-2 hours
- **Testing**: 30 minutes

**Total: 3-4 hours to working audio**

## Next Steps

1. Download Wireshark: https://www.wireshark.org/download.html
2. Capture SuperLivePlus traffic
3. Send me the PCAP file or screenshots
4. I'll analyze and implement

---

**This WILL work** because we're copying a working implementation.
