# Playback Video Not Playing - Debug Guide

## Changes Made

### 1. **NvrVideoViewManager.java** - Improved userId Handling
**File**: `android/app/src/main/java/com/vms/nvrsdk/NvrVideoViewManager.java`

**Change**: Enhanced the userId retrieval logic to be more explicit and verbose:
```java
// OLD CODE:
final int tagUserId = (vp.getTag() instanceof Integer) ? (Integer) vp.getTag() 
    : com.vms.tvt.TVTManager.loginHandle;

// NEW CODE:
int tagUserId = -1;
if (vp.getTag() instanceof Integer) {
    tagUserId = (Integer) vp.getTag();
    Log.i("NvrVideoView", "✅ Using tag userId: " + tagUserId);
} else {
    tagUserId = com.vms.tvt.TVTManager.loginHandle;
    Log.w("NvrVideoView", "⚠️ No tag userId, using TVTManager: " + tagUserId);
}
```

**Why**: This helps identify if the userId is properly being passed from React Native to the native layer.

---

### 2. **Playback.tsx** - Enhanced Logging
**File**: `src/screens/Playback.tsx`

**Change**: Added comprehensive logging after playback starts:
```typescript
console.log('═══════════════════════════════════════════');
console.log('📊 PLAYBACK STATUS SUMMARY');
console.log(`✅ Successfully started ${Object.keys(playbackHandlesRef.current).length} channels`);
console.log(`   Channels: ${visibleChannels.join(', ')}`);
console.log(`   Time: ${finalPlaybackTime}`);
// ... more detailed logging
```

**Why**: This helps verify that playback handles are being created and stored correctly.

---

### 3. **MultiPlaybackGrid.tsx** - Debug Native Props
**File**: `src/components/MultiPlaybackGrid.tsx`

**Change**: Added detailed logging of props passed to NvrVideoView:
```typescript
console.log(`[GRID] RENDER Ch ${channelId}`);
console.log(`      Handle: ${safeHandle} (Type: ${typeof handleData.handle})`);
console.log(`      RealChannel: ${handleData.realChannel}`);
console.log(`      UserId: ${userId || 'undefined'}`);
```

**Why**: This confirms that the correct data is being passed to the native component.

---

## Debugging Steps

### Step 1: Check Console Logs
After the app rebuilds and you navigate to the Playback page, check the Metro/console logs for:

1. **"📊 PLAYBACK STATUS SUMMARY"** - Should show:
   - Number of channels started
   - List of channel IDs
   - Playback start time
   - Active playback handles with their types

2. **"[GRID] RENDER Ch X"** - Should show for each channel:
   - Handle value and type (should be string)
   - RealChannel number
   - UserId (should NOT be 'undefined')

### Step 2: Check Android Logcat
Run this command to filter important logs:
```bash
adb logcat | findstr "NvrVideoView"
```

Look for these key messages:

✅ **SUCCESS indicators**:
- `"📥 setHandle: <handle> (hex=...)"`
- `"✅ Using tag userId: <number>"` (NOT "⚠️ No tag userId")
- `"PLAYBACK INIT <handle>"` (Toast message)
- `"📡 Header Received: Handle=<handle> Type=<type>"`
- `"📦 VIDEO DATA ARRIVED!"` (Toast message)
- `"🔑 FIRST KEYFRAME - Forcing renderer activation!"`
- `"🎬 RENDERER ACTIVATED!"` (Toast message)
- `"✅ VIDEO PIXELS RENDERING! Decode Time: <time>"`

❌ **ERROR indicators**:
- `"⚠️ No tag userId, using TVTManager: <number>"`
- `"❌ Playback FAILED - error code: <code>"`
- `"❌ Decode Frame failed"`
- `"⚠️ SDK Exception:"`

### Step 3: Check for Missing Data Flow
If you see **handle set** but **NO video data**, check:

1. **Is userId correct?**
   - Should see: `"✅ Using tag userId: X"` NOT `"⚠️ No tag userId"`
   
2. **Is PlaybackControl sequence executed?**
   - Look for: `"🎬 Playback commands: START_DECODE=true, RESUME=true, NORMAL=true"`
   
