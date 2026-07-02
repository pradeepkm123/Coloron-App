# Complete SuperLivePlus Remote Playback Process Explanation

## 📊 Understanding the Playback Interface

Based on the SuperLivePlus playback page showing:
- **Calendar view**: December 2025 and January 2026
- **Current selected date**: 2026-01-01
- **Timeline**: Hours 00 to 12 (24-hour format)
- **Blue bar**: Recording from ~00:00 to 00:10
- **Current playback time**: 00:08:22

---

## 🔄 Complete Playback Process Flow

### Phase 1: Initialization & Discovery

#### 1.1 Device Authentication
**Location**: `NvrSdkModule.java` → `login()` method

```java
// App logs into NVR/DVR using credentials
// Establishes secure connection via P2P/Domain/IP
// SDK function: NET_DVR_Login_V40()

@ReactMethod
public void login(ReadableMap params, Promise promise) {
    // loginType:
    // - 0: TCP (LAN / public IP)
    // - 1: NAT20 (P2P)
    
    int loginType = params.getInt("loginType");
    String host = params.getString("host");
    int port = params.getInt("port");
    String username = params.getString("username");
    String password = params.getString("password");
    
    // Returns userId (login handle) for all subsequent operations
}
```

**Flow**:
```
App → NVR: "Login with credentials"
NVR → App: "Login successful, userId=123"
App: Stores userId for all future API calls
```

#### 1.2 Channel Selection
**Location**: `Playback.tsx` → `useEffect` initialization

```typescript
// User selects which camera channel to view
// Each channel = specific camera feed

const [currentChannel, setCurrentChannel] = useState(0); // Focused Channel
const [visibleChannels, setVisibleChannels] = useState<number[]>([0]);

// For multi-channel NVRs, automatically show all channels in grid
if (count > 1 && count <= 4) newGrid = '2x2';
else if (count > 4 && count <= 9) newGrid = '3x3';
else if (count > 9) newGrid = '4x4';
```

---

### Phase 2: Recording Index Query

#### 2.1 Calendar Data Population (Which dates have recordings?)

**Location**: `NvrSdkModule.java` → `queryRecordingDays()`

**Process**:
```
App → Recorder: "Which dates have recordings for December 2025 & January 2026?"
Recorder → App: "Dates: 28, 29, 30, 31, 1, 2, 3"
App: Highlights these dates in blue on calendar
```

**Implementation**:
```java
@ReactMethod
public void queryRecordingDays(ReadableMap params, Promise promise) {
    int userId = params.getInt("userId");
    int channelId = params.getInt("channelId");
    int year = params.getInt("year");
    int month = params.getInt("month"); // 1-12
    
    // STEP 1: Calculate month range
    Calendar cal = Calendar.getInstance();
    cal.set(year, month - 1, 1, 0, 0, 0);
    int daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH);
    
    // STEP 2: Try multiple time formats (SDK compatibility)
    int[] startRaw = {year, month, 1, 0, 0, 0};
    int[] endRaw = {year, month, daysInMonth, 23, 59, 59};
    
    int[] startOff = {year - 1900, month - 1, 1, 0, 0, 0};
    int[] endOff = {year - 1900, month - 1, daysInMonth, 23, 59, 59};
    
    // STEP 3: Try multiple channel offsets (TVT SDK quirk)
    int[] channelOffsets = {0, 32, 64, 100};
    long findHandle = -1;
    
    for (int offset : channelOffsets) {
        int realChannel = channelId + offset;
        findHandle = sdk.FindFile(userId, realChannel, startRaw, endRaw);
        if (findHandle != -1) break;
    }
    
    // STEP 4: Iterate through ALL results and extract unique days
    HashSet<Integer> uniqueDays = new HashSet<>();
    for (int i = 0; i < 5000; i++) {
        NET_SDK_REC_FILE f = sdk.FindNextFile(findHandle);
        if (f == null) break;
        
        int[] sArr = f.getStartTime();
        Calendar fCal = Calendar.getInstance();
        if (sArr[0] < 1000) { // Offset format (Year-1900)
            fCal.set(sArr[0] + 1900, sArr[1], sArr[2]);
        } else { // Raw format
            fCal.set(sArr[0], sArr[1] - 1, sArr[2]);
        }
        
        uniqueDays.add(fCal.get(Calendar.DAY_OF_MONTH));
    }
    sdk.FindClose(findHandle);
    
    // Return array of days: [28, 29, 30, 31, 1, 2, 3]
    return uniqueDays;
}
```

