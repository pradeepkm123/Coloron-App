# 🔍 PLAYBACK TROUBLESHOOTING GUIDE

## ✅ **Enhanced Logging Now Active**

The app has been updated with comprehensive diagnostic logging. When you navigate to the Playback screen, you'll now see detailed information in the console about what's happening.

---

## 📋 **What to Check in Console Logs**

### **STEP 1: Check if Recordings Exist**

Look for this in console:
```
📊 QueryRecord Result: Found X segments
   First segment: 2025-12-30 09:10:25 - 2025-12-30 10:30:00
```

#### ✅ If you see segments:
Good! Recordings exist. Move to Step 2.

#### ❌ If you see "Found 0 segments":
```
❌ NO RECORDINGS FOUND for Ch 0 on Wed Jan 01 2026
   Try a different date or check NVR recording schedule
```

**This means:**
- NVR has NO recordings for this channel on this date
- Either recording wasn't enabled, or HDD was full, or camera was offline

**What to do:**
1. Try a **different date** (use calendar icon)
2. Try **yesterday's date** (more likely to have recordings)
3. Check **Live View first** - if live works, try playback for TODAY
4. Check NVR web interface to verify recordings actually exist

---

### **STEP 2: Check Time Selection**

Look for:
```
✅ Time 2026-01-01 12:00:00 is INSIDE segment 2026-01-01 11:30:00 - 2026-01-01 13:00:00
   Clamped playback time: 2026-01-01 12:00:00
```

OR:

```
⚠️ Time 2026-01-01 00:00:00 has NO recording in any segment
   Snapping to FIRST available segment: 2026-01-01 09:10:25
```

**This is NORMAL** - the app automatically snaps to valid times.

---

### **STEP 3: Check Playback Attempt**

Look for:
```
🚀 Starting Grid Playback:
   Time: 2026-01-01 09:10:25
   Channels: 0, 1, 2, 3
   Login Handle: 1
```

Then for EACH channel:
```
   📺 Starting Ch 0: 2026-01-01 09:10:25 → 2026-01-01 10:30:00
   ➡️ Ch 0 handle: 123456789 (string)
   ✅ Ch 0 playback started successfully
```

#### ✅ Success Indicators:
- Handle is a **positive number** or **large negative** (e.g., -9876543210)
- You see "✅ playback started successfully"

#### ❌ Failure Indicators:
```
   ➡️ Ch 0 handle: -1 (string)
   ❌ Ch 0 playback FAILED - error code: -1
      Common causes: wrong channel, no recording, or offline
```

---

## 🎯 **Common Problems & Solutions**

### **Problem 1: "NO RECORDINGS FOUND"**

**Symptoms:**
```
📊 QueryRecord Result: Found 0 segments
❌ NO RECORDINGS FOUND
```

**Solutions:**
1. **Change the date** to one you KNOW has recordings
2. Check **NVR's recording schedule** in web interface
3. Verify **HDD is installed** and has space
4. Try **Live View first** - if camera is online, enable recording
5. Try a **different channel** (some channels may not be configured for recording)

---

### **Problem 2: "Playback FAILED - error code: -1"**

**Symptoms:**
```
📺 Starting Ch 0: 2026-01-01 09:10:25 → ...
➡️ Ch 0 handle: -1 
❌ Ch 0 playback FAILED
```

**Possible Causes:**

#### Cause A: Wrong Channel Number
- NVR might expect channel 1 instead of 0
- Try switching to a different channel in the UI

#### Cause B: Recording Corrupted
- File exists in index but is damaged
- Try a different time segment

#### Cause C: Channel Offline at that Time
- Camera was disconnected when recording happened
- Try a different date when camera was definitely online

#### Cause D: Playback Service Not Running on NVR
- NVR might not support simultaneous live + playback
- Stop Live View before trying Playback

**What to try:**
```
1. Close Live View completely
2. Navigate to Playback
3. Select a DIFFERENT  channel (try Ch 1 or 2)
4. Select YESTERDAY's date
5. Look for green/gold bars on timeline (those are valid recordings)
6. Tap on a green bar to jump to that time
```

