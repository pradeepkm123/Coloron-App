# Playback Video Not Streaming - Debugging Guide

## Issue
Playback video is not playing or streaming on the Playback screen.

## Enhanced Logging Added

We've added comprehensive logging to track the entire playback flow:

### 1. React Native Side (`Playback.tsx`)
- ✅ Logs when playback handles are created
- ✅ Logs when handles are passed to components
- ✅ Logs state changes for `playbackHandles`

### 2. Native Android Side
- ✅ `PlaybackSurfaceViewManager.java` - Logs when handles are received from React Native
- ✅ `PlaybackSurfaceView.java` - Logs surface lifecycle and binding process
- ✅ `NvrSdkModule.java` - Logs playback start requests

## How to Debug

### Step 1: Check Metro Bundler Console

Look for these log patterns in the Metro console:

```
🚀 Starting Grid Playback:
   Time: 2026-01-01 00:08:22
   Channels: 0, 1, 2, 3
   Login Handle: 123

📺 Starting Ch 0: 2026-01-01 00:08:22 → 2026-01-01 00:10:15
➡️ Ch 0 handle: 12345678 (string)
✅ Ch 0 playback started successfully

📊 Playback Handles State Updated: {0: "12345678", 1: "12345679"}
   Handles count: 2
   Ch 0: 12345678
   Ch 1: 12345679
```

**What to check:**
- ✅ Are handles being created? (Look for `➡️ Ch X handle:`)
- ✅ Are handles valid? (Should be large positive or large negative numbers, NOT -1 to -100)
- ✅ Is the state updating? (Look for `📊 Playback Handles State Updated`)

### Step 2: Check Android Logcat

Use this command to filter relevant logs:
```powershell
# Find your Android SDK platform-tools directory first
# Usually: C:\Users\<YourName>\AppData\Local\Android\Sdk\platform-tools

# Then run:
.\adb.exe logcat -c  # Clear logs
.\adb.exe logcat *:S ReactNativeJS:V NvrSdk:V PlaybackSurfaceView:V PlaybackSurfaceViewManager:V H264Decode:V
```

Look for this sequence:

#### A. Handle Passing (PlaybackSurfaceViewManager)
```
PlaybackSurfaceViewManager: 📺 setPlaybackHandle called with: 12345678
PlaybackSurfaceViewManager: ✅ Parsed handle: 12345678 (valid: true)
```

**Issue if you see:**
```
PlaybackSurfaceViewManager: ⚠️ Empty/null handle, setting to -1
```
→ **Problem**: Handle not being passed from React Native to native component

#### B. Surface Binding (PlaybackSurfaceView)
```
PlaybackSurfaceView: setPlaybackHandle: 12345678
PlaybackSurfaceView: surfaceCreated
PlaybackSurfaceView: 🔗 bindSurface() called
PlaybackSurfaceView:    playbackHandle: 12345678
PlaybackSurfaceView:    sdk: initialized
PlaybackSurfaceView: ✅ Surface is valid, proceeding with binding...
PlaybackSurfaceView: 🔧 Attempting SetPlaybackRenderSurface via reflection...
PlaybackSurfaceView: ✅ SetPlaybackRenderSurface SUCCESS!
PlaybackSurfaceView: 🎮 Sending PlayBackControl commands...
PlaybackSurfaceView:    CMD_PLAY (1): true
PlaybackSurfaceView:    CMD_START_DECODE (15): true
PlaybackSurfaceView: ✅ Playback commands sent successfully!
PlaybackSurfaceView: 🎉 BIND SURFACE COMPLETE - Video should start rendering now!
```

**Issue if you see:**
```
PlaybackSurfaceView: ❌ bindSurface: Invalid handle (0)
```
→ **Problem**: Handle is 0 or not set

```
PlaybackSurfaceView: ❌ bindSurface: SDK is null
```
→ **Problem**: SDK not initialized

```
PlaybackSurfaceView: ❌ Surface is null or invalid!
```
→ **Problem**: SurfaceView not properly created

```
PlaybackSurfaceView: ⚠️ SetPlaybackRenderSurface not found, trying SetSurface...
PlaybackSurfaceView: ❌ SetSurface FAILED: ...
```
→ **Problem**: SDK doesn't have the expected surface binding method

#### C. Playback Start (NvrSdkModule)
```
NvrSdk: 🎬 PLAYBACK START REQUEST:
NvrSdk:    User=123 Ch=0
NvrSdk:    Time: 2026-01-01 00:08:22 → 2026-01-01 23:59:59
NvrSdk:    Struct: [126,0,1,0:8:22]
NvrSdk:    Trying RealChannel=0 (offset=0)
NvrSdk:       Trying PlayBackByTime(SUBSTREAM=1)...
NvrSdk: ✅ PlayBackByTime(SUB) SUCCESS! Ch=0 Handle=12345678
NvrSdk: 🎮 Sending PlaybackControl commands...
NvrSdk:    PlayBackControl(PLAY=1): true
NvrSdk:    PlayBackControl(START_DECODE=15): true
NvrSdk: 🎉 PLAYBACK STREAM OPENED SUCCESSFULLY
NvrSdk:    Handle: 12345678
NvrSdk:    Channel: 0
```

**Issue if you see:**
```
NvrSdk: ❌ ALL PLAYBACK ATTEMPTS FAILED
NvrSdk:    Final handle: -1
```
→ **Problem**: No recording found at the specified time, or wrong channel

## Common Issues & Solutions

### Issue 1: Black Screen, No Video

