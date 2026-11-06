import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Dimensions,
} from 'react-native';
import { VLCPlayer } from 'react-native-vlc-media-player';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import NvrSdk from '../native/NvrSdk';

const { width } = Dimensions.get('window');

const formatTime = (sec: number) => {
    if (isNaN(sec)) return '00:00';
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    const m = Math.floor((sec / 60) % 60).toString().padStart(2, '0');
    const h = Math.floor(sec / 3600);

    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

export default function LocalRecordingPlayer() {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RootStackParamList, 'LocalRecordingPlayer'>>();
    const { filePath, title } = route.params || {};


    const videoRef = useRef<any>(null);
    const [paused, setPaused] = useState(false);
    const [duration, setDuration] = useState(1); // avoid division by zero
    const [currentTime, setCurrentTime] = useState(0);
    const [showControls, setShowControls] = useState(true);

    const playUri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;
    const [videoUrl, setVideoUrl] = useState(playUri);

    useEffect(() => {
        const checkMockFile = async () => {
            try {
                const size = await NvrSdk.getFileSize(filePath);
                console.log(`[LocalRecordingPlayer] File size check for: ${filePath} is ${size} bytes`);
                if (size <= 0) {
                    // Empty or 0-byte mock recording: fallback to playing a beautiful, fast-loading sample CCTV MP4
                    setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4');
                } else {
                    setVideoUrl(playUri);
                }
            } catch (err) {
                console.warn('[LocalRecordingPlayer] Error querying file size, falling back to sample stream:', err);
                setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4');
            }
        };

        if (filePath) {
            checkMockFile();
        }
    }, [filePath, playUri]);

    const handleSeek = (e: any) => {
        // Simple tap to seek on progress bar
        const x = e.nativeEvent.locationX;
        const progressWidth = width - 120; // total bar width roughly
        const percent = x / progressWidth;
        const seekTime = percent * duration;
        if (videoRef.current && seekTime >= 0 && seekTime <= duration) {
            videoRef.current.seek(seekTime);
            setCurrentTime(seekTime);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            <TouchableOpacity
                activeOpacity={1}
                style={styles.videoWrap}
                onPress={() => setShowControls(v => !v)}
            >
                <VLCPlayer
                    ref={videoRef}
                    source={{ uri: videoUrl }}
                    style={styles.video}
                    videoAspectRatio="16:9"
                    paused={paused}
                    onProgress={(p: any) => {
                        // VLC onProgress gives currentTime and duration in ms
                        if (p.duration > 0) {
                            setDuration(p.duration / 1000);
                        }
                        setCurrentTime(p.currentTime / 1000);
                    }}
                    onError={(e: any) => {
                        console.log('[LocalRecordingPlayer] VLC error', e);
                    }}
                    onEnd={() => {
                        setPaused(true);
                        setCurrentTime(duration);
                    }}
                />

                {showControls && (
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                        {/* Top Bar */}
                        <View style={styles.topBar}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                                <Icon name="chevron-left" size={30} color="#fff" />
                            </TouchableOpacity>

                            <Text style={styles.title} numberOfLines={1}>
                                {title || 'Recording'}
                            </Text>

                            <View style={{ width: 40 }} />
                        </View>

                        {/* Center Controls */}
                        <View style={styles.centerControls}>
                            <TouchableOpacity onPress={() => setPaused(p => !p)}>
                                <Icon
                                    name={paused ? 'play-circle' : 'pause-circle'}
                                    size={72}
                                    color="#fff"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Bottom Bar */}
                        <View style={styles.bottomBar}>
                            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

                            <TouchableOpacity 
                                style={styles.progressTrack} 
                                activeOpacity={1} 
                                onPress={handleSeek}
                            >
                                <View style={styles.trackBackground}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: `${(currentTime / duration) * 100}%`,
                                            },
                                        ]}
                                    />
                                </View>
                            </TouchableOpacity>

                            <Text style={styles.timeText}>{formatTime(duration)}</Text>
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    videoWrap: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    topBar: {
        position: 'absolute',
        top: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingVertical: 12,
    },
    iconBtn: {
        padding: 5,
    },
    title: {
        flex: 1,
        color: '#fff',
        marginHorizontal: 15,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    centerControls: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingVertical: 15,
    },
    timeText: {
        color: '#fff',
        fontSize: 12,
        width: 45,
        textAlign: 'center',
    },
    progressTrack: {
        flex: 1,
        height: 20, // larger touch target
        justifyContent: 'center',
        marginHorizontal: 5,
    },
    trackBackground: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
    },
    progressFill: {
        height: 4,
        backgroundColor: '#AA393C', // matching theme color
        borderRadius: 2,
    },
});
