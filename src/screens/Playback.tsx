import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    ScrollView,
    Dimensions,
    Platform,
    StatusBar,
    Alert,
    useWindowDimensions,
    PanResponder,
    PermissionsAndroid,
    InteractionManager,
    AppState,
    BackHandler,
    Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Device, deviceStorage } from '../utils/deviceStorage';
import * as NvrSdk from '../native/NvrSdk';
import { deviceSessionManager } from '../services/DeviceSessionManager';
import CalendarTimeModal from '../components/Playback/CalendarTimeModal';
import { RootStackParamList } from '../types/navigation';
import { isSameDay } from '../utils/liveViewUtils';
import BottomBar from '../Component/BottomBar';
import { authStorage } from '../utils/authStorage';
import { api } from '../utils/api';
import { localSettings } from '../utils/localSettings';

type PlaybackRouteProp = RouteProp<RootStackParamList, 'Playback'>;

const THEME = {
    bgGradient: ['#FFE9E9', '#FFFFFF'],
    primary: '#A83232',
    accent: '#00EAFF',
    cardBg: '#FFFFFF',
    textDark: '#333333',
    textGrey: '#999999',
    recordingYellow: '#FEB442',
    recordingGreen: '#4AC23B',
    recordingGold: '#B79901'
};

import {
    VideoSection,
    CalendarModal,
    SpeedModal,
    DeviceModal,
    FilterModal,
    PlaybackTimeline,
    PlaybackControls,
    ChannelFilterSection,
    PlaybackHeader,
    FullscreenControls,
    DateSelector,
    GridModal
} from '../components/Playback';
import { GridType } from '../components/GridSelection';

// ─── Event Type Mappings ──────────────────────────────────────────────────────
const RECORD_TYPE_MAP: { [key: string]: number } = {
    'SCHEDULE': 0,
    'MOTION': 1,
    'SENSOR': 2,
    'MANUAL': 3,
    'INTRUSION': 4,
    'LINE_CROSSING': 5,
    'FACE': 6,
    'VEHICLE': 7,
    'AI': 8,
    'POS': 10
};

const UI_TO_USER_MAP: { [key: string]: string } = {
    'Schedule': 'SCHEDULE',
    'Motion': 'MOTION',
    'Sensor': 'SENSOR',
    'Manual': 'MANUAL',
    'AI Event-Intrusion': 'INTRUSION',
    'AI Event-Line Crossing': 'LINE_CROSSING',
    'AI Event-Face': 'FACE',
    'AI Event-License Plate': 'VEHICLE',
    'Other AI Events': 'AI',
    'POS': 'POS'
};

const USER_TO_UI_MAP: { [key: string]: string } = {
    'SCHEDULE': 'Schedule',
    'MOTION': 'Motion',
    'SENSOR': 'Sensor',
    'MANUAL': 'Manual',
    'INTRUSION': 'AI Event-Intrusion',
    'LINE_CROSSING': 'AI Event-Line Crossing',
    'FACE': 'AI Event-Face',
    'VEHICLE': 'AI Event-License Plate',
    'AI': 'Other AI Events',
    'POS': 'POS'
};
const requestStoragePermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
        if (Platform.Version >= 33) {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
                PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
            ]);
            return (
                granted[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] === PermissionsAndroid.RESULTS.GRANTED &&
                granted[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO] === PermissionsAndroid.RESULTS.GRANTED
            );
        } else {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            ]);
            return (
                granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED &&
                granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED
            );
        }
    } catch (err) {
        console.warn('Permission request error:', err);
        return false;
    }
};