3. **Are KeyFrame requests being sent?**
   - Look for: `"🔑 Requesting KeyFrames for userId=X, handle=Y"`
   - Should send 10 requests over 4 seconds

4. **Is video data arriving?**
   - Look for: `"📦 VIDEO DATA ARRIVED!"` toast
   - If NO toast/log, check backend playback endpoint or NVR connection

---

## Common Issues & Solutions

### Issue 1: Video Not Rendering (Black Screen)
**Symptoms**: Playback starts successfully, but screen stays black

**Check**:
```bash
adb logcat | findstr "onVideoData\|VIDEO DATA\|KEYFRAME"
```

**Solution**:
- If NO video data logs → Backend/NVR issue (check network, credentials, recording availability)
- If video data arriving but no rendering → Check for decode errors

### Issue 2: "⚠️ No tag userId, using TVTManager"
**Symptoms**: userId not properly passed to native layer

**Check**: `Playback.tsx` line 1016 - ensure `userId={userId}` is set
**Verify**: `userId` state is not null (should be set after login at line 418)

**Solution**:
- Check if login succeeded: Look for `"✅ Ch X playback started successfully"` in console
- Verify `setUserId(loginHandle)` was called

### Issue 3: Handle Type Error
**Symptoms**: Handle shows as `undefined` or wrong type

**Check**: Console log `"[GRID] RENDER Ch X"` should show `Type=string`

**Solution**:
- Verify `playbackHandles` state contains objects with `{ handle: string, realChannel: number }`
- Check `startPlayback` response parsing at Playback.tsx line 221-223

### Issue 4: Multiple Init Calls
**Symptoms**: Playback restarts repeatedly

**Check**: Look for multiple `"🔹 STEP 3: SDK_QueryRecord"` logs in quick succession

**Solution**:
- This was addressed with `skipNextInitRef` at line 525
- If still happening, check dependency array of main useEffect (line 636)

---

## Testing Checklist

After the rebuild completes, test these scenarios:

1. ✅ **Single Channel Playback**
   - Select a single channel from the channel selector
   - Should see: Grid type = 1x1, 1 handle in logs
   - Expected: Video plays in full screen

2. ✅ **Multi-Channel Playback (2x2)**
   - Should start with all channels if device has 2-4 channels
   - Expected: 2-4 videos playing in grid

3. ✅ **Date/Time Selection**
   - Change date using calendar
   - Change time using timeline scrubber
   - Expected: Video jumps to new time without errors

4. ✅ **Toast Notifications (ON DEVICE)**
   - Should see toasts appear on the device screen:
     - "PLAYBACK INIT <handle>"
     - "📦 VIDEO DATA ARRIVED!" (if data is flowing)
     - "🎬 RENDERER ACTIVATED!" (when first keyframe decoded)

---

## Next Steps if Still Not Working

If video still doesn't play after these changes:

1. **Share the complete logs**:
   ```bash
   # Metro console logs (look for "📊 PLAYBACK STATUS SUMMARY")
   # AND
   adb logcat -v time | findstr "NvrVideoView" > playback_debug.txt
   ```

2. **Check if it's a backend issue**:
   - Test RTSP URL directly with VLC or ffplay
   - Check if backend has playback routes working

3. **Verify recording exists**:
   - Check `"QueryRecord Result: Found X segments"` in logs
   - If 0 segments → No recordings on that date

4. **Try different time**:
   - Jump to a known recorded time
   - Check calendar for days with footage (yellow dots)

---

## File Reference

**Modified Files**:
1. `/android/app/src/main/java/com/vms/nvrsdk/NvrVideoViewManager.java` (lines 177-187)
2. `/src/screens/Playback.tsx` (lines 610-630, 638-645)
3. `/src/components/MultiPlaybackGrid.tsx` (lines 57-67)

**Key Files to Check**:
- `/src/native/NvrVideoView.tsx` - React Native component wrapper
- `/android/app/src/main/java/com/vms/tvt/TVTManager.java` - May store fallback loginHandle
