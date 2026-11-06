import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Text, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NvrVideoView from '../native/NvrVideoView';
import { GridType } from './GridSelection';

const { width } = Dimensions.get('window');



interface MultiPlaybackGridProps {
    gridType: GridType;
    channels: number[]; // Array of channel IDs to display
    playbackHandles: { [channelId: number]: { handle: string | null, realChannel: number, status?: string } };
    selectedChannel: number;
    onSelectChannel: (channelId: number) => void;
    isLoading?: boolean;
    channelNames?: { [key: number]: string }; // Optional map of channel ID to Name
    userId?: number | null;
    rtspUrls?: { [key: number]: string };
    onSnapshot?: (channelId: number) => void;
    onRecord?: (channelId: number) => void;
    onClip?: (channelId: number) => void;
    onFullscreen?: (channelId: number) => void;
    onDoubleClickChannel?: (channelId: number) => void;
    hideExpandIcon?: boolean;
    hideLabels?: boolean;
}

const PlaybackVideoCell = React.memo(({ handle, userId, channelId }: { handle: string, userId?: number, channelId: number }) => {
    const [flicker, setFlicker] = React.useState(0);

    React.useEffect(() => {
        if (handle) {
            // Short flicker at 800ms to force layout re-measure on Android SurfaceView
            const timer1 = setTimeout(() => setFlicker(0.5), 800);
            // Reset back to 0 so layout stabilizes
            const timer2 = setTimeout(() => setFlicker(0), 1200);
            return () => { clearTimeout(timer1); clearTimeout(timer2); };
        } else {
            setFlicker(0);
        }
    }, [handle]);

    return (
        <View style={[styles.videoWrapper, { marginBottom: flicker }]}>
            {/* Do NOT use key={handle} here — it destroys the native SurfaceView on every handle update! */}
            <NvrVideoView
                style={styles.surface}
                handle={handle}
                userId={userId ?? -1}
                channelId={channelId}
                streamType={0}
            />
        </View>
    );
});

