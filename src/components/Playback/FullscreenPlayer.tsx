import React from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    Modal,
    Platform,
    StatusBar,
    ScrollView,
    PanResponderInstance
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MultiPlaybackGrid from '../MultiPlaybackGrid';
import { GridType } from '../GridSelection';

interface FullscreenPlayerProps {
    visible: boolean;
    onClose: () => void;
    gridType: GridType;
    visibleChannels: number[];
    playbackHandles: any;
    currentChannel: number;
    onSelectChannel: (ch: number) => void;
    userId: number | null;
    channelNames: { [key: number]: string };
    isLoading: boolean;
    rtspUrls: { [key: number]: string };
    onDoubleTap: (ch: number) => void;
    onToggleGrid: () => void;
    onSnapshot: () => void;
    isRecording: boolean;
    onToggleRecord: () => void;
    showFsControls: boolean;
    onToggleFsControls: () => void;
    panHandlers: any;
    tempTime: Date;
    currentDate: Date;
    filteredFiles: any[];
    recordingStyles: any;
    onJumpToTime: (date: Date) => void;
    onToggleAudio: () => void;
    audioChannel: number | null;
    onOpenFilterModal: () => void;
    onOpenGridModal: () => void;
    onOpenDeviceModal: () => void;
    onOpenCalendarModal: () => void;
    onRewind: () => void;
    isPlaying: boolean;
    onTogglePlay: () => void;
    playbackSpeed: number;
    onSpeedChange: () => void;
    onSpeedLongPress: () => void;
    quality: string;
    onToggleQuality: () => void;
    landscapeTimelineRef: React.RefObject<View>;
    theme: {
        primary: string;
    };
}

