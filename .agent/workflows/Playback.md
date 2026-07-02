---
description: SuperLivePlus Playback implementation Workflow guide
---

# 🎥 SuperLivePlus Playback - Full Workflow Guide

To implement Playback in your VMS app like **SuperLivePlus**, the architecture must support a continuous stream pipeline directly between the Native Device SDK and hardware-decoded canvas rendering. 

Below is the full implementation workflow integrated specifically within your workspace:

---

## ⚙️ 1. Core Architecture (React Native + Native SDK)
SuperLivePlus does **not** rely on standard web format decoders (No HLS, No Dash, No standard `<Video />` components). 

### 🔥 Workspace Structure
1. **React Native UI layer**: Handles timeline sliders, calendars, layout triggers.
2. **Native JavaScript Module (`NvrSdk.ts`)**: Forwards functions to corresponding Java modules.
3. **Android Native Module (`TVTSdkModule.java`)**: Manages device socket streams.
4. **Hardware Decoder Window (`NvrVideoViewManager.java`)**: Generates an Android `SurfaceView` overlay specifically bounded to intercept raw `byte[]` streams emitted by the SDK decoder.

---

## 📡 2. Step-by-Step API Execution Workflow

### 🟢 STEP 1: Node Handshake & Startup
Initialize the SDK layout framework once at launch.
```java
TVTSdkModule.initSDK();
loginHandle = TVTSdkModule.loginDevice(ip, port, user, pass, loginType);
```

---

### 🟢 STEP 2: Record Range Discovery (`searchRecordings`)
Query back and disclose exactly where the timestamps contain recorded fragments for the target channel cell to populate the calendar and timeline grid bars.
```typescript
const files = await NvrSdk.searchRecordings(userId, channelId, startOfDay, endOfDay);
// returns: [{ start: "10:00:00", end: "10:30:00", typeLabel: "Schedule" }]
```
**🎨 UI Output:** Maps blue, green, and yellow strips cleanly across `<PlaybackTimeline />` scales.

---

### 🟢 STEP 3: Initializing Stream Handlers (`startPlayback`)
Trigger `startPlayback` connecting directly to NVR hardware decoding.
```typescript
const res = await NvrSdk.startPlayback(userId, channelId, startTimeStr, windowEndStr, streamType);
// playHandle = res.handle
```
**🚨 Native setup routine forwards:**
1. Calls `PlayBackByTimeEx` natively.
2. Registers standard socket buffer queues.
3. Attaches `playHandle` lookup key to `NvrVideoViewManager`.

---

### 🟢 STEP 4: Audio/Video Callback Streaming 
Data streams flow sequentially inside standard Native threaded loops continuously:
```java
@Override
public void onVideoData(long handle, int type, byte[] data, int length, ...) {
    // 1. Fetch byte[] buffer streams from NVR
    // 2. Dispatch straight into NvrVideoViewManager matching specific grids
    NvrVideoViewManager.dispatchVideoData(handle, data, length, bKey, w, h);
}
```

---

### 🟢 STEP 5: Layout Window Bindings (Crucial Step)
React Native cannot parse binary raw H26x streams. Your app encapsulates `SurfaceView` overlays:
```typescript
<NvrVideoView 
   handle={handle} 
   userId={userId} 
   channelId={channelId} 
/>
```
**💡 Multi-Grid Support Limit Check:** 
Some NVR hardware decoders only support **1 parallel playback stream concurrently**. To preserve seamless grids, explicit triggers are sometimes optimized to only feed the actively selected container slot window directly instead of over-running memory caps.

---

## ⏯️ 3. UI Controller Handlers

| Action | Function (SDK API Handler) |
| :--- | :--- |
| **Pause** | `NvrSdk.playbackControl(handle, NvrSdk.PLAYBACK_CMD.PAUSE)` |
| **Resume** | `NvrSdk.playbackControl(handle, NvrSdk.PLAYBACK_CMD.RESUME)` |
| **Fast Forward** | `NvrSdk.playbackControl(handle, NvrSdk.PLAYBACK_CMD.FF, speedMulti)` |
| **Seek / Drag Time** | Execute `jumpToTime(targetDate)` (stops previous stream and binds immediate target start time string). |
| **Snapshot** | `NvrSdk.capturePlaybackSnapshot({ handle, path, userId, channelCount })` |
| **Volume Audio** | `NvrSdk.playbackControl(handle, NvrSdk.PLAYBACK_CMD.VOLUME, 100)` |

---

## 🛠️ 4. Handling Black Screens (Workarounds applied)
Since Native Android `SurfaceView` coordinates sometimes fail to trigger re-renders correctly on complex grid overlapping sizing in React Native:
* **The Delayed Layout Flicker:** Introduces `marginBottom: 0.5` bump around ~800ms right after attaching native handle to force the Android Views framework to correctly redraw bounding layout meshes for the overlay securely.
* **Filter Lockdown Rules**: Adding locks such as `skipNextSnapRef` ensures manual selectors (Calendar clicks or timelines) aren't forcibly overwritten or locked into random buffers during frame pipeline stalls.