const Playback: React.FC = () => {
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
    const [scaleIndex, setScaleIndex] = useState(0);
    const scaleLevels = [
        { label: '24h', pxPerMin: 1 },
        { label: '12h', pxPerMin: 2 },
        { label: '6h', pxPerMin: 4 },
        { label: '2h', pxPerMin: 12 },
        { label: '1h', pxPerMin: 24 }
    ];
    const activeScale = scaleLevels[scaleIndex];
    const TIMELINE_WIDTH = 1440 * activeScale.pxPerMin;
    const TIMELINE_SCALE = 60 * activeScale.pxPerMin; // Pixels per hour
    const HALF_SCREEN = SCREEN_WIDTH / 2;
    const route = useRoute<PlaybackRouteProp>();
    const navigation = useNavigation<any>();
    const { deviceId, deviceName, initialChannelId, channelId, startTime, eventTime, endTime, eventType } = route.params || {};

    // Parsed parameters for safe use
    const parsedStartTime = useMemo(() => {
        if (!startTime) return null;
        const n = Number(startTime);
        const d = !isNaN(n) ? new Date(n) : new Date(startTime);
        return isNaN(d.getTime()) ? null : d;
    }, [startTime]);

    // --- STATES ---
    const [currentDate, setCurrentDate] = useState(() => {
        const routeParams = route.params || {};
        const startVal = routeParams.startTime;
        if (startVal) {
            const n = Number(startVal);
            const d = !isNaN(n) ? new Date(n) : new Date(startVal);
            if (!isNaN(d.getTime())) {
                return d;
            }
        }
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [isPlaying, setIsPlaying] = useState(true);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [quality, setQuality] = useState<'HD' | 'SD'>('HD');
    const [audioChannel, setAudioChannel] = useState<number | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [recordDuration, setRecordDuration] = useState(0);
    const [appLocalSettings, setAppLocalSettings] = useState<any>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [showVisualFlash, setShowVisualFlash] = useState(false);

    // NEW: Manual jump trigger to avoid loops
    const [manualJumpTrigger, setManualJumpTrigger] = useState(0);


    // NEW: Multi-Channel State
    const [playbackHandles, setPlaybackHandles] = useState<{ [key: number]: { handle: string | null, realChannel: number, status?: string, error?: string } }>({});
    const [gridType, setGridType] = useState<GridType>('1x1');
    const [visibleChannels, setVisibleChannels] = useState<number[]>(() => {
        const routeParams = route.params || {};
        const ch = routeParams.initialChannelId !== undefined ? Number(routeParams.initialChannelId) : (routeParams.channelId !== undefined ? Number(routeParams.channelId) : 0);
        return [ch];
    });
    const [channelNames, setChannelNames] = useState<{ [key: number]: string }>({});
    const [rtspUrls, setRtspUrls] = useState<{ [key: number]: string }>({});
    const [prevGridState, setPrevGridState] = useState<{ type: GridType, channels: number[] } | null>(null);
    const [playbackDirection, setPlaybackDirection] = useState<'forward' | 'backward'>('forward');

    // Legacy single-handle state removed/ignored
    // const [playbackHandle, setPlaybackHandle] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [currentChannel, setCurrentChannel] = useState(() => {
        const routeParams = route.params || {};
        return routeParams.initialChannelId !== undefined ? Number(routeParams.initialChannelId) : (routeParams.channelId !== undefined ? Number(routeParams.channelId) : 0);
    }); // Focused Channel
    const [recordingFiles, setRecordingFiles] = useState<any[]>([]);
    const [userId, setUserId] = useState<number | null>(null);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const deviceChannelCount = selectedDevice
        ? (selectedDevice.channels?.length || selectedDevice.channelCount || selectedDevice.videoInputNum || (selectedDevice.isNVR ? 16 : 1))
        : 8;
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);
    const [isSpeedModalVisible, setIsSpeedModalVisible] = useState(false);
    const [tempTime, setTempTime] = useState(new Date());
    const tempTimeRef = useRef(new Date());
    const isUserScrollingRef = useRef(false);

    // NEW: Device Modal State
    const [isDeviceModalVisible, setIsDeviceModalVisible] = useState(false);
    const [allDevices, setAllDevices] = useState<Device[]>([]);

    // Keep tempTime in sync with currentDate when changed externally
    useEffect(() => {
        setTempTime(new Date(currentDate));
    }, [currentDate.getTime()]);

    // Keep visibleChannelsRef in sync so init() always reads latest channels
    useEffect(() => {
        visibleChannelsRef.current = visibleChannels;
    }, [visibleChannels]);

    // Load devices, map Serial Number to local ID, and set default deviceId if missing
    useEffect(() => {
        const loadAndResolveDevice = async () => {
            const devs = await deviceStorage.getDevices();
            if (isMounted.current) {
                setAllDevices(devs);
            }
            if (!devs || devs.length === 0) return;

            if (deviceId) {
                // Find matching device by local ID, SN (deviceId), or sn field
                const target = devs.find(d => 
                    String(d.id) === String(deviceId) || 
                    (d.deviceId && String(d.deviceId) === String(deviceId)) ||
                    (d.sn && String(d.sn) === String(deviceId))
                );

                if (target && String(target.id) !== String(deviceId)) {
                    console.log(`[Playback] Mapping device ID parameter from SN (${deviceId}) to Local ID (${target.id})`);
                    navigation.setParams({
                        deviceId: String(target.id),
                        deviceName: target.name,
                    });
                }
            } else {
                const defaultDev = devs[0];
                console.log("[Playback] Setting default device parameter:", defaultDev.name);
                navigation.setParams({
                    deviceId: String(defaultDev.id),
                    deviceName: defaultDev.name,
                    initialChannelId: 0
                });
            }
        };
        loadAndResolveDevice();
    }, [deviceId]);

    const [recordedDays, setRecordedDays] = useState<any[]>([]); // mixed for compatibility
    const [recordedChannels, setRecordedChannels] = useState<number[]>([]);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [isPreciseModalVisible, setIsPreciseModalVisible] = useState(false);

    const [syncKey, setSyncKey] = useState(0);
    const [filterType, setFilterType] = useState('All');

    // NEW: Filter States
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [isGridModalVisible, setIsGridModalVisible] = useState(false);
    const [selectedRecordingTypes, setSelectedRecordingTypes] = useState<string[]>(['Schedule', 'Motion', 'Manual', 'Sensor', 'AI Event-Face', 'AI Event-License Plate', 'AI Event-Line Crossing', 'AI Event-Intrusion', 'Other AI Events', 'POS']);
    const [isFullscreen, setIsFullscreen] = useState(() => !!route.params?.initialFullscreen);
    const [showFsControls, setShowFsControls] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaToast, setMediaToast] = useState<{ visible: boolean; type: 'picture' | 'video'; path: string } | null>(null);
    const recordingPathRef = useRef<string | null>(null);

    const fsPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 10,
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dy < -50) setShowFsControls(true);
                else if (gesture.dy > 50) setShowFsControls(false);
            },
        })
    ).current;

    // Timeline Color Logic matching SuperLivePlus recording types and colors:
    const recordingStyles: { [key: string]: { color: string, icon: string } } = {
        'AI Event-Face': { color: '#00D4FF', icon: 'account' },
        'AI Event-License Plate': { color: '#00E676', icon: 'car' },
        'AI Event-Line Crossing': { color: '#FF00FF', icon: 'account' },
        'AI Event-Intrusion': { color: '#FFFF00', icon: 'account' },
        'Other AI Events': { color: '#00EAFF', icon: 'car' },
        'Manual': { color: '#76FF03', icon: 'calendar-clock' },
        'Sensor': { color: '#FF1744', icon: 'alert-box' },
        'Motion': { color: '#FF9100', icon: 'alert-box' },
        'POS': { color: '#D500F9', icon: 'cash-register' },
        'Schedule': { color: '#0055FF', icon: 'calendar-clock' },
        'Unknown': { color: '#9CA3AF', icon: 'help-circle' }
    };

    // Guard refs for persistent state
    const lastInitKey = useRef<string>('');
    const lastDeviceIdRef = useRef<string>('');
    const lastInitialChannelIdRef = useRef<number | undefined>(undefined);
    const lastStartTimeRef = useRef<string | number | undefined>(undefined);
    const lastFetchedKey = useRef<string>('');
    const [dateRange, setDateRange] = useState<Date[]>([]);

    useEffect(() => {
        const dates = [];
        for (let i = -7; i <= 7; i++) {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + i);
            dates.push(d);
        }
        setDateRange(dates);
    }, [currentDate.toDateString()]);

    // 🚀 DATE-BASED NAVIGATION (SuperLivePlus Mode)
    const handleDateSelect = async (date: Date) => {
        console.log(`[Playback] handleDateSelect -> User selected date: ${date.toDateString()}`);
        
        // 1. Stop all active streams immediately to prevent native socket conflicts and JNI watchdog interference
        await stopAllPlayback();
        
        // 2. Explicitly clear high-frequency tracking refs to avoid stale checks
        lastPlayedTimeRef.current = {};
        playbackHandlesRef.current = {};

        // 3. Mark this as a manual date change to bypass focusChangedOnly check in init
        isManualDateChangeRef.current = true;

        // 4. Set the target date representation to midnight of the selected day
        const targetDay = new Date(date);
        targetDay.setHours(0, 0, 0, 0);

        // 5. Update UI state immediately so the timeline and loading indicators react instantly
        if (isMounted.current) {
            setCurrentDate(targetDay);
            setTempTime(targetDay);
            setIsLoading(true);
        }
        
        // 6. Trigger search & playback initialization
        setManualJumpTrigger(prev => prev + 1);
    };

    // 🎯 PRECISE JUMP (SuperLivePlus Mode)
    const handlePreciseJump = async (timestamp: string) => {
        if (!userId || !selectedDevice) return;

        setIsPreciseModalVisible(false); // Close modal immediately
        setIsLoading(true);
        console.log(`[Playback] Precise Seek Request: ${timestamp}`);

        try {
            // Step 1: Parse YYYY-MM-DD HH:mm:ss safely (avoid timezone issues)
            const [datePart, timePart] = timestamp.split(' ');
            const [y, m, d] = datePart.split('-').map(Number);
            const [hh, mm, ss] = timePart.split(':').map(Number);
            const jumpDate = new Date(y, m - 1, d, hh, mm, ss);

            if (isNaN(jumpDate.getTime())) {
                console.error("[Playback] Invalid Jump Date:", timestamp);
                setIsLoading(false);
                return;
            }

            // Step 2: Switch currentDate to the EXACT selected time (NOT 00:00:00)
            const targetDateStr = jumpDate.toDateString();
            lastInitKey.current = `${deviceId}-${targetDateStr}`;

            skipNextInitRef.current = true; // Extra guard to block init()
            setCurrentDate(jumpDate);
            setTempTime(jumpDate);

            // Step 3: Search recordings for the selected day to find what actually exists
            const dayStart = new Date(y, m - 1, d, 0, 0, 0);
            const dayEnd = new Date(y, m - 1, d, 23, 59, 59);
            let seekTime = jumpDate; // Default: seek to exactly what user picked

            try {
                const filterKey = `playback_filter_${deviceId}_${currentChannel}`;
                const stored = await AsyncStorage.getItem(filterKey);
                let activeUiTypes = selectedRecordingTypes;
                if (stored) {
                    try {
                        const userTypes = JSON.parse(stored);
                        if (Array.isArray(userTypes)) {
                            const uiTypes = userTypes.map(t => USER_TO_UI_MAP[t]).filter(Boolean);
                            if (uiTypes.length > 0) activeUiTypes = uiTypes;
                        }
                    } catch (e) {
                        console.error("[Playback] Failed to parse saved filters:", e);
                    }
                }
                const sdkIntTypes = activeUiTypes.map(t => RECORD_TYPE_MAP[UI_TO_USER_MAP[t]]).filter(v => v !== undefined);

                console.log(`[Playback] Searching recordings for ${datePart} on CH ${currentChannel} with types:`, sdkIntTypes);
                const recs: any = await NvrSdk.searchRecordings(
                    userId,
                    currentChannel,
                    formatTime(dayStart),
                    formatTime(dayEnd),
                    sdkIntTypes
                );
                const segments = Array.isArray(recs) ? recs : (recs?.fileList || []);
                console.log(`[Playback] Found ${segments.length} recordings on ${datePart}`);

                if (segments.length > 0) {
                    if (isMounted.current) {
                        setRecordingFiles(segments);
                        setSearchPerformed(true);
                    }

                    // Check if selected time falls inside an existing recording
                    const targetMs = jumpDate.getTime();
                    const inSegment = segments.find((f: any) =>
                        safeParseDate(f.start).getTime() <= targetMs &&
                        safeParseDate(f.end).getTime() >= targetMs
                    );

                    if (!inSegment) {
                        // No recording at exact time – snap to the closest segment start
                        const sorted = [...segments].sort((a: any, b: any) =>
                            Math.abs(safeParseDate(a.start).getTime() - targetMs) -
                            Math.abs(safeParseDate(b.start).getTime() - targetMs)
                        );
                        const closest = sorted[0];
                        const [dp2, tp2] = closest.start.split(' ');
                        const [y2, m2, d2] = dp2.split('-').map(Number);
                        const [h2, min2, s2] = tp2.split(':').map(Number);
                        seekTime = new Date(y2, m2 - 1, d2, h2, min2, s2);
                        console.log(`[Playback] No recording at ${timestamp}, snapping to: ${closest.start}`);
                    }
                } else {
                    console.warn(`[Playback] No recordings found on ${datePart}. Attempting direct seek anyway.`);
                }
            } catch (searchErr) {
                console.warn("[Playback] Recording search failed, attempting direct seek:", searchErr);
            }

            // Step 4: Start the stream at the resolved seek time
            await jumpToTime(seekTime, true);
        } catch (e) {
            console.error("Precise Playback Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const loadUser = async () => {
            const u = await authStorage.getUser();
            setCurrentUser(u);
        };
        loadUser();

        const loadAppSettings = async () => {
            try {
                const ls = await localSettings.getSettings();
                setAppLocalSettings(ls);
            } catch (err) {
                console.warn(err);
            }
        };
        loadAppSettings();
    }, []);


    // --- REFS ---
    const timelineRef = useRef<ScrollView>(null);
    const landscapeTimelineRef = useRef<any>(null);
    // NEW: Map for handles
    const playbackHandlesRef = useRef<{ [key: number]: { handle: string | null, realChannel: number } }>({});
    const lastPlayedTimeRef = useRef<{ [key: number]: string }>({});
    const visibleChannelsRef = useRef<number[]>([0]);

    // Channel-specific playback state and time refs
    const channelPlaybackStatesRef = useRef<{ [channelId: number]: { isPlaying: boolean, speed: number, direction: 'forward' | 'backward' } }>({});
    const channelTimesRef = useRef<{ [channelId: number]: Date }>({});

    const getChannelPlaybackState = (ch: number) => {
        if (!channelPlaybackStatesRef.current[ch]) {
            channelPlaybackStatesRef.current[ch] = { isPlaying: true, speed: 1, direction: 'forward' };
        }
        return channelPlaybackStatesRef.current[ch];
    };


    const activeSegmentRef = useRef<any>(null);
    const lastJumpTimeRef = useRef<number>(0);
    const isMounted = useRef(true);
    const isStartingRef = useRef(false);
    const currentRequestIdRef = useRef(0);
    const lastFocusedChannelRef = useRef<number | undefined>(undefined);
    const userIdRef = useRef<number | null>(null);

    const setUserIdWithRef = (id: number | null) => {
        setUserId(id);
        userIdRef.current = id;
    };

    const skipNextInitRef = useRef(false);
    const isManualDateChangeRef = useRef(false);
    const skipNextSnapRef = useRef(false);
    const lastTapRef = useRef<number>(0);

    // --- HELPERS ---
    const formatTime = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const safeParseDate = (dateStr: any): Date => {
        if (!dateStr) return new Date();
        if (dateStr instanceof Date) {
            return isNaN(dateStr.getTime()) ? new Date() : dateStr;
        }
        if (typeof dateStr === 'number') {
            const dNum = new Date(dateStr);
            return isNaN(dNum.getTime()) ? new Date() : dNum;
        }
        const str = String(dateStr).trim();
        const formatted = str.includes(' ') ? str.replace(' ', 'T') : str;
        const d = new Date(formatted);
        if (!isNaN(d.getTime())) {
            return d;
        }
        const parts = str.split(/[\sT\-:]+/);
        if (parts.length >= 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const hour = parts[3] ? parseInt(parts[3], 10) : 0;
            const minute = parts[4] ? parseInt(parts[4], 10) : 0;
            const second = parts[5] ? parseInt(parts[5], 10) : 0;
            const dFallback = new Date(year, month, day, hour, minute, second);
            if (!isNaN(dFallback.getTime())) return dFallback;
        }
        return new Date();
    };

    const getRelativeDateLabel = (date: Date) => {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        if (isSameDay(date, today)) return 'Today';
        if (isSameDay(date, yesterday)) return 'Yesterday';
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    };

    const formatShortTime = (d: Date) => {
        const h = d.getHours();
        const m = d.getMinutes();
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    };

    const getRecTypeLabel = (code: number) => {
        // Standard SDK Mapping (TVT/XM/Others)
        // 0: Schedule/General
        // 1: Motion
        // 2: Alarm/Sensor
        // 3: Manual
        // 4: Intelligent/AI
        switch (code) {
            case 0: return 'Schedule';
            case 1: return 'Motion';
            case 2: return 'Sensor';
            case 3: return 'Manual';
            case 4: return 'AI Event-Intrusion';
            case 5: return 'AI Event-Line Crossing';
            case 6: return 'AI Event-Face';
            case 7: return 'AI Event-License Plate';
            case 8: return 'Other AI Events';
            case 10: return 'POS';
            default: return 'Schedule';
        }
    };

    const filteredFiles = useMemo(() => {
        const filtered = recordingFiles.filter(file => {
            const type = file.typeLabel || getRecTypeLabel(file.type);
            if (!file.typeLabel) file.typeLabel = type;

            // Check primary modal filters
            if (!selectedRecordingTypes.includes(type)) return false;

            // Check quick filter chips
            if (filterType === 'All') return true;
            if (filterType === 'Event') return ['Motion', 'Sensor'].includes(type);
            if (filterType === 'Person') return ['AI Event-Face', 'AI Event-Intrusion', 'AI Event-Line Crossing'].includes(type);
            if (filterType === 'Vehicle') return ['AI Event-License Plate', 'Other AI Events'].includes(type);

            return true;
        });

        console.log(`🎬 Filtered Files: ${filtered.length} of ${recordingFiles.length} total recordings`);
        if (filtered.length > 0) {
            const typeCounts: { [key: string]: number } = {};
            filtered.forEach(f => {
                const t = f.typeLabel || 'Unknown';
                typeCounts[t] = (typeCounts[t] || 0) + 1;
            });
            console.log('📊 Recording Types:', typeCounts);
        }

        return filtered;
    }, [recordingFiles, selectedRecordingTypes, filterType]);

    const handleDoubleTap = (channelId: number) => {
        if (gridType === '1x1') {
            // Restore previous grid — applyGridType handles stream startup
            if (prevGridState) {
                const restoreType = prevGridState.type; // capture before clearing
                const restoreChannels = prevGridState.channels;
                setPrevGridState(null);
                applyGridType(restoreType, restoreChannels);
            } else {
                const count = deviceChannelCount;
                const nextGrid: GridType = count <= 4 ? '2x2' : (count <= 9 ? '3x3' : '4x4');
                applyGridType(nextGrid);
            }
        } else {
            // Zoom into single channel — start just this channel's stream
            setPrevGridState({ type: gridType, channels: [...visibleChannels] });
            setCurrentChannel(channelId);
            applyGridType('1x1', [channelId]);
        }
    };


    const applyGridType = async (type: GridType, overrideChannels?: number[]) => {
        const loginHandle = userIdRef.current || userId;
        if (!loginHandle || !selectedDevice) {
            console.log("[Playback] applyGridType: loginHandle or selectedDevice is missing", { loginHandle, selectedDevice });
            return;
        }

        isStartingRef.current = true;
        try {
            // ── 1. Compute the full channel list for the new grid
            const count = deviceChannelCount;
            let numChannels = 1;
            if (type === '2x2') numChannels = 4;
            else if (type === '3x3') numChannels = 9;
            else if (type === '4x4') numChannels = 16;
            else if (type === '5x5') numChannels = 25;
            else if (type === '6x6' || type === '32') numChannels = 32;
            else if (type === '1+3') numChannels = 4;
            else if (type === '1+5') numChannels = 6;
            else if (type === '1+7') numChannels = 8;
            else if (type === '1+8') numChannels = 9;
            else if (type === '1+12') numChannels = 13;

            // Calculate paging around currentChannel so the focused channel is always visible in the selected layout
            let allChannels = overrideChannels;
            if (!allChannels) {
                const pageIndex = Math.floor(currentChannel / numChannels);
                const startCh = pageIndex * numChannels;
                allChannels = Array.from({ length: numChannels }, (_, i) => {
                    const ch = startCh + i;
                    return ch < count ? ch : undefined;
                }).filter(ch => ch !== undefined) as number[];
            }

            // ── 2. Update UI state
            setGridType(type);
            setVisibleChannels(allChannels);
            visibleChannelsRef.current = allChannels; // 🚀 Sync Ref for general loop re-measuring
            setIsLoading(true);
            setIsGridModalVisible(false);
            setShowFsControls(false);

            // ── 3. Compute the playback window using current time ref
            const playTime = isUserScrollingRef.current ? tempTimeRef.current : currentDate;
            const startStr = formatTime(playTime);
            const endDate = new Date(playTime);
            endDate.setHours(23, 59, 59, 999);
            const endStr = formatTime(endDate);

            // 🚀 OPTIMIZATION: Force Main Stream (0) for playback since NVRs only support main-stream playback
            const streamType = 0;

            // ── 4. Stop handles for channels that are NO LONGER needed
            const channelSet = new Set(allChannels);
            const handlesToStop: string[] = [];
            const channelsToStopList: number[] = [];

            Object.entries(playbackHandlesRef.current).forEach(([chKey, hObj]) => {
                const ch = Number(chKey);
                if (!channelSet.has(ch) && hObj?.handle) {
                    handlesToStop.push(hObj.handle);
                    channelsToStopList.push(ch);
                }
            });

            if (handlesToStop.length > 0) {
                console.log(`[Playback] Grid Cleanup: Stopping ${handlesToStop.length} stale channels: ${channelsToStopList.join(', ')}`);
                await Promise.all(handlesToStop.map(h => NvrSdk.stopPlayback(h).catch(() => { })));

                channelsToStopList.forEach(ch => {
                    delete playbackHandlesRef.current[ch];
                });
                if (isMounted.current) {
                    setPlaybackHandles(prev => {
                        const newState = { ...prev };
                        channelsToStopList.forEach(ch => {
                            delete newState[ch];
                        });
                        return newState;
                    });
                }
                // Small JNI cool-down after stopping handles
                await new Promise<void>(resolve => setTimeout(resolve, 80));
            }

            // 🚀 BATCHED SEQUENTIAL START: Maximized for responsiveness.
            // Start up to 8 channels simultaneously for high-performance NVRs.
            const BATCH_SIZE = 8;
            const BATCH_DELAY = 100; // Performance tuning

            for (let i = 0; i < allChannels.length; i += BATCH_SIZE) {
                if (i > 0) {
                    await new Promise<void>(resolve => setTimeout(resolve, BATCH_DELAY));
                }
                const batch = allChannels.slice(i, i + BATCH_SIZE);
                console.log(`[Playback] Starting Batch ${Math.floor(i / BATCH_SIZE) + 1}: CH ${batch.join(', ')}`);

                await Promise.all(batch.map(async (ch, index) => {
                    // Short staggered delay to space out socket allocations slightly
                    await new Promise<void>(resolve => setTimeout(resolve, index * 40));

                    const existing = playbackHandlesRef.current[ch];

                    // Skip channels already playing correctly in the same stream type
                    if (existing?.handle && playbackHandlesRef.current[ch]?.status === 'OK' && (existing as any).streamType === streamType) {
                        return;
                    }

                    // Stop stale handle if present
                    if (existing?.handle) {
                        await NvrSdk.stopPlayback(existing.handle).catch(() => { });
                    }

                    try {
                        const res: any = await NvrSdk.startPlayback(loginHandle, ch, startStr, endStr, streamType);
                        const handle = (res && typeof res === 'object') ? res.handle : res;
                        const realChannel = (res && typeof res === 'object') ? res.realChannel : ch;
                        const isValid = handle && String(handle) !== '0' && String(handle) !== '-1' && String(handle) !== 'null' && String(handle) !== 'undefined';

                        console.log(`[AI-PUSH] SDK PlayBackByTime result: ${handle} (Channel: ${ch}, Stream: ${streamType})`);
                        console.log(`[Playback] CH ${ch} handle: ${handle} (Stream: ${streamType})`);

                        const handleEntry = { handle: isValid ? handle : null, realChannel, status: isValid ? 'OK' : 'NO_DATA', streamType };
                        playbackHandlesRef.current[ch] = handleEntry;

                        const state = getChannelPlaybackState(ch);
                        state.isPlaying = true;
                        state.speed = 1;
                        state.direction = 'forward';
                        channelTimesRef.current[ch] = new Date(playTime);
                        lastPlayedTimeRef.current[ch] = startStr;

                        if (isMounted.current) {
                            setPlaybackHandles(prev => ({ ...prev, [ch]: handleEntry }));
                        }
                    } catch (err) {
                        console.log(`[AI-PUSH] SDK PlayBackByTime result: FAILED (Channel: ${ch}, Error: ${err})`);
                        console.log(`[Playback] CH ${ch} FAILED:`, err);
                        const errorEntry = { handle: null, realChannel: ch, status: 'ERROR', streamType };
                        playbackHandlesRef.current[ch] = errorEntry;

                        const state = getChannelPlaybackState(ch);
                        state.isPlaying = false;

                        if (isMounted.current) {
                            setPlaybackHandles(prev => ({ ...prev, [ch]: errorEntry }));
                        }
                    }
                }));
            }

            if (isMounted.current) {
                setIsPlaying(true);

                // 🚀 Sync Audio after grid change (if forward)
                if (audioChannel !== null && playbackDirection === 'forward') {
                    const h = playbackHandlesRef.current[audioChannel];
                    if (h && h.handle) {
                        NvrSdk.playbackControl(h.handle, NvrSdk.PLAYBACK_CMD.STARTAUDIO).catch(() => { });
                    }
                }
            }
        } catch (err) {
            console.error("[Playback] applyGridType failed", err);
        } finally {
            isStartingRef.current = false;
            if (isMounted.current) {
                setIsLoading(false);
            }
        }
    };

    const handleSelectChannel = (ch: number) => {
        const isAlreadyVisible = visibleChannelsRef.current.includes(ch);
        setCurrentChannel(ch);

        // Sync global control states to the selected channel's state
        const state = getChannelPlaybackState(ch);
        setIsPlaying(state.isPlaying);
        setPlaybackSpeed(state.speed);
        setPlaybackDirection(state.direction);

        if (channelTimesRef.current[ch]) {
            setCurrentDate(channelTimesRef.current[ch]);
            setTempTime(channelTimesRef.current[ch]);
        } else {
            channelTimesRef.current[ch] = new Date(currentDate);
        }

        if (gridType === '1x1') {
            setVisibleChannels([ch]);
            visibleChannelsRef.current = [ch];
            setManualJumpTrigger(prev => prev + 1);
        } else if (!isAlreadyVisible) {
            // If not visible, page the grid to show the selected channel
            const count = deviceChannelCount;
            let numChannels = 1;
            if (gridType === '2x2') numChannels = 4;
            else if (gridType === '3x3') numChannels = 9;
            else if (gridType === '4x4') numChannels = 16;
            else if (gridType === '5x5') numChannels = 25;
            else if (gridType === '6x6' || gridType === '32') numChannels = 32;
            else if (gridType === '1+3') numChannels = 4;
            else if (gridType === '1+5') numChannels = 6;
            else if (gridType === '1+7') numChannels = 8;
            else if (gridType === '1+8') numChannels = 9;
            else if (gridType === '1+12') numChannels = 13;

            const pageIndex = Math.floor(ch / numChannels);
            const startCh = pageIndex * numChannels;
            const newChannels = Array.from({ length: numChannels }, (_, idx) => {
                const targetCh = startCh + idx;
                return targetCh < count ? targetCh : undefined;
            }).filter(targetCh => targetCh !== undefined) as number[];

            applyGridType(gridType, newChannels);
        } else {
            // Already visible, just focus it and query its recordings without resetting streams
            setManualJumpTrigger(prev => prev + 1);
        }
    };

    const handleSnapshot = async () => {
        if (isCapturing || !selectedDevice || userId === null) return;

        const handleObj = playbackHandles[currentChannel];
        if (currentChannel === undefined || !handleObj || !handleObj.handle) {
            Alert.alert('Error', 'No active channel selected or no video playing');
            return;
        }

        const hasPermission = await requestStoragePermissions();
        if (!hasPermission) {
            Alert.alert('Permission Denied', 'Storage permissions are required to save snapshots.');
            return;
        }

        const hasSpace = await localSettings.checkDiskSpace(appLocalSettings?.reservedDiskSpace || 50);
        if (!hasSpace) {
            Alert.alert('Storage Full', 'Please clear some space or adjust Reserved Disk Space in Local Settings.');
            return;
        }

        setIsCapturing(true);

        try {
            // Visual Flash on capture
            setShowVisualFlash(true);
            setTimeout(() => setShowVisualFlash(false), 200);

            // Dynamically load user for exact userTag alignment with Gallery
            const freshUser = await authStorage.getUser();
            const userTag = (freshUser?.email || freshUser?.username || 'user').replace(/[^a-zA-Z0-9]/g, '_');
            const timestamp = Date.now();
            const fileName = `snap_${currentChannel}_${timestamp}.jpg`;
            const path = `/sdcard/VMS/${userTag}/Snapshots/${fileName}`;

            console.log(`📸 Taking Playback Snapshot: Handle=${handleObj.handle}, UserID=${userId}, Channel=${currentChannel}, Path=${path}`);

            // Non-blocking snapshot capture
            const actualPath = await NvrSdk.capturePlaybackSnapshot({
                handle: String(handleObj.handle),
                path,
                userId: userId,
                channelId: currentChannel
            });

            // Save to DB so it appears in App Gallery immediately
            api.saveMedia({
                type: 'snapshot',
                fileName,
                filePath: actualPath,
                channelId: currentChannel,
                deviceName: selectedDevice.name || 'Unknown Device'
            }).catch(e => console.warn("Failed to save snapshot to DB:", e.message));

            // Save to public gallery and scan
            try {
                const publicPath = await NvrSdk.saveMediaToPublic(actualPath, 'image');
                await NvrSdk.scanFile(publicPath);
                console.log(`SNAPSHOT_SAVED_TO_PUBLIC: ${publicPath}`);
            } catch (scanErr) {
                console.warn('Failed to save to public gallery:', scanErr);
            }

            // Always scan the sandbox file too
            NvrSdk.scanFile(actualPath).catch(() => { });

            setMediaToast({
                visible: true,
                type: 'picture',
                path: actualPath,
            });

            // Automatically hide toast after 4 seconds
            setTimeout(() => {
                setMediaToast(prev => {
                    if (prev && prev.path === actualPath) {
                        return null;
                    }
                    return prev;
                });
            }, 4000);

        } catch (e: any) {
            console.error('SNAPSHOT: Capture error', e);
            Alert.alert('Snapshot Failed', 'Check camera stream status.');
        } finally {
            setIsCapturing(false);
        }
    };

    const handleToggleRecord = async () => {
        if (userId === null || userId === undefined || userId < 0) {
            Alert.alert('Error', 'Not logged in to device.');
            return;
        }

        const handleObj = playbackHandles[currentChannel];
        if (currentChannel === undefined || !handleObj || !handleObj.handle) {
            Alert.alert('Error', 'No active channel selected or no video playing');
            return;
        }

        if (isRecording) {
            // STOP RECORDING
            const handleToStop = handleObj.handle;
            setIsRecording(false);
            const savedPath = recordingPathRef.current;
            const savedDuration = recordDuration;
            setRecordDuration(0);

            if (handleToStop) {
                (async () => {
                    try {
                        await NvrSdk.stopLocalRecord(String(handleToStop), false);
                        console.log('RECORD_STOP_SUCCESS');
                    } catch (e: any) {
                        console.warn('RECORD: stopLocalRecord warning:', e.message);
                    }

                    if (savedPath) {
                        // Wait 800ms
                        await new Promise(resolve => setTimeout(resolve, 800));

                        // Scan sandbox file
                        NvrSdk.scanFile(savedPath).catch(() => { });

                        // Copy to public Movies/VMS gallery
                        try {
                            const publicPath = await NvrSdk.saveMediaToPublic(savedPath, 'recording');
                            if (publicPath && publicPath !== savedPath) {
                                await NvrSdk.scanFile(publicPath);
                                console.log(`RECORD_SAVED_TO_PUBLIC: ${publicPath}`);
                            }
                        } catch (publicErr) {
                            console.warn('RECORD: Failed to save recording to public gallery:', publicErr);
                        }

                        const savedFileName = savedPath.split('/').pop() || `rec_${new Date().getTime()}.mp4`;

                        // Check if thumbnail actually exists on disk AND has real content (not a 0-byte placeholder)
                        let finalToastPath = savedPath;
                        let thumbnailDbPath = '';
                        const thumbPath = savedPath + '.jpg';
                        const hasThumb = await NvrSdk.checkFileExists(thumbPath);
                        if (hasThumb) {
                            const thumbSize = await NvrSdk.getFileSize(thumbPath);
                            if (thumbSize > 500) { // Must be a real JPEG, not an empty placeholder
                                finalToastPath = thumbPath;
                                thumbnailDbPath = thumbPath;
                            }
                        }

                        // Save metadata to backend DB
                        try {
                            const freshUser = await authStorage.getUser();
                            const userEmail = freshUser?.email || freshUser?.username || '';
                            const userIdVal = freshUser?.id || freshUser?._id || userId || -1;

                            api.saveMedia({
                                type: 'recording',
                                fileName: savedFileName,
                                filePath: savedPath,
                                thumbnailPath: thumbnailDbPath,
                                channelId: currentChannel,
                                deviceName: selectedDevice?.name || 'Unknown Device',
                                userEmail: String(userEmail),
                                userId: Number(userIdVal),
                            }).catch(e => {
                                console.log('RECORD: DB sync silent fail', e.message);
                            });
                        } catch (userErr) {
                            console.warn('RECORD: Failed to fetch user info for DB metadata:', userErr);
                        }

                        setMediaToast({
                            visible: true,
                            type: 'video',
                            path: finalToastPath,
                        });

                        setTimeout(() => {
                            setMediaToast(prev => {
                                if (prev && (prev.path === finalToastPath || prev.path === savedPath)) {
                                    return null;
                                }
                                return prev;
                            });
                        }, 5000);
                    }
                })();
            }
            recordingPathRef.current = null;
        } else {
            // START RECORDING
            const hasPermission = await requestStoragePermissions();
            if (!hasPermission) {
                Alert.alert('Permission Denied', 'Storage permissions are required to start recording.');
                return;
            }

            const hasSpace = await localSettings.checkDiskSpace(appLocalSettings?.reservedDiskSpace || 50);
            if (!hasSpace) {
                Alert.alert('Storage Full', 'Insufficient space for local recording.');
                return;
            }

            try {
                const freshUser = await authStorage.getUser();
                const userTag = (freshUser?.email || freshUser?.username || 'user').replace(/[^a-zA-Z0-9]/g, '_');
                const timestamp = new Date().getTime();
                const fileName = `rec_${currentChannel}_${timestamp}.mp4`;
                const path = `/sdcard/VMS/${userTag}/Records/${fileName}`;

                console.log('RECORD_START_REQUEST');
                console.log(`RECORD_HANDLE: ${handleObj.handle}`);
                console.log(`RECORD_PATH: ${path}`);

                const result = await NvrSdk.startLocalRecord(
                    String(handleObj.handle),
                    path,
                    false, // isLive = false for Playback
                    userId
                );

                if (!result) {
                    console.log('RECORD_START_FAILED: startLocalRecord returned false');
                    Alert.alert('Recording Failed', 'Stream is not ready. Please try again.');
                    setIsRecording(false);
                    recordingPathRef.current = null;
                    return;
                }

                console.log('RECORD_START_SUCCESS');
                setIsRecording(true);
                setRecordDuration(0);
                recordingPathRef.current = path;

                // Capture a thumbnail image immediately when recording starts (like in LiveView)
                const thumbPath = path + '.jpg';
                setTimeout(() => {
                    if (handleObj.handle && userId !== null) {
                        NvrSdk.captureSnapshotWithHandle(userId, currentChannel, thumbPath, handleObj.handle).catch(() => { });
                    }
                }, 800);

            } catch (e: any) {
                setIsRecording(false);
                recordingPathRef.current = null;
                const msg = e?.message || String(e);
                console.log(`RECORD_START_FAILED: ${msg}`);
                Alert.alert('Recording Failed', 'Failed to start recording. Please try again.');
            }
        }
    };

    const stopAllPlayback = async (excludeChannels: number[] = []) => {
        const handlesEntries = Object.entries(playbackHandlesRef.current);
        const handlesToStop = handlesEntries.filter(([ch]) => !excludeChannels.includes(Number(ch)));

        if (handlesToStop.length > 0) {
            console.log(`🛑 Stopping active playback handles (Excluding: ${excludeChannels})`);
            // Fire and forget stop commands to be faster
            handlesToStop.forEach(([_, hObj]) => {
                if (hObj && hObj.handle) {
                    NvrSdk.stopPlayback(hObj.handle).catch(() => { });
                }
            });
        }

        // Update Refs & State
        const newRef: any = {};
        const newState: any = {};

        excludeChannels.forEach(ch => {
            if (playbackHandlesRef.current[ch]) newRef[ch] = playbackHandlesRef.current[ch];
            if (playbackHandles[ch]) newState[ch] = playbackHandles[ch];
        });

        playbackHandlesRef.current = newRef;
        if (isMounted.current) {
            setPlaybackHandles(newState);
            // Only clear RTSP/Audio if we aren't excluding
            if (excludeChannels.length === 0) {
                setRtspUrls({});
                setAudioChannel(null);
            }
        }

        // Removed explicit delay for "micro-second" response
        return Promise.resolve();
    };

    // --- CLEANUP ON UNMOUNT ---
    useEffect(() => {
        return () => {
            console.log("Cleanup: Stopping all playback on unmount");
            isMounted.current = false;
            stopAllPlayback();
            NvrSdk.setOrientation(1); // Ensure back to Portrait
            StatusBar.setHidden(false);
        };
    }, []);

    // NEW: Handle initial fullscreen parameter
    useEffect(() => {
        if (route.params?.initialFullscreen) {
            setIsFullscreen(true);
            StatusBar.setHidden(true);
            NvrSdk.setOrientation(0); // Landscape
        }
    }, [route.params?.initialFullscreen]);

    // --- HW BACK HANDLER ---
    useEffect(() => {
        const backAction = () => {
            if (isFullscreen) {
                setIsFullscreen(false);
                StatusBar.setHidden(false);
                NvrSdk.setOrientation(1); // Portrait
                return true;
            }
            return false;
        };
        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, [isFullscreen]);

    // --- RECORDING TIMER ---
    useEffect(() => {
        let interval: any;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordDuration(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const jumpRequestIdRef = useRef(0);
    const isSeekingRef = useRef(false);
    const lastSeekTimeRef = useRef<number>(0);

    const jumpToTime = async (date: Date, isFinal: boolean = false, targetChannel?: number, keepSpeedAndDirection: boolean = false) => {
        if (!userId) return;

        const targetMs = date.getTime();
        // 🛑 GUARD: Prevents redundant jumps to the exact same millisecond
        if (isFinal && targetMs === lastSeekTimeRef.current && targetChannel === undefined) {
            console.log("[JumpToTime] Skipping duplicate final jump");
            return;
        }

        // 🛑 GUARD: If already seeking, skip debounced updates (but ALWAYS allow final release)
        if (isSeekingRef.current && !isFinal) {
            return;
        }

        const requestId = ++jumpRequestIdRef.current;
        isSeekingRef.current = true;
        if (isFinal && targetChannel === undefined) lastSeekTimeRef.current = targetMs;

        const now = Date.now();
        // 🚀 SDK STABILITY: Strictly enforce 400ms between jump attempts to prevent Error 87
        if (now - lastJumpTimeRef.current < 400) return;
        lastJumpTimeRef.current = now;

        console.log(`[JumpToTime] Request ${requestId} started for ${date.toLocaleTimeString()} (Target CH: ${targetChannel})`);

        // 🚀 OPTIMISTIC UI: Update time immediately for instant timeline feedback
        let targetDate = new Date(date);
        if (targetChannel === undefined || targetChannel === currentChannel) {
            setCurrentDate(targetDate);
            setTempTime(targetDate);
            setIsPlaying(true);
            if (!keepSpeedAndDirection && playbackDirection !== 'backward') {
                setPlaybackSpeed(1);
            }
        }

        const channelsToStart = targetChannel !== undefined ? [targetChannel] : visibleChannels;
        channelsToStart.forEach(ch => {
            channelTimesRef.current[ch] = targetDate;
            const state = getChannelPlaybackState(ch);
            state.isPlaying = true;
            if (!keepSpeedAndDirection) {
                state.speed = 1;
                state.direction = 'forward';
            }
        });

        // --- Audio Cleanup before jump ---
        if (audioChannel !== null && channelsToStart.includes(audioChannel)) {
            const h = playbackHandlesRef.current[audioChannel];
            if (h && h.handle) NvrSdk.playbackControl(h.handle, NvrSdk.PLAYBACK_CMD.STOPAUDIO).catch(() => { });
        }

        isStartingRef.current = true;
        const currentRequestHandles: string[] = []; // Track all handles started in this specific request

        try {
            console.log("Selected:", formatTime(targetDate));
            console.log("Files:", filteredFiles.length);

            // 1. SuperLive+ Smart Snap Logic: Always verify recording exists before seek
            if (filteredFiles.length > 0) {
                const targetMs = targetDate.getTime();
                const isValid = filteredFiles.some(f => {
                    const s = safeParseDate(f.start).getTime();
                    const e = safeParseDate(f.end).getTime();
                    return targetMs >= s && targetMs <= e;
                });

                if (!isValid) {
                    // No recording found at exact time, snap to the closest segment
                    const sortedFiles = [...filteredFiles].sort((a, b) =>
                        Math.abs(safeParseDate(a.start).getTime() - targetMs) -
                        Math.abs(safeParseDate(b.start).getTime() - targetMs)
                    );
                    targetDate = safeParseDate(sortedFiles[0].start);
                    if (targetChannel === undefined || targetChannel === currentChannel) {
                        setCurrentDate(targetDate);
                        setTempTime(targetDate);
                    }
                    channelsToStart.forEach(ch => {
                        channelTimesRef.current[ch] = targetDate;
                    });
                    console.log(`[JumpToTime] No recording at selected time. Snapped to closest:`, formatTime(targetDate));
                }
            } else {
                console.log("[JumpToTime] No files to snap to. Proceeding with blind seek.");
            }

            // 2. Format times — use END OF DAY as end window (NVRs reject small windows, ErrorCode 9)
            const startStr = formatTime(targetDate);
            const endDate = new Date(targetDate);
            endDate.setHours(23, 59, 59, 999); // Always use end of selected day
            const endStr = formatTime(endDate);

            // 🚀 SEAMLESS SWAP: Stop old handles immediately and AWAIT completion
            const oldHandles = targetChannel !== undefined
                ? [playbackHandlesRef.current[targetChannel]?.handle].filter(Boolean)
                : Object.values(playbackHandlesRef.current).map(h => h.handle).filter(Boolean);

            if (oldHandles.length > 0) {
                console.log(`[JumpToTime] Stopping ${oldHandles.length} existing streams...`);
                await Promise.all(oldHandles.map(h => NvrSdk.stopPlayback(h as string).catch(() => { })));
            }

            // 🚀 SDK COOL-DOWN: Allow NVR socket resources to clear out fully (Critical for TVT Error 87 & 15)
            const coolDown = oldHandles.length > 0 ? 150 : 0;
            if (coolDown > 0) {
                await new Promise<void>(resolve => setTimeout(resolve, coolDown));
            }

            // Check if cancelled before starting loop
            if (requestId !== jumpRequestIdRef.current) {
                console.log(`[JumpToTime] Request ${requestId} ABORTED after stop/sleep`);
                return;
            }

            // 3. Start new streams in parallel with small staggered start intervals to prevent thread exhaustion
            const results = await Promise.all(channelsToStart.map(async (ch, index) => {
                // Short staggered delay to space out socket allocations slightly
                await new Promise<void>(resolve => setTimeout(resolve, index * 40));

                // 🛑 NEW REQUEST GUARD: Stop immediately if a newer jump was triggered
                if (requestId !== jumpRequestIdRef.current) return null;

                try {
                    console.log(`[JumpToTime] FINAL PLAYBACK TIME: ${startStr} (CH ${ch})`);
                    // Force streamType to 0 (Main Stream) since playback only supports main stream
                    const res: any = await NvrSdk.startPlayback(userId, ch, startStr, endStr, 0);

                    if (res && res.handle) {
                        currentRequestHandles.push(res.handle);

                        // 🛑 DOUBLE CHECK: Ensure no newer request arrived while startPlayback was awaiting
                        if (requestId !== jumpRequestIdRef.current) {
                            console.log(`[JumpToTime] Request ${requestId} cleaning up orphaned handle for CH ${ch}`);
                            NvrSdk.stopPlayback(res.handle).catch(() => { });
                            return null;
                        }

                        // Apply speed if state.direction is forward and state.speed > 1
                        const state = getChannelPlaybackState(ch);
                        if (state.direction === 'forward' && state.speed > 1) {
                            const speedMap: { [key: number]: number } = { 1: 6, 2: 7, 4: 8, 8: 9, 16: 10 };
                            const speedVal = speedMap[state.speed] || 6;
                            console.log(`🚀 [JumpToTime] Applying speed ${state.speed}X (SDK=${speedVal}) to new handle ${res.handle}...`);
                            NvrSdk.playbackControl(res.handle, NvrSdk.PLAYBACK_CMD.FF, speedVal).catch(e => console.log('Speed control failed in jumpToTime', e));
                        } else if (state.direction === 'backward' && state.isNativeRewind) {
                            const speedMap: { [key: number]: number } = { 1: 6, 2: 7, 4: 8, 8: 9, 16: 10 };
                            const speedVal = speedMap[state.speed] || 6;
                            console.log(`🚀 [JumpToTime] Applying native rewind speed ${state.speed}X (SDK=${speedVal}) to new handle ${res.handle}...`);
                            NvrSdk.playbackControl(res.handle, NvrSdk.PLAYBACK_CMD.RW, speedVal).catch(e => console.log('Native rewind failed in jumpToTime', e));
                        }

                        lastPlayedTimeRef.current[ch] = startStr;
                        return { ch, handle: res.handle, realChannel: res.realChannel, status: 'OK' };
                    }
                } catch (err: any) {
                    console.log(`❌ Playback failed for CH ${ch}:`, err);

                    // 🚀 AUTO-RELOGIN for ErrorCode 20 (Invalid Session)
                    if (err?.message?.includes('ErrorCode: 20')) {
                        console.log("[JumpToTime] Session expired (ErrorCode 20). Attempting re-login...");
                        try {
                            const newUserId = await deviceSessionManager.reconnectDevice(String(selectedDevice!.id));
                            if (newUserId && newUserId > 0) {
                                setUserIdWithRef(newUserId);
                                // Retry ONE more time with main stream (0)
                                const retryRes: any = await NvrSdk.startPlayback(newUserId, ch, startStr, endStr, 0);
                                if (retryRes && retryRes.handle) {
                                    currentRequestHandles.push(retryRes.handle);

                                    // Apply speed if state.direction is forward and state.speed > 1
                                    const state = getChannelPlaybackState(ch);
                                    if (state.direction === 'forward' && state.speed > 1) {
                                        const speedMap: { [key: number]: number } = { 1: 6, 2: 7, 4: 8, 8: 9, 16: 10 };
                                        const speedVal = speedMap[state.speed] || 6;
                                        console.log(`🚀 [JumpToTime] Applying speed ${state.speed}X (SDK=${speedVal}) to new handle ${retryRes.handle}...`);
                                        NvrSdk.playbackControl(retryRes.handle, NvrSdk.PLAYBACK_CMD.FF, speedVal).catch(e => console.log('Speed control failed in jumpToTime retry', e));
                                    } else if (state.direction === 'backward' && state.isNativeRewind) {
                                        const speedMap: { [key: number]: number } = { 1: 6, 2: 7, 4: 8, 8: 9, 16: 10 };
                                        const speedVal = speedMap[state.speed] || 6;
                                        console.log(`🚀 [JumpToTime] Applying native rewind speed ${state.speed}X (SDK=${speedVal}) to new handle ${retryRes.handle}...`);
                                        NvrSdk.playbackControl(retryRes.handle, NvrSdk.PLAYBACK_CMD.RW, speedVal).catch(e => console.log('Native rewind failed in jumpToTime retry', e));
                                    }

                                    lastPlayedTimeRef.current[ch] = startStr;
                                    return { ch, handle: retryRes.handle, realChannel: retryRes.realChannel, status: 'OK' };
                                }
                            }
                        } catch (reloginErr) {
                            console.error("[JumpToTime] Auto-relogin failed:", reloginErr);
                        }
                    }
                }
                return { ch, handle: null, realChannel: ch, status: 'NO_DATA' };
            }));

            // Final Guard before updating state
            if (requestId !== jumpRequestIdRef.current) {
                console.log(`[JumpToTime] Request ${requestId} CLEANUP started handles`);
                await Promise.all(currentRequestHandles.map(h => NvrSdk.stopPlayback(h).catch(() => { })));
                return;
            }

            const newHandles = targetChannel !== undefined ? { ...playbackHandlesRef.current } : {};
            results.forEach(r => {
                if (r) newHandles[r.ch] = { handle: r.handle, realChannel: r.realChannel, status: r.status };
            });

            playbackHandlesRef.current = newHandles;
            if (isMounted.current) {
                setPlaybackHandles(newHandles);
            }
            console.log(`[JumpToTime] Request ${requestId} SUCCESS`);

        } catch (error) {
            console.error('Jump failed:', error);
        } finally {
            if (requestId === jumpRequestIdRef.current) {
                isStartingRef.current = false;
                isSeekingRef.current = false;

                // 🚀 Sync Audio after jump (if forward)
                if (audioChannel !== null && playbackDirection === 'forward') {
                    if (channelsToStart.includes(audioChannel)) {
                        const h = playbackHandlesRef.current[audioChannel];
                        if (h && h.handle) {
                            NvrSdk.playbackControl(h.handle, NvrSdk.PLAYBACK_CMD.STARTAUDIO).catch(() => { });
                        }
                    }
                }
            } else {
                currentRequestHandles.forEach(h => {
                    let stillInUse = false;
                    Object.values(playbackHandlesRef.current).forEach(ph => { if (ph.handle === h) stillInUse = true; });
                    if (!stillInUse) NvrSdk.stopPlayback(h).catch(() => { });
                });
            }
        }
    };

    const togglePlay = async () => {
        const nextState = !isPlaying;

        // Update all visible channels' playing state
        visibleChannels.forEach(ch => {
            const state = getChannelPlaybackState(ch);
            if (state.direction === 'backward' && nextState) {
                state.direction = 'forward';
                state.speed = 1;
            }
            state.isPlaying = nextState;
        });

        setIsPlaying(nextState);

        // If we were in rewind mode and we are resuming, trigger a jump to sync all channels to the same forward play speed/time
        const anyInRewind = visibleChannels.some(ch => getChannelPlaybackState(ch).direction === 'backward');
        if (anyInRewind && nextState) {
            setPlaybackDirection('forward');
            setPlaybackSpeed(1);
            const targetTime = channelTimesRef.current[currentChannel] || currentDate;
            jumpToTime(targetTime, true);
            return;
        }

        // Broadcast the play/pause command to all active handles in the grid
        await Promise.all(visibleChannels.map(async (ch) => {
            const h = playbackHandlesRef.current[ch];
            if (!h || !h.handle) return;

            const cmd = nextState ? NvrSdk.PLAYBACK_CMD.RESUME : NvrSdk.PLAYBACK_CMD.PAUSE;
            console.log(`🎬 [CH ${ch}] ${nextState ? 'Resuming' : 'Pausing'} stream (Handle: ${h.handle})...`);

            // Audio sync
            if (audioChannel === ch) {
                const audioCmd = nextState ? NvrSdk.PLAYBACK_CMD.STARTAUDIO : NvrSdk.PLAYBACK_CMD.STOPAUDIO;
                NvrSdk.playbackControl(h.handle, audioCmd).catch(() => { });
            }

            await NvrSdk.playbackControl(h.handle, cmd).catch(e => console.log(`Control failed for CH ${ch}`, e));
        }));
    };

    // --- PLAYBACK TIMER (Step 9: Timeline Cursor Sync) ---
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        const anyPlaying = visibleChannelsRef.current.some(ch => {
            const h = playbackHandlesRef.current[ch];
            return h && h.handle && getChannelPlaybackState(ch).isPlaying;
        });

        if (anyPlaying && !isLoading && !isUserScrollingRef.current) {
            const tickMs = 250;
            interval = setInterval(() => {
                if (!isMounted.current || isUserScrollingRef.current) return;

                visibleChannelsRef.current.forEach(ch => {
                    const h = playbackHandlesRef.current[ch];
                    if (!h || !h.handle) return;

                    const state = getChannelPlaybackState(ch);
                    if (!state.isPlaying) return;

                    const currentChTime = channelTimesRef.current[ch] || currentDate;
                    const delta = tickMs * state.speed * (state.direction === 'backward' ? -1 : 1);
                    channelTimesRef.current[ch] = new Date(currentChTime.getTime() + delta);
                });

                const selectedChTime = channelTimesRef.current[currentChannel] || currentDate;
                setCurrentDate(selectedChTime);
                tempTimeRef.current = selectedChTime;
            }, tickMs);
        }
        return () => clearInterval(interval);
    }, [isPlaying, isLoading, currentChannel, playbackSpeed, playbackDirection]);

    // --- REWIND SIMULATION ENGINE (Step 5: Simulated Rewind Control) ---
    useEffect(() => {
        let interval: any;
        const focusedState = getChannelPlaybackState(currentChannel);
        if (focusedState.isPlaying && focusedState.direction === 'backward' && !focusedState.isNativeRewind && !isLoading && !isStartingRef.current && !isUserScrollingRef.current) {
            const speed = Math.abs(focusedState.speed);
            const jumpInterval = speed >= 8 ? 500 : 1000;
            interval = setInterval(() => {
                if (!isMounted.current) return;
                const targetTime = channelTimesRef.current[currentChannel] || currentDate;
                jumpToTime(targetTime, true, undefined, true);
            }, jumpInterval);
        }
        return () => clearInterval(interval);
    }, [isPlaying, playbackDirection, isLoading, currentChannel, visibleChannels]);

    // --- FILTER WATCHDOG (Step 8: Auto-Skip & Step 10: Real-time Switch) ---
    useEffect(() => {
        if (!isPlaying || isLoading || isStartingRef.current || skipNextInitRef.current) return;
        if (recordingFiles.length === 0) return;

        const watchdogTimer = setTimeout(() => {
            if (!isPlaying || isLoading || isStartingRef.current) return;

            try {
                const currentMs = currentDate.getTime();

                const isValid = filteredFiles.some(f => {
                    const s = safeParseDate(f.start).getTime();
                    const e = safeParseDate(f.end).getTime();
                    return currentMs >= s && currentMs < (e - 1000);
                });

                if (!isValid) {
                    const futureFiles = filteredFiles.filter(f => safeParseDate(f.start).getTime() > currentMs);
                    if (futureFiles.length > 0) {
                        futureFiles.sort((a, b) => safeParseDate(a.start).getTime() - safeParseDate(b.start).getTime());
                        const nextEvent = futureFiles[0];
                        const nextStart = safeParseDate(nextEvent.start);

                        jumpToTime(nextStart);
                    } else {
                        console.log("🔹 Watchdog: End of filtered events.");
                        setPlaybackSpeed(1);
                        setIsPlaying(false);
                        getChannelPlaybackState(currentChannel).isPlaying = false;
                    }
                }
            } catch (e) {
                console.error("Watchdog failed", e);
            }
        }, 1000);

        return () => clearTimeout(watchdogTimer);
    }, [isPlaying, isLoading, currentDate.getTime(), filteredFiles.length, selectedRecordingTypes.length]);

    // TVT SDK Speed Constants: 1x=6, 2x=7, 4x=8, 8x=9
    // TVT SDK Speed Constants: 1x=6, 2x=7, 4x=8, 8x=9, 16x=10 (Guessed or Standard)
    const SDK_SPEEDS: { [key: number]: number } = {
        1: 6,
        2: 7,
        4: 8,
        8: 9,
        16: 10 // Assuming 16x maps to 10 based on standard linear mapping in many SDKs, or we can look it up.
        // If 16x fails (no effect), we might need to verify this value.
        // TVT often uses enum: SLOW=-1, NORMAL=0, FAST=1 (2x), FAST2=2 (4x), FAST3=3 (8x), FAST4=4 (16x).
        // But the Java constant map seemed to use different ints.
        // Let's stick to the existing map logic + one more step.
    };

    const handleSpeedChange = () => {
        if (playbackDirection === 'backward') {
            // Switch back to forward 2x speed
            handleSelectSpeed(2, true);
        } else {
            const speeds = [1, 2, 4, 8, 16];
            const currentIndex = speeds.indexOf(playbackSpeed);
            const nextIndex = (currentIndex + 1) % speeds.length;
            handleSelectSpeed(speeds[nextIndex]);
        }
    };

    const handleSelectSpeed = async (speed: number, forceForwardReset: boolean = false) => {
        // Optimistic UI: Update immediately
        setIsSpeedModalVisible(false);
        
        let directionChanged = false;
        
        visibleChannels.forEach(ch => {
            const state = getChannelPlaybackState(ch);
            if (forceForwardReset) {
                state.direction = 'forward';
                directionChanged = true;
            }
            state.speed = speed;
            state.isPlaying = true;
        });

        setIsPlaying(true);
        
        if (forceForwardReset) {
            setPlaybackDirection('forward');
        }

        const isBackward = playbackDirection === 'backward' && !forceForwardReset;
        setPlaybackSpeed(isBackward ? -speed : speed);

        if (directionChanged) {
            const targetTime = channelTimesRef.current[currentChannel] || currentDate;
            jumpToTime(targetTime, true, undefined, true);
            return;
        }

        // Apply speed command to all active handles of visible channels
        const speedMap: { [key: number]: number } = { 1: 6, 2: 7, 4: 8, 8: 9, 16: 10 };
        const speedVal = speedMap[speed] || 6;

        await Promise.all(visibleChannels.map(async (ch) => {
            const state = getChannelPlaybackState(ch);
            const h = playbackHandlesRef.current[ch];
            if (!h || !h.handle) return;

            if (isBackward) {
                if (state.isNativeRewind) {
                    console.log(`🚀 [CH ${ch}] Changing native rewind speed to ${speed}X (SDK=${speedVal}) for handle ${h.handle}...`);
                    NvrSdk.playbackControl(h.handle, NvrSdk.PLAYBACK_CMD.RW, speedVal).catch(e => console.log('Rewind speed control failed', e));
                } else {
                    console.log(`🚀 [CH ${ch}] Changing simulated rewind speed to ${speed}X...`);
                }
            } else {
                const cmd = speed === 1 ? NvrSdk.PLAYBACK_CMD.RESUME : NvrSdk.PLAYBACK_CMD.FF;
                console.log(`🚀 [CH ${ch}] Changing forward speed to ${speed}X (SDK=${speedVal}) for handle ${h.handle}...`);
                NvrSdk.playbackControl(h.handle, cmd, speedVal).catch(e => console.log('Forward speed control failed', e));
            }
        }));
    };

    const handleToggleAudio = async () => {
        const targetCh = currentChannel;
        const handleObj = playbackHandlesRef.current[targetCh]; // Use ref for current data

        if (!handleObj || !handleObj.handle) {
            console.log("No handle for audio");
            Alert.alert("Audio", "No video playing on selected channel");
            return;
        }

        // Optimistic UI: Toggle immediately
        const prevAudioChannel = audioChannel;
        const newAudioChannel = audioChannel === targetCh ? null : targetCh;
        setAudioChannel(newAudioChannel);

        // Fire-and-forget: SDK calls in background
        (async () => {
            try {
                if (prevAudioChannel === targetCh) {
                    // Turn OFF
                    console.log(`🔇 Stopping Audio for Ch ${targetCh}`);
                    await NvrSdk.playbackControl(String(handleObj.handle), NvrSdk.PLAYBACK_CMD.STOPAUDIO);
                } else {
                    // If another channel has audio, turn it OFF first (using ref to catch previous handle)
                    if (prevAudioChannel !== null) {
                        const oldObj = playbackHandlesRef.current[prevAudioChannel];
                        if (oldObj && oldObj.handle) {
                            await NvrSdk.playbackControl(String(oldObj.handle), NvrSdk.PLAYBACK_CMD.STOPAUDIO).catch(() => { });
                        }
                    }
                    // Turn ON for current channel
                    console.log(`🔊 Starting Audio for Ch ${targetCh} (Handle: ${handleObj.handle})`);
                    await NvrSdk.playbackControl(String(handleObj.handle), NvrSdk.PLAYBACK_CMD.STARTAUDIO);
                    await NvrSdk.playbackControl(String(handleObj.handle), NvrSdk.PLAYBACK_CMD.VOLUME, 100).catch(e => console.log("Volume set failed (ignorable)", e));
                }
            } catch (e: any) {
                console.error("Audio toggle failed:", e);
                // Revert UI on failure
                setAudioChannel(prevAudioChannel);
                Alert.alert("Audio Error", "Failed to toggle audio");
            }
        })();
    };

    const handleRewind = async () => {
        const speeds = [1, 2, 4, 8, 16]; // Rewind speeds
        let nextRewindSpeed = 2; // Default to 2x when switching directions

        const currentChState = getChannelPlaybackState(currentChannel);
        if (currentChState.direction === 'backward') {
            const currentIndex = speeds.indexOf(Math.abs(currentChState.speed));
            nextRewindSpeed = speeds[(currentIndex + 1) % speeds.length];
        }

        setIsPlaying(true);
        setPlaybackDirection('backward');
        setPlaybackSpeed(-nextRewindSpeed);

        // Apply rewind to all visible channels
        await Promise.all(visibleChannels.map(async (ch) => {
            const state = getChannelPlaybackState(ch);
            const h = playbackHandlesRef.current[ch];
            let nativeRewindSuccess = false;

            if (h && h.handle) {
                try {
                    const speedMap: { [key: number]: number } = { 1: 6, 2: 7, 4: 8, 8: 9, 16: 10 };
                    const speedVal = speedMap[nextRewindSpeed] || 6;
                    console.log(`🚀 [CH ${ch}] Attempting Native Rewind to speed ${nextRewindSpeed}X (SDK=${speedVal}) for handle ${h.handle}...`);
                    const result = await NvrSdk.playbackControl(h.handle, NvrSdk.PLAYBACK_CMD.RW, speedVal);
                    if (result) {
                        console.log(`✅ [CH ${ch}] Native Rewind SUCCESS`);
                        nativeRewindSuccess = true;
                    } else {
                        console.log(`⚠️ [CH ${ch}] Native Rewind returned FALSE (not supported by NVR)`);
                    }
                } catch (err) {
                    console.log(`❌ [CH ${ch}] Native Rewind call failed:`, err);
                }
            }

            if (nativeRewindSuccess) {
                state.isNativeRewind = true;
            } else {
                console.log(`⏪ [CH ${ch}] Falling back to Simulated Rewind ${nextRewindSpeed}X...`);
                state.isNativeRewind = false;
                // Stop current playback stream only for simulated rewind
                if (h && h.handle) {
                    await NvrSdk.stopPlayback(h.handle).catch(() => { });
                }
            }

            state.isPlaying = true;
            state.direction = 'backward';
            state.speed = nextRewindSpeed;
        }));
    };

    // --- MAIN INIT ---
    useEffect(() => {
        isMounted.current = true;
        // Consolidated recorded days fetching moved to bottom useEffect

        const init = async () => {
            if (!deviceId) return;

            const requestId = ++currentRequestIdRef.current;

            // ✅ prevent recursive init caused by internal setCurrentDate or state updates
            if (skipNextInitRef.current) {
                console.log("Init: Skipping recursive call (skip flag is set)");
                skipNextInitRef.current = false;
                return;
            }

            const targetDateStr = currentDate.toDateString();
            const initKey = `${deviceId}-${targetDateStr}`;
            const isFirstRun = lastInitKey.current === '';
            const forceReInit = isManualDateChangeRef.current;
            isManualDateChangeRef.current = false;
            const focusChangedOnly = lastInitKey.current === initKey && lastDeviceIdRef.current === String(deviceId) && !forceReInit;

            const isOnlyFocusChange = focusChangedOnly &&
                lastFocusedChannelRef.current !== undefined &&
                lastFocusedChannelRef.current !== currentChannel &&
                visibleChannelsRef.current.includes(currentChannel) &&
                visibleChannelsRef.current.every(ch => {
                    const h = playbackHandlesRef.current[ch];
                    return h && h.handle && h.status === 'OK';
                });

            lastFocusedChannelRef.current = currentChannel;
            lastInitKey.current = initKey;

            try {
                // 🚀 SMART LOADING: Don't show full-screen spinner if just adding channels on the same day
                const isMajorChange = !focusChangedOnly || isFirstRun;
                if (isMajorChange && isMounted.current) {
                    setIsLoading(true);
                }

                isStartingRef.current = true;
                // 🚀 KEY FIX: Always use the ref (never the stale closure) so session refresh doesn't confuse init
                let loginHandle = userIdRef.current;

                let devices = allDevices;
                if (!devices || devices.length === 0) {
                    devices = await deviceStorage.getDevices();
                    if (isMounted.current) setAllDevices(devices);
                }

                let target = devices.find(d => 
                    String(d.id) === String(deviceId) || 
                    (d.deviceId && String(d.deviceId) === String(deviceId)) ||
                    (d.sn && String(d.sn) === String(deviceId))
                );

                // Fallback: If deviceId is a sub-channel
                if (!target && String(deviceId).includes('_ch')) {
                    const parentId = String(deviceId).split('_ch')[0];
                    target = devices.find(d => 
                        String(d.id) === parentId ||
                        (d.deviceId && String(d.deviceId) === parentId) ||
                        (d.sn && String(d.sn) === parentId)
                    );
                }

                if (!target) {
                    if (requestId === currentRequestIdRef.current) {
                        isStartingRef.current = false;
                    }
                    return;
                }

                setSelectedDevice(target);

                // Check if device changed to reset grid, or if a new initial channel ID is requested
                const isNewDevice = lastDeviceIdRef.current !== String(deviceId);
                const isNewInitialChannel = initialChannelId !== undefined && String(initialChannelId) !== String(lastInitialChannelIdRef.current);
                lastDeviceIdRef.current = String(deviceId);
                lastInitialChannelIdRef.current = initialChannelId !== undefined ? Number(initialChannelId) : undefined;

                let channelsToPlay: number[] = [];

                if (isNewDevice || isNewInitialChannel) {
                    // --- GRID INIT Logic (Always start with 1x1 for playback to save resources) ---
                    let newGrid: GridType = '1x1';
                    let newVisibleChannels: number[] = [];

                    if (initialChannelId !== undefined) {
                        newVisibleChannels = [Number(initialChannelId)];
                        channelsToPlay = [Number(initialChannelId)];
                    } else {
                        newVisibleChannels = [0];
                        channelsToPlay = [0];
                    }

                    // NEW: Populate channel names from device storage
                    const cNames: { [key: number]: string } = {};
                    if (target.channels && Array.isArray(target.channels)) {
                        target.channels.forEach(ch => {
                            cNames[ch.id] = ch.name || `CH ${ch.id + 1}`;
                        });
                    }

                    visibleChannelsRef.current = newVisibleChannels;
                    if (isMounted.current) {
                        setGridType(newGrid);
                        setVisibleChannels(newVisibleChannels);
                        setChannelNames(cNames);
                        if (initialChannelId !== undefined) setCurrentChannel(Number(initialChannelId));
                        setIsLoading(true);
                    }
                } else {
                    // StartTime Changed? (Notification Click on SAME device)
                    if (initialChannelId !== undefined && startTime && String(startTime) !== String(lastStartTimeRef.current)) {
                        const targetCh = Number(initialChannelId);
                        console.log(`[Playback] Notification Switch to Ch ${targetCh}`);
                        channelsToPlay = [targetCh];
                        visibleChannelsRef.current = channelsToPlay;
                        if (isMounted.current) {
                            setGridType('1x1');
                            setVisibleChannels(channelsToPlay);
                            setCurrentChannel(targetCh);
                        }
                    } else {
                        // Keep current view state — play ALL visible channels in the current grid
                        const latestVisible = visibleChannelsRef.current;
                        channelsToPlay = latestVisible.length > 0
                            ? latestVisible
                            : [currentChannel !== undefined ? currentChannel : 0];
                    }
                }

                // Update tracker
                lastStartTimeRef.current = startTime;

                // STEP 1: Login (if needed)
                if (!loginHandle) {
                    loginHandle = await deviceSessionManager.ensureSession(String(target.id));
                    if (loginHandle === undefined || loginHandle < 0) {
                        throw new Error("Login failed: Invalid UserID from DeviceSessionManager");
                    }
                    if (isMounted.current) setUserIdWithRef(loginHandle);
                }

                if (requestId !== currentRequestIdRef.current) return;

                const isNotificationMode = !!eventTime;

                let isMatchingDay = false;
                let finalPlaybackTime = formatTime(currentDate);
                if (isNotificationMode && parsedStartTime) {
                    finalPlaybackTime = formatTime(parsedStartTime);
                    if (Math.abs(parsedStartTime.getTime() - currentDate.getTime()) > 1000) {
                        skipNextInitRef.current = true;
                        if (isMounted.current) {
                            setCurrentDate(parsedStartTime);
                            setTempTime(parsedStartTime);
                        }
                    }
                } else {
                    isMatchingDay = !!(parsedStartTime && isSameDay(parsedStartTime, currentDate) && !skipNextSnapRef.current);
                    if (isMatchingDay) {
                        const alarmDate = new Date(parsedStartTime);
                        alarmDate.setSeconds(alarmDate.getSeconds() - 2);
                        if (Math.abs(alarmDate.getTime() - currentDate.getTime()) > 1000) {
                            skipNextInitRef.current = true;
                            if (isMounted.current) {
                                setCurrentDate(alarmDate);
                                setTempTime(alarmDate);
                            }
                        }
                        finalPlaybackTime = formatTime(alarmDate);
                    }
                }

                // Helper to start playback handles
                const startVideoStreams = async (startTimeStr: string) => {
                    // Force cleanup only for handles NOT in the new list
                    const playSet = new Set(channelsToPlay);
                    const currentHandles = Object.entries(playbackHandlesRef.current);

                    const cleanupPromises = currentHandles.map(async ([chKey, hObj]) => {
                        const ch = Number(chKey);
                        if (!playSet.has(ch) && hObj?.handle) {
                            console.log(`[Playback] Cleanup: Stopping stale CH ${ch}`);
                            await NvrSdk.stopPlayback(hObj.handle).catch(() => { });
                            delete playbackHandlesRef.current[ch];
                            if (isMounted.current) {
                                setPlaybackHandles(prev => {
                                    const next = { ...prev };
                                    delete next[ch];
                                    return next;
                                });
                            }
                        }
                    });

                    await Promise.all(cleanupPromises);

                    const tDate = new Date(startTimeStr.includes(' ') ? startTimeStr.replace(' ', 'T') : startTimeStr);
                    const endDate = new Date(tDate);
                    // Optimized: Use 30-minute window for faster initial load
                    endDate.setHours(23, 59, 59, 999);
                    const windowEndStr = formatTime(endDate);

                    console.log(`[Playback] init -> Starting ${channelsToPlay.length} streams at ${startTimeStr}`);

                    const batchSize = 8; // Maximize parallel execution (was 2)
                    const NEXT_BATCH_DELAY = 100; // Minimal inter-batch wait (was 300)

                    for (let i = 0; i < channelsToPlay.length; i += batchSize) {
                        const batch = channelsToPlay.slice(i, i + batchSize);
                        console.log(`[Playback] init -> Starting batch ${Math.floor(i / batchSize) + 1}: CH ${batch.join(', ')}`);

                        await Promise.all(batch.map(async (ch, index) => {
                            // Short staggered delay to space out socket allocations slightly
                            await new Promise<void>(resolve => setTimeout(resolve, index * 40));
                            try {
                                const oldH = playbackHandlesRef.current[ch];
                                const streamType = 0; // Force Main Stream (0) since NVRs only support main-stream playback

                                // 🚀 DIFFERENTIAL START: If already playing the EXACT same request, skip.
                                // But we must NOT skip if the time (finalPlaybackTime) has changed.
                                const lastPlayedTime = lastPlayedTimeRef.current[ch];
                                if (!isNotificationMode && focusChangedOnly && oldH && oldH.handle && oldH.status === 'OK' && (oldH as any).streamType === streamType && lastPlayedTime === finalPlaybackTime) {
                                    console.log(`[Playback] init -> Ch ${ch} already playing correct stream at ${finalPlaybackTime}, skipping.`);
                                    return;
                                }

                                lastPlayedTimeRef.current[ch] = finalPlaybackTime;

                                if (oldH && oldH.handle) {
                                    await NvrSdk.stopPlayback(oldH.handle).catch(() => { });
                                }

                                const res: any = await NvrSdk.startPlayback(loginHandle, ch, startTimeStr, windowEndStr, streamType);
                                const handle = typeof res === 'object' ? res.handle : res;
                                const workedCh = typeof res === 'object' ? res.realChannel : ch;
                                const isValid = handle && String(handle) !== '0' && String(handle) !== '-1' && String(handle) !== 'null' && String(handle) !== 'undefined';

                                console.log(`[AI-PUSH] SDK PlayBackByTime result: ${handle} (Channel: ${ch}, Stream: ${streamType})`);

                                if (isValid) {
                                    const entry = { handle, realChannel: workedCh, status: 'OK', streamType };
                                    playbackHandlesRef.current[ch] = entry as any;

                                    const state = getChannelPlaybackState(ch);
                                    state.isPlaying = true;
                                    state.speed = 1;
                                    state.direction = 'forward';
                                    channelTimesRef.current[ch] = new Date(currentDate);

                                    if (isMounted.current) setPlaybackHandles(prev => ({ ...prev, [ch]: entry }));
                                } else {
                                    const entry = { handle: null, realChannel: ch, status: 'NO_DATA', streamType };
                                    playbackHandlesRef.current[ch] = entry as any;

                                    const state = getChannelPlaybackState(ch);
                                    state.isPlaying = false;

                                    if (isMounted.current) setPlaybackHandles(prev => ({ ...prev, [ch]: entry }));
                                }
                            } catch (e: any) {
                                console.log(`[AI-PUSH] SDK PlayBackByTime result: FAILED (Channel: ${ch}, Error: ${e})`);
                                const entry = { handle: null, realChannel: ch, status: 'ERROR', streamType: (gridType === '1x1' ? 0 : 1) };
                                playbackHandlesRef.current[ch] = entry as any;

                                const state = getChannelPlaybackState(ch);
                                state.isPlaying = false;

                                if (isMounted.current) setPlaybackHandles(prev => ({ ...prev, [ch]: entry }));
                            }
                        }));
                        // Actually wait between batches to prevent SDK/Bridge flooding
                        if (i + batchSize < channelsToPlay.length) {
                            await new Promise<void>(r => setTimeout(() => r(), NEXT_BATCH_DELAY));
                        }
                    }
                    if (isMounted.current) {
                        channelsToPlay.forEach(ch => {
                            const state = getChannelPlaybackState(ch);
                            state.isPlaying = true;
                            state.speed = 1;
                            state.direction = 'forward';
                            channelTimesRef.current[ch] = new Date(currentDate);
                        });
                        setIsPlaying(true);

                        // 🚀 Sync Audio after init (if forward)
                        if (audioChannel !== null && playbackDirection === 'forward') {
                            const h = playbackHandlesRef.current[audioChannel];
                            if (h && h.handle) {
                                NvrSdk.playbackControl(h.handle, NvrSdk.PLAYBACK_CMD.STARTAUDIO).catch(() => { });
                            }
                        }
                    }
                };

                // 🚀 OPTIMIZED: Search recordings FIRST, then start video streams ONCE at the correct time.
                // This prevents the flickering double-start race condition.
                const startOfDay = new Date(currentDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(currentDate);
                endOfDay.setHours(23, 59, 59, 999);

                let recordingsResponse = null;
                if (!focusChangedOnly || !lastInitKey.current) {
                    try {
                        const filterKey = `playback_filter_${deviceId}_${currentChannel}`;
                        const stored = await AsyncStorage.getItem(filterKey);
                        let activeUiTypes = selectedRecordingTypes;
                        if (stored) {
                            try {
                                const userTypes = JSON.parse(stored);
                                if (Array.isArray(userTypes)) {
                                    const uiTypes = userTypes.map(t => USER_TO_UI_MAP[t]).filter(Boolean);
                                    if (uiTypes.length > 0) {
                                        activeUiTypes = uiTypes;
                                        if (isMounted.current) {
                                            setSelectedRecordingTypes(uiTypes);
                                        }
                                    }
                                }
                            } catch (e) {
                                console.error("[Playback] Failed to parse saved filters in init:", e);
                            }
                        }
                        const sdkIntTypes = activeUiTypes.map(t => RECORD_TYPE_MAP[UI_TO_USER_MAP[t]]).filter(v => v !== undefined);

                        if (isNotificationMode) {
                            // Under notification mode, query with ALL recording types to guarantee matching schedule/motion/AI footage
                            const notificationRecordTypes = [0, 1, 2, 3, 4, 5, 6, 7, 9, 10];
                            console.log(`[Playback] Notification Search: CH ${currentChannel} from ${formatTime(new Date(Number(startTime)))} to ${formatTime(new Date(Number(endTime)))}`);
                            recordingsResponse = await NvrSdk.searchRecordings(
                                loginHandle,
                                currentChannel,
                                formatTime(new Date(Number(startTime))),
                                formatTime(new Date(Number(endTime))),
                                notificationRecordTypes
                            );
                        } else {
                            console.log(`[Playback] Search: CH ${currentChannel} from ${formatTime(startOfDay)} to ${formatTime(endOfDay)} with types:`, sdkIntTypes);
                            recordingsResponse = await NvrSdk.searchRecordings(loginHandle, currentChannel, formatTime(startOfDay), formatTime(endOfDay), sdkIntTypes);
                        }

                        // 🚀 NEW: Check all channels for "available" status for the side panel grid
                        // We do this in the background to avoid blocking the main stream start
                        if (!isNotificationMode) {
                            (async () => {
                                const available: number[] = [];
                                const totalChannels = deviceChannelCount;

                                // Check in chunks of 4 to avoid overwhelming the NVR
                                for (let i = 0; i < totalChannels; i += 8) {
                                    const chunk = Array.from({ length: Math.min(8, totalChannels - i) }, (_, index) => i + index);
                                    await Promise.all(chunk.map(async (ch) => {
                                        try {
                                            const res = await NvrSdk.searchRecordings(loginHandle, ch, formatTime(startOfDay), formatTime(endOfDay));
                                            if (res && res.length > 0) {
                                                available.push(ch);
                                            }
                                        } catch (e) { }
                                    }));
                                }
                                if (isMounted.current) {
                                    setRecordedChannels(available.sort((a, b) => a - b));
                                }
                            })();
                        }

                    } catch (e) {
                        console.error("Recording search failed", e);
                        recordingsResponse = [];
                    }
                }

                if (requestId !== currentRequestIdRef.current) return;

                if (recordingsResponse !== null) {
                    const segments = Array.isArray(recordingsResponse) ? recordingsResponse : (recordingsResponse && (recordingsResponse as any).fileList) ? (recordingsResponse as any).fileList : [];

                    if (isNotificationMode) {
                        if (segments.length === 0) {
                            console.log(`[Playback] Notification search empty. Falling back to entire day search for clock drift.`);
                            try {
                                const notificationRecordTypes = [0, 1, 2, 3, 4, 5, 6, 7, 9, 10];
                                const fallbackRecs = await NvrSdk.searchRecordings(
                                    loginHandle,
                                    currentChannel,
                                    formatTime(startOfDay),
                                    formatTime(endOfDay),
                                    notificationRecordTypes
                                );
                                const fallbackSegments = Array.isArray(fallbackRecs) ? fallbackRecs : (fallbackRecs?.fileList || []);
                                if (fallbackSegments.length > 0) {
                                    segments.push(...fallbackSegments);
                                }
                            } catch (fallbackErr) {
                                console.error("[Playback] Fallback entire day search failed:", fallbackErr);
                            }
                        }

                        if (segments.length === 0) {
                            Alert.alert("No Recording", "No recording found for this event time");
                            if (isMounted.current) {
                                setIsLoading(false);
                                setIsPlaying(false);
                                setRecordingFiles([]);
                                setSearchPerformed(true);
                            }
                            isStartingRef.current = false;
                            return;
                        }
                        if (isMounted.current) {
                            setRecordingFiles(segments);
                            setSearchPerformed(true);
                        }

                        // Snap start time to closest segment if needed
                        const targetMs = parsedStartTime ? parsedStartTime.getTime() : currentDate.getTime();
                        const inSegment = segments.find((f: any) => {
                            const st = new Date(f.start.includes(' ') ? f.start.replace(' ', 'T') : f.start).getTime();
                            const et = new Date(f.end.includes(' ') ? f.end.replace(' ', 'T') : f.end).getTime();
                            return st <= targetMs && et >= targetMs;
                        });

                        if (!inSegment) {
                            const sorted = [...segments].sort((a: any, b: any) => {
                                const stA = new Date(a.start.includes(' ') ? a.start.replace(' ', 'T') : a.start).getTime();
                                const stB = new Date(b.start.includes(' ') ? b.start.replace(' ', 'T') : b.start).getTime();
                                return Math.abs(stA - targetMs) - Math.abs(stB - targetMs);
                            });
                            const closest = sorted[0];
                            console.log(`[Playback] No recording at event start time. Snapping to: ${closest.start}`);
                            finalPlaybackTime = closest.start;
                            const snapDate = new Date(finalPlaybackTime.includes(' ') ? finalPlaybackTime.replace(' ', 'T') : finalPlaybackTime);
                            skipNextInitRef.current = true;
                            if (isMounted.current) {
                                setCurrentDate(snapDate);
                                setTempTime(snapDate);
                            }
                        }

                        // Background search the entire day to populate the timeline beautifully using active filters
                        const activeFilterKey = `playback_filter_${deviceId}_${currentChannel}`;
                        AsyncStorage.getItem(activeFilterKey).then(storedFilters => {
                            let activeUiTypes = selectedRecordingTypes;
                            if (storedFilters) {
                                try {
                                    const userTypes = JSON.parse(storedFilters);
                                    if (Array.isArray(userTypes)) {
                                        const uiTypes = userTypes.map(t => USER_TO_UI_MAP[t]).filter(Boolean);
                                        if (uiTypes.length > 0) activeUiTypes = uiTypes;
                                    }
                                } catch (e) { }
                            }
                            const sdkIntTypes = activeUiTypes.map(t => RECORD_TYPE_MAP[UI_TO_USER_MAP[t]]).filter(v => v !== undefined);
                            return NvrSdk.searchRecordings(loginHandle, currentChannel, formatTime(startOfDay), formatTime(endOfDay), sdkIntTypes);
                        }).then(allDayRecs => {
                            if (isMounted.current) {
                                const allSegments = Array.isArray(allDayRecs) ? allDayRecs : (allDayRecs?.fileList || []);
                                setRecordingFiles(allSegments);
                            }
                        }).catch(err => console.log("[Playback] Background day-search failed:", err));
                    } else {
                        if (isMounted.current) {
                            setRecordingFiles(segments);
                            setSearchPerformed(true);
                        }

                        // Snap logic: If we have segments, but the starting time has no footage, jump to first recording
                        const needsSnap = segments.length > 0 && !isMatchingDay && !skipNextSnapRef.current && !focusChangedOnly;
                        if (needsSnap) {
                            const targetMs = safeParseDate(finalPlaybackTime).getTime();
                            const specific = segments.filter((s: any) => (safeParseDate(s.end).getTime() - safeParseDate(s.start).getTime()) < 23 * 3600 * 1000);
                            const pool = specific.length > 0 ? specific : segments;
                            const inSegment = pool.find((f: any) => targetMs >= safeParseDate(f.start).getTime() && targetMs <= safeParseDate(f.end).getTime());

                            if (!inSegment) {
                                const sortedPool = [...pool].sort((a: any, b: any) => safeParseDate(a.start).getTime() - safeParseDate(b.start).getTime());
                                const closest = sortedPool[0];
                                console.log(`[Playback] Snapping start time to earliest recording: ${closest.start}`);
                                finalPlaybackTime = closest.start;
                                const snapDate = safeParseDate(finalPlaybackTime);
                                skipNextInitRef.current = true;
                                if (isMounted.current) {
                                    setCurrentDate(snapDate);
                                    setTempTime(snapDate);
                                }
                            }
                        }
                    }
                }

                // NOW start the video streams exactly once
                if (!isOnlyFocusChange) {
                    await startVideoStreams(finalPlaybackTime);
                } else {
                    console.log(`[Playback] init -> Only focus changed within visible grid. Skipping stream restart.`);
                    if (isMounted.current) {
                        setIsPlaying(true);
                    }
                }

            } catch (e) {
                console.error("Init failed", e);
            } finally {
                if (requestId === currentRequestIdRef.current) {
                    isStartingRef.current = false;
                    if (isMounted.current) setIsLoading(false);
                    skipNextSnapRef.current = false; // Reset
                }
            }
        };

        const interactionTask = InteractionManager.runAfterInteractions(() => {
            if (deviceId && isMounted.current) init();
        });

        return () => {
            isMounted.current = false;
            interactionTask.cancel();
            const uid = userIdRef.current;
            if (uid !== null && uid >= 0) {
                console.log('[Playback] Cleanup: Preserving userId for background service', uid);
            }
        };
        // NOTE: visibleChannels intentionally NOT in deps — applyGridType handles its own stream startup.
        // Including it would cause a redundant double-stream-start after every grid change.
        // 🚀 KEY FIX: userId is intentionally NOT in deps — session refresh (setUserId) must never
        // trigger a full re-init, which would restart the stream at today's date.
        // userIdRef.current is always read fresh inside the effect.
    }, [deviceId, currentDate.toDateString(), currentChannel, syncKey, manualJumpTrigger, quality, startTime, initialChannelId, eventTime, endTime]);

    /* Debug: Removed for production responsiveness
    useEffect(() => {
        // console.log('📊 Playback Handles State Updated:', playbackHandles);
    }, [playbackHandles]);
    */



    useEffect(() => {
        if (userId && selectedDevice) {
            const fetchRecordedDays = async () => {
                const year = calendarMonth.getFullYear();
                const month = calendarMonth.getMonth() + 1;
                const fetchKey = `${selectedDevice?.id}-${currentChannel}-${year}-${month}`;

                if (lastFetchedKey.current === fetchKey) return;

                try {
                    // Fetch for current month
                    const currentResult: number[] = await NvrSdk.queryRecordingDays(userId, currentChannel, year, month);

                    // Fetch for previous month to cover boundary transitions in DateSelector
                    const prevMonthDate = new Date(year, month - 2, 1);
                    const prevYear = prevMonthDate.getFullYear();
                    const prevMonth = prevMonthDate.getMonth() + 1;
                    const prevResult: number[] = await NvrSdk.queryRecordingDays(userId, currentChannel, prevYear, prevMonth);

                    const allIsoDates: string[] = [];

                    if (currentResult && Array.isArray(currentResult)) {
                        currentResult.forEach(dayNum => {
                            allIsoDates.push(`${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`);
                        });
                    }

                    if (prevResult && Array.isArray(prevResult)) {
                        prevResult.forEach(dayNum => {
                            allIsoDates.push(`${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`);
                        });
                    }

                    setRecordedDays(allIsoDates);
                    lastFetchedKey.current = fetchKey;
                } catch (e) {
                    console.error("Days fetch failed", e);
                }
            };
            fetchRecordedDays();
        }
    }, [calendarMonth, userId, currentChannel]);

    // --- APPSTATE HANDLER (Multitasking support) ---
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                console.log("📱 App backgrounded: Stopping all playback for resource efficiency");
                stopAllPlayback();
            } else if (nextAppState === 'active') {
                console.log("📱 App foregrounded: Restarting streams");
                setSyncKey(prev => prev + 1); // Triggers re-init() via dependency array
            }
        });

        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (!isUserScrolling && !isUserScrollingRef.current) {
            setTempTime(currentDate);
            tempTimeRef.current = currentDate;
        }
    }, [currentDate?.getTime(), isUserScrolling]);



    const handleScroll = (event: any) => {
        const offset = event.nativeEvent.contentOffset.x;
        // Clamp offset to avoid jumping to 0 on rubber-banding
        const clampedOffset = Math.max(0, Math.min(TIMELINE_WIDTH, offset));
        const totalMinutes = clampedOffset / activeScale.pxPerMin;

        const hours = Math.floor(totalMinutes / 60);
        const mins = Math.floor(totalMinutes % 60);
        const secs = Math.floor((totalMinutes * 60) % 60);

        // ALWAYS use a clean midnight date as base to avoid accumulation errors
        const newDate = new Date(currentDate);
        newDate.setHours(0, 0, 0, 0); // Reset to midnight
        newDate.setHours(hours, mins, secs);

        tempTimeRef.current = newDate;
        if (isUserScrolling || isUserScrollingRef.current) {
            setTempTime(newDate);
        }
    };

    const handleScrollEnd = () => {
        const wasUserScrolling = isUserScrolling || isUserScrollingRef.current;
        isUserScrollingRef.current = false;
        setIsUserScrolling(false);

        if (!wasUserScrolling || isProgrammaticScrolling.current) return;

        if (isMounted.current) {
            // SNAP POSITION IMMEDIATELY
            const targetTime = tempTimeRef.current;
            setCurrentDate(targetTime);

            // 🛑 Cancel any pending debounced seek
            if (debouncedSeekTimeoutRef.current) {
                clearTimeout(debouncedSeekTimeoutRef.current);
                debouncedSeekTimeoutRef.current = null;
            }

            // 🚀 Force Final Jump on release
            jumpToTime(targetTime, true);
        }
    };

    const debouncedSeekTimeoutRef = useRef<any>(null);

    // 🚀 STABLE SEEK: Debounced Jumping for Dragging (SuperLivePlus Style)
    // - Dragging updates the UI label immediately via handleScroll.
    // - Video only jumps if user pauses for 500ms OR releases finger.
    const debouncedSeek = useMemo(() => {
        return (date: Date) => {
            if (!userId) return;

            if (debouncedSeekTimeoutRef.current) {
                clearTimeout(debouncedSeekTimeoutRef.current);
            }

            debouncedSeekTimeoutRef.current = setTimeout(() => {
                // 🛑 Only execute if STILL dragging and NOT already seeking
                if (isUserScrollingRef.current && !isSeekingRef.current) {
                    console.log("🚀 Debounced Seek: User paused dragging, jumping to", date.toLocaleTimeString());
                    jumpToTime(date);
                }
                debouncedSeekTimeoutRef.current = null;
            }, 500);
        };
    }, [userId, visibleChannels, quality]);
    return (
        <LinearGradient key={deviceId} colors={THEME.bgGradient} style={styles.container}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            {!isFullscreen && (
                <>
                    <CalendarTimeModal
                        visible={isPreciseModalVisible}
                        onClose={() => setIsPreciseModalVisible(false)}
                        onSelect={handlePreciseJump}
                        recordedDays={recordedDays}
                        onMonthChange={setCalendarMonth}
                        initialDate={currentDate}
                    />

                    <PlaybackHeader
                        deviceName={deviceName || 'Playback'}
                        onBack={() => navigation.goBack()}
                    />
                    <DateSelector
                        currentDate={currentDate}
                        dateRange={dateRange}
                        onSelectDate={handleDateSelect}
                        onOpenCalendar={() => setIsPreciseModalVisible(true)}
                        onRefresh={() => {
                            handleDateSelect(currentDate);
                        }}
                        formatShortTime={formatShortTime}
                        getRelativeDateLabel={getRelativeDateLabel}
                        recordedDays={recordedDays}
                        theme={{ recordingYellow: THEME.recordingYellow }}
                    />

                    {/* Calendar Modal */}
                    <CalendarModal
                        visible={isCalendarVisible}
                        onClose={() => setIsCalendarVisible(false)}
                        isFullscreen={isFullscreen}
                        initialDate={currentDate}
                        onSelectDate={async (date: Date) => {
                            const finalDate = new Date(date);
                            setIsCalendarVisible(false);

                            // Use handleDateSelect for clean day-init
                            await handleDateSelect(finalDate);
                        }}
                        recordedDays={recordedDays}
                        onMonthChange={setCalendarMonth}
                        theme={{
                            primary: THEME.primary,
                            recordingYellow: THEME.recordingYellow
                        }}
                    />
                </>
            )}

            {/* Video Player Grid - Hoisted for Persistent Mounting */}
            <View style={{ width: '100%', backgroundColor: '#000', position: 'relative' }}>
                <VideoSection
                    selectedDevice={selectedDevice}
                    gridType={gridType}
                    visibleChannels={visibleChannels}
                    playbackHandles={playbackHandles}
                    currentChannel={currentChannel}
                    onSelectChannel={(ch: number) => {
                        handleSelectChannel(ch);
                        if (isFullscreen) {
                            setShowFsControls(prev => !prev);
                        }
                    }}
                    isLoading={isLoading}
                    channelNames={channelNames}
                    userId={userId}
                    rtspUrls={rtspUrls}
                    onFullscreen={(ch: number) => {
                        setCurrentChannel(ch);
                        setVisibleChannels([ch]);
                        setGridType('1x1');
                        if (Platform.OS === 'android') {
                            StatusBar.setHidden(true, 'slide');
                        }
                        setIsFullscreen(true);
                        setShowFsControls(false); // Initial state: hidden
                        NvrSdk.setOrientation(0); // Landscape
                        setManualJumpTrigger(prev => prev + 1);
                    }}
                    onDoubleTap={handleDoubleTap}
                    recordingFiles={recordingFiles}
                    searchPerformed={searchPerformed}
                    isRecording={isRecording}
                    recordDuration={recordDuration}
                    quality={quality}
                    playbackSpeed={playbackSpeed}
                    isFullscreen={isFullscreen}
                />

                {/* Visual Flash Overlay */}
                {showVisualFlash && (
                    <View style={styles.flashOverlay} />
                )}

                {/* Media Success Toast Overlay */}
                {mediaToast && (
                    <TouchableOpacity
                        style={styles.toastOverlay}
                        activeOpacity={0.9}
                        onPress={() => {
                            setMediaToast(null);
                            (navigation as any).navigate('Gallery');
                        }}
                    >
                        <View style={styles.toastContent}>
                            <View style={styles.toastThumbContainer}>
                                {mediaToast.path.endsWith('.jpg') ? (
                                    <Image
                                        source={{ uri: 'file://' + mediaToast.path }}
                                        style={styles.toastThumb}
                                        resizeMode="cover"
                                        onError={() => {/* silent — fallback renders underneath */ }}
                                    />
                                ) : (
                                    <View style={styles.toastThumbPlaceholder}>
                                        <Icon name="video-outline" size={22} color="#FFF" />
                                    </View>
                                )}
                            </View>
                            <Text style={styles.toastText}>
                                {mediaToast.type === 'picture'
                                    ? 'The picture has been saved. Please click to view.'
                                    : 'The video has been saved. Please click to view'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Recording Indicator */}
                {isRecording && (
                    <View style={styles.recIndicator}>
                        <View style={styles.recDot} />
                        <Text style={styles.recText}>
                            REC{' '}
                            {new Date(recordDuration * 1000).toISOString().substr(14, 5)}
                        </Text>
                    </View>
                )}
            </View>

            {!isFullscreen && (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 110 }}
                    showsVerticalScrollIndicator={false}
                >

                    {/* Second Bar */}
                    <PlaybackControls
                        isPlaying={isPlaying}
                        onTogglePlay={togglePlay}
                        onSnapshot={handleSnapshot}
                        isRecording={isRecording}
                        onToggleRecord={handleToggleRecord}
                        playbackSpeed={playbackSpeed}
                        onSpeedChange={handleSpeedChange}
                        onSpeedLongPress={() => setIsSpeedModalVisible(true)}
                        onRewind={handleRewind}
                        onGridPress={() => setIsGridModalVisible(true)}
                        onDevicePress={() => setIsDeviceModalVisible(true)}
                        gridType={gridType}
                    />

                    {/* Playback & Filter (and Channel Select) */}
                    <ChannelFilterSection
                        channelCount={deviceChannelCount}
                        currentChannel={currentChannel}
                        channelNames={channelNames}
                        onSelectChannel={handleSelectChannel}
                        filterType={filterType}
                        onSetFilterType={setFilterType}
                        onOpenFilterModal={() => setIsFilterModalVisible(true)}
                        recordingYellow={THEME.recordingYellow}
                    />

                    {/* Timeline */}
                    <PlaybackTimeline
                        currentDate={currentDate}
                        activeScale={activeScale}
                        timelineWidth={TIMELINE_WIDTH}
                        timelineScale={TIMELINE_SCALE}
                        halfScreen={HALF_SCREEN}
                        filteredFiles={filteredFiles}
                        recordingStyles={recordingStyles}
                        onJumpToTime={(d) => jumpToTime(d, true)}
                        onSeek={debouncedSeek}
                        onDragStateChange={(dragging) => {
                            isUserScrollingRef.current = dragging;
                            setIsUserScrolling(dragging);
                        }}
                        isPlaying={isPlaying}
                        togglePlay={togglePlay}
                        isLoading={isLoading}
                        scaleIndex={scaleIndex}
                        setScaleIndex={setScaleIndex}
                        scaleLevels={scaleLevels}
                        tempTime={tempTime}
                        setTempTime={setTempTime}
                        eventTime={eventTime}
                    />
                </ScrollView>
            )}

            {/* Speed Selection Modal */}
            <SpeedModal
                visible={isSpeedModalVisible}
                onClose={() => setIsSpeedModalVisible(false)}
                isFullscreen={isFullscreen}
                currentSpeed={playbackSpeed}
                onSelectSpeed={handleSelectSpeed}
            />

            {/* Device Selection Modal */}
            <DeviceModal
                visible={isDeviceModalVisible}
                onClose={() => setIsDeviceModalVisible(false)}
                isFullscreen={isFullscreen}
                devices={allDevices}
                selectedDeviceId={selectedDevice?.id}
                onSelectDevice={(device) => {
                    if (selectedDevice?.id !== device.id) {
                        setIsDeviceModalVisible(false);
                        setIsLoading(true);
                        stopAllPlayback().then(() => {
                            setUserIdWithRef(null); // Force login again
                            skipNextInitRef.current = false;
                            skipNextSnapRef.current = false;
                            setSelectedDevice(device);
                            setCurrentChannel(0);
                            setVisibleChannels([0]); // Reset to first ch
                            setGridType('1x1');
                            setIsLoading(false);
                            setSyncKey(k => k + 1); // Trigger re-init
                            navigation.setParams({ deviceId: String(device.id), deviceName: device.name });
                        });
                    } else {
                        setIsDeviceModalVisible(false);
                    }
                }}
            />

            {/* Recording Type Filter Modal */}
            <FilterModal
                visible={isFilterModalVisible}
                onClose={() => setIsFilterModalVisible(false)}
                isFullscreen={isFullscreen}
                recordingStyles={recordingStyles}
                selectedTypes={selectedRecordingTypes}
                onApply={async (newTypes) => {
                    setIsFilterModalVisible(false);
                    const userTypes = newTypes.map(t => UI_TO_USER_MAP[t]).filter(Boolean);
                    const filterKey = `playback_filter_${deviceId}_${currentChannel}`;
                    await AsyncStorage.setItem(filterKey, JSON.stringify(userTypes));
                    setSelectedRecordingTypes(newTypes);
                    setSyncKey(k => k + 1); // Trigger re-initF
                }}
            />

            {/* Grid Selection Modal */}
            <GridModal
                visible={isGridModalVisible}
                onClose={() => setIsGridModalVisible(false)}
                isFullscreen={isFullscreen}
                gridType={gridType}
                onSelectGrid={applyGridType}
                allowedGrids={['1x1', '2x2', '3x3', '4x4']}
            />

            {/* Fullscreen Overlay Controls */}
            {isFullscreen && (
                <FullscreenControls
                    onClose={() => {
                        setIsFullscreen(false);
                        StatusBar.setHidden(false);
                        NvrSdk.setOrientation(1); // Portrait
                    }}
                    gridType={gridType}
                    onToggleGrid={() => {
                        if (gridType === '1x1') {
                            const count = deviceChannelCount;
                            const nextGrid = count <= 4 ? '2x2' : (count <= 9 ? '3x3' : '4x4');
                            const nextChannels = Array.from({ length: count }, (_, i) => i);
                            applyGridType(nextGrid, nextChannels);
                        } else {
                            applyGridType('1x1', [currentChannel]);
                        }
                    }}
                    onSnapshot={handleSnapshot}
                    isRecording={isRecording}
                    onToggleRecord={handleToggleRecord}
                    showFsControls={showFsControls}
                    onToggleFsControls={() => setShowFsControls(!showFsControls)}
                    panHandlers={fsPanResponder.panHandlers}
                    tempTime={tempTime}
                    currentDate={currentDate}
                    filteredFiles={filteredFiles}
                    recordingStyles={recordingStyles}
                    eventTime={eventTime}

                    onToggleAudio={handleToggleAudio}
                    audioChannel={audioChannel}
                    currentChannel={currentChannel}
                    onOpenFilterModal={() => setIsFilterModalVisible(true)}
                    onOpenGridModal={() => setIsGridModalVisible(true)}
                    onOpenDeviceModal={() => setIsDeviceModalVisible(true)}
                    onOpenCalendarModal={() => setIsCalendarVisible(!isCalendarVisible)}
                    recordedDays={recordedDays}
                    isCalendarOpen={isCalendarVisible}
                    onDateSelect={async (d) => {
                        setIsCalendarVisible(false);
                        await handleDateSelect(d);
                    }}
                    onRewind={handleRewind}
                    isPlaying={isPlaying}
                    onTogglePlay={togglePlay}
                    playbackSpeed={playbackSpeed}
                    onSpeedChange={handleSpeedChange}
                    onSpeedLongPress={() => setIsSpeedModalVisible(true)}
                    quality={quality}
                    onToggleQuality={() => { setQuality(q => q === 'HD' ? 'SD' : 'HD'); setIsLoading(true); }}
                    landscapeTimelineRef={landscapeTimelineRef}
                    theme={{ primary: THEME.primary }}
                    onJumpToTime={(d) => jumpToTime(d, true)}
                    setTempTime={setTempTime}
                    calendarMonth={calendarMonth}
                    setCalendarMonth={setCalendarMonth}
                    activeScale={activeScale}
                    timelineWidth={TIMELINE_WIDTH}
                    timelineScale={TIMELINE_SCALE}
                    scaleIndex={scaleIndex}
                    setScaleIndex={setScaleIndex}
                    scaleLevels={scaleLevels}
                    onSelectSpeed={handleSelectSpeed}
                    onSelectChannel={handleSelectChannel}
                    selectedDevice={selectedDevice}
                    allDevices={allDevices}
                    recordedChannels={recordedChannels}
                    onSeek={debouncedSeek}
                />
            )}

            {!isFullscreen && (
                <BottomBar
                    currentUserId={userId}
                    currentChannelId={currentChannel}
                    onAudioToggle={handleToggleAudio}
                    isAudioActive={audioChannel !== null}
                    deviceName={selectedDevice?.name}
                    currentChannelName={channelNames[currentChannel]}
                />
            )}
        </LinearGradient >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    dateControlContainer: {
        backgroundColor: '#FFFFFF',
        paddingTop: 10,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    dateHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    headerActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fullDateText: {
        fontSize: 18,
        fontWeight: '700',
        color: THEME.textDark,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    },
    timeText: {
        fontSize: 14,
        fontWeight: '400',
        color: THEME.textGrey,
    },
    relativeDayText: {
        fontSize: 24,
        fontWeight: '900',
        color: THEME.textDark,
        marginTop: 2,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F7F7F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    dateStripContent: {
        paddingHorizontal: 15,
        alignItems: 'center',
        height: 80,
    },
    dateItem: {
        width: 55,
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 5,
        borderRadius: 15,
        backgroundColor: 'transparent',
    },
    activeDateItem: {
        backgroundColor: THEME.primary,
        elevation: 4,
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    dayNameText: {
        fontSize: 13,
        color: THEME.textGrey,
        marginBottom: 4,
    },
    dayNumText: {
        fontSize: 18,
        fontWeight: '800',
        color: THEME.textDark,
    },
    activeDateText: {
        color: '#FFFFFF',
    },
    recordingDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#FEB442',
        position: 'absolute',
        bottom: 8,
    },
    toastOverlay: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.85)',
        padding: 8,
        borderRadius: 8,
        zIndex: 999,
        elevation: 10,
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    toastThumbContainer: {
        width: 40,
        height: 40,
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: '#333',
    },
    toastThumb: {
        width: '100%',
        height: '100%',
    },
    toastThumbPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#222',
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
    },
    toastText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '500',
        maxWidth: 200,
    },
    recIndicator: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,0,0,0.6)',
        paddingHorizontal: 6,
        borderRadius: 4,
        paddingVertical: 2,
        zIndex: 10,
    },
    recDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFF',
        marginRight: 4,
    },
    recText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    flashOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        zIndex: 9999,
        pointerEvents: 'none',
    },
});

export default Playback;
