const fs = require('fs');
let src = fs.readFileSync('src/screens/Playback.tsx', 'utf8');

// 1. Fix isValid in applyGridType (around line 377)
src = src.replace(/const isValid = handle && handle !== '0' && handle !== '-1' && !String\(handle\)\.startsWith\('-10'\);/g, 
    "const isValid = handle && String(handle) !== '0' && String(handle) !== '-1' && String(handle) !== 'null' && String(handle) !== 'undefined';");

// 2. Limit applyGridType to only start ONE stream (the currentChannel) to avoid SDK overload
src = src.replace(/const startPromises = allChannels\.map\(async \(ch\) => \{/g, `const startPromises = allChannels.map(async (ch) => {
            // 🔥 LIMITATION: Only start the actively selected channel during Playback to avoid SDK ErrorCode 0 / Overload
            if (ch !== currentChannel && type !== '1x1') {
                if (isMounted.current) {
                    setPlaybackHandles(prev => ({ ...prev, [ch]: { handle: null, realChannel: ch, status: 'NO_DATA' } }));
                }
                return;
            }
`);

fs.writeFileSync('src/screens/Playback.tsx', src);
console.log('Fixed applyGridType and isValid');
