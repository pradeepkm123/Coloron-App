import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import NvrVideoView from '../native/NvrVideoView';
import * as NvrSdk from '../native/NvrSdk';

export interface LivePlayerProps {
    userId: number;
    host: string;
    username?: string;
    password?: string;
    channelId: number;
    streamType: number;
    deviceType?: string;
    index: number;
    aspectRatio?: string;
    muted?: boolean;
    osdVisible?: boolean;
    originalScale?: boolean;
    channelName?: string;
    rotation?: number;
    onBitrateUpdate?: (bitrate: number, fps: number) => void;
    onHandleAcquired?: (index: number, handle: string | null) => void;
}

const LivePlayer: React.FC<LivePlayerProps> = React.memo(({
    userId, channelId, streamType, index, onBitrateUpdate, onHandleAcquired, rotation = 0, osdVisible = true, channelName = '',
    muted = false, originalScale = false
}) => {

    const [handle, setHandle] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [flicker, setFlicker] = React.useState(0);

    React.useEffect(() => {
        let activeHandle: string | null = null;
        let isMounted = true;

        const startStream = async () => {
            setLoading(true);
            let retryCount = 0;
            while (isMounted) {
                try {
                    console.log(`[LivePlayer] Starting stream for CH${channelId + 1} (Attempt ${retryCount + 1})...`);
                    const h = await NvrSdk.startLive(userId, channelId, streamType as any);
                    console.log(`[AI-PUSH] SDK StartLive result: ${h} (Channel: ${channelId}, StreamType: ${streamType})`);
                    if (isMounted) {
                        if (h && h !== "-1") {
                            console.log(`[LivePlayer] Stream started, handle: ${h}`);
                            setHandle(h);
                            activeHandle = h;
                            onHandleAcquired?.(index, h);
                            break;
                        }
                    } else {
                        // If component unmounted while starting, stop it immediately
                        if (h && h !== "-1") NvrSdk.stopLive(h);
                        break;
                    }
                } catch (err) {
                    console.log(`[AI-PUSH] SDK StartLive result: FAILED (Channel: ${channelId}, StreamType: ${streamType}, Error: ${err})`);
                    console.warn(`[LivePlayer] Failed to start stream for CH${channelId + 1} (attempt ${retryCount + 1}):`, err);
                }
                
                retryCount++;
                // Wait 4 seconds before retrying
                await new Promise(resolve => setTimeout(resolve, 4000));
            }
        };

        startStream();

        return () => {
            isMounted = false;
            if (activeHandle && activeHandle !== "-1") {
                console.log(`[LivePlayer] Stopping stream for handle: ${activeHandle}`);
                NvrSdk.stopLive(activeHandle);
            }
        };
    }, [userId, channelId, streamType]);

    React.useEffect(() => {
        if (handle) {
            const timer = setTimeout(() => setFlicker(0.5), 1000);
            return () => clearTimeout(timer);
        } else {
            setFlicker(0);
        }
    }, [handle]);

    return (
        <View style={{ flex: 1, marginBottom: flicker, position: 'relative' }}>
            <NvrVideoView
                style={{ flex: 1, transform: [{ rotate: `${rotation}deg` }] }}
                userId={userId}
                channelId={channelId}
                streamType={streamType}
                handle={handle}
                muted={muted}
                originalScale={originalScale}
                onBitrateUpdate={(e: any) => {
                    setLoading(false);
                    const { bitrate, fps } = e.nativeEvent;
                    onBitrateUpdate?.(bitrate, fps);
                }}
            />
            {/* {osdVisible && (
                <View style={{ position: 'absolute', top: 5, left: 5, backgroundColor: 'rgba(0,0,0,0.4)', padding: 4, borderRadius: 4 }}>
                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>{channelName || `CH ${channelId + 1}`}</Text>
                </View>
            )} */}
            {loading && (
                <View style={StyleSheet.absoluteFillObject}>
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#A83232" />
                    </View>
                </View>
            )}
        </View>
    );

});

const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
    },
});

export default LivePlayer;