const FullscreenPlayer: React.FC<FullscreenPlayerProps> = ({
    visible,
    onClose,
    gridType,
    visibleChannels,
    playbackHandles,
    currentChannel,
    onSelectChannel,
    userId,
    channelNames,
    isLoading,
    rtspUrls,
    onDoubleTap,
    onToggleGrid,
    onSnapshot,
    isRecording,
    onToggleRecord,
    showFsControls,
    onToggleFsControls,
    panHandlers,
    tempTime,
    currentDate,
    filteredFiles,
    recordingStyles,
    onJumpToTime,
    onToggleAudio,
    audioChannel,
    onOpenFilterModal,
    onOpenGridModal,
    onOpenDeviceModal,
    onOpenCalendarModal,
    onRewind,
    isPlaying,
    onTogglePlay,
    playbackSpeed,
    onSpeedChange,
    onSpeedLongPress,
    quality,
    onToggleQuality,
    landscapeTimelineRef,
    theme
}) => {
    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="none"
            supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
            statusBarTranslucent={true}
            hardwareAccelerated={true}
            onShow={() => {
                if (Platform.OS === 'android') {
                    StatusBar.setHidden(true, 'slide');
                    StatusBar.setTranslucent(true);
                }
            }}
            onRequestClose={onClose}
        >
            <View
                style={styles.fullscreenContainer}
                {...panHandlers}
            >
                <MultiPlaybackGrid
                    gridType={gridType}
                    channels={visibleChannels}
                    playbackHandles={playbackHandles}
                    selectedChannel={currentChannel}
                    onSelectChannel={onSelectChannel}
                    userId={userId}
                    channelNames={channelNames}
                    isLoading={isLoading}
                    rtspUrls={rtspUrls}
                    onFullscreen={onClose}
                    hideExpandIcon={true}
                    hideLabels={true}
                    onDoubleClickChannel={onDoubleTap}
                />

                <View style={styles.fullscreenTopControls}>
                    <View style={styles.fsTopTextWrap}>
                        <TouchableOpacity
                            style={styles.fullscreenBackBtn}
                            onPress={onClose}
                        >
                            <Icon name="chevron-left" size={30} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.playerRightControls, { right: 20, top: '25%' }]}>
                    <TouchableOpacity style={styles.playerCircleBtn} onPress={onToggleGrid}>
                        <Icon name={gridType === '1x1' ? "view-grid-outline" : "square-outline"} size={26} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.playerCircleBtn} onPress={onSnapshot}>
                        <Icon name="camera" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.playerCircleBtn, isRecording && { backgroundColor: '#EF4444' }]}
                        onPress={onToggleRecord}
                    >
                        <Icon name={isRecording ? "stop" : "video"} size={24} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.playerCircleBtn, showFsControls && { backgroundColor: theme.primary }]}
                        onPress={onToggleFsControls}
                    >
                        <Icon name="timeline-clock-outline" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {showFsControls && (
                    <View style={styles.fullscreenBottomBar}>
                        <View style={styles.fullscreenTimelineWrap}>
                            <View
                                style={styles.simplifiedTimeline}
                                ref={landscapeTimelineRef}
                            >
                                <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#333', borderRadius: 4 }} />
                                {filteredFiles.map((file, idx) => {
                                    let start: Date, end: Date;
                                    try {
                                        start = new Date(file.start.replace(' ', 'T'));
                                        end = new Date(file.end.replace(' ', 'T'));
                                        if (isNaN(start.getTime())) return null;
                                    } catch (e) { return null; }

                                    const startPct = ((start.getHours() * 3600 + start.getMinutes() * 60 + start.getSeconds()) / 86400) * 100;
                                    const endPct = ((end.getHours() * 3600 + end.getMinutes() * 60 + end.getSeconds()) / 86400) * 100;
                                    const widthPct = Math.max(0.2, endPct - startPct);
                                    const type = file.typeLabel || 'Schedule';
                                    const segmentColor = recordingStyles[type]?.color || '#007AFF';

                                    return (
                                        <View key={idx} style={[styles.footageIndicator, { left: `${startPct}%`, width: `${widthPct}%`, backgroundColor: segmentColor }]} />
                                    );
                                })}
                                <View style={[styles.timelineNeedleSmall, { left: `${(tempTime.getHours() * 3600 + tempTime.getMinutes() * 60 + tempTime.getSeconds()) / 864}%` }]}>
                                    <View style={styles.needleHandle} />
                                </View>
                            </View>

                            <View style={styles.timelineMarkers}>
                                {Array.from({ length: 13 }).map((_, i) => {
                                    const h = i * 2;
                                    return <Text key={i} style={styles.markerText}>{h.toString().padStart(2, '0')}</Text>;
                                })}
                            </View>
                        </View>

                        <View style={styles.fullscreenActions}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity style={styles.fsActionIcon} onPress={onOpenFilterModal}>
                                    <Icon name="file-document-outline" size={24} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.fsActionIcon} onPress={onToggleAudio}>
                                    <Icon name={audioChannel === currentChannel ? "volume-high" : "volume-off"} size={24} color={audioChannel === currentChannel ? "#00EAFF" : "#FFF"} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.fsActionIcon} onPress={onOpenGridModal}>
                                    <Icon name="view-grid-outline" size={24} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.fsActionIcon} onPress={onOpenDeviceModal}>
                                    <Icon name="format-list-bulleted" size={24} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.fsActionIcon} onPress={onOpenCalendarModal}>
                                    <Icon name="calendar-month" size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.fsBottomMainActions}>
                                <TouchableOpacity style={styles.fsActionIcon}>
                                    <Icon name="skip-previous" size={24} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.fsActionIcon} onPress={onRewind}>
                                    <Icon name="rewind" size={28} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.fsActionIcon} onPress={onTogglePlay}>
                                    <Icon name={isPlaying ? "pause" : "play"} size={36} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.fsActionIcon}
                                    onPress={onSpeedChange}
                                    onLongPress={onSpeedLongPress}
                                >
                                    {playbackSpeed > 1 ? (
                                        <View style={{ alignItems: 'center' }}>
                                            <Icon name="fast-forward" size={24} color="#00EAFF" />
                                            <Text style={{ color: '#00EAFF', fontSize: 10, fontWeight: 'bold' }}>{playbackSpeed}x</Text>
                                        </View>
                                    ) : (
                                        <Icon name="fast-forward" size={28} color="#FFF" />
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.fsActionIcon}>
                                    <Icon name="skip-next" size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity style={styles.fsActionIcon} onPress={onToggleQuality}>
                                    <Icon name={quality === 'HD' ? "high-definition" : "standard-definition"} size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    fullscreenContainer: {
        ...StyleSheet.absoluteFillObject,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        zIndex: 9999,
        elevation: 10
    },
    fullscreenTopControls: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.09)',
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 10, zIndex: 200
    },
    fsTopTextWrap: { flexDirection: 'row', alignItems: 'center' },
    fullscreenBackBtn: { padding: 5 },
    playerRightControls: {
        position: 'absolute', top: 10, right: 10,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100
    },
    playerCircleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    fullscreenBottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 140, backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 30, paddingTop: 10
    },
    fullscreenTimelineWrap: { height: 50, width: '100%', justifyContent: 'flex-start' },
    simplifiedTimeline: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 3,
        position: 'relative',
        width: '100%',
        marginTop: 5
    },
    footageIndicator: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#007AFF', borderRadius: 3 },
    timelineNeedleSmall: { position: 'absolute', left: '0%', top: -6, bottom: -6, width: 2, backgroundColor: '#EF4444', zIndex: 10 },
    needleHandle: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#EF4444',
        position: 'absolute',
        top: -3,
        left: -5,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    timelineMarkers: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    markerText: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
    fullscreenActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        paddingHorizontal: 10
    },
    fsActionIcon: { padding: 8 },
    fsBottomMainActions: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
});

export default FullscreenPlayer;