**Symptoms:**
- Surface is created
- Handle is valid
- But no video appears

**Check:**
1. Look for decoder errors in logcat:
   ```
   H264Decode: ERROR: ...
   ```

2. Check if video data is being received:
   ```powershell
   .\adb.exe logcat | Select-String "VIDEO|DECODE|RENDER"
   ```

**Solutions:**
- Try different stream type (MAIN vs SUB)
- Check NVR recording format (H.264 vs H.265)
- Verify device supports the codec

### Issue 2: Handle is -1 or Invalid

**Symptoms:**
```
❌ Ch 0 playback FAILED - error code: -1
```

**Causes:**
1. No recording exists at the selected time
2. Wrong channel number
3. NVR is offline

**Solutions:**
1. Check if recordings exist:
   ```typescript
   // In Playback.tsx, check segments array
   console.log('Segments:', segments);
   ```

2. Try different date/time with known recordings

3. Verify NVR connection:
   ```typescript
   // Check if login succeeded
   console.log('Login Handle:', loginHandle);
   ```

### Issue 3: Surface Not Binding

**Symptoms:**
```
PlaybackSurfaceView: ❌ Surface is null or invalid!
```

**Solutions:**
1. Check if `PlaybackSurfaceView` is properly rendered:
   ```typescript
   // In MultiPlaybackGrid.tsx
   {handle ? (
       <PlaybackSurfaceView
           style={styles.surface}  // Must have width/height
           playbackHandle={handle}
       />
   ) : null}
   ```

2. Ensure surface has dimensions:
   ```typescript
   surface: {
       width: '100%',
       height: '100%',
   }
   ```

### Issue 4: Handle Not Passed to Native

**Symptoms:**
```
PlaybackSurfaceViewManager: ⚠️ Empty/null handle, setting to -1
```

**Causes:**
- State not updating
- Component not re-rendering

**Solutions:**
1. Check if `playbackHandles` state is updating:
   ```
   📊 Playback Handles State Updated: {0: "12345678"}
   ```

2. Verify handle is a string (not number):
   ```typescript
   // In NvrSdk.ts
   return await getModule().startPlayback(...); // Should return string
   ```

## Testing Checklist

Use this checklist to systematically debug:

- [ ] **Metro Console**: Playback handles are being created
- [ ] **Metro Console**: Handles are valid (not -1 to -100)
- [ ] **Metro Console**: State is updating (`📊 Playback Handles State Updated`)
- [ ] **Logcat**: `PlaybackSurfaceViewManager` receives handles
- [ ] **Logcat**: `PlaybackSurfaceView.setPlaybackHandle` is called
- [ ] **Logcat**: `surfaceCreated` is called
- [ ] **Logcat**: `bindSurface()` is called
- [ ] **Logcat**: Surface is valid
- [ ] **Logcat**: `SetPlaybackRenderSurface` or `SetSurface` succeeds
- [ ] **Logcat**: `PlayBackControl` commands return true
- [ ] **Logcat**: No decoder errors
- [ ] **Visual**: Video appears on screen

## Next Steps

If video still doesn't play after checking all above:

1. **Capture full logcat output:**
   ```powershell
   .\adb.exe logcat > playback_debug.log
   ```
   Then navigate to playback screen and try to play video.

2. **Check SDK methods available:**
   Add this to `PlaybackSurfaceView.java`:
   ```java
   // In bindSurface(), before trying to bind:
   for (java.lang.reflect.Method m : sdk.getClass().getMethods()) {
       if (m.getName().contains("Playback") || m.getName().contains("Surface")) {
           Log.d(TAG, "Available method: " + m.getName());
       }
   }
   ```

3. **Try alternative binding methods:**
   The SDK might use different method names. Common alternatives:
   - `SetPlaySurface`
   - `SetVideoSurface`
   - `BindSurface`
   - `AttachSurface`

4. **Verify recording exists:**
   Use the NVR's web interface to confirm recordings exist for the date/time you're trying to play.

## Quick Fix Attempts

### Fix 1: Force Refresh
```typescript
// In Playback.tsx, add a key to force re-render
<MultiPlaybackGrid
    key={Object.keys(playbackHandles).join('-')}
    gridType={gridType}
    channels={visibleChannels}
    playbackHandles={playbackHandles}
    ...
/>
```

### Fix 2: Delay Surface Binding
```java
// In PlaybackSurfaceView.java, setPlaybackHandle()
public void setPlaybackHandle(long handle) {
    this.playbackHandle = handle;
    // Delay binding to ensure surface is ready
    new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
        if (getHolder().getSurface() != null && getHolder().getSurface().isValid()) {
            bindSurface();
        }
    }, 300);
}
```

### Fix 3: Try Different Channel Offset
```typescript
// In Playback.tsx, when starting playback
// If channel 0 doesn't work, try channel 32
const handle = await NvrSdk.startPlayback(loginHandle, ch + 32, ...);
```

## Success Indicators

You'll know playback is working when you see:

1. **Metro Console:**
   ```
   ✅ Ch 0 playback started successfully
   📊 Playback Handles State Updated: {0: "12345678"}
   ```

2. **Logcat:**
   ```
   PlaybackSurfaceView: 🎉 BIND SURFACE COMPLETE - Video should start rendering now!
   ```

3. **Screen:**
   - Video appears in the playback grid
   - Timeline shows current position
   - Video plays smoothly

---

**Remember**: The most common issue is that no recording exists at the selected time. Always verify recordings exist first!