**UI Rendering** (`Playback.tsx`):
```typescript
useEffect(() => {
    if (userId && selectedDevice) {
        const fetchRecordedDays = async () => {
            const days = await NvrSdk.queryRecordingDays(
                userId, 
                currentChannel, 
                calendarMonth.getFullYear(), 
                calendarMonth.getMonth() + 1
            );
            setRecordedDays(days); // [28, 29, 30, 31, 1, 2, 3]
        };
        fetchRecordedDays();
    }
}, [calendarMonth, userId, currentChannel]);

// Calendar rendering
const hasFootage = recordedDays.includes(d);
<Text style={hasFootage && {color: THEME.recordingYellow, fontWeight: 'bold'}}>
    {d}
</Text>
{hasFootage && <View style={styles.footageDot} />}
```

#### 2.2 Timeline Data Retrieval (What recordings exist for selected date?)

**Location**: `NvrSdkModule.java` → `searchRecordings()`

**Process**:
```
App → Recorder: "What recordings exist for 2026-01-01, Channel 1?"
Recorder → App: "Recordings: 00:00:00 - 00:10:15"
App: Draws blue bar from 00:00 to 00:10 on timeline
```

**Implementation**:
```java
@ReactMethod
public void searchRecordings(ReadableMap params, Promise promise) {
    int userId = params.getInt("userId");
    int channelId = params.getInt("channelId");
    String fromISO = params.getString("fromISO"); // "2026-01-01 00:00:00"
    String toISO = params.getString("toISO");     // "2026-01-01 23:59:59"
    
    // Parse ISO to SDK time format
    int[] startRaw = parseIsoToSdkTime(fromISO);
    int[] endRaw = parseIsoToSdkTime(toISO);
    
    // XM SDK Order: Year, Month, Day, Hour, Minute, Second
    int[] startOff = {startRaw[0] - 1900, startRaw[1] - 1, ...};
    int[] endOff = {endRaw[0] - 1900, endRaw[1] - 1, ...};
    
    // Try multiple channel offsets
    int[] channelOffsets = {0, 32, 64, 100};
    long findHandle = -1;
    
    for (int offset : channelOffsets) {
        int realChannel = channelId + offset;
        findHandle = sdk.FindFile(userId, realChannel, startRaw, endRaw);
        if (findHandle != -1) break;
    }
    
    // Collect all recording segments
    WritableArray results = Arguments.createArray();
    for (int i = 0; i < 500; i++) {
        NET_SDK_REC_FILE f = sdk.FindNextFile(findHandle);
        if (f == null) break;
        
        int[] sArr = f.getStartTime();
        int[] eArr = f.getStopTime();
        
        WritableMap m = Arguments.createMap();
        m.putString("start", String.format("%04d-%02d-%02d %02d:%02d:%02d",
            sArr[0] + 1900, sArr[1] + 1, sArr[2], sArr[3], sArr[4], sArr[5]));
        m.putString("end", String.format("%04d-%02d-%02d %02d:%02d:%02d",
            eArr[0] + 1900, eArr[1] + 1, eArr[2], eArr[3], eArr[4], eArr[5]));
        results.pushMap(m);
    }
    
    sdk.FindClose(findHandle);
    return results; // [{start: "2026-01-01 00:00:00", end: "2026-01-01 00:10:15"}]
}
```

