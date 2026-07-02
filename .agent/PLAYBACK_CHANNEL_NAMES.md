# Feature: Playback Channel Names

## Overview
Implemented logic to display actual camera names (e.g., "Front Door", "Office") in the Playback screen instead of generic "CH 1", "CH 2" labels.

## Changes Made

### 1. `src/screens/Playback.tsx`
- **State Added:** `channelNames` to store the mapping of Channel ID -> Name.
- **Initialization:** Extracts channel names from the selected `Device` object's `channels` array.
- **Channel Selection Area:** Updated the bottom horizontal scroll view to display the actual name.
  - Fallback: Defaults to `CH {i+1}` if no name is found.
- **Grid Integration:** Passes the `channelNames` map to the `MultiPlaybackGrid` component.

### 2. `src/components/MultiPlaybackGrid.tsx`
- **Props Updated:** Accepts optional `channelNames` prop.
- **Overlay Update:** The video cell overlay now displays the camera name.
  - Consistent with the selection area.

## How It Works

1. When a device is selected, the app checks if `device.channels` exists.
2. It iterates through the channels and builds a lookup map:
   ```javascript
   {
       0: "Front Door",
       1: "Backyard",
       2: "Kitchen"
   }
   ```
3. This map is used to render text in the UI.

## Testing
- **With Names:** Add a device with named channels. Go to Playback. Verify names appear in the bottom list and on the video grid.
- **Without Names:** Add a device without specific channel names. Verify it shows "CH 1", "CH 2", etc.
- **Missing Channels:** If `device.channels` is empty, it calculates generic names based on `channelCount`.

## Screenshot
(No screenshot available, but verify on device)
