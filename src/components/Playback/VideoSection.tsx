import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GridType } from '../GridSelection';
import MultiPlaybackGrid from '../MultiPlaybackGrid';
import { Device } from '../../utils/deviceStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface VideoSectionProps {
    selectedDevice: Device | null;
    gridType: GridType;
    visibleChannels: number[];
    playbackHandles: {
        [channelId: number]: {
            handle: string | null;
            realChannel: number;
            status?: string;
            error?: string;
        };
    };
    currentChannel: number;
    onSelectChannel: (channelId: number) => void;
    isLoading?: boolean;
    channelNames?: { [key: number]: string };
    userId?: number | null;
    rtspUrls?: { [key: number]: string };
    onFullscreen?: (channelId: number) => void;
    onDoubleTap?: (channelId: number) => void;
    recordingFiles?: any[];
    searchPerformed?: boolean;
    isRecording?: boolean;
    recordDuration?: number;
    quality?: 'HD' | 'SD';
    playbackSpeed?: number;
    isFullscreen?: boolean;
}

const VideoSection: React.FC<VideoSectionProps> = ({
    selectedDevice,
    gridType,
    visibleChannels,
    playbackHandles,
    currentChannel,
    onSelectChannel,
    isLoading,
    channelNames,
    userId,
    rtspUrls,
    onFullscreen,
    onDoubleTap,
    recordingFiles,
    searchPerformed,
    isRecording,
    recordDuration,
    quality,
    playbackSpeed,
    isFullscreen,
}) => {
    // Height adapts to grid type so all cells are visible in portrait mode
    const getVideoHeight = () => {
        if (isFullscreen) return '100%';
        // 1x1: standard 16:9 aspect
        if (gridType === '1x1') return SCREEN_WIDTH * (9 / 16);
        // 2x2: square grid (width × width gives 4 equal cells that are square-ish)
        if (gridType === '2x2') return SCREEN_WIDTH;
        // 3x3: needs more height — use screen width * 1.35 to show 3 rows comfortably
        if (gridType === '3x3') return SCREEN_WIDTH * 1.35;
        // 4x4: use screen width * 1.5 for 4 compact rows
        if (gridType === '4x4') return SCREEN_WIDTH * 1.5;
        // Layout grids: similar proportions
        if (gridType === '1+3') return SCREEN_WIDTH * (9 / 16);
        if (gridType === '1+5') return SCREEN_WIDTH;
        if (gridType === '1+7') return SCREEN_WIDTH;
        if (gridType === '1+8') return SCREEN_WIDTH * 1.1;
        if (gridType === '1+12') return SCREEN_WIDTH * 1.35;
        return SCREEN_WIDTH * (9 / 16);
    };

    return (
        <View style={[styles.container, { height: getVideoHeight() as any }]}>
            <MultiPlaybackGrid
                gridType={gridType}
                channels={visibleChannels}
                playbackHandles={playbackHandles}
                selectedChannel={currentChannel}
                onSelectChannel={onSelectChannel}
                isLoading={isLoading}
                channelNames={channelNames}
                userId={userId}
                rtspUrls={rtspUrls}
                onFullscreen={onFullscreen}
                onDoubleClickChannel={onDoubleTap}
                hideExpandIcon={isFullscreen}
                hideLabels={true}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#000',
        overflow: 'hidden',
    },
});

export default VideoSection;