**UI Rendering** (`Playback.tsx`):
```typescript
// Query recordings for selected date
const segments = await NvrSdk.searchRecordings(
    loginHandle, 
    currentChannel, 
    formatTime(startOfDay),  // "2026-01-01 00:00:00"
    formatTime(endOfDay)     // "2026-01-01 23:59:59"
);

setRecordingFiles(segments);

// Render timeline with blue bars
{recordingFiles.map((file, idx) => {
    const start = new Date(file.start);
    const end = new Date(file.end);
    const startX = ((start.getHours() * 60 + start.getMinutes()) / (24 * 60)) * TIMELINE_WIDTH;
    const endX = ((end.getHours() * 60 + end.getMinutes()) / (24 * 60)) * TIMELINE_WIDTH;
    
    return (
        <View 
            key={idx} 
            style={{
                left: startX, 
                width: endX - startX, 
                backgroundColor: THEME.recordingGreen,
                height: 60
            }} 
        />
    );
})}
```

---

### Phase 3: Playback Stream Initiation

#### 3.1 Stream Request

**Location**: `Playback.tsx` → `jumpToTime()` and initialization

**Process**:
```
User clicks play or selects time (00:08:22)
App sends exact timestamp to recorder
SDK function: NET_DVR_PlayBackByTime()
```

**Implementation**:
```typescript
const jumpToTime = async (date: Date) => {
    if (!userId) return;
    
    setIsLoading(true);
    
    // Stop all existing playback first
    await stopAllPlayback();
    
    const startStr = formatTime(date); // "2026-01-01 00:08:22"
    
    // Loop through all visible channels (for multi-channel grid)
    for (const ch of visibleChannels) {
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59);
        
        const handle = await NvrSdk.startPlayback(
            userId, 
            ch, 
            startStr,              // "2026-01-01 00:08:22"
            formatTime(endDate)    // "2026-01-01 23:59:59"
        );
        
        // Store handle for this channel
        playbackHandlesRef.current[ch] = handle;
        setPlaybackHandles(prev => ({...prev, [ch]: handle}));
    }
    
    setCurrentDate(date);
    setIsPlaying(true);
};
```

#### 3.2 HDD Read Process (on Recorder)

**Location**: `NvrSdkModule.java` → `startPlayback()`

**Process**:
```
1. Locate video file for 2026-01-01 00:08:22
2. Open HDD file pointer at correct position
3. Start reading video packets
4. Convert to network stream format
5. Begin streaming to mobile app
```

