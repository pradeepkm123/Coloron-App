const fs = require('fs');
let src = fs.readFileSync('src/screens/Playback.tsx', 'utf8');

src = src.replace(/let channelsToPlay: number\[\] = \[\];[\s\S]*?\/\/ Update tracker/g, (match) => {
    return `let channelsToPlay: number[] = [];

                if (isNewDevice) {
                    // --- GRID INIT Logic (Only for new device) ---
                    const count = target.channelCount || 1;
                    let newGrid: '1x1' | '2x2' | '3x3' | '4x4' = '1x1';
                    let newVisibleChannels: number[] = [];

                    // If we have an initial channel, focus on it
                    if (initialChannelId !== undefined) {
                        newGrid = '1x1';
                        newVisibleChannels = [Number(initialChannelId)];
                        channelsToPlay = [Number(initialChannelId)];
                    } else {
                        if (count >= 1 && count <= 4) newGrid = count > 1 ? '2x2' : '1x1';
                        else if (count <= 9) newGrid = '3x3';
                        else newGrid = '4x4';
                        // Always include all channels for the grid structure
                        newVisibleChannels = Array.from({ length: Math.max(count, 1) }, (_, i) => i);
                        channelsToPlay = [currentChannel !== undefined ? currentChannel : 0];
                    }

                    // NEW: Populate channel names from device storage
                    const cNames: { [key: number]: string } = {};
                    if (target.channels && Array.isArray(target.channels)) {
                        target.channels.forEach(ch => {
                            cNames[ch.id] = ch.name || \`CH \${ch.id + 1}\`;
                        });
                    }

                    if (isMounted.current) {
                        setGridType(newGrid);
                        setVisibleChannels(newVisibleChannels);
                        setChannelNames(cNames);
                        if (initialChannelId !== undefined) setCurrentChannel(Number(initialChannelId));
                        setIsLoading(true);
                    }
                } else {
                    // StartTime Changed? (Notification Click on SAME device)
                    if (initialChannelId !== undefined && startTime && String(startTime) !== String(lastStartTimeRef.current)) {
                        const targetCh = Number(initialChannelId);
                        console.log(\`[Playback] Notification Switch to Ch \${targetCh}\`);
                        channelsToPlay = [targetCh];
                        if (isMounted.current) {
                            setGridType('1x1');
                            setVisibleChannels(channelsToPlay);
                            setCurrentChannel(targetCh);
                        }
                    } else {
                        // Keep current view state, but ONLY play the currently selected single channel
                        channelsToPlay = [currentChannel !== undefined ? currentChannel : 0];
                    }
                }

                // Update tracker`;
});

fs.writeFileSync('src/screens/Playback.tsx', src);
console.log('Fixed channelsToPlay');
