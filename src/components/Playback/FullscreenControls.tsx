import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    Platform,
    StatusBar,
    Animated,
    ScrollView,
    useWindowDimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GridType } from '../GridSelection';

interface FullscreenControlsProps {
    onClose: () => void;
    gridType: GridType;
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
    onOpenFilterModal: () => void;
    onOpenGridModal: () => void;
    onOpenDeviceModal: () => void;
    onOpenCalendarModal: () => void;
    onToggleAudio: () => void;
    audioChannel: number | null;
    currentChannel: number;
    onRewind: () => void;
    isPlaying: boolean;
    onTogglePlay: () => void;
    playbackSpeed: number;
    onSpeedChange: () => void;
    onSpeedLongPress: () => void;
    quality: string;
    onToggleQuality: () => void;
    landscapeTimelineRef: React.RefObject<any>;
    theme: {
        primary: string;
    };
    recordedDays: string[]; // ["2026-03-01", "2026-03-05"]
    isCalendarOpen: boolean;
    onDateSelect: (d: Date) => void;
    onJumpToTime: (d: Date) => void;
    setTempTime: (d: Date) => void;
    calendarMonth: Date;
    setCalendarMonth: (d: Date) => void;
    activeScale: { label: string, pxPerMin: number };
    timelineWidth: number;
    timelineScale: number;
    scaleIndex: number;
    setScaleIndex: (i: number) => void;
    scaleLevels: any[];
    onSelectSpeed: (speed: number) => void;
    onSelectChannel: (ch: number) => void;
    selectedDevice: any;
    allDevices: any[];
    recordedChannels: number[];
    onSeek: (d: Date) => void;
    eventTime?: number;
}