**Implementation**:
```java
@ReactMethod
public void startPlayback(ReadableMap params, Promise promise) {
    ensureSdk();
    stopAllLiveStreams(); // Critical: Stop live before playback
    
    int userId = params.getInt("userId");
    int channelId = params.getInt("channelId");
    String fromISO = params.getString("fromISO"); // "2026-01-01 00:08:22"
    String toISO = params.getString("toISO");     // "2026-01-01 23:59:59"
    
    int[] start = parseIsoToSdkTime(fromISO);
    int[] end = parseIsoToSdkTime(toISO);
    
    // ✅ STEP 1: Create NET_DVR_TIME struct (Year-1900, Month-1)
    // This is THE CORRECT format that NVR expects
    int[] startStruct = new int[] {
        start[0] - 1900,  // year offset
        start[1] - 1,     // month 0-indexed
        start[2],         // day
        start[3],         // hour
        start[4],         // minute
        start[5]          // second
    };
    int[] endStruct = new int[] {
        end[0] - 1900,
        end[1] - 1,
        end[2],
        end[3],
        end[4],
        end[5]
    };
    
    Log.i("NvrSdk", "🎬 PLAYBACK START REQUEST:");
    Log.i("NvrSdk", "   User=" + userId + " Ch=" + channelId);
    Log.i("NvrSdk", "   Time: " + fromISO + " → " + toISO);
    
    // ✅ STEP 2: Try MULTIPLE stream types and channel offsets
    int[] channelOffsets = {0, 32, 64, 100};
    long handle = -1;
    
    for (int offset : channelOffsets) {
        int realChannel = channelId + offset;
        int[] channels = new int[] {realChannel};
        
        // Method 1: PlayBackByTime with SUBSTREAM (matches SDK example)
        handle = sdk.PlayBackByTime(userId, channels, 1, startStruct, endStruct);
        if (handle > 0 || handle < -100) {
            Log.i("NvrSdk", "✅ PlayBackByTime(SUB) SUCCESS! Ch=" + realChannel);
            break;
        }
        
        // Method 2: PlayBackByTime with MAIN STREAM
        handle = sdk.PlayBackByTime(userId, channels, 0, startStruct, endStruct);
        if (handle > 0 || handle < -100) {
            Log.i("NvrSdk", "✅ PlayBackByTime(MAIN) SUCCESS! Ch=" + realChannel);
            break;
        }
        
        // Method 3: PlayBackByTimeEx (fallback)
        handle = sdk.PlayBackByTimeEx(userId, channels, 0, startStruct, endStruct, true);
        if (handle > 0 || handle < -100) {
            Log.i("NvrSdk", "✅ PlayBackByTimeEx SUCCESS! Ch=" + realChannel);
            break;
        }
    }
    
    // ✅ STEP 3: Send playback control commands
    if (handle > 0 || handle < -100) {
        // CMD_PLAY = 1 (Start playing)
        sdk.PlaybackControl(handle, 1, 0, 0);
        
        // CMD_START_DECODE = 15 (Start decoding video)
        sdk.PlaybackControl(handle, 15, 0, 0);
        
        Log.i("NvrSdk", "✅ Playback started successfully, handle=" + handle);
        promise.resolve(String.valueOf(handle));
    } else {
        Log.e("NvrSdk", "❌ Playback FAILED - error code: " + handle);
        promise.reject("PLAYBACK_ERROR", "Failed to start playback");
    }
}
```

---

### Phase 4: Video Streaming & Decoding

#### 4.1 Network Transmission

**Process**:
```
Recorder sends video packets over network
Uses proprietary protocol (not RTSP for playback)
Includes timing information for synchronization
```

#### 4.2 Mobile Processing

**Location**: `PlaybackSurfaceView.java` (Native Android Component)

**Process**:
```
Receive packets → Buffer → Decode → Render
```

**Implementation**:
```java
public class PlaybackSurfaceView extends SurfaceView implements SurfaceHolder.Callback {
    private String playbackHandle;
    private nvrsdk sdk;
    
    @Override
    public void surfaceCreated(SurfaceHolder holder) {
        // Bind playback handle to this surface for rendering
        if (playbackHandle != null && sdk != null) {
            // SDK automatically decodes and renders to this surface
            sdk.SetPlaybackSurface(Long.parseLong(playbackHandle), holder.getSurface());
            
            Log.d(TAG, "✅ Playback surface bound to handle: " + playbackHandle);
        }
    }
    
    public void setPlaybackHandle(String handle) {
        this.playbackHandle = handle;
        // Video will start rendering automatically
    }
}
```

**React Native Integration** (`MultiPlaybackGrid.tsx`):
```typescript
<PlaybackSurfaceView
    playbackHandle={playbackHandles[channel]}
    style={{flex: 1}}
/>
```

**Decoding Flow**:
```
1. SDK receives H.264/H.265 packets from NVR
2. Hardware decoder (MediaCodec) decodes frames
3. Frames rendered to SurfaceView
4. Timeline updates: 00:08:22 → 00:08:23 → 00:08:24...
```

---

## 🛠 Technical Components Involved

### Recorder Side (NVR/DVR)
- **HDD Management**: File system for video storage
- **Index Database**: Quick lookup of recording times
- **Stream Engine**: Converts HDD files to network streams
- **Command Processor**: Handles play/pause/seek requests

### Mobile App Side
- **SDK Interface**: `NvrSdkModule.java` - Communicates with recorder
- **Video Decoder**: Hardware/software decoding (H.264/H.265)
- **UI Components**:
  - Calendar view with date highlighting (`Playback.tsx`)
  - Timeline with recording indicators
  - Playback controls (play, pause, seek)
  - Multi-channel grid (`MultiPlaybackGrid.tsx`)
