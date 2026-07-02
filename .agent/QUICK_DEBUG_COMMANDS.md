# Quick Playback Debug Commands

## For Windows PowerShell

### 1. Find ADB Location
```powershell
# Common locations:
C:\Users\<YourName>\AppData\Local\Android\Sdk\platform-tools\adb.exe
C:\Android\Sdk\platform-tools\adb.exe

# Or search for it:
Get-ChildItem -Path C:\ -Filter adb.exe -Recurse -ErrorAction SilentlyContinue
```

### 2. Check Connected Devices
```powershell
cd "C:\Users\<YourName>\AppData\Local\Android\Sdk\platform-tools"
.\adb.exe devices
```

### 3. Clear Logs and Start Fresh
```powershell
.\adb.exe logcat -c
```

### 4. Watch Playback Logs (Filtered)
```powershell
.\adb.exe logcat *:S ReactNativeJS:V NvrSdk:V PlaybackSurfaceView:V PlaybackSurfaceViewManager:V H264Decode:V
```

### 5. Watch All Logs (Unfiltered)
```powershell
.\adb.exe logcat | Select-String "Playback|NvrSdk|Surface|VIDEO|DECODE"
```

### 6. Save Logs to File
```powershell
.\adb.exe logcat > E:\prd\app\VMS\playback_debug.log
# Press Ctrl+C after reproducing the issue
```

### 7. Search for Errors Only
```powershell
.\adb.exe logcat *:E
```

### 8. Watch React Native Console
```powershell
# Already running in your Metro bundler terminal
# Look for console.log() outputs
```

## What to Look For

### ✅ SUCCESS Pattern:
```
NvrSdk: ✅ PlayBackByTime(SUB) SUCCESS! Ch=0 Handle=12345678
PlaybackSurfaceViewManager: ✅ Parsed handle: 12345678 (valid: true)
PlaybackSurfaceView: ✅ SetPlaybackRenderSurface SUCCESS!
PlaybackSurfaceView: 🎉 BIND SURFACE COMPLETE
```

### ❌ FAILURE Patterns:

**No Recording:**
```
NvrSdk: ❌ ALL PLAYBACK ATTEMPTS FAILED
NvrSdk:    Final handle: -1
```

**Surface Issue:**
```
PlaybackSurfaceView: ❌ Surface is null or invalid!
```

**SDK Issue:**
```
PlaybackSurfaceView: ❌ SetPlaybackRenderSurface FAILED
```

**Handle Not Passed:**
```
PlaybackSurfaceViewManager: ⚠️ Empty/null handle, setting to -1
```

## Quick Test Steps

1. **Open Playback Screen** in the app
2. **Select a date** with recordings (blue highlighted dates)
3. **Watch Metro Console** for:
   ```
   🚀 Starting Grid Playback
   ✅ Ch 0 playback started successfully
   📊 Playback Handles State Updated
   ```
4. **Watch Logcat** for surface binding
5. **Check screen** for video

## Common Quick Fixes

### If No Video Appears:

1. **Try different date/time:**
   - Select a different blue-highlighted date
   - Try earlier in the day (00:00)

2. **Restart app:**
   ```powershell
   .\adb.exe shell am force-stop com.vms
   # Then relaunch from device
   ```

3. **Check NVR is online:**
   - Go to Home screen
   - Check device status shows "Online"

4. **Rebuild app:**
   ```powershell
   cd E:\prd\app\VMS
   npx react-native run-android
   ```

## Report Issue

If still not working, collect:

1. **Metro Console Output** (copy from terminal)
2. **Logcat Output** (save to file using command #6 above)
3. **Screenshot** of the playback screen
4. **NVR Details:**
   - Model
   - Firmware version
   - Number of channels
   - Recording format (H.264/H.265)

Then share these with the development team.