const MultiPlaybackGrid: React.FC<MultiPlaybackGridProps> = ({
    gridType,
    channels,
    playbackHandles,
    selectedChannel,
    onSelectChannel,
    isLoading,
    channelNames,
    userId,
    rtspUrls,
    onSnapshot,
    onRecord,
    onClip,
    onFullscreen,
    onDoubleClickChannel,
    hideExpandIcon,
    hideLabels
}) => {
    const lastTapMap = React.useRef<{ [key: number]: number }>({});
    const lastHandleMapRef = React.useRef<{ [key: number]: string }>({});
    const [showControls, setShowControls] = React.useState<number | null>(null);
    const controlsTimerRef = React.useRef<any>(null);

    const toggleControls = (ch: number) => {
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        if (showControls === ch) {
            setShowControls(null);
        } else {
            setShowControls(ch);
            controlsTimerRef.current = setTimeout(() => {
                setShowControls(null);
            }, 3000);
        }
    };

    const renderCell = (index: number, width: string | number, height: string | number) => {
        const channelId = channels[index];
        const isSelected = selectedChannel === channelId;

        if (channelId === undefined) {
            return (
                <View key={`empty-${index}`} style={[styles.cell, { width: width as any, height: height as any }]}>
                    <View style={styles.emptyContainer}>
                        <Icon name="video-off-outline" size={20} color="#333" />
                    </View>
                </View>
            );
        }

        const handleData = playbackHandles[channelId];

        return (
            <TouchableOpacity
                key={`cell-${channelId}-${index}`}
                style={[
                    styles.cell,
                    isSelected && styles.selectedCell,
                    { width: width as any, height: height as any }
                ]}
                activeOpacity={0.9}
                onPress={() => {
                    const now = Date.now();
                    const lastTap = lastTapMap.current[channelId] || 0;
                    toggleControls(channelId);
                    if (now - lastTap < 300) {
                        onDoubleClickChannel?.(channelId);
                    } else {
                        onSelectChannel(channelId);
                    }
                    lastTapMap.current[channelId] = now;
                }}
            >
                {(() => {
                    const currentHandle = handleData && handleData.handle ? handleData.handle : null;

                    // Update persistent Ref for this cell node
                    if (currentHandle) {
                        if (!lastHandleMapRef.current) lastHandleMapRef.current = {};
                        lastHandleMapRef.current[channelId] = currentHandle;
                    }

                    if (handleData && (handleData.status === 'NO_DATA' || handleData.status === 'ERROR')) {
                        if (lastHandleMapRef.current) {
                            delete lastHandleMapRef.current[channelId];
                        }
                    }

                    const activeHandle = currentHandle || (lastHandleMapRef.current && lastHandleMapRef.current[channelId]);

                    if (activeHandle) {
                        return <PlaybackVideoCell handle={activeHandle} userId={userId || undefined} channelId={channelId} />;
                    }

                    return (
                        <View style={styles.infoContainer}>
                            {handleData && handleData.status === 'NO_DATA' ? (
                                <View style={styles.statusBox}>
                                    <View style={styles.offlineCircle}>
                                        <Icon name="video-off-outline" size={20} color="#FF9800" />
                                    </View>
                                    <Text style={[styles.infoText, { color: '#FF9800' }]}>No Data</Text>
                                    <Text style={styles.subInfoText}>CH {channelId + 1}</Text>
                                </View>
                            ) : handleData && handleData.status === 'ERROR' ? (
                                <View style={styles.statusBox}>
                                    <View style={[styles.offlineCircle, { backgroundColor: 'rgba(168,50,50,0.15)', borderColor: 'rgba(168,50,50,0.4)' }]}>
                                        <Icon name="camera-off" size={20} color="#A83232" />
                                    </View>
                                    <Text style={[styles.infoText, { color: '#A83232' }]}>Offline</Text>
                                    <Text style={styles.subInfoText}>CH {channelId + 1}</Text>
                                </View>
                            ) : (
                                <View style={styles.loadingBox}>
                                    <ActivityIndicator size="small" color="#A83232" />
                                </View>
                            )}
                        </View>
                    );
                })()}

                {/* Channel Label Overlay - Premium Look */}
                {!hideLabels && (
                    <View style={styles.overlay}>
                        <View style={styles.labelBadge}>
                            <Text style={styles.channelLabel} numberOfLines={1}>
                                {channelNames && channelNames[channelId] ? channelNames[channelId] : `CH ${channelId + 1}`}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Per-Channel Side Icons */}
                {handleData && handleData.handle && !hideExpandIcon && showControls === channelId && (
                    <View style={styles.cellSideControls}>
                        <TouchableOpacity
                            style={styles.cellMiniBtn}
                            onPress={(e) => {
                                e.stopPropagation();
                                onFullscreen?.(channelId);
                            }}
                        >
                            <Icon name="arrow-expand" size={18} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                )}

                {isSelected && (
                    <View style={styles.selectionIndicator}>
                        <Icon name="check-circle" size={12} color="#A83232" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderGridContent = () => {
        switch (gridType) {
            case '1x1':
                return renderCell(0, '100%', '100%');
            case '2x2':
                return (
                    <View style={{ width: '100%', height: '100%', flexWrap: 'wrap', flexDirection: 'row' }}>
                        {renderCell(0, '50%', '50%')}
                        {renderCell(1, '50%', '50%')}
                        {renderCell(2, '50%', '50%')}
                        {renderCell(3, '50%', '50%')}
                    </View>
                );
            case '3x3':
                return (
                    <View style={{ width: '100%', height: '100%', flexWrap: 'wrap', flexDirection: 'row' }}>
                        {Array.from({ length: 9 }).map((_, i) => renderCell(i, '33.33%', '33.33%'))}
                    </View>
                );
            case '4x4':
                return (
                    <View style={{ width: '100%', height: '100%', flexWrap: 'wrap', flexDirection: 'row' }}>
                        {Array.from({ length: 16 }).map((_, i) => renderCell(i, '25%', '25%'))}
                    </View>
                );
            case '5x5':
                return (
                    <View style={{ width: '100%', height: '100%', flexWrap: 'wrap', flexDirection: 'row' }}>
                        {Array.from({ length: 25 }).map((_, i) => renderCell(i, '20%', '20%'))}
                    </View>
                );
            case '6x6':
                return (
                    <View style={{ width: '100%', height: '100%', flexDirection: 'row', flexWrap: 'wrap' }}>
                        {Array.from({ length: 36 }).map((_, i) => (
                            <View key={i} style={{ width: '16.66%', height: '16.66%' }}>
                                {renderCell(i, '100%', '100%')}
                            </View>
                        ))}
                    </View>
                );
            case '1+3':
                return (
                    <View style={{ width: '100%', height: '100%', flexDirection: 'row' }}>
                        <View style={{ flex: 3 }}>
                            {renderCell(0, '100%', '100%')}
                        </View>
                        <View style={{ flex: 1 }}>
                            {renderCell(1, '100%', '33.33%')}
                            {renderCell(2, '100%', '33.33%')}
                            {renderCell(3, '100%', '33.33%')}
                        </View>
                    </View>
                );
            case '1+5':
                return (
                    <View style={{ width: '100%', height: '100%' }}>
                        <View style={{ flex: 2, flexDirection: 'row' }}>
                            <View style={{ flex: 2 }}>
                                {renderCell(0, '100%', '100%')}
                            </View>
                            <View style={{ flex: 1 }}>
                                {renderCell(1, '100%', '50%')}
                                {renderCell(2, '100%', '50%')}
                            </View>
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row' }}>
                            {renderCell(3, '33.33%', '100%')}
                            {renderCell(4, '33.33%', '100%')}
                            {renderCell(5, '33.33%', '100%')}
                        </View>
                    </View>
                );
            case '1+7':
                return (
                    <View style={{ width: '100%', height: '100%' }}>
                        <View style={{ flex: 3, flexDirection: 'row' }}>
                            <View style={{ flex: 3 }}>
                                {renderCell(0, '100%', '100%')}
                            </View>
                            <View style={{ flex: 1 }}>
                                {renderCell(1, '100%', '33.33%')}
                                {renderCell(2, '100%', '33.33%')}
                                {renderCell(3, '100%', '33.33%')}
                            </View>
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row' }}>
                            {renderCell(4, '25%', '100%')}
                            {renderCell(5, '25%', '100%')}
                            {renderCell(6, '25%', '100%')}
                            {renderCell(7, '25%', '100%')}
                        </View>
                    </View>
                );
            case '1+12':
                return (
                    <View style={{ width: '100%', height: '100%' }}>
                        <View style={{ flex: 1, flexDirection: 'row' }}>
                            {renderCell(1, '25%', '100%')}
                            {renderCell(2, '25%', '100%')}
                            {renderCell(3, '25%', '100%')}
                            {renderCell(4, '25%', '100%')}
                        </View>
                        <View style={{ flex: 2, flexDirection: 'row' }}>
                            <View style={{ flex: 1 }}>
                                {renderCell(5, '100%', '50%')}
                                {renderCell(6, '100%', '50%')}
                            </View>
                            <View style={{ flex: 2 }}>
                                {renderCell(0, '100%', '100%')}
                            </View>
                            <View style={{ flex: 1 }}>
                                {renderCell(7, '100%', '50%')}
                                {renderCell(8, '100%', '50%')}
                            </View>
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row' }}>
                            {renderCell(9, '25%', '100%')}
                            {renderCell(10, '25%', '100%')}
                            {renderCell(11, '25%', '100%')}
                            {renderCell(12, '25%', '100%')}
                        </View>
                    </View>
                );
            case '32':
                return (
                    <View style={{ width: '100%', height: '100%', flexDirection: 'row', flexWrap: 'wrap' }}>
                        {Array.from({ length: 32 }).map((_, i) => (
                            <View key={i} style={{ width: '12.5%', height: '25%' }}>
                                {renderCell(i, '100%', '100%')}
                            </View>
                        ))}
                    </View>
                );
            default:
                return renderCell(0, '100%', '100%');
        }
    };

    return (
        <View style={styles.container}>
            {renderGridContent()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#000',
    },
    cell: {
        borderWidth: 0.5,
        borderColor: '#1A1A1A',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: '#050505',
    },
    selectedCell: {
        borderColor: '#A83232',
        borderWidth: 1.5,
        zIndex: 10,
    },
    videoWrapper: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    surface: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    emptyContainer: {
        opacity: 0.2,
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
    statusBox: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingBox: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoText: {
        color: '#666',
        marginTop: 4,
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    subInfoText: {
        color: '#444',
        marginTop: 2,
        fontSize: 8,
    },
    offlineCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 152, 0, 0.35)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#444',
        marginTop: 6,
        fontSize: 10,
        fontWeight: '500',
    },
    overlay: {
        position: 'absolute',
        top: 6,
        left: 6,
        maxWidth: '80%',
    },
    labelBadge: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    channelLabel: {
        color: '#E0E0E0',
        fontSize: 10,
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowRadius: 2,
        textTransform: 'uppercase',
    },
    selectionIndicator: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 10,
        padding: 1,
    },
    cellSideControls: {
        position: 'absolute',
        right: 8,
        top: 8,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    cellMiniBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.2)',
    }
});

export default MultiPlaybackGrid;
