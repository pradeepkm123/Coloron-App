# SDK Upgrade Request - Two-Way Audio Support

## To: SDK Provider (TVT/XM/NVR SDK Team)

### Current Situation

We are developing a professional VMS (Video Management System) mobile application and require **two-way audio (intercom)** functionality to communicate with cameras through our app.

### Current SDK Information

**SDK Details:**
- Library: `dvrsdk.jar`
- Native Libraries: 
  - `libnvrsdk.so`
  - `libAudioCodec.so`
  - `libH264Decode.so`
  - `libNatTraveral.so`
  - `libRecorder.so`
- Package: `com.sdk.interfance.nvrsdk`

**Current SDK Capabilities (Working):**
- ✅ Device login/logout (`LoginEx`, `Logout`)
- ✅ Live video streaming (`LivePlay`, `StopLivePlay`)
- ✅ Playback (`PlayBackByTime`, `PlayBackByTimeEx`)
- ✅ Recording search (`FindFile`)
- ✅ PTZ control (`PTZControl`)
- ✅ Device discovery
- ✅ Snapshot capture

**Missing Capabilities (Required):**
- ❌ Two-way audio / Intercom functionality
- ❌ Audio transmission to camera
- ❌ Voice communication

### Methods We Need

Based on industry standards and similar SDKs, we require the following methods (or equivalent):

```java
// Start audio channel
public long StartVoiceCom(int userId, boolean needEncode);
public boolean OpenSound(int userId);

// Send audio data
public int InputAudioData(int userId, byte[] audioData, int length);
public int TalkSendData(int userId, byte[] audioData, int length);
public int SendVoiceData(int userId, byte[] audioData, int length);

// Stop audio channel
public boolean StopVoiceCom(long handle);
public boolean CloseSound(int userId);
```

**OR** any equivalent methods that enable:
1. Opening an audio channel to a logged-in device
2. Sending G.711 A-law encoded audio data
3. Closing the audio channel

### Technical Requirements

**Audio Specifications:**
- Sample Rate: 8000 Hz
- Channels: Mono
- Encoding: G.711 A-law (PCMA)
- Bit Depth: 16-bit PCM (before encoding)
- Packet Size: 160 bytes (20ms of audio)

**Platform:**
- Android (React Native)
- Minimum SDK: API 24
- Target SDK: API 34

### Reference Implementation

**SuperLivePlus** (a professional VMS app) successfully implements two-way audio with the same camera models we're targeting. This confirms that:
1. The cameras support two-way audio
2. A solution exists (either through SDK or direct protocol)
3. Our implementation approach is correct

### What We've Already Implemented

We have a **complete two-way audio implementation** ready, including:
- ✅ Audio capture using `AudioRecord`
- ✅ G.711 A-law encoding
- ✅ Beautiful UI with permissions
- ✅ Half-duplex (push-to-talk) interface
- ✅ Thread management and lifecycle handling

**We only need the SDK methods to transmit the audio data.**

### Request

Please provide ONE of the following:

#### Option A: Updated SDK (Preferred)
- SDK version with two-way audio support
- Documentation for audio methods
- Sample code demonstrating audio transmission
- API reference for audio-related methods

#### Option B: Protocol Documentation
If SDK methods aren't available, please provide:
- Audio protocol specification
- Handshake/authentication requirements
- Packet format and structure
- Port numbers and network requirements

#### Option C: Technical Consultation
- Schedule a call with your technical team
- Discuss implementation approach
- Get guidance on proper audio integration

### Business Impact

**Without two-way audio:**
- ❌ Cannot compete with existing VMS apps
- ❌ Missing critical security feature
- ❌ Incomplete product offering
- ❌ Lost business opportunities

**With two-way audio:**
- ✅ Feature parity with competitors
- ✅ Complete VMS solution
- ✅ Enhanced security capabilities
- ✅ Increased market competitiveness

### Timeline

We need this functionality **urgently** to meet our product launch deadline. Any expedited support would be greatly appreciated.

### Contact Information

**Project:** VMS Mobile Application
**Platform:** React Native (Android)
**Developer:** [Your Name/Company]
**Email:** [Your Email]
**Phone:** [Your Phone]

### Additional Information

We are willing to:
- ✅ Sign NDA if required
- ✅ Pay for premium SDK version
- ✅ Participate in beta testing
- ✅ Provide feedback and bug reports
- ✅ Purchase technical support package

### Questions for SDK Team

1. **Does your SDK support two-way audio?**
   - If yes, which version?
   - What are the method names?

2. **What audio formats are supported?**
   - G.711 A-law?
   - G.711 μ-law?
   - Other codecs?

3. **Are there any sample applications?**
   - Android demo with audio?
   - Source code available?

4. **What is the upgrade path?**
   - Cost for updated SDK?
   - License requirements?
   - Support terms?

5. **Technical documentation?**
   - API reference?
   - Integration guide?
   - Best practices?

### Appendix: Current SDK Methods

Here are the methods currently available in our SDK version:

```java
// Login/Logout
public int LoginEx(String host, int port, String user, String pass, int type, String sn, boolean wifi);
public boolean Logout(int userId);

// Live Streaming
public long LivePlay(int userId, int channelId, int streamType);
public boolean StopLivePlay(long handle);

// Playback
public long PlayBackByTime(int userId, int[] channels, int streamType, int[] startTime, int[] endTime);
public long PlayBackByTimeEx(int userId, int[] channels, int streamType, int[] startTime, int[] endTime, boolean isEx);
public boolean StopPlayBack(long handle);

// Recording
public long FindFile(int userId, long channel, int[] startTime, int[] endTime);

// Device Info
public byte[] GetDeviceInfo(int userId);
public byte[] GetCHDeviceStatus(int userId);

// PTZ
public boolean PTZControl(int userId, int channelId, int cmd, int param1, int param2);

// Configuration
public byte[] GetDVRConfig(int userId, int type, int channel, int bufferSize, int[] actualSize, boolean wait);
```

**MISSING:** Any audio-related methods

---

## Next Steps

1. Send this document to SDK provider
2. Follow up within 3-5 business days
3. Request technical call if needed
4. Evaluate alternative SDKs if no response

**Prepared:** 2026-01-30
**Status:** Awaiting SDK provider response