const FullscreenControls: React.FC<FullscreenControlsProps> = ({
    onClose,
    gridType,
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
    onOpenFilterModal,
    onOpenGridModal,
    onOpenDeviceModal,
    onOpenCalendarModal,
    onToggleAudio,
    audioChannel,
    currentChannel,
    onRewind,
    isPlaying,
    onTogglePlay,
    playbackSpeed,
    onSpeedChange,
    onSpeedLongPress,
    quality,
    onToggleQuality,
    landscapeTimelineRef,
    recordedDays,
    isCalendarOpen,
    onDateSelect,
    theme,
    onJumpToTime,
    setTempTime,
    activeScale,
    timelineWidth,
    timelineScale,
    scaleIndex,
    setScaleIndex,
    scaleLevels,
    onSelectSpeed,
    calendarMonth,
    setCalendarMonth,
    onSelectChannel,
    selectedDevice,
    allDevices,
    recordedChannels,
    onSeek,
    eventTime
}) => {
    const { width: FS_SCREEN_WIDTH } = useWindowDimensions();
    const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
    const [isDevicePanelOpen, setIsDevicePanelOpen] = useState(false);
    const FS_HALF_SCREEN = FS_SCREEN_WIDTH / 2;
    const timelineRef = React.useRef<any>(null);
    const isUserScrollingRef = React.useRef(false);
    const isProgrammaticScrolling = React.useRef(false);
    const tempTimeRef = React.useRef(new Date(currentDate));
    const wasPlayingRef = React.useRef(false); // Track if we paused playback for seeking

    useEffect(() => {
        tempTimeRef.current = currentDate;
    }, [currentDate]);

    // Auto-scroll when currentDate changes (playback)
    useEffect(() => {
        if (!isUserScrollingRef.current && timelineRef.current && !isProgrammaticScrolling.current) {
            const totalMinutes = currentDate.getHours() * 60 + currentDate.getMinutes() + currentDate.getSeconds() / 60;
            const offset = (totalMinutes * activeScale.pxPerMin);

            isProgrammaticScrolling.current = true;
            timelineRef.current.scrollTo({ x: offset, animated: true });
            setTimeout(() => { isProgrammaticScrolling.current = false; }, 600);
        }
    }, [currentDate.getTime(), activeScale.pxPerMin]);

    const handleScroll = (event: any) => {
        if (!isUserScrollingRef.current || isProgrammaticScrolling.current) return;

        const offset = event.nativeEvent.contentOffset.x;
        const totalMinutes = offset / activeScale.pxPerMin;

        const hours = Math.floor(totalMinutes / 60);
        const mins = Math.floor(totalMinutes % 60);
        const secs = Math.floor((totalMinutes * 60) % 60);

        const newDate = new Date(currentDate);
        newDate.setHours(0, 0, 0, 0);
        newDate.setHours(hours, mins, secs);

        tempTimeRef.current = newDate;
        // Only update the displayed time label — do NOT trigger heavy JNI calls while dragging
        setTempTime(newDate);
    };

    const handleScrollEnd = () => {
        const wasUserScrolling = isUserScrollingRef.current;
        isUserScrollingRef.current = false;
        if (!wasUserScrolling || isProgrammaticScrolling.current) return;
        // 🚀 Fire the single seek call only on drag release — starts streams for selected time
        onJumpToTime(tempTimeRef.current);
    };

    const timelineContent = React.useMemo(() => {
        const priorityMap: { [key: string]: number } = {
            'Schedule': 1, 'Manual': 2, 'Motion': 3, 'Sensor': 4, 'POS': 5,
            'Other AI Events': 6, 'AI Event-Intrusion': 7, 'AI Event-Line Crossing': 8,
            'AI Event-Face': 9, 'AI Event-License Plate': 10
        };

        const sortedFiles = [...filteredFiles].sort((a, b) => {
            const pA = priorityMap[a.typeLabel || 'Schedule'] || 0;
            const pB = priorityMap[b.typeLabel || 'Schedule'] || 0;
            return pA - pB;
        });

        return (
            <View style={{ width: timelineWidth, height: 40, flexDirection: 'row' }}>
                {/* Ruler Marks */}
                {Array.from({ length: 25 }, (_, i) => (
                    <View key={i} style={{ position: 'absolute', left: i * timelineScale, height: '100%', width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                ))}

                {/* Segments */}
                {sortedFiles.map((file, idx) => {
                    let start: Date, end: Date;
                    try {
                        start = new Date(file.start.replace(' ', 'T'));
                        end = new Date(file.end.replace(' ', 'T'));
                        if (isNaN(start.getTime())) return null;
                    } catch (e) { return null; }

                    const sMin = start.getHours() * 60 + start.getMinutes() + start.getSeconds() / 60;
                    const eMin = end.getHours() * 60 + end.getMinutes() + end.getSeconds() / 60;
                    const left = sMin * activeScale.pxPerMin;
                    const width = Math.max(2, (eMin - sMin) * activeScale.pxPerMin);
                    const color = recordingStyles[file.typeLabel || 'Schedule']?.color || '#1890FF';

                    return (
                        <View
                            key={`seg-${idx}`}
                            style={{
                                position: 'absolute',
                                left, width,
                                top: 5, bottom: 5,
                                backgroundColor: color,
                                borderRadius: 2,
                                zIndex: 10 + (priorityMap[file.typeLabel || 'Schedule'] || 0)
                            }}
                        />
                    );
                })}

                {/* Event Marker */}
                {eventTime && (() => {
                    const eventDate = new Date(eventTime);
                    if (eventDate.getFullYear() === currentDate.getFullYear() &&
                        eventDate.getMonth() === currentDate.getMonth() &&
                        eventDate.getDate() === currentDate.getDate()) {
                        
                        const eventMin = eventDate.getHours() * 60 + eventDate.getMinutes() + eventDate.getSeconds() / 60;
                        const eventLeft = eventMin * activeScale.pxPerMin;
                        return (
                            <View
                                style={{
                                    position: 'absolute',
                                    left: eventLeft - 10,
                                    top: 0,
                                    width: 20,
                                    height: 40,
                                    alignItems: 'center',
                                    zIndex: 150,
                                }}
                                pointerEvents="none"
                            >
                                <Icon name="bell-ring" size={12} color="#FF9500" />
                                <View style={{ width: 1.5, flex: 1, backgroundColor: '#FF9500', opacity: 0.8 }} />
                            </View>
                        );
                    }
                    return null;
                })()}
            </View>
        );
    }, [filteredFiles, timelineWidth, timelineScale, activeScale, recordingStyles, eventTime]);

    const formatFullDate = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const day = pad(d.getDate());
        const month = pad(d.getMonth() + 1);
        const year = d.getFullYear();
        const hours = pad(d.getHours());
        const mins = pad(d.getMinutes());
        const secs = pad(d.getSeconds());
        return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
    };

    return (
        <View
            style={styles.overlayContainer}
            {...panHandlers}
            pointerEvents="box-none"
        >
            {showFsControls && (
                <View style={styles.fsTopOverlay}>
                    <TouchableOpacity onPress={onClose} style={styles.fsTopLeft}>
                        <Icon name="chevron-left" size={28} color="#FFF" />
                    </TouchableOpacity>
                </View>
            )}

            {showFsControls && (
                <View style={styles.fsExitBtnLeft}>
                    <TouchableOpacity onPress={onClose} style={styles.fsSquareCloseBtn}>
                        <Icon name="close-box-outline" size={32} color="#FFF" />
                    </TouchableOpacity>
                </View>
            )}

            {showFsControls && (
                <View style={styles.fsRightColumn}>
                    <TouchableOpacity style={styles.fsActionCircle} onPress={onSnapshot}>
                        <Icon name="camera-outline" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.fsActionCircle, isRecording && { backgroundColor: '#EF4444' }]}
                        onPress={onToggleRecord}
                    >
                        <Icon name={isRecording ? "stop" : "video-outline"} size={26} color="#FFF" />
                    </TouchableOpacity>
                    {/* <TouchableOpacity
                        style={styles.fsActionCircle}
                        onPress={() => { }} // Placeholder for Clip toggle or cutting logic
                    >
                        <Icon name="content-cut" size={22} color="#FFF" />
                    </TouchableOpacity> */}
                </View>
            )}

            {showFsControls && (
                <View style={styles.fsBottomContainerModern}>
                    {/* TOP LAYER: Date & Timeline Ruler */}
                    <View style={styles.fsTimelineHeader}>
                        <View style={styles.fsTimelineInfo}>
                            <Text style={styles.fsTimelineDateText}>
                                {currentDate.toISOString().split('T')[0]}
                            </Text>
                            <Text style={styles.fsTimelineTimeLarge}>
                                {tempTime.toTimeString().split(' ')[0]}
                            </Text>
                        </View>

                        <View style={styles.fsTimelineScrollSection}>
                            <View style={styles.fsZoomRow}>
                                {scaleLevels.map((lvl, idx) => (
                                    <TouchableOpacity
                                        key={lvl.label}
                                        onPress={() => setScaleIndex(idx)}
                                        style={[styles.fsZoomTab, scaleIndex === idx && styles.fsZoomTabActive]}
                                    >
                                        <Text style={[styles.fsZoomTabText, scaleIndex === idx && styles.fsZoomTabActiveText]}>{lvl.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.fsTimelineWrapper}>
                                <ScrollView
                                    ref={timelineRef}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    onScroll={handleScroll}
                                    onScrollBeginDrag={() => {
                                        if (!isUserScrollingRef.current) {
                                            isUserScrollingRef.current = true;
                                            wasPlayingRef.current = isPlaying;
                                            if (isPlaying) onTogglePlay(); // Pause while scrubbing
                                        }
                                    }}
                                    onMomentumScrollBegin={() => {
                                        isUserScrollingRef.current = true;
                                    }}
                                    onMomentumScrollEnd={handleScrollEnd}
                                    onScrollEndDrag={handleScrollEnd}
                                    scrollEventThrottle={16}
                                    contentContainerStyle={{ paddingLeft: FS_HALF_SCREEN, paddingRight: FS_HALF_SCREEN }}
                                >
                                    <View style={{ width: timelineWidth, height: '100%' }}>
                                        {/* Ruler Labels inside ScrollView */}
                                        <View style={styles.fsRulerLabelsInternal}>
                                            {['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22', '24'].map(h => (
                                                <Text key={h} style={[styles.fsRulerText, { position: 'absolute', left: parseInt(h) * timelineScale, width: 30, marginLeft: -15, textAlign: 'center' }]}>
                                                    {h}
                                                </Text>
                                            ))}
                                        </View>
                                        {timelineContent}
                                    </View>
                                </ScrollView>
                                <View style={styles.fsNeedleCenter} />
                            </View>

                            {/* Legend Row */}
                            <View style={styles.fsLegendRow}>
                                {['Schedule', 'Manual', 'Motion', 'Sensor', 'POS', 'AI Event-Intrusion', 'AI Event-Line Crossing', 'AI Event-Face', 'AI Event-License Plate', 'Other AI Events'].map((key) => {
                                    const style = recordingStyles[key];
                                    if (!style) return null;
                                    
                                    // Format names to match SuperLivePlus spec:
                                    let displayLabel = key;
                                    if (key === 'AI Event-Face') {
                                        displayLabel = 'AI Event-Human Face';
                                    }
                                    
                                    return (
                                        <View key={key} style={styles.fsLegendItem}>
                                            <View style={[styles.fsLegendDot, { backgroundColor: style.color }]} />
                                            <Text style={styles.fsLegendText}>{displayLabel}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </View>

                    {/* BOTTOM LAYER: Controls Row */}
                    <View style={styles.fsIconsRow}>
                        <TouchableOpacity style={styles.fsBottomIcon} onPress={() => setIsDevicePanelOpen(!isDevicePanelOpen)}>
                            <Icon name="file-video-outline" size={26} color={isDevicePanelOpen ? "#00EAFF" : "#FFF"} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.fsBottomIcon} onPress={onToggleAudio}>
                            <Icon name={audioChannel === currentChannel ? "volume-high" : "volume-off"} size={26} color={audioChannel === currentChannel ? "#00EAFF" : "#FFF"} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.fsBottomIcon} onPress={onOpenGridModal}>
                            <Icon name="view-grid-outline" size={26} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.fsBottomIcon} onPress={onOpenFilterModal}>
                            <Icon name="format-list-bulleted" size={26} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.fsBottomIcon} onPress={onOpenCalendarModal}>
                            <Icon name="calendar-month-outline" size={26} color={isCalendarOpen ? "#00EAFF" : "#FFF"} />
                        </TouchableOpacity>

                        <View style={styles.fsDivider} />

                        <TouchableOpacity style={styles.fsBottomIcon} onPress={onRewind}>
                            <Icon name="rewind" size={26} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.fsBottomIcon} onPress={onTogglePlay}>
                            <Icon name={isPlaying ? "pause" : "play"} size={28} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.fsBottomIcon}
                            onPress={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
                        >
                            <Icon name="fast-forward" size={26} color={playbackSpeed > 1 ? "#00EAFF" : "#FFF"} />
                        </TouchableOpacity>

                        <View style={styles.fsDivider} />

                        <TouchableOpacity style={styles.fsBottomIcon} onPress={onToggleQuality}>
                            <View style={styles.fsHdBadgeIcon}>
                                <Text style={styles.fsHdBadgeText}>HD</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {showFsControls && isSpeedMenuOpen && (
                <View style={styles.fsSpeedMenuPanel}>
                    <Text style={styles.fsSpeedTitle}>Speed</Text>
                    {[16, 8, 4, 2, 1].map((s) => (
                        <TouchableOpacity
                            key={s}
                            style={[styles.fsSpeedOption, playbackSpeed === s && styles.fsSpeedActive]}
                            onPress={() => {
                                onSelectSpeed(s);
                                setIsSpeedMenuOpen(false);
                            }}
                        >
                            <Text style={[styles.fsSpeedText, playbackSpeed === s && styles.fsSpeedActiveText]}>
                                X{s}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {showFsControls && isDevicePanelOpen && (
                <View style={styles.fsSideDevicePanel}>
                    {/* Header: Device Name Dropdown + Nav Arrows */}
                    <View style={styles.fsSideHeader}>
                        <TouchableOpacity style={styles.fsSideDeviceTrigger}>
                            <Text style={styles.fsSideDeviceName}>{selectedDevice?.name || 'Device'}</Text>
                            <Icon name="chevron-down" size={20} color="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                        <View style={styles.fsSideNavRow}>
                            <TouchableOpacity style={styles.fsSideNavCircle}>
                                <Icon name="arrow-left" size={16} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.fsSideNavCircle}>
                                <Icon name="arrow-right" size={16} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.fsSideDivider} />

                    {/* Channels Grid */}
                    <ScrollView contentContainerStyle={styles.fsSideGrid}>
                        {(() => {
                            const total = selectedDevice?.channelCount || 16;
                            const channelsToDisplay = recordedChannels.length > 0 ? recordedChannels : Array.from({ length: total }, (_, i) => i);
                            
                            return channelsToDisplay.map((i) => {
                                const isSelected = i === currentChannel;
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={[styles.fsSideChannelBox, isSelected && styles.fsSideChannelActive]}
                                        onPress={() => onSelectChannel(i)}
                                    >
                                        <Text style={[styles.fsSideChannelText, isSelected && styles.fsSideChannelActiveText]}>
                                            {String(i + 1).padStart(2, '0')}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            });
                        })()}
                    </ScrollView>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
        justifyContent: 'space-between'
    },
    // Redesigned Top Bar for Design Match
    fsTopOverlay: {
        position: 'absolute', top: 5, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10,
        zIndex: 102,
    },
    fsTopLeft: {
        flexDirection: 'row', alignItems: 'center', gap: 5
    },
    fsPtzLabel: {
        color: '#FFF', fontSize: 22, fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
    },
    fsTopRight: {
        paddingRight: 10
    },
    fsDateTimeLarge: {
        color: '#FFF', fontSize: 24, fontWeight: 'bold', letterSpacing: 2,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
    },
    // Left Square Exit
    fsExitBtnLeft: {
        position: 'absolute', left: 10, top: '45%', zIndex: 102
    },
    fsSquareCloseBtn: {
        width: 44, height: 44, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4,
        justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
    },
    // Right Side Column Styles
    fsRightColumn: {
        position: 'absolute', right: 20, top: '25%',
        alignItems: 'center', gap: 18, zIndex: 102
    },
    fsActionCircle: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.3)',
        elevation: 4
    },
    // Modern Dual Bottom Bar
    fsBottomContainerModern: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)', paddingBottom: 10, zIndex: 102
    },
    fsTimelineHeader: {
        flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 15, paddingVertical: 5
    },
    fsTimelineInfo: {
        width: 140, marginBottom: 5
    },
    fsTimelineDateText: {
        color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500'
    },
    fsTimelineTimeLarge: {
        color: '#FFF', fontSize: 18, fontWeight: 'bold', marginTop: 2,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
    },
    fsTimelineScrollSection: {
        flex: 1, marginLeft: 10
    },
    fsZoomRow: {
        flexDirection: 'row', gap: 10, marginBottom: 8, justifyContent: 'flex-end'
    },
    fsZoomTab: {
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)'
    },
    fsZoomTabActive: {
        backgroundColor: '#00EAFF'
    },
    fsZoomTabText: {
        color: '#FFF', fontSize: 11, fontWeight: '600'
    },
    fsZoomTabActiveText: {
        color: '#000'
    },
    fsTimelineWrapper: {
        height: 60, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden', position: 'relative'
    },
    fsRulerLabelsInternal: {
        height: 20, position: 'relative'
    },
    fsRulerText: {
        color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 'bold', top: 5
    },
    fsNeedleCenter: {
        position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, backgroundColor: '#FF6B00', zIndex: 100,
        shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 2, elevation: 5
    },
    fsLegendRow: {
        flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 8, paddingHorizontal: 10
    },
    fsLegendItem: {
        flexDirection: 'row', alignItems: 'center', gap: 4
    },
    fsLegendDot: {
        width: 6, height: 6, borderRadius: 3
    },
    fsLegendText: {
        color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '500'
    },
    fsIconsRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 5
    },
    fsBottomIcon: {
        padding: 5
    },
    fsDivider: {
        width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 5
    },
    fsHdBadgeIcon: {
        borderWidth: 1.5, borderColor: '#FFF', borderRadius: 4, paddingHorizontal: 3
    },
    fsHdBadgeText: {
        color: '#FFF', fontSize: 11, fontWeight: 'bold'
    },
    // Calendar Panel Styling
    fsCalendarPanel: {
        position: 'absolute',
        top: 20,
        right: 15,
        bottom: 20,
        width: 290,
        backgroundColor: '#1E1E24',
        borderRadius: 12,
        padding: 12,
        zIndex: 150,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    fsCalendarTopDate: {
        color: '#00EAFF', fontSize: 13, textAlign: 'center', fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        letterSpacing: 1
    },
    calHeader: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 15, marginBottom: 12
    },
    calHeaderText: {
        color: '#FFF', fontSize: 16, fontWeight: 'bold'
    },
    calWeekRow: {
        flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10
    },
    calWeekText: {
        color: '#FFF', fontSize: 13, width: `${100 / 7}%`, textAlign: 'center', fontWeight: '500'
    },
    calDayBox: {
        width: `${100 / 7}%`, height: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 2
    },
    calDaysGrid: {
        flexDirection: 'row', flexWrap: 'wrap'
    },
    calDayCircle: {
        width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center'
    },
    calSelectedCircle: {
        backgroundColor: '#00EAFF'
    },
    calDayText: {
        fontSize: 13, fontWeight: '600'
    },
    calSelectedText: {
        color: '#000', fontWeight: 'bold'
    },
    calRecordingText: {
        color: '#00EAFF'
    },
    calInactiveText: {
        color: 'rgba(255,255,255,0.8)'
    },
    recordingDot: {
        position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#00EAFF'
    },
    fsSpeedMenuPanel: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 100,
        width: 100,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.1)',
        zIndex: 110
    },
    fsSpeedTitle: {
        color: '#999',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 30,
        textTransform: 'uppercase'
    },
    fsSpeedOption: {
        width: '100%',
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    fsSpeedActive: {
        backgroundColor: 'rgba(0, 174, 239, 0.1)'
    },
    fsSpeedText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold'
    },
    fsSpeedActiveText: {
        color: '#00AEEF'
    },
    // Side Device Panel
    fsSideDevicePanel: {
        position: 'absolute', top: 0, bottom: 90, right: 0, width: 320,
        backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 110, paddingVertical: 15
    },
    fsSideHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15
    },
    fsSideDeviceTrigger: {
        flexDirection: 'row', alignItems: 'center', gap: 6
    },
    fsSideDeviceName: {
        color: '#FFF', fontSize: 16, fontWeight: 'bold'
    },
    fsSideNavRow: {
        flexDirection: 'row', gap: 12
    },
    fsSideNavCircle: {
        width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#FFF',
        justifyContent: 'center', alignItems: 'center'
    },
    fsSideDivider: {
        height: 1, backgroundColor: 'rgba(255,255,255,0.1)', width: '100%', marginBottom: 15
    },
    fsSideGrid: {
        flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, gap: 10
    },
    fsSideChannelBox: {
        width: '22%', aspectRatio: 1, backgroundColor: '#222', borderRadius: 100,
        justifyContent: 'center', alignItems: 'center', marginBottom: 5
    },
    fsSideChannelActive: {
        backgroundColor: '#00AEEF'
    },
    fsSideChannelText: {
        color: '#00AEEF', fontSize: 15, fontWeight: 'bold'
    },
    fsSideChannelActiveText: {
        color: '#FFF'
    }
});

export default FullscreenControls;