---

### **Problem 3: Handle Success but Black Screen**

**Symptoms:**
```
✅ Ch 0 playback started successfully
```
But video is still black.

**Check Native Logs:**
In Android Studio Logcat or `adb logcat`, look for:

```
🎬 PLAYBACK START REQUEST
✅ PlayBackByTimeEx SUCCESS! Handle=12345
🎮 Sending PlaybackControl commands...
   PlayBackControl(PLAY=1): true
   PlayBackControl(START_DECODE=15): true
Binding/Rendering to Surface...
```

If you DON'T see "Binding/Rendering to Surface", the surface is not being created properly.

**Solution:**
1. Try switching Grid mode (1x1 → 2x2 → back to 1x1)
2. Navigate away and back to Playback
3. Force close app and reopen

---

## 🧪 **Diagnostic Workflow**

Follow this exact order:

### **Test 1: Verify NVR Has Recordings**
1. Login to NVR web interface
2. Go to Playback section
3. Verify you can see recordings for Channel 0
4. Note the EXACT time range (e.g., "09:10:25 to 10:30:00")

### **Test 2: Verify Live Stream Works**
1. Go to Live View in app
2. Verify Channel 0 shows live video
3. This confirms:
   - Login works ✅
   - Network works ✅
   - Channel is online ✅

### **Test 3: Try Playback with Known-Good Time**
1. Go to Playback screen
2. Use calendar to select the date you verified in Test 1
3. Look at timeline - you should see **green/gold bars**
4. If NO bars appear → recordings query is failing (check channel number)
5. If bars appear → **tap on a bar** to jump to that exact time
6. Check console for "✅ playback started successfully"

---

## 📱 **UI Indicators to Look For**

### Timeline Display:
- **Green bars** = Normal recordings
- **Gold bars** = Motion/alarm recordings
- **No bars** = No recordings found (wrong date or channel)

### Loading States:
- **Spinner** = App is loading
- **Black with "Playback" chip** = Stream is connecting
- **Video showing** = SUCCESS! ✅

### Error States:  
- **"Select Device"** = No device selected
- **"No recordings found"** = Wrong date/channel
- **Black screen with no chip** = Playback failed to start

---

## 🎬 **Expected Console Output (Success)**

Here's what you should see when everything works:

```
🔹 STEP 3: SDK_QueryRecord for Focused Ch 0...
   Searching: 2025-12-30 00:00:00 to 2025-12-30 23:59:59

📊 QueryRecord Result: Found 3 segments
   First segment: 2025-12-30 09:10:25 - 2025-12-30 10:30:00
   Last segment: 2025-12-30 18:45:10 - 2025-12-30 20:15:30

🎯 Target time: 2025-12-30 12:00:00 (1735545600000ms)

⚠️ Time 2025-12-30 12:00:00 has NO recording in any segment
   Snapping to FIRST available segment: 2025-12-30 09:10:25
   This is NORMAL - NVR only records on motion/schedule

🚀 Starting Grid Playback:
   Time: 2025-12-30 09:10:25
   Channels: 0
   Login Handle: 1

   📺 Starting Ch 0: 2025-12-30 09:10:25 → 2025-12-30 10:30:00
   ➡️ Ch 0 handle: 123456789 (string)
   ✅ Ch 0 playback started successfully

🎉 VIDEO SHOULD APPEAR NOW
```

---

## 🚨 **If Still Not Working**

Please share these logs:

1. **Console output** when navigating to Playback
2. **Which step fails** (no segments? handle = -1? black screen?)
3. **NVR model and firmware version**
4. **Number of channels** on your NVR
5. **Date/time** you're trying to play back

With this info, I can provide a more specific fix!

---

**Remember:** Playback ONLY works if:
- ✅ NVR has recordings for that channel
- ✅ Time is within a valid segment
- ✅ Channel number is correct
- ✅ Playback service is running on NVR
- ✅ Network connection is stable
