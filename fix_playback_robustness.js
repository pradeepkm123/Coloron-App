const fs = require('fs');
let src = fs.readFileSync('src/screens/Playback.tsx', 'utf8');

// 1. Force 1x1 grid and single channel for Playback to match SuperLivePlus and avoid device overload
src = src.replace(/if \(isNewDevice\) \{[\s\S]*?if \(isMounted\.current\) \{[\s\S]*?setGridType\(newGrid\);[\s\S]*?setVisibleChannels\(newVisibleChannels\);/g, (match) => {
    return match.replace(/newGrid = '.*';/g, "newGrid = '1x1';")
                .replace(/newVisibleChannels = Array\.from\(.*?\);/, "newVisibleChannels = [currentChannel !== undefined ? currentChannel : 0];");
});

// 2. Clear all handles before starting new ones in startVideoStreams to be absolutely safe
src = src.replace(/const startVideoStreams = async \(startTimeStr: string\) => \{/, `const startVideoStreams = async (startTimeStr: string) => {
                    // Force cleanup of EVERYTHING old before starting new to avoid SDK limits
                    const currentHandles = Object.keys(playbackHandlesRef.current);
                    if (currentHandles.length > 0) {
                        console.log(\`[Playback] Pre-Starting Cleanup: Stopping \${currentHandles.length} streams\`);
                        await Promise.all(currentHandles.map(async (chKey) => {
                            const hObj = playbackHandlesRef.current[Number(chKey)];
                            if (hObj && hObj.handle) {
                                await NvrSdk.stopPlayback(hObj.handle).catch(() => {});
                                delete playbackHandlesRef.current[Number(chKey)];
                            }
                        }));
                        if (isMounted.current) setPlaybackHandles({});
                    }
`);

// 3. Use 24h window for playback to ensure it hits data
src = src.replace(/endDate\.setMinutes\(endDate\.getMinutes\(\) \+ 30\);/g, "endDate.setHours(23, 59, 59, 999);");

// 4. More permissive handle validation (as long as it's not empty, '0' or '-1')
src = src.replace(/const isValid = handle && handle !== '0' && handle !== '-1' && !handle\.startsWith\('-10'\);/g, 
    "const isValid = handle && String(handle) !== '0' && String(handle) !== '-1' && String(handle) !== 'null' && String(handle) !== 'undefined';");

fs.writeFileSync('src/screens/Playback.tsx', src);
console.log('Applied Playback robustness fixes');