- **Buffer Management**: Handles network fluctuations

---

## 🔍 Data Flow Details

### Date Highlighting Logic
```typescript
for (const date of calendar_month) {
    const days = await NvrSdk.queryRecordingDays(userId, channel, year, month);
    if (days.includes(date.getDate())) {
        highlight_date_blue();
    } else {
        leave_date_normal();
    }
}
```

### Timeline Generation
```typescript
const recordings = await NvrSdk.searchRecordings(userId, channel, selected_date);
for (const segment of recordings) {
    const startX = calculateTimelinePosition(segment.start);
    const endX = calculateTimelinePosition(segment.end);
    draw_blue_segment(startX, endX);
}
```

### Playback Session
```typescript
const playbackHandle = await NvrSdk.startPlayback(userId, channel, "2026-01-01 00:08:22", "2026-01-01 23:59:59");

while (playing) {
    // SDK automatically:
    // 1. Receives video packets from NVR
    // 2. Decodes frames
    // 3. Renders to PlaybackSurfaceView
    // 4. Updates current time
    
    if (user_pressed_pause()) {
        await NvrSdk.playbackControl(playbackHandle, CMD_PAUSE);
    }
}
```

---

## ⚠️ Common Issues & Solutions

### Black Screen with Moving Timeline
- **Cause**: Decoder mismatch or wrong stream type
- **Solution**: Try both MAIN (0) and SUB (1) stream types
- **Code**: Already implemented in `startPlayback()` with fallback logic

### No Dates Highlighted
- **Cause**: No recordings or channel offset mismatch
- **Solution**: Try multiple channel offsets (0, 32, 64, 100)
- **Code**: Already implemented in `queryRecordingDays()`

### Playback Stuttering
- **Cause**: Network bandwidth or decoder performance
- **Solution**: Use SUB stream (lower quality) instead of MAIN
- **Code**: `startPlayback()` tries SUB stream first

### Time Mismatch
- **Cause**: Timezone differences or wrong time format
- **Solution**: Use NET_DVR_TIME format (Year-1900, Month-1)
- **Code**: `parseIsoToSdkTime()` handles conversion

---

## 📱 User Interaction Flow

1. **Open Playback Page**
   - See calendar with blue dates = days with recordings
   
2. **Select date (Jan 1, 2026)**
   - See timeline showing recorded periods (blue bars)
   
3. **Drag/click timeline to select time (00:08:22)**
   - Press play → video starts from selected time
   
4. **Use controls: pause, fast forward, rewind, jump**
   - Timeline updates as video plays
   
5. **Multi-channel view**
   - If NVR has 8 channels, show all 8 in 3x3 grid
   - All channels play synchronized

---

## 🔐 Security Considerations

- Authentication required before any playback
- Encrypted streams for privacy
- User permissions: Some users may only see certain channels
- No direct HDD access - all through secure API

---

## 💾 Storage & File System Notes

- Recordings stored in proprietary format on HDD
- Index files separate from video data
- Overwrite protection: Oldest recordings deleted when full
- Multiple resolutions: Substream for mobile, mainstream for local

---

## 🎯 Summary

This entire process allows you to remotely access and play back recorded footage from your NVR/DVR as if you were standing in front of it, with the mobile app providing a user-friendly interface to navigate through days/hours of recordings efficiently.

**Key SDK Functions Used**:
1. `NET_DVR_Login_V40()` - Authentication
2. `FindFile()` / `FindNextFile()` - Query recordings
3. `PlayBackByTime()` - Start playback stream
4. `PlaybackControl()` - Control playback (play/pause/seek)
5. `SetPlaybackSurface()` - Bind video to Android SurfaceView

**Your Implementation Files**:
- `Playback.tsx` - UI and orchestration
- `NvrSdkModule.java` - Native SDK bridge
- `PlaybackSurfaceView.java` - Video rendering
- `MultiPlaybackGrid.tsx` - Multi-channel layout
