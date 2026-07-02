import React from 'react';
import { requireNativeComponent, StyleProp, ViewStyle } from 'react-native';

interface VideoPlayerProps {
    liveHandle: string | null;
    style?: StyleProp<ViewStyle>;
}

const NativeVideoPlayer = requireNativeComponent<VideoPlayerProps>('VideoPlayerView');

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ liveHandle, style }) => {
    return (
        <NativeVideoPlayer
            liveHandle={liveHandle || ''}
            style={style}
        />
    );
};
