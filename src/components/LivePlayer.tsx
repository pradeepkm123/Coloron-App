import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { VLCPlayer } from 'react-native-vlc-media-player';
import NvrVideoView from '../native/NvrVideoView';
import * as NvrSdk from '../native/NvrSdk';
import connectionManager, { ConnectionEvent } from '../services/ConnectionManager';
import { generateRtspUrls } from '../services/OnvifService';

export interface LivePlayerProps {
    userId: number;
    host?: string;
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
    streamUrl?: string;
    protocol?: 'TVT' | 'ONVIF';
    onBitrateUpdate?: (bitrate: number, fps: number) => void;
    onHandleAcquired?: (index: number, handle: string | null) => void;
}

const LivePlayer: React.FC<LivePlayerProps> = React.memo(({
    userId, channelId, streamType, index, onBitrateUpdate, onHandleAcquired, rotation = 0, osdVisible = true, channelName = '',
    muted = false, originalScale = false, host = '', username = '', password = '', streamUrl, protocol = 'TVT', aspectRatio
}) => {
    const isOnvif = protocol === 'ONVIF' || (!!streamUrl && streamUrl.startsWith('rtsp://'));
    const [handle, setHandle] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusText, setStatusText] = useState<string | null>(null);
    const [flicker, setFlicker] = useState(0);

    // Candidate URLs for ONVIF failover
    const candidateUrlsRef = useRef<string[]>([]);
    const [candidateIndex, setCandidateIndex] = useState(0);
    const vlcPlayerRef = useRef<any>(null);

    useEffect(() => {
        if (isOnvif) {
            const urls: string[] = [];
            if (streamUrl && streamUrl.trim()) {
                urls.push(streamUrl.trim());
            }
            if (host) {
                const generated = generateRtspUrls(host, 554, username, password);
                generated.forEach(u => {
                    if (!urls.includes(u)) urls.push(u);
                });
            }
            candidateUrlsRef.current = urls;
            setCandidateIndex(0);
            setLoading(true);
            setStatusText(null);
            console.log(`[LivePlayer] ONVIF Candidate RTSP URLs (${urls.length}):`, urls);
        }
    }, [isOnvif, streamUrl, host, username, password]);

    // Listen to global connection state
    useEffect(() => {
        const handleConnectionState = (evt: ConnectionEvent) => {
            if (evt.state === 'RECONNECTING') {
                setStatusText('Reconnecting video...');
                setLoading(true);
            } else if (evt.state === 'OFFLINE') {
                setStatusText('Network Offline');
                setLoading(true);
            } else if (evt.state === 'CONNECTED') {
                setStatusText(null);
            }
        };

        connectionManager.on('connectionStateChanged', handleConnectionState);
        return () => {
            connectionManager.off('connectionStateChanged', handleConnectionState);
        };
    }, []);

    // TVT Stream initialization (only for non-ONVIF)
    useEffect(() => {
        if (isOnvif) return;

        let activeHandle: string | null = null;
        let isMounted = true;

        const startStream = async () => {
            setLoading(true);

            if (userId < 0) {
                console.log(`[LivePlayer] Invalid userId (${userId}) for CH${channelId + 1}, waiting for login/reconnect...`);
                setStatusText('Connecting...');
                return;
            }

            setStatusText(null);
            let retryCount = 0;

            while (isMounted) {
                try {
                    console.log(`[LivePlayer] Starting stream for CH${channelId + 1} with userId ${userId} (Attempt ${retryCount + 1})...`);
                    const h = await NvrSdk.startLive(userId, channelId, streamType as any);
                    console.log(`[LivePlayer] SDK StartLive result: ${h} (Channel: ${channelId}, StreamType: ${streamType})`);
                    
                    if (isMounted) {
                        if (h && h !== "-1") {
                            console.log(`[LivePlayer] Stream started successfully, handle: ${h}`);
                            setHandle(h);
                            activeHandle = h;
                            setLoading(false);
                            onHandleAcquired?.(index, h);
                            break;
                        }
                    } else {
                        if (h && h !== "-1") NvrSdk.stopLive(h);
                        break;
                    }
                } catch (err: any) {
                    console.warn(`[LivePlayer] Failed to start stream for CH${channelId + 1} (attempt ${retryCount + 1}):`, err?.message || err);
                }

                retryCount++;
                if (retryCount > 5) {
                    setStatusText('Connection Retry...');
                }

                // Wait before retrying if stream failed
                await new Promise<void>(resolve => { setTimeout(resolve, 3000); });
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
    }, [isOnvif, userId, channelId, streamType]);

    useEffect(() => {
        if (handle) {
            const timer = setTimeout(() => setFlicker(0.5), 1000);
            return () => clearTimeout(timer);
        } else {
            setFlicker(0);
        }
    }, [handle]);

    // Handle ONVIF video rendering via VLCPlayer
    if (isOnvif) {
        const currentRtspUrl = candidateUrlsRef.current[candidateIndex] || streamUrl || '';

        const handleVlcError = (err: any) => {
            console.warn(`[LivePlayer] ONVIF stream error on ${currentRtspUrl}:`, err);
            if (candidateIndex + 1 < candidateUrlsRef.current.length) {
                const nextIdx = candidateIndex + 1;
                console.log(`[LivePlayer] Trying next candidate ONVIF URL (${nextIdx + 1}/${candidateUrlsRef.current.length}):`, candidateUrlsRef.current[nextIdx]);
                setCandidateIndex(nextIdx);
                setStatusText(`Trying stream ${nextIdx + 1}...`);
            } else {
                setStatusText('Stream Unreachable');
                setLoading(false);
            }
        };

        return (
            <View style={{ flex: 1, position: 'relative', backgroundColor: '#000' }}>
                {currentRtspUrl ? (
                    <VLCPlayer
                        ref={vlcPlayerRef}
                        style={{ flex: 1, transform: [{ rotate: `${rotation}deg` }] }}
                        videoAspectRatio={(aspectRatio as any) || "16:9"}
                        source={{
                            uri: currentRtspUrl,
                            initOptions: [
                                '--network-caching=300',
                                '--rtsp-tcp',
                                '--drop-late-frames',
                                '--skip-frames',
                            ]
                        }}
                        autoplay={true}
                        paused={false}
                        muted={muted}
                        onPlaying={() => {
                            setLoading(false);
                            setStatusText(null);
                        }}
                        onProgress={() => {
                            setLoading(false);
                        }}
                        onError={handleVlcError}
                    />
                ) : null}

                {loading && (
                    <View style={StyleSheet.absoluteFillObject}>
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color="#A83232" />
                            {statusText && <Text style={styles.statusText}>{statusText}</Text>}
                        </View>
                    </View>
                )}
            </View>
        );
    }

    return (
        <View style={{ flex: 1, marginBottom: flicker, position: 'relative', backgroundColor: '#000' }}>
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
                    setStatusText(null);
                    const { bitrate, fps } = e.nativeEvent;
                    onBitrateUpdate?.(bitrate, fps);
                }}
            />

            {loading && (
                <View style={StyleSheet.absoluteFillObject}>
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#A83232" />
                        {statusText && <Text style={styles.statusText}>{statusText}</Text>}
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
        backgroundColor: 'rgba(0,0,0,0.85)',
    },
    statusText: {
        color: '#FFFFFF',
        marginTop: 10,
        fontSize: 12,
        fontWeight: '600',
    },
});

export default LivePlayer;
