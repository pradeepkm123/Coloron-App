import React from 'react';
import { requireNativeComponent, StyleProp, ViewStyle } from 'react-native';

interface NvrVideoViewProps {
    style?: StyleProp<ViewStyle>;
    userId: number;
    channelId: number;
    streamType: number;
    handle?: string | null;
    onHandleAcquired?: (event: { nativeEvent: { handle: string, index: number } }) => void;
    onBitrateUpdate?: (event: { nativeEvent: { bitrate: number, fps: number } }) => void;
    [key: string]: any;
}

const NativeNvrVideoView = requireNativeComponent<NvrVideoViewProps>('NvrVideoView');

const NvrVideoView: React.FC<NvrVideoViewProps> = (props) => {
    return (
        <NativeNvrVideoView
            {...props}
        />
    );
};

export default NvrVideoView;
