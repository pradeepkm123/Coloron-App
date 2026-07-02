# 🔬 REVERSE ENGINEERING SUPERLIVEPLUS - COMPLETE GUIDE

## 📋 What You'll Need

### Required:
1. ✅ **Wireshark** - Network packet analyzer
2. ✅ **SuperLivePlus app** - Installed on your phone
3. ✅ **Your camera** - Connected to WiFi
4. ✅ **Your PC** - On the same WiFi network

### Time Required:
- Setup: 15 minutes
- Capture: 5 minutes
- Analysis: 30-60 minutes
- Implementation: 1-2 hours
- **Total: 2-3 hours to working audio**

---

## 🚀 PHASE 1: SETUP (15 minutes)

### Step 1.1: Download Wireshark

**Option A - Direct Download:**
1. Go to: https://www.wireshark.org/download.html
2. Click "Windows x64 Installer"
3. Download and run the installer

**Option B - Direct Link:**
```
https://2.na.dl.wireshark.org/win64/Wireshark-win64-latest.exe
```

### Step 1.2: Install Wireshark

1. Run the installer
2. Click "Next" through all screens (default options are fine)
3. When asked about WinPcap/Npcap, choose "Install Npcap"
4. Finish installation
5. Restart your PC if prompted

### Step 1.3: Verify Installation

1. Open Wireshark
2. You should see a list of network interfaces
3. Find your WiFi adapter (usually called "Wi-Fi" or "Wireless")
4. ✅ If you see this, you're ready!

---

## 🎯 PHASE 2: IDENTIFY YOUR CAMERA (5 minutes)

### Step 2.1: Find Camera IP

Your camera is likely one of these IPs on your network:
- 192.168.1.1
- 192.168.1.3
- 192.168.1.8
- 192.168.1.13
- 192.168.1.22
- 192.168.1.46
- 192.168.1.57
- 192.168.1.98

### Step 2.2: Confirm Camera IP

**Method 1 - Check SuperLivePlus:**
1. Open SuperLivePlus
2. Go to device settings
3. Look for IP address

**Method 2 - Check Camera Web Interface:**
1. Try opening each IP in your browser
2. The camera will show a login page
3. Note which IP shows your camera

**Method 3 - Trial and Error:**
- We'll try each IP during capture
- The one with audio packets is your camera

📝 **Write down your camera IP here: ________________**

---

## 📡 PHASE 3: CAPTURE TRAFFIC (5 minutes)

### Step 3.1: Start Wireshark Capture

1. **Open Wireshark**
2. **Double-click your WiFi adapter** (or select it and click the blue shark fin)
3. **Packets will start scrolling** - this is normal!
4. **Leave Wireshark running**

### Step 3.2: Use SuperLivePlus Audio

Now perform these actions EXACTLY:

1. ✅ **Open SuperLivePlus** on your phone
2. ✅ **Connect to your camera** (wait for video to appear)
3. ✅ **Press and HOLD the talk/intercom button**
4. ✅ **Speak clearly for 10 seconds**: "Testing one two three four five six seven eight nine ten"
5. ✅ **Release the talk button**
6. ✅ **Wait 3 seconds**
7. ✅ **Press talk again and speak for 5 more seconds**
8. ✅ **Release**
9. ✅ **Close SuperLivePlus**

### Step 3.3: Stop Capture

1. **Go back to Wireshark**
2. **Click the red square** (Stop) button
3. **Save the capture**:
   - File → Save As
   - Name: `superlive_audio_capture.pcapng`
   - Save to: `e:\prd\app\VMS\`
4. ✅ **Capture saved!**

---

## 🔍 PHASE 4: FILTER THE DATA (10 minutes)

### Step 4.1: Filter by Camera IP

In Wireshark's filter box (top of window), type:

```
ip.addr == 192.168.1.XXX
```

Replace `XXX` with your camera's IP address, then press **Enter**.

**Example:**
```
ip.addr == 192.168.1.46
```

Now you should see ONLY packets between your phone and camera.

### Step 4.2: Find the Audio Packets

Look for patterns:

1. **Look for UDP packets** (Protocol column shows "UDP")
2. **Look for packets around 170-200 bytes** (Length column)
3. **Look for packets sent TO the camera** (Destination = camera IP)
4. **Look for LOTS of packets in a row** (during the 10 seconds you spoke)

### Step 4.3: Identify the Audio Port

1. **Click on one of the suspected audio packets**
2. **Look at the "Destination Port"** in the packet details
3. **Common ports**: 9000, 8000, 6666, 34599

📝 **Write down the audio port: ________________**

---

## 📊 PHASE 5: ANALYZE PACKETS (20 minutes)

### Step 5.1: Examine the First Audio Packet

1. **Find the FIRST packet sent when you pressed talk**
2. **Click on it**
3. **In the middle panel**, expand these sections:
   - Internet Protocol Version 4
   - User Datagram Protocol
   - Data

### Step 5.2: Look at the Hex Dump

At the bottom of Wireshark, you'll see hex values like:

```
0000   00 23 24 2a b0 1a 3c 0a f3 f3 30 b9 08 00 45 00
0010   00 ac 1f 3a 40 00 80 11 00 00 c0 a8 01 39 c0 a8
0020   01 2e 23 28 23 28 00 98 00 00 [AUDIO DATA STARTS]
```

### Step 5.3: What to Look For

**Before the audio data, look for:**

1. **Magic bytes** - Repeated pattern at start (e.g., `54 56 54 00`)
2. **Sequence numbers** - Incrementing numbers
3. **Timestamps** - Numbers that increase
4. **Packet type** - Identifier byte

**Example pattern:**
```
[4 bytes: Magic] [4 bytes: Sequence] [4 bytes: Timestamp] [160 bytes: Audio]
```

### Step 5.4: Compare Multiple Packets

1. **Click on 3-4 consecutive audio packets**
2. **Compare their hex dumps**
3. **Note what changes** (sequence, timestamp)
4. **Note what stays the same** (magic bytes, structure)

---

## 📸 PHASE 6: DOCUMENT FINDINGS (15 minutes)

### Step 6.1: Take Screenshots

Take screenshots of:

1. **Packet List View** (showing filtered packets)
2. **First Audio Packet Details** (expanded sections)
3. **Hex Dump of First Packet**
4. **Hex Dump of Second Packet** (to see what changes)

Save screenshots to: `e:\prd\app\VMS\wireshark_screenshots\`

### Step 6.2: Document the Protocol

Create a file: `e:\prd\app\VMS\protocol_analysis.txt`

Fill in this template:

```
=== CAMERA INFORMATION ===
Camera IP: [Your camera IP]
Camera Port: [Port number]

