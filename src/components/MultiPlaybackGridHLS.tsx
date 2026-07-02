import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Text, ActivityIndicator } from 'react-native';
import Video from 'react-native-video';

const { width } = Dimensions.get('window');

type GridType = '1x1' | '2x2' | '3x3' | '4x4';

interface MultiPlaybackGridHLSProps {
    gridType: GridType;
    channels: number[]; // Array of channel IDs to display
    playbackData: { [channelId: number]: { startTime: string, endTime: string, deviceId: string, host: string } };
    selectedChannel: number;
    onSelectChannel: (channelId: number) => void;
    isLoading?: boolean;
    channelNames?: { [key: number]: string };
}

interface HLSSession {
    hlsUrl: string;
    sessionId: string;
}

const MultiPlaybackGridHLS: React.FC<MultiPlaybackGridHLSProps> = ({
    gridType,
    channels,
    playbackData,
    selectedChannel,
    onSelectChannel,
    isLoading,
    channelNames
}) => {

    const [hlsSessions, setHlsSessions] = useState<{ [channelId: number]: HLSSession }>({});
    const [errors, setErrors] = useState<{ [channelId: number]: string }>({});

    // Start HLS conversion for each channel
    useEffect(() => {
        const startHLSConversions = async () => {
            for (const channelId of channels) {
                const data = playbackData[channelId];
                if (!data) continue;

                try {
                    const url = `http://localhost:5000/tvt-nvr/${data.deviceId}/recordings/playback-stream?channelId=${channelId}&startTime=${encodeURIComponent(data.startTime)}&endTime=${encodeURIComponent(data.endTime)}&host=${data.host}`;

                    console.log(`🎬 Starting HLS conversion for Ch ${channelId}:`, url);

                    const response = await fetch(url);
                    const result = await response.json();

                    if (result.success && result.hlsUrl) {
                        console.log(`✅ HLS URL for Ch ${channelId}:`, result.hlsUrl);
                        setHlsSessions(prev => ({
                            ...prev,
                            [channelId]: {
                                hlsUrl: result.hlsUrl,
                                sessionId: result.sessionId
                            }
                        }));
                    } else {
                        throw new Error(result.error || 'Failed to start HLS stream');
                    }
                } catch (error: any) {
                    console.error(`❌ HLS conversion failed for Ch ${channelId}:`, error.message);
                    setErrors(prev => ({ ...prev, [channelId]: error.message }));
                }
            }
        };

        if (channels.length > 0 && Object.keys(playbackData).length > 0) {
            startHLSConversions();
        }

        // Cleanup: Stop HLS sessions on unmount
        return () => {
            Object.entries(hlsSessions).forEach(([channelId, session]) => {
                fetch(`http://localhost:5000/tvt-nvr/any/recordings/playback-stream/${session.sessionId}`, {
                    method: 'DELETE'
                }).catch(() => { });
            });
        };
    }, [channels.join(','), Object.keys(playbackData).join(',')]);

    // Determine rows/cols
    let rows = 1;
    let cols = 1;
    if (gridType === '2x2') { rows = 2; cols = 2; }
    else if (gridType === '3x3') { rows = 3; cols = 3; }
    else if (gridType === '4x4') { rows = 4; cols = 4; }

    const renderCell = (index: number) => {
        const channelId = channels[index];
        if (channelId === undefined) return <View style={styles.cell} />;

        const session = hlsSessions[channelId];
        const error = errors[channelId];
        const isSelected = selectedChannel === channelId;

        return (
            <TouchableOpacity
                style={[
                    styles.cell,
                    isSelected && styles.selectedCell,
                    { width: `${100 / cols}%`, height: `${100 / rows}%` }
                ]}
                activeOpacity={0.9}
                onPress={() => onSelectChannel(channelId)}
            >
                {session ? (
                    <Video
                        source={{ uri: session.hlsUrl }}
                        style={styles.video}
                        resizeMode="contain"
                        paused={false}
                        repeat={false}
                        onError={(e) => {
                            console.error(`Video error Ch ${channelId}:`, e);
                            setErrors(prev => ({ ...prev, [channelId]: e.error.errorString }));
                        }}
                        onLoad={() => console.log(`✅ Video loaded for Ch ${channelId}`)}
                    />
                ) : error ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10 }}>
                        <Text style={{ color: '#ff6b6b', fontSize: 10, textAlign: 'center' }}>{error}</Text>
                    </View>
                ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="white" />
                        <Text style={{ color: 'white', marginTop: 5, fontSize: 10 }}>Converting...</Text>
                    </View>
                )}

                {/* Channel Label Overlay */}
                <View style={styles.overlay}>
                    <Text style={styles.channelLabel}>
                        {channelNames && channelNames[channelId] ? channelNames[channelId] : `CH ${channelId + 1}`}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const totalCells = rows * cols;

    return (
        <View style={styles.container}>
            {Array.from({ length: totalCells }).map((_, i) => (
                <React.Fragment key={i}>
                    {renderCell(i)}
                </React.Fragment>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#000',
    },
    cell: {
        backgroundColor: '#111',
        borderWidth: 0.5,
        borderColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    selectedCell: {
        borderColor: '#A83232',
        borderWidth: 2,
    },
    video: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        position: 'absolute',
        top: 5,
        left: 5,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    channelLabel: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    }
});

export default MultiPlaybackGridHLS;
