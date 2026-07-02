import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Text,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface PlaybackTimelineProps {
    currentDate: Date;
    activeScale: { label: string, pxPerMin: number };
    timelineWidth: number;
    timelineScale: number;
    halfScreen: number;
    filteredFiles: any[];
    recordingStyles: { [key: string]: { color: string, icon: string } };
    onJumpToTime: (date: Date) => void;
    onSeek?: (date: Date) => void;
    isPlaying: boolean;
    togglePlay: () => void;
    isLoading: boolean;
    scaleIndex: number;
    setScaleIndex: (index: number) => void;
    scaleLevels: { label: string, pxPerMin: number }[];
    tempTime: Date;
    setTempTime: (date: Date) => void;
    onDragStateChange?: (isDragging: boolean) => void;
    eventTime?: number;
}

const PlaybackTimeline: React.FC<PlaybackTimelineProps> = ({
    currentDate,
    activeScale,
    timelineWidth,
    timelineScale,
    halfScreen,
    filteredFiles,
    recordingStyles,
    onJumpToTime,
    onSeek,
    isPlaying,
    togglePlay,
    isLoading,
    scaleIndex,
    setScaleIndex,
    scaleLevels,
    tempTime,
    setTempTime,
    onDragStateChange,
    eventTime
}) => {
    const timelineRef = useRef<ScrollView>(null);
    const isUserScrollingRef = useRef(false);
    const isProgrammaticScrolling = useRef(false);
    const tempTimeRef = useRef(new Date(currentDate));
    const [isScrolling, setIsScrolling] = useState(false);

    useEffect(() => {
        tempTimeRef.current = currentDate;
    }, [currentDate]);

    // Auto-scroll when currentDate changes (playback)
    useEffect(() => {
        if (!isUserScrollingRef.current && timelineRef.current && !isProgrammaticScrolling.current) {
            const totalMinutes = currentDate.getHours() * 60 + currentDate.getMinutes() + currentDate.getSeconds() / 60;
            const offset = (totalMinutes * activeScale.pxPerMin);

            isProgrammaticScrolling.current = true;
            timelineRef.current.scrollTo({ x: offset, animated: false });
            setTimeout(() => { isProgrammaticScrolling.current = false; }, 100);
        }
    }, [currentDate.getTime(), activeScale.pxPerMin]);

    const handleScroll = (event: any) => {
        if (isProgrammaticScrolling.current) return; // Prevent loop

        const offset = event.nativeEvent.contentOffset.x;
        const clampedOffset = Math.max(0, Math.min(timelineWidth, offset));
        const totalMinutes = clampedOffset / activeScale.pxPerMin;

        const hours = Math.floor(totalMinutes / 60);
        const mins = Math.floor(totalMinutes % 60);
        const secs = Math.floor((totalMinutes * 60) % 60);

        const newDate = new Date(currentDate);
        newDate.setHours(0, 0, 0, 0);
        newDate.setHours(hours, mins, secs);

        tempTimeRef.current = newDate;
        // Only update the displayed time label — do NOT call SDK while dragging (heavy JNI)
        setTempTime(newDate);
    };

    const handleScrollEnd = () => {
        if (!isUserScrollingRef.current) return;
        isUserScrollingRef.current = false;
        console.log("Timeline scroll end, jumping to:", tempTimeRef.current.toLocaleTimeString());
        onJumpToTime(tempTimeRef.current);
    };

    const waveformBars = useMemo(() => {
        // Generate continuous waveform height bars along the 24-hour timeline width
        const count = Math.floor(timelineWidth / 6); // 1 bar every 6px
        return Array.from({ length: count }, (_, i) => ({
            height: 15 + (Math.sin(i / 10) * 10) + (Math.random() * 15), // Smooth oscillating heights + random noise
            left: i * 6
        }));
    }, [timelineWidth]);

    const timelineContent = useMemo(() => {
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

        // 🚀 Pre-calculate file pixel boundaries for fast waveform coloring check
        const mappedSegments = sortedFiles.map(file => {
            try {
                const s = new Date((file.start || "").replace(' ', 'T'));
                const e = new Date((file.end || "").replace(' ', 'T'));
                if (isNaN(s.getTime())) return null;
                const startMin = s.getHours() * 60 + s.getMinutes() + s.getSeconds() / 60;
                const endMin = e.getHours() * 60 + e.getMinutes() + e.getSeconds() / 60;
                return {
                    startLeft: startMin * activeScale.pxPerMin,
                    endLeft: endMin * activeScale.pxPerMin,
                    color: recordingStyles[file.typeLabel || 'Schedule']?.color || '#1890FF'
                };
            } catch { return null; }
        }).filter(Boolean) as { startLeft: number, endLeft: number, color: string }[];

        return (
            <View style={{ width: timelineWidth, height: 110, backgroundColor: '#FFF' }}>
                {/* Visual Waveform graph background with live colored highlights */}
                <View style={[styles.timelineBarBg, { top: 20, height: 50, backgroundColor: '#FAFBFB', width: timelineWidth, zIndex: 1, flexDirection: 'row', alignItems: 'center' }]}>
                    {waveformBars.map((bar, i) => {
                        // Find matching recording segment for coloring
                        const match = mappedSegments.find(s => bar.left >= s.startLeft && bar.left <= s.endLeft);
                        const barColor = match ? match.color : '#E0E6ED';

                        return (
                            <View 
                                key={`wave-${i}`}
                                style={{
                                    position: 'absolute',
                                    left: bar.left,
                                    width: 3,
                                    height: bar.height,
                                    backgroundColor: barColor, // 🚀 Powered by recording type
                                    borderRadius: 1.5,
                                }}
                            />
                        );
                    })}
                </View>

                {/* Ruler Container */}
                <View style={[styles.rulerContainer, { top: 20, height: 50, zIndex: 60 }]}>
                    {[...Array(25)].map((_, i) => {
                        const left = i * timelineScale;
                        const showLabel = (scaleIndex === 0) ? (i % 2 === 0) : true;

                        if (!showLabel) return <View key={i} style={[styles.subTick, { left, bottom: 0, height: 10, opacity: 0.5 }]} />;

                        return (
                            <View key={i} style={[styles.rulerMarker, { left, height: 50 }]}>
                                <Text style={[styles.rulerText, { marginTop: -20, fontSize: 10, color: '#9CA3AF' }]}>{i.toString().padStart(2, '0')}:00</Text>
                                <View style={[styles.rulerTickMajor, { height: '100%', opacity: 0.1, backgroundColor: '#6B7280' }]} />
                            </View>
                        );
                    })}
                </View>

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
                                    top: 10,
                                    width: 20,
                                    height: 70,
                                    alignItems: 'center',
                                    zIndex: 150,
                                }}
                                pointerEvents="none"
                            >
                                <Icon name="bell-ring" size={16} color="#FF9500" />
                                <View style={{ width: 2, flex: 1, backgroundColor: '#FF9500', opacity: 0.8 }} />
                            </View>
                        );
                    }
                    return null;
                })()}

                {/* Recording segment coloring handled directly above inside waveformBars.map */}
            </View>
        );
    }, [filteredFiles, waveformBars, timelineWidth, timelineScale, scaleIndex, activeScale, recordingStyles, eventTime]);

    return (
        <View style={styles.timelineContainer}>
            <View style={styles.zoomControls}>
                <TouchableOpacity style={styles.zoomBtn} onPress={() => setScaleIndex(Math.max(0, scaleIndex - 1))}>
                    <Icon name="magnify-minus-outline" size={18} color="#4B5563" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.zoomBtn} onPress={() => setScaleIndex(Math.min(scaleLevels.length - 1, scaleIndex + 1))}>
                    <Icon name="magnify-plus-outline" size={18} color="#4B5563" />
                </TouchableOpacity>
            </View>

            {/* Floating Live Center Preview Box */}
            {isScrolling && (
                <View style={styles.previewContainer}>
                    <View style={styles.previewBox}>
                        <Icon name="clock-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
                        <Text style={styles.previewTimeText}>
                            {`${tempTime.getHours().toString().padStart(2, '0')}:${tempTime.getMinutes().toString().padStart(2, '0')}:${tempTime.getSeconds().toString().padStart(2, '0')}`}
                        </Text>
                    </View>
                    <View style={styles.previewArrow} />
                </View>
            )}

            <View style={{ marginTop: 5 }}>
                <ScrollView
                    ref={timelineRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    onScrollBeginDrag={() => { 
                        isUserScrollingRef.current = true;
                        setIsScrolling(true);
                        if (onDragStateChange) onDragStateChange(true);
                        if (isPlaying) {
                            togglePlay(); // Pause while dragging
                        }
                    }}
                    onMomentumScrollBegin={() => { 
                        isUserScrollingRef.current = true;
                        setIsScrolling(true);
                        if (onDragStateChange) onDragStateChange(true);
                    }}
                    onMomentumScrollEnd={() => {
                        setIsScrolling(false);
                        if (onDragStateChange) onDragStateChange(false);
                        handleScrollEnd();
                    }}
                    onScrollEndDrag={(e) => {
                        const velocity = e.nativeEvent.velocity;
                        const hasMomentum = velocity && (Math.abs(velocity.x) > 0.1 || Math.abs(velocity.y) > 0.1);
                        if (!hasMomentum) {
                            setIsScrolling(false);
                            if (onDragStateChange) onDragStateChange(false);
                            handleScrollEnd();
                        }
                    }}
                    scrollEventThrottle={16}
                    decelerationRate="normal"
                    contentContainerStyle={{ paddingLeft: halfScreen, paddingRight: halfScreen, backgroundColor: '#FFF' }}
                >
                    {timelineContent}
                </ScrollView>
            </View>

            <View style={styles.needle} />

            {/* Recording Scale / Legend */}
            <View style={styles.legendContainer}>
                {['Schedule', 'Manual', 'Motion', 'Sensor', 'POS', 'AI Event-Intrusion', 'AI Event-Line Crossing', 'AI Event-Face', 'AI Event-License Plate', 'Other AI Events'].map((key) => {
                    const style = recordingStyles[key];
                    if (!style) return null;
                    
                    // Format names to match SuperLivePlus spec:
                    let displayLabel = key;
                    if (key === 'AI Event-Face') {
                        displayLabel = 'AI Event-Human Face';
                    }
                    
                    return (
                        <View key={key} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: style.color }]} />
                            <Text style={styles.legendText}>{displayLabel}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    timelineContainer: { marginTop: 10, backgroundColor: '#FFF', position: 'relative', marginBottom: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingBottom: 10 },
    zoomControls: { position: 'absolute', top: -38, right: 16, flexDirection: 'row', zIndex: 100 },
    zoomBtn: { padding: 6, backgroundColor: '#FFF', borderRadius: 20, elevation: 2, marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },

    // Floating Box styles
    previewContainer: { position: 'absolute', alignSelf: 'center', top: -42, alignItems: 'center', zIndex: 200 },
    previewBox: { backgroundColor: 'rgba(17, 24, 39, 0.85)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', elevation: 3 },
    previewTimeText: { color: '#FFF', fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
    previewArrow: { width: 0, height: 0, borderLeftWidth: 5, borderLeftColor: 'transparent', borderRightWidth: 5, borderRightColor: 'transparent', borderTopWidth: 5, borderTopColor: 'rgba(17, 24, 39, 0.85)' },

    needle: { position: 'absolute', left: '50%', marginLeft: -1, top: 40, height: 60, width: 2, backgroundColor: '#EF4444', zIndex: 100 },
    timelineBarBg: { position: 'absolute', left: 0, height: 35, backgroundColor: '#FFF' },
    rulerContainer: { height: 40, width: '100%', position: 'relative' },
    rulerMarker: { position: 'absolute', alignItems: 'center', top: 0, width: 40, marginLeft: -20 },
    rulerTickMajor: { width: 1, height: '100%', backgroundColor: '#E5E7EB', position: 'absolute' },
    rulerText: { fontSize: 12, color: '#666', fontWeight: '500', marginBottom: 4 },
    subTick: { position: 'absolute', width: 1, height: 8, backgroundColor: '#E5E7EB', bottom: 0 },
    segment: { position: 'absolute', height: 35, justifyContent: 'center', zIndex: 10 },
    legendContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 12, paddingHorizontal: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
    legendText: { fontSize: 10, color: '#666', fontWeight: '500' }
});

export default PlaybackTimeline;