=== PACKET STRUCTURE ===
Total packet size: [bytes]
Header size: [bytes]
Audio data size: [bytes]

=== HEADER FORMAT ===
Bytes 0-3: [What are these? Magic number?]
Bytes 4-7: [Sequence number?]
Bytes 8-11: [Timestamp?]
Bytes 12-15: [Unknown?]

=== SAMPLE PACKET (HEX) ===
[Paste first 50 bytes of hex dump here]

=== OBSERVATIONS ===
- What changes between packets?
- What stays the same?
- Any patterns noticed?
```

---

## 🎯 PHASE 7: SHARE WITH ME

### Option A: Share the PCAP File

If you can share files:
1. Upload `superlive_audio_capture.pcapng` to a file sharing service
2. Share the link with me
3. I'll analyze it directly

### Option B: Share Screenshots & Info

Provide me with:
1. Camera IP address
2. Audio port number
3. Screenshots from Wireshark
4. Your filled `protocol_analysis.txt`

### Option C: Describe What You See

Tell me:
1. "The audio packets go to port [NUMBER]"
2. "Each packet is [NUMBER] bytes"
3. "The first few bytes are: [HEX VALUES]"
4. "The packets are sent via [TCP/UDP]"

---

## ⚡ QUICK REFERENCE

### Wireshark Filters

```
# Show only camera traffic
ip.addr == 192.168.1.46

# Show only UDP traffic to camera
ip.dst == 192.168.1.46 && udp

# Show only specific port
udp.port == 9000

# Show packets during specific time
frame.time >= "2026-01-30 16:00:00" && frame.time <= "2026-01-30 16:01:00"
```

### Common Camera Ports

- **9000** - Most common for audio
- **8000** - TVT/XM alternative
- **6666** - Dahua cameras
- **34599** - Some NVRs
- **554** - RTSP (usually video)

### Packet Size Hints

- **~172 bytes** = 12-byte RTP header + 160-byte G.711 audio
- **~160 bytes** = Raw G.711 audio (no header)
- **~200 bytes** = Custom header + audio

---

## 🆘 TROUBLESHOOTING

### "I don't see any packets"
- Make sure you selected the right WiFi adapter
- Make sure your phone is on WiFi (not mobile data)
- Try restarting the capture

### "Too many packets, can't find audio"
- Use the filter: `ip.addr == [CAMERA_IP]`
- Look for UDP packets
- Look for packets sent TO the camera (not from)

### "I can't identify the camera IP"
- Try each IP from the list
- Look for the one with lots of traffic when you use SuperLivePlus

### "Wireshark won't install"
- Run installer as Administrator
- Disable antivirus temporarily
- Download Npcap separately: https://npcap.com/

---

## ✅ SUCCESS CRITERIA

You've succeeded when you can answer:

1. ✅ What is the camera IP?
2. ✅ What port does audio use?
3. ✅ Is it TCP or UDP?
4. ✅ How big are the packets?
5. ✅ What are the first 12 bytes of an audio packet?

**Once you have these answers, I can implement the protocol in 1-2 hours!**

---

## 📞 NEXT STEPS

After you complete the capture:

1. Share the information with me
2. I'll analyze the protocol structure
3. I'll implement it in NvrSdkModule.java
4. We'll test it
5. **Your audio will work!**

---

**Ready? Start with Phase 1: Download Wireshark!**

Good luck! 🚀
