import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    ScrollView,
    Platform,
    requireNativeComponent,
    NativeModules,
    PermissionsAndroid,
    Alert,
    ActivityIndicator,
    PanResponder,
    Animated,
    Vibration,
    LayoutAnimation,
    UIManager,
    InteractionManager,
    AppState,
    NativeEventEmitter,
    Image,
} from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import {
    useNavigation,
    useRoute,
    useIsFocused,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Device, deviceStorage } from '../utils/deviceStorage';
import GridSelection, { GridType, GridIcon } from '../components/GridSelection';
import CameraListDrawer from '../components/CameraListDrawer';
import DeviceListDrawer from '../components/DeviceListDrawer';
import PtzControlDrawer from '../components/PtzControlDrawer';
import ImageSettingsDrawer from '../components/ImageSettingsDrawer';
import BottomBar from '../Component/BottomBar';
import IntercomModal from '../components/IntercomModal';
import LivePlayer from '../components/LivePlayer';
import * as NvrSdk from '../native/NvrSdk';
import { deviceSessionManager } from '../services/DeviceSessionManager';
import NvrVideoView from '../native/NvrVideoView';
import { authStorage } from '../utils/authStorage';
import { api } from '../utils/api';
import { localSettings, LocalSettings } from '../utils/localSettings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribeDeviceAlarms, alarmEmitter } from '../services/AlarmService';
import { useEventStore } from '../store/useEventStore';
import { normalizeAiEvent } from '../utils/eventMapper';
import AiEventBanner from '../components/AiEventBanner';
import PinchZoomView, { PinchZoomRef } from '../components/PinchZoomView';


const { TVTSdkModule, DeviceSDK } = NativeModules;
const tvtEventEmitter = new NativeEventEmitter(TVTSdkModule);
const deviceEventEmitter = new NativeEventEmitter(DeviceSDK);

const THEME = {
    bg: '#F5F5F7',
    primary: '#A83232', // Red accent
    cardBg: '#FFFFFF',
    textDark: '#1A1A1A',
    textGrey: '#8E8E93',
    border: '#E5E5EA',
    gridBg: '#000',
    activeBorder: '#00AEEF',
};

// LivePlayer removed, now imported from ../components/LivePlayer

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

export default function LiveView() {
    const route = useRoute();
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const { deviceId, channelId: initialChannelId } = (route.params as any) || {};

    // --- STATE ---
    const [allDevices, setAllDevices] = useState<Device[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const currentUserIdRef = useRef<number | null>(null);
    const setCurrentUserIdWithRef = (id: number | null) => {
        setCurrentUserId(id);
        currentUserIdRef.current = id;
    };
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Grid State: channelId or null. No handles needed in JS!
    const [gridCells, setGridCells] = useState<(number | null)[]>(
        Array(36).fill(null),
    );

    const [activeCellIndex, setActiveCellIndex] = useState(0);
    const [currentGrid, setCurrentGrid] = useState<GridType>('1x1');
    const [bitrateData, setBitrateData] = useState<{
        [key: number]: { kbps: number; fps: number };
    }>({});
    const [showCellFeatures, setShowCellFeatures] = useState(false);

    // Feature States
    const [isHD, setIsHD] = useState(true); // Default to HD (Main Stream) to force stream rendering testing
    const [isRecording, setIsRecording] = useState(false);
    const isRecordingRef = useRef(false);
    const recordingHandleRef = useRef<string | null>(null);
    const [recHandle, setRecHandle] = useState<string | null>(null);
    const [currentRecordInfo, setCurrentRecordInfo] = useState<{
        fileName: string;
        path: string;
        thumbPath?: string;
        channelId: number;
    } | null>(null);
    const [recordTimer, setRecordTimer] = useState(0);
    const [ptzOpen, setPtzOpen] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isImageSettingsVisible, setIsImageSettingsVisible] = useState(false);
    const [imageSettings, setImageSettings] = useState({
        brightness: 50,
        contrast: 50,
        saturation: 50,
        hue: 50,
        sharpness: 50,
    });
    const [ptzSpeed, setPtzSpeed] = useState(4); // Default PTZ speed

    // UI Modals
    const [gridSelectionOpen, setGridSelectionOpen] = useState(false);
    const [cameraListOpen, setCameraListOpen] = useState(false);
    const [deviceListOpen, setDeviceListOpen] = useState(false);
    const [appLocalSettings, setAppLocalSettings] =
        useState<LocalSettings | null>(null);
    const [intercomVisible, setIntercomVisible] = useState(false);

    const [talkHandle, setTalkHandle] = useState<string | null>(null);
    const [isTalking, setIsTalking] = useState(false);
    const [audioActiveIndex, setAudioActiveIndex] = useState<number | null>(null);
    const [isAudioOn, setIsAudioOn] = useState(false); // Audio mute state for bottom bar button
    const [syncKey, setSyncKey] = useState(0);
    const lastTapRef = useRef<number>(0);
    const [snapMessage, setSnapMessage] = useState<string | null>(null);
    const [mediaToast, setMediaToast] = useState<{ visible: boolean; type: 'picture' | 'video'; path: string } | null>(null);
    const wasUnfocusedRef = useRef<boolean>(false);

    const [isCapturing, setIsCapturing] = useState(false);
    const [showVisualFlash, setShowVisualFlash] = useState(false);
    const [hasAudioSupport, setHasAudioSupport] = useState<boolean | undefined>(
        undefined,
    );
    const [showFsControls, setShowFsControls] = useState(false);
    const [lampStatus, setLampStatus] = useState<{ [key: number]: boolean }>({});
    const [irStatus, setIrStatus] = useState<{ [key: number]: boolean }>({});

    // Store integration will manage actual history. We only need aiAlerts for tile flashing.
    const [aiAlerts, setAiAlerts] = useState<{ [key: number]: { type: string, time: number } }>({});
    const addEvent = useEventStore(state => state.addEvent);
    const setEvents = useEventStore(state => state.setEvents);
    const liveEvents = useEventStore(state => state.events);

    // 🚀 NEW: Batched Loading State to prevent SDK flooding on large grids
    const [loadingCellCount, setLoadingCellCount] = useState(0);
    const loadingTimerRef = useRef<any>(null);
    const loggingInRef = useRef(false);
    const alarmMonitorStartedRef = useRef(false);

    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const dragXY = useRef(new Animated.ValueXY()).current;

    // Low-level initialization locks to prevent redundant SDK/Network activity
    const initStartedRef = useRef<string | null>(null);
    const channelsFetchedRef = useRef(false);
    const cellLayouts = useRef<{
        [key: number]: { x: number; y: number; w: number; h: number };
    }>({}).current;

    // FS Slider Width (approx based on panel width)
    const fsSliderWidth = 350;
    const fsThumbPos = useRef(
        new Animated.Value(((ptzSpeed - 1) / 7) * fsSliderWidth),
    ).current;

    const handlesRef = useRef<{ [key: string]: string | null }>({});
    const zoomRefs = useRef<{ [key: number]: PinchZoomRef }>({});
    const indexToKey = (idx: number) => `idx_${idx}`;
    const handleHandleAcquired = (index: number, handle: string | null) => {
        handlesRef.current[indexToKey(index)] = handle;
    };

    const fsResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 30,
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dy < -60) {
                    setShowFsControls(true);
                } else if (gesture.dy > 60) {
                    setShowFsControls(false);
                }
            },
        }),
    ).current;

    const gridPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: () => draggingIndex !== null,
            onPanResponderMove: Animated.event(
                [null, { dx: dragXY.x, dy: dragXY.y }],
                { useNativeDriver: false },
            ),
            onPanResponderRelease: () => handleDragRelease(),
            onPanResponderTerminate: () => handleDragRelease(),
        }),
    ).current;

    const handleDragRelease = () => {
        if (
            draggingIndex !== null &&
            hoverIndex !== null &&
            draggingIndex !== hoverIndex
        ) {
            const newCells = [...gridCells];
            const temp = newCells[draggingIndex];
            newCells[draggingIndex] = newCells[hoverIndex];
            newCells[hoverIndex] = temp;
            setGridCells(newCells);
            setActiveCellIndex(hoverIndex);
        }
        setDraggingIndex(null);
        setHoverIndex(null);
        dragXY.setValue({ x: 0, y: 0 });
    };

    useEffect(() => {
        const id = dragXY.addListener(value => {
            if (draggingIndex === null) return;
            const startLayout = cellLayouts[draggingIndex];
            if (!startLayout) return;

            const currentX = startLayout.x + value.x + startLayout.w / 2;
            const currentY = startLayout.y + value.y + startLayout.h / 2;

            let found: number | null = null;
            Object.keys(cellLayouts).forEach(idxStr => {
                const idx = parseInt(idxStr);
                const l = cellLayouts[idx];
                if (
                    currentX >= l.x &&
                    currentX <= l.x + l.w &&
                    currentY >= l.y &&
                    currentY <= l.y + l.h
                ) {
                    found = idx;
                }
            });

            if (found !== hoverIndex) {
                setHoverIndex(found);
            }
        });
        return () => dragXY.removeListener(id);
    }, [draggingIndex, hoverIndex, cellLayouts]);

    useEffect(() => {
        const target = ((ptzSpeed - 1) / 7) * fsSliderWidth;
        Animated.spring(fsThumbPos, {
            toValue: target,
            useNativeDriver: false,
            bounciness: 0,
        }).start();
    }, [ptzSpeed, fsSliderWidth]);

    useEffect(() => {
        authStorage.getUser().then(setCurrentUser);
    }, []);

    useEffect(() => {
        // --- 🔔 INITIALIZE NOTIFICATION CHANNELS ---
        const initNotifications = async () => {
            await notifee.createChannel({
                id: 'ai-events',
                name: 'AI Event Notifications',
                importance: AndroidImportance.HIGH,
            });
        };
        initNotifications();

        const reqPerms = async () => {
            if (Platform.OS === 'android') {
                try {
                    // Request Storage and Audio permissions
                    const granted = await PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                        // POST_NOTIFICATIONS is only available/needed on API 33+
                        ...(Platform.Version >= 33
                            ? [PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS]
                            : []),
                    ]);

                    // Check basic permissions
                    // Check basic permissions: Log status but do not block user with an alert.
                    // This allows the user to choose "Don't allow" or "Only this time" without nagging.
                    if (
                        granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] !==
                        PermissionsAndroid.RESULTS.GRANTED ||
                        granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !==
                        PermissionsAndroid.RESULTS.GRANTED
                    ) {
                        console.log(
                            'Permissions not fully granted, features may be limited.',
                        );
                    }

                    // Explicitly check notification permission for Android 13+
                    if (
                        Platform.Version >= 33 &&
                        granted[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] !==
                        PermissionsAndroid.RESULTS.GRANTED
                    ) {
                        console.log('Notification permission denied');
                    } else {
                        console.log('Notification permission granted (or not needed)');
                    }
                } catch (err) {
                    console.warn(err);
                }
            }
        };
        reqPerms();

        const loadAppSettings = async () => {
            const ls = await localSettings.getSettings();
            setAppLocalSettings(ls);
            if (ls.resolutionAdaption) {
                // Resolution Adaptation Logic could be more complex,
                // but we honor the preference by picking the default stream type here.
                setIsHD(false);
            }
        };
        loadAppSettings();

        const loadDevices = async () => {
            const devices = await deviceStorage.getDevices();
            setAllDevices(devices);

            const target = deviceId
                ? devices.find(d => 
                    String(d.id) === String(deviceId) || 
                    (d.deviceId && String(d.deviceId) === String(deviceId)) ||
                    (d.sn && String(d.sn) === String(deviceId))
                  )
                : devices[0];

            if (target) {
                // Prevent duplicate login if we are already logged in to this device
                const isAutoPlay = (route.params as any)?.autoPlay || (route.params as any)?.fromAlarm;
                if (!isAutoPlay && selectedDevice && String(selectedDevice.id) === String(target.id) && currentUserIdRef.current !== null && isLoggedIn) {
                    console.log(`[LiveView] Already logged in to device: ${target.id}`);
                    return;
                }

                if ((route.params as any)?.autoPlay) {
                    navigation.setParams({ autoPlay: undefined } as any);
                }
                initStartedRef.current = String(target.id);
                channelsFetchedRef.current = false; // Reset for new device

                // 1. START TRANSITION: Release current resources
                setIsTransitioning(true);
                setIsLoggedIn(false);
                setGridCells(Array(36).fill(null));

                // Explicitly logout previous native session
                const oldId = currentUserIdRef.current;
                if (oldId !== null && oldId >= 0) {
                    // We keep the old session alive for the Background Service
                    setCurrentUserIdWithRef(null);
                }

                setSelectedDevice(null); // Unmount all players

                // 2. COOLING PERIOD (10ms): Minimal wait for native thread
                setTimeout(() => {
                    setSelectedDevice(target);
                    performLogin(target);
                }, 10);
            }
        };
        const interactionTask = InteractionManager.runAfterInteractions(() => {
            loadDevices();
        });

        return () => {
            interactionTask.cancel();
            // Screen unmount cleanup: stop recording if active
            if (isRecordingRef.current && recordingHandleRef.current) {
                NvrSdk.stopLocalRecord(recordingHandleRef.current).catch(() => { });
            }
            const uid = currentUserIdRef.current;
            if (uid !== null && uid >= 0) {
                console.log('[LiveView] Cleanup: Preserving userId for background service', uid);
                // We no longer destroy the session here.
            }
        };
    }, [deviceId]);

    // Mapped SN to local ID defensively on component load in LiveView.tsx
    useEffect(() => {
        let isMounted = true;
        const resolveDeviceParam = async () => {
            if (!deviceId) return;
            try {
                const devs = await deviceStorage.getDevices();
                if (!isMounted) return;
                const target = devs.find(d => 
                    String(d.id) === String(deviceId) || 
                    (d.deviceId && String(d.deviceId) === String(deviceId)) ||
                    (d.sn && String(d.sn) === String(deviceId))
                );
                if (target && String(target.id) !== String(deviceId)) {
                    console.log(`[LiveView] Mapping device ID parameter from SN (${deviceId}) to Local ID (${target.id})`);
                    navigation.setParams({
                        deviceId: String(target.id),
                        deviceName: target.name,
                    } as any);
                }
            } catch (err) {
                console.warn('[LiveView] resolveDeviceParam error:', err);
            }
        };
        resolveDeviceParam();
        return () => {
            isMounted = false;
        };
    }, [deviceId]);

    const handleRefresh = () => {
        if (selectedDevice) {
            if (isLoggedIn && currentUserId !== null) {
                console.log('[LiveView] Skipping refresh: already connected.');
                return;
            }
            console.log('Refreshing streams for', selectedDevice.name);
            setLoadingCellCount(0); // Only reset on manual/forced refresh
            performLogin(selectedDevice);
        }
    };

    const triggerCleanDeviceTransition = (device: Device) => {
        console.log(`[LiveView] Triggering clean device transition to: ${device.name} (${device.id})`);
        
        setIsTransitioning(true);
        setIsLoggedIn(false);
        setGridCells(Array(36).fill(null));
        setCurrentUserIdWithRef(null);
        setSelectedDevice(null);
        channelsFetchedRef.current = false;
        
        const currentIdParam = (route.params as any)?.deviceId;
        navigation.setParams({
            deviceId: String(device.id),
            deviceName: device.name,
        });

        if (currentIdParam !== undefined && String(currentIdParam) === String(device.id)) {
            setTimeout(() => {
                setSelectedDevice(device);
                performLogin(device);
            }, 50);
        }
    };


    // --- FOCUS HANDLER ---
    // Only refresh (remount streams) when we TRULY navigated away (e.g. to LandscapeLiveView)
    // Do NOT restart on every minor focus event


    // --- APPSTATE HANDLER (Multitasking support) ---
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'background') {
                console.log('📱 App backgrounded: Stopping live streams (Alarm monitor remains active for notification testing)');
                if (isRecordingRef.current && recordingHandleRef.current) {
                    NvrSdk.stopLocalRecord(recordingHandleRef.current).catch(() => { });
                    isRecordingRef.current = false;
                    recordingHandleRef.current = null;
                    setIsRecording(false);
                }
                // NOTE: We do NOT stopAlarmMonitor or logout here anymore to allow
                // foreground/background transition testing without breaking the SDK session.
                // Professional apps keep the command session alive briefly.
            } else if (nextAppState === 'active') {
                console.log('📱 App foregrounded: Refreshing live streams');
                handleRefresh();
            }
        });

        return () => subscription.remove();
    }, [currentUserId, selectedDevice]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isRecording) {
            interval = setInterval(() => setRecordTimer(t => t + 1), 1000);
        } else {
            setRecordTimer(0);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    useEffect(() => {
        if (ptzOpen) {
            const chId = gridCells[activeCellIndex];
            if (chId !== null && chId !== undefined) {
                const chObj = selectedDevice?.channels?.find(
                    (c: any) =>
                        (typeof c.id === 'string' ? parseInt(c.id) : c.id) ===
                        chId,
                );
                const chName = chObj?.name || '';
                const hasPtz = chObj?.ptz === true || chObj?.ptzSupport === true || chName.toLowerCase().includes('ptz') || chName.toLowerCase().includes('dome') || chName.toLowerCase().includes('speed');
                if (!hasPtz) {
                    setPtzOpen(false);
                }
            } else {
                setPtzOpen(false);
            }
        }
    }, [activeCellIndex, gridCells, selectedDevice, ptzOpen]);

    const performLogin = async (device: Device) => {
        if (loggingInRef.current) return;

        // Reset state if switching to a different device
        if (selectedDevice && String(selectedDevice.id) !== String(device.id)) {
            console.log(`[LiveView] Switching device from ${selectedDevice.id} to ${device.id}. Resetting states.`);
            setIsLoggedIn(false);
            setGridCells(Array(36).fill(null));
            setCurrentUserIdWithRef(null);
            channelsFetchedRef.current = false;
        }

        // --- 🛡️ PREVENT DUPLICATE LOGIN ---
        if (currentUserIdRef.current !== null && currentUserIdRef.current >= 0 && selectedDevice && String(selectedDevice.id) === String(device.id)) {
            console.log('[LiveView] Already logged in with userId:', currentUserIdRef.current);
            setIsLoggedIn(true);
            setIsLoggingIn(false);
            return;
        }

        loggingInRef.current = true;

        if (isRecordingRef.current) {
            Alert.alert('Recording', 'Please stop recording before switching flows.');
            return;
        }
        try {
            setIsLoggingIn(true);
            console.log('Logging in to', device.name);

            // Pre-populate grid from cache for "micro-second" feeling
            if (device.channels && Array.isArray(device.channels)) {
                const initialGrid = Array(36).fill(null);
                device.channels.slice(0, 36).forEach((ch: any, idx: number) => {
                    initialGrid[idx] =
                        typeof ch.id === 'string' ? parseInt(ch.id) : ch.id;
                });
                setGridCells(initialGrid);
            }

            const userId = await deviceSessionManager.ensureSession(String(device.id));

            console.log('[LiveView] Session manager userId:', userId);

            if (userId < 0) {
                throw new Error('Invalid User ID returned from DeviceSessionManager');
            }

            setCurrentUserIdWithRef(userId);
            setHasAudioSupport(device.audioSupport ?? (device.audioInputNum !== undefined && device.audioInputNum > 0));
            setIsLoggedIn(true);
            setIsLoggingIn(false);

            // Fetch channels ONLY once per login session
            let channels = device.channels || [];
            if (!channelsFetchedRef.current || channels.length === 0) {
                console.log(`[LiveView] Initial SDK Channel Fetch for User: ${userId}`);
                const fresh = await NvrSdk.getChannels(userId);
                if (fresh) channels = fresh;
                channelsFetchedRef.current = true;
            }

            // Always show all channels if connectedChannels is empty or too small
            const connectedChannels = channels || [];
            if (connectedChannels.length === 0) {
                console.warn(
                    '[LiveView] No channels found in list, falling back to channelCount from login',
                );
                // Create placeholders if list is empty
                for (let i = 0; i < (device.channelCount || 1); i++) {
                    connectedChannels.push({ id: i, name: `CH${i + 1}`, online: true });
                }
            }

            const allChannelIds = connectedChannels.map(c => c.id);

            const updatedDevice = { ...device, channels: channels, userId: userId, deviceName: device.name }; // Keep all for internal state
            setSelectedDevice(updatedDevice);
            await deviceStorage.updateDevice(updatedDevice);

            const initialGrid = Array(36).fill(null);
            allChannelIds.slice(0, 36).forEach((chId, idx) => {
                initialGrid[idx] = typeof chId === 'string' ? parseInt(chId) : chId;
            });

            // --- AUTO GRID SELECTION: Always open with 1x1 for fast initial load ---
            // Users can manually switch to multi-channel grids via the grid selector.
            const targetGrid: GridType = '1x1';

            console.log(
                `[LiveView] Default grid: ${targetGrid} (${allChannelIds.length} channels available)`,
            );
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setCurrentGrid(targetGrid);

            if (initialChannelId !== undefined) {
                const targetChId = typeof initialChannelId === 'string' ? parseInt(initialChannelId, 10) : initialChannelId;
                const chIdx = allChannelIds.indexOf(targetChId);
                if (chIdx !== -1) {
                    setActiveCellIndex(chIdx);
                } else if (!isNaN(targetChId) && targetChId >= 0 && targetChId < allChannelIds.length) {
                    setActiveCellIndex(targetChId);
                } else {
                    setActiveCellIndex(0);
                }
            } else {
                setActiveCellIndex(0);
            }
            if (route.params?.fromAlarm) {
                setIsHD(false); // use sub stream first
            }
            setGridCells(initialGrid);

            // --- 🎯 REAL-TIME AI START MONITORING ---
            await deviceSessionManager.startAlarmMonitor(String(device.id)).catch(err => {
                console.warn('[LiveView] AI Monitoring failed to start:', err);
            });

            console.log(
                `Grid populated with ${allChannelIds.length} connected channels.`,
            );
            setIsTransitioning(false);

            // --- 🎯 REAL-TIME AI ARMING ---
            // Trigger subscription immediately so we don't wait for the background loop
            await NvrSdk.enableAlarms(userId, -1).catch(() => { }); // Set -1 for all channels support in native if possible or bulk
            subscribeDeviceAlarms(updatedDevice);
        } catch (e) {
            console.error('Login Failed', e);
            Alert.alert('Login Failed', 'Could not connect to device.');
            setIsLoggedIn(false);
            setCurrentUserId(null);
        } finally {
            loggingInRef.current = false;
            setIsLoggingIn(false);
            setIsTransitioning(false);
        }
    };

    const startSingleChannelLive = useCallback(async ({ deviceId: targetDeviceId, channelId: targetChannelId, streamType }: { deviceId: string | number, channelId: number, streamType: 'main' | 'sub' }) => {
        console.log(`[LiveView] startSingleChannelLive: deviceId=${targetDeviceId}, channelId=${targetChannelId}, streamType=${streamType}`);

        // Fetch devices if not loaded yet
        const devices = allDevices.length > 0 ? allDevices : await deviceStorage.getDevices();
        if (allDevices.length === 0) {
            setAllDevices(devices);
        }

        const target = devices.find(d => String(d.id) === String(targetDeviceId));
        if (!target) {
            console.warn(`[LiveView] startSingleChannelLive: device not found ${targetDeviceId}`);
            return;
        }

        // Set stream type (SD / sub stream first)
        setIsHD(streamType === 'main');

        // Ensure 1x1 grid
        setCurrentGrid('1x1');

        // Check if we are already logged in to this device
        if (selectedDevice && String(selectedDevice.id) === String(target.id) && currentUserIdRef.current !== null && isLoggedIn) {
            console.log(`[LiveView] Already logged in. Selecting channel: ${targetChannelId}`);

            // Find channel index
            const targetChId = parseInt(String(targetChannelId), 10);
            const chIdx = gridCells.indexOf(targetChId);
            if (chIdx !== -1) {
                setActiveCellIndex(chIdx);
            } else {
                // If not found in current gridCells, let's put it at index 0 or find it in channels
                const channels = target.channels || [];
                const allChannelIds = channels.map((c: any) => c.id);
                const freshIdx = allChannelIds.indexOf(targetChId);
                if (freshIdx !== -1) {
                    const newGrid = [...gridCells];
                    newGrid[0] = targetChId;
                    setGridCells(newGrid);
                    setActiveCellIndex(0);
                }
            }
            return;
        }

        // If not logged in, trigger login sequence
        initStartedRef.current = String(target.id);
        channelsFetchedRef.current = false;
        setIsTransitioning(true);
        setIsLoggedIn(false);
        setGridCells(Array(36).fill(null));
        setCurrentUserIdWithRef(null);
        setSelectedDevice(null);

        setTimeout(() => {
            setSelectedDevice(target);
            performLogin(target);
        }, 10);
    }, [allDevices, selectedDevice, isLoggedIn, gridCells]);

    useEffect(() => {
        if (route.params?.fromAlarm) {
            startSingleChannelLive({
                deviceId: route.params.deviceId,
                channelId: route.params.channelId,
                streamType: 'sub', // use sub stream first
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route.params?.fromAlarm, route.params?.deviceId, route.params?.channelId]);



    // Periodic Sync Ref to prevent multiple interval setups
    const syncStartedRef = useRef(false);

    // Periodic Sync: Refresh channel names/status every 30 seconds
    useEffect(() => {
        if (!isLoggedIn || !currentUserId || !selectedDevice) {
            syncStartedRef.current = false;
            return;
        }

        if (syncStartedRef.current) return;
        syncStartedRef.current = true;

        console.log('[LiveView] Initializing background channel sync...');
        const syncTimer = setInterval(async () => {
            if (isRecordingRef.current || !isFocused) return;
            try {
                console.log('[LiveView] Background channel sync pulse...');
                const freshChannels = await NvrSdk.getChannels(currentUserId);
                if (freshChannels && freshChannels.length > 0) {
                    // Only update if count changed or we have 0 currently
                    if (!selectedDevice || !selectedDevice.channels || selectedDevice.channels.length !== freshChannels.length) {
                        setSelectedDevice(prev => {
                            if (!prev) return null;
                            const updated = { ...prev, channels: freshChannels };
                            deviceStorage.updateDevice(updated).catch(() => { });
                            return updated;
                        });
                    }
                }
            } catch (e) {
                console.warn('[LiveView] Background sync failed', e);
            }
        }, 60000); // Slow down to 60s to reduce churn

        return () => {
            clearInterval(syncTimer);
            syncStartedRef.current = false;
        };
    }, [isLoggedIn, currentUserId]); // Removed selectedDevice from dependencies to prevent loop

    // --- 🚨 LIVE AI EVENT LISTENER ---
    useEffect(() => {
        if (!isLoggedIn || currentUserId === null) return;

        const handleAiEvent = async (rawEvent: any) => {
            try {
                console.log('[LiveView] 📥 JS RECEIVED RAW EVENT:', JSON.stringify(rawEvent));
                setSnapMessage(`Raw AI: ${rawEvent.type} CH${(rawEvent.channelId || 0) + 1}`);
                setTimeout(() => setSnapMessage(null), 3000);

                const isMatch = String(rawEvent.deviceId) === String(selectedDevice?.id) ||
                    String(rawEvent.deviceId) === String(selectedDevice?.sn) ||
                    (rawEvent.deviceId?.startsWith('DEV-') && String(selectedDevice?.loginId) === rawEvent.deviceId.split('-')[1]) ||
                    rawEvent.userId === currentUserId;

                if (!isMatch) return;

                const settings = await deviceStorage.getPushSettings(String(rawEvent.deviceId), currentUserId?.toString());
                if (settings && settings.global) {
                    if (!settings.global.enablePush || !settings.global.messageSubscription) {
                        return;
                    }
                    const eventType = String(rawEvent.type).toUpperCase();
                    const chConfig = settings.channels?.find((c: any) => parseInt(c.id) === rawEvent.channelId);
                    if (chConfig) {
                        const mapping: any = {
                            'MOTION': 'enabled',
                            'HUMAN_DETECTION': 'human',
                            'VEHICLE_DETECTION': 'vehicle',
                            'FACE_DETECTION': 'faceDet',
                            'FACE_RECOGNITION': 'faceRec',
                            'REGION_INTRUSION': 'intrusion',
                            'LINE_CROSSING': 'line',
                            'LOITERING': 'loitering',
                            'CROWD_DETECTION': 'crowd',
                            'TAMPERING': 'tamper'
                        };
                        const field = mapping[eventType];
                        if (field && !chConfig[field]) return;
                    }
                }

                const normalized = normalizeAiEvent(rawEvent, currentUserId, selectedDevice);
                addEvent(normalized);

                if (normalized.channelId >= 0) {
                    setAiAlerts(prev => ({
                        ...prev,
                        [normalized.channelId]: { type: normalized.eventType, time: Date.now() }
                    }));
                    setTimeout(() => {
                        setAiAlerts(prev => {
                            const next = { ...prev };
                            if (next[normalized.channelId] && Date.now() - next[normalized.channelId].time >= 5500) {
                                delete next[normalized.channelId];
                            }
                            return next;
                        });
                    }, 6000);
                }
            } catch (err) {
                console.error('[LiveView] AI Event processing error:', err);
            }
        };

        console.log('[LiveView] 🔍 AI Listener: Registering native callbacks for both modules...');
        const sub1 = tvtEventEmitter.addListener('onAiEvent', handleAiEvent);
        const sub2 = deviceEventEmitter.addListener('onAiEvent', handleAiEvent);

        const sub3 = tvtEventEmitter.addListener('AI_EVENT', async (data) => {
            console.log('[LiveView] 🚨 RECEIVED AI_EVENT:', data);

            // Handle as standard event
            handleAiEvent(data);

            // Trigger Local Notification
            await notifee.displayNotification({
                title: `${data.type || 'AI Alert'}`,
                body: `Channel ${(data.channelId || 0) + 1} - ${selectedDevice?.name || 'Device'}`,
                android: {
                    channelId: 'alarm-channel',
                    importance: AndroidImportance.HIGH,
                    smallIcon: 'ic_launcher',
                    pressAction: {
                        id: 'default',
                    },
                },
            });
        });

        return () => {
            console.log('[LiveView] 🔍 AI Listener: Cleaning up native callbacks...');
            sub1.remove();
            sub2.remove();
            sub3.remove();
        };
    }, []);

    // ─── LOAD ALARMS FROM STORAGE & SUBSCRIBE TO REAL-TIME ALARMS ───
    useEffect(() => {
        // 1. Load initial history
        const loadInitialHistory = async () => {
            try {
                const storageKey = await authStorage.getAlarmStorageKey();
                const stored = await AsyncStorage.getItem(storageKey);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        const normalizedList = parsed.map((alarm: any) =>
                            normalizeAiEvent({
                                id: alarm.id,
                                deviceId: alarm.deviceId,
                                channelId: Number(alarm.channelId),
                                channelName: alarm.channelName || `CH ${Number(alarm.channelId) + 1}`,
                                type: alarm.type || alarm.eventType || 'MOTION',
                                timestamp: alarm.timestamp || Date.now(),
                            }, currentUserId, selectedDevice)
                        );
                        setEvents(normalizedList);
                    }
                }
            } catch (err) {
                console.warn('[LiveView] Failed to load initial alarm history:', err);
            }
        };

        loadInitialHistory();

        // 2. Subscribe to real-time alarm emissions (both SDK & FCM)
        const handleNewAlarm = (alarm: any) => {
            console.log('[LiveView] 🔔 Received alarm via alarmEmitter:', alarm);
            const isMatch = String(alarm.deviceId) === String(selectedDevice?.id) ||
                String(alarm.deviceId) === String(selectedDevice?.sn) ||
                (alarm.deviceId?.startsWith('DEV-') && String(selectedDevice?.loginId) === alarm.deviceId.split('-')[1]) ||
                alarm.userId === currentUserId;

            // Only add if event belongs to the current user/device context
            if (isMatch) {
                const normalized = normalizeAiEvent({
                    id: alarm.id,
                    deviceId: alarm.deviceId,
                    channelId: Number(alarm.channelId),
                    channelName: alarm.channelName || `CH ${Number(alarm.channelId) + 1}`,
                    type: alarm.type || alarm.eventType || 'MOTION',
                    timestamp: alarm.timestamp || Date.now(),
                }, currentUserId, selectedDevice);
                addEvent(normalized);
            }
        };

        alarmEmitter.on('new_alarm', handleNewAlarm);
        return () => {
            alarmEmitter.removeListener('new_alarm', handleNewAlarm);
        };
    }, [currentUserId, selectedDevice, setEvents, addEvent]);

    useEffect(() => {
        if (!isLoggedIn) {
            setLoadingCellCount(0);
            return;
        }

        const gridSize = getGridSize(currentGrid);
        setLoadingCellCount(gridSize);
    }, [isLoggedIn, currentGrid]);

    const getGridSize = (type: GridType): number => {
        if (type === '1x1') return 1;
        if (type === '2x2') return 4;
        if (type === '3x3') return 9;
        if (type === '4x4') return 16;
        if (type === '5x5') return 25;
        if (type === '6x6') return 36;
        if (type === '32') return 32;
        if (type === '1+12') return 13;
        if (type.startsWith('1+')) {
            return 1 + parseInt(type.split('+')[1]);
        }
        return 4;
    };

    const handleGridChange = (type: GridType) => {
        if (isRecordingRef.current) {
            Alert.alert('Recording', 'Please stop recording before changing grid layout.');
            return;
        }

        if (currentGrid === type) return;

        // Note: Removed LayoutAnimation here because rapidly switching complex flex grids 
        // causes severe overlap/ghosting bugs on Android.
        setCurrentGrid(type);

        if (selectedDevice) {
            const maxCh = selectedDevice.channels?.length || 16;
            const size = getGridSize(type);
            const newCells = [...gridCells];

            const currentChId = gridCells[activeCellIndex] !== null ? gridCells[activeCellIndex] : 0;
            const startChId = typeof currentChId === 'number' ? currentChId : 0;

            // Auto-populate grid based on new layout
            for (let i = 0; i < size; i++) {
                newCells[i] = (startChId + i) % maxCh;
            }

            setGridCells(newCells);
            setActiveCellIndex(0);
        }
    };

    // --- ACTIONS ---

    const handleSnapshot = async () => {
        if (isCapturing || !selectedDevice || currentUserId === null) return;

        const chId = gridCells[activeCellIndex];
        if (chId === null || chId === undefined) {
            Alert.alert('Selection Required', 'Please tap on a camera view before taking a snapshot.');
            return;
        }

        const handle = handlesRef.current[indexToKey(activeCellIndex)];
        if (!handle) {
            Alert.alert('Error', 'Camera is not currently playing.');
            return;
        }

        const hasPermission = await requestStoragePermissions();
        if (!hasPermission) {
            Alert.alert('Permission Denied', 'Storage permissions are required to save snapshots.');
            return;
        }

        // 5. Reserved Disk Space Check
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
            const fileName = `snap_${chId}_${timestamp}.jpg`;
            const initialPath = `/sdcard/VMS/${userTag}/Snapshots/${fileName}`;

            console.log(`📸 Taking Live Snapshot: UserID=${currentUserId}, Channel=${chId}, Path=${initialPath}`);

            // Call captureSnapshot directly for live stream
            const actualPath = await NvrSdk.captureSnapshot(
                currentUserId,
                chId,
                initialPath
            );

            // Save to DB so it appears in App Gallery immediately
            api.saveMedia({
                type: 'snapshot',
                fileName,
                filePath: actualPath,
                channelId: chId,
                deviceName: selectedDevice.name || 'Unknown Device'
            }).catch(e => console.warn("Failed to save snapshot to DB:", e.message));

            // Save to public gallery and scan
            try {
                const publicPath = await NvrSdk.saveMediaToPublic(actualPath, 'image');
                await NvrSdk.scanFile(publicPath);
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

    const handleRecordToggle = async () => {
        if (currentUserId === null || currentUserId === undefined || currentUserId < 0) {
            Alert.alert('Error', 'Not logged in to device.');
            return;
        }

        if (isRecording) {
            // STOP RECORDING
            const handleToStop = recordingHandleRef.current;
            setIsRecording(false);
            isRecordingRef.current = false;
            recordingHandleRef.current = null;
            setRecHandle(null);

            const savedPath = currentRecordInfo?.path;
            const savedThumbPath = currentRecordInfo?.thumbPath;
            const savedFileName = currentRecordInfo?.fileName;
            const savedChId = currentRecordInfo?.channelId;
            const savedDuration = recordTimer;
            setRecordTimer(0);
            setCurrentRecordInfo(null);

            // Background explicit stop
            if (handleToStop) {
                (async () => {
                    // 1. Stop SDK recording — always continue regardless of result
                    try {
                        await NvrSdk.stopLocalRecord(handleToStop, true);
                        console.log('RECORD_STOP_SUCCESS');
                    } catch (e: any) {
                        console.warn('RECORD: stopLocalRecord warning (file may still be saved):', e.message);
                    }

                    if (savedPath && savedFileName && savedChId !== undefined) {
                        // 2. Wait 800ms
                        await new Promise(resolve => setTimeout(resolve, 800));

                        // 3. Scan sandbox path so it appears in the app Gallery
                        NvrSdk.scanFile(savedPath).catch(() => { });

                        // 4. Copy to public Movies/VMS gallery so it appears in system Gallery
                        try {
                            const publicPath = await NvrSdk.saveMediaToPublic(savedPath, 'recording');
                            if (publicPath && publicPath !== savedPath) {
                                await NvrSdk.scanFile(publicPath);
                                console.log(`RECORD_SAVED_TO_GALLERY: ${publicPath}`);
                            }
                        } catch (publicErr) {
                            console.warn('RECORD: Failed to save recording to public gallery:', publicErr);
                        }

                        // Check if thumbnail actually exists on disk
                        let finalToastPath = savedPath;
                        let thumbnailDbPath = '';
                        if (savedThumbPath) {
                            const hasThumb = await NvrSdk.checkFileExists(savedThumbPath);
                            if (hasThumb) {
                                finalToastPath = savedThumbPath;
                                thumbnailDbPath = savedThumbPath;
                            }
                        }

                        // 5. Save metadata to backend DB
                        try {
                            const freshUser = await authStorage.getUser();
                            const userEmail = freshUser?.email || freshUser?.username || '';
                            const userIdVal = freshUser?.id || freshUser?._id || currentUserId || -1;

                            api.saveMedia({
                                type: 'recording',
                                fileName: savedFileName,
                                filePath: savedPath,
                                thumbnailPath: thumbnailDbPath,
                                channelId: savedChId,
                                deviceName: selectedDevice?.name || 'Unknown Device',
                                userEmail: String(userEmail),
                                userId: Number(userIdVal),
                            }).catch(e => {
                                console.log('RECORD: DB sync silent fail', e.message);
                            });
                        } catch (userErr) {
                            console.warn('RECORD: Failed to fetch user info for DB metadata:', userErr);
                        }

                        // 6. Show success toast using only valid thumbnail
                        setMediaToast({
                            visible: true,
                            type: 'video',
                            path: finalToastPath,
                        });

                        // 7. Automatically hide toast after 5 seconds
                        setTimeout(() => {
                            setMediaToast(prev => {
                                if (prev && (prev.path === finalToastPath || prev.path === savedPath)) {
                                    return null;
                                }
                                return prev;
                            });
                        }, 5000);
                    } else {
                        console.warn('RECORD: savedPath or fileName missing, cannot complete gallery save');
                    }
                })();
            }
        } else {
            // START RECORDING
            const hasPermission = await requestStoragePermissions();
            if (!hasPermission) {
                Alert.alert('Permission Denied', 'Storage permissions are required to start recording.');
                return;
            }

            const chId = gridCells[activeCellIndex];
            if (chId === null || chId === undefined || chId < 0) {
                Alert.alert('Error', 'No camera selected.');
                return;
            }

            const liveHandle = handlesRef.current[indexToKey(activeCellIndex)];
            if (!liveHandle || liveHandle === '-1') {
                Alert.alert('Error', 'Camera is not currently playing natively. Please wait for stream.');
                return;
            }

            const hasSpace = await localSettings.checkDiskSpace(appLocalSettings?.reservedDiskSpace || 50);
            if (!hasSpace) {
                Alert.alert('Storage Full', 'Insufficient space for local recording.');
                return;
            }

            try {
                // Dynamically load user for exact userTag alignment with Gallery
                const freshUser = await authStorage.getUser();
                const userTag = (freshUser?.email || freshUser?.username || 'user').replace(/[^a-zA-Z0-9]/g, '_');
                const timestamp = new Date().getTime();
                const fileName = `rec_${chId}_${timestamp}.mp4`;
                const path = `/sdcard/VMS/${userTag}/Records/${fileName}`;
                const thumbPath = `${path}.jpg`;

                console.log('RECORD_START_REQUEST');
                console.log(`RECORD_HANDLE: ${liveHandle}`);
                console.log(`RECORD_PATH: ${path}`);

                // Call SDK first — only update UI state if it succeeds
                // The Java layer handles MakeKeyFrame + 300ms delay internally
                const result = await NvrSdk.startLocalRecord(
                    liveHandle,
                    path,
                    true,
                    currentUserId,
                );

                if (!result) {
                    console.log('RECORD_START_FAILED: startLocalRecord returned false');
                    Alert.alert('Recording Failed', 'Stream is not ready. Please try again.');
                    isRecordingRef.current = false;
                    recordingHandleRef.current = null;
                    setRecHandle(null);
                    setIsRecording(false);
                    setCurrentRecordInfo(null);
                    return;
                }

                console.log('RECORD_START_SUCCESS');

                // SDK reported success — now update UI state
                isRecordingRef.current = true;
                recordingHandleRef.current = liveHandle;
                setRecHandle(liveHandle);
                setIsRecording(true);
                setRecordTimer(0);
                setCurrentRecordInfo({ fileName, path: path, thumbPath, channelId: chId });

                // Capture first frame as thumbnail specifically for the Gallery to use
                setTimeout(() => {
                    if (recordingHandleRef.current && currentUserId !== null) {
                        NvrSdk.captureSnapshotWithHandle(currentUserId, chId, thumbPath, recordingHandleRef.current).catch(() => { });
                    }
                }, 800);
            } catch (e: any) {
                // Clean reset — no partial state left over
                isRecordingRef.current = false;
                recordingHandleRef.current = null;
                setRecHandle(null);
                setIsRecording(false);
                setCurrentRecordInfo(null);
                const msg = e?.message || String(e);
                console.log(`RECORD_START_FAILED: ${msg}`);
                Alert.alert('Recording Failed', 'Failed to start recording. Please try again.');
            }
        }
    };

    const handlePtz = (action: number) => {
        if (currentUserId === null) return;
        const chId = gridCells[activeCellIndex];
        if (chId === null) return;

        let finalAction = action;
        // Direction Reverse Logic
        if (appLocalSettings?.ptzReverseControl) {
            if (action === NvrSdk.PTZ_ACTION.UP) finalAction = NvrSdk.PTZ_ACTION.DOWN;
            else if (action === NvrSdk.PTZ_ACTION.DOWN)
                finalAction = NvrSdk.PTZ_ACTION.UP;
            else if (action === NvrSdk.PTZ_ACTION.LEFT)
                finalAction = NvrSdk.PTZ_ACTION.RIGHT;
            else if (action === NvrSdk.PTZ_ACTION.RIGHT)
                finalAction = NvrSdk.PTZ_ACTION.LEFT;
        }

        const handle = handlesRef.current[indexToKey(activeCellIndex)];
        console.log(
            `PTZ Action: ${finalAction} (Original: ${action}) on Ch ${chId} with speed ${ptzSpeed}`,
        );
        NvrSdk.ptzControl(
            currentUserId,
            typeof chId === 'string' ? parseInt(chId, 10) : chId,
            finalAction,
            ptzSpeed,
        ).catch(e => console.log('PTZ Error', e));
    };

    const handlePreset = async (command: number, index: number) => {
        if (currentUserId === null) return;
        const chId = gridCells[activeCellIndex];
        if (chId === null) return;

        const handle = handlesRef.current[indexToKey(activeCellIndex)];
        console.log(
            `PTZ Preset: Cmd ${command}, Index ${index} on Ch ${chId}`,
        );
        try {
            await NvrSdk.ptzPreset(currentUserId, typeof chId === 'string' ? parseInt(chId, 10) : chId, command, index);
        } catch (e) {
            console.error('Preset command failed', e);
            throw e;
        }
    };

    const handleStopPtz = () => {
        if (currentUserId === null) return;
        const chId = gridCells[activeCellIndex];
        if (chId === null) return;
        NvrSdk.ptzControl(currentUserId, typeof chId === 'string' ? parseInt(chId, 10) : chId, NvrSdk.PTZ_ACTION.STOP, 0);
    };

    const handleStartTalk = async () => {
        if (!currentUserId) return;
        const chId = gridCells[activeCellIndex];
        if (chId === null) {
            Alert.alert(
                'Selection Required',
                'Please select a camera before talking.',
            );
            return;
        }

        try {
            const handle = await NvrSdk.startTalk(currentUserId);
            setTalkHandle(handle);
            setIsTalking(true);
        } catch (e) {
            console.warn('Talk Start Failed', e);
        }
    };

    const handleStopTalk = async () => {
        if (!talkHandle) {
            setIsTalking(false);
            return;
        }
        try {
            await NvrSdk.stopTalk(talkHandle);
            setTalkHandle(null);
            setIsTalking(false);
        } catch (e) {
            console.warn('Talk Stop Failed', e);
            setIsTalking(false);
        }
    };

    const handleOpenImageSettings = async () => {
        if (!currentUserId) return;
        const chId = gridCells[activeCellIndex];
        if (chId === null) return;

        // Note: For live, we need the live handle.
        // Assuming we store live handles in a map or similar.
        // Looking at LivePlayer usage, we might need a way to get the handle.
        // Actually, LiveView has handlesRef!
        const handle = handlesRef.current[indexToKey(activeCellIndex)];
        if (!handle) {
            Alert.alert('Error', 'No active stream to adjust');
            return;
        }

        try {
            const data = await NvrSdk.getVideoEffect(currentUserId, handle);
            setImageSettings(data);
            setIsImageSettingsVisible(true);
        } catch (e) {
            console.warn('Failed to get image settings', e);
            // Fallback to default if native fails
            setIsImageSettingsVisible(true);
        }
    };

    const handleImageSettingsChange = async (newSettings: any) => {
        setImageSettings(newSettings);
        if (!currentUserId) return;
        const handle = handlesRef.current[indexToKey(activeCellIndex)];
        if (!handle) return;

        try {
            await NvrSdk.setVideoEffect({
                userId: currentUserId,
                handle,
                ...newSettings,
            });
        } catch (e) {
            console.error('Failed to apply image settings', e);
        }
    };

    const handleSaveImageSettings = async () => {
        if (!currentUserId) return;
        const handle = handlesRef.current[indexToKey(activeCellIndex)];
        if (!handle) return;

        try {
            await NvrSdk.saveVideoEffect({
                userId: currentUserId,
                handle,
                ...imageSettings,
            });
            Alert.alert('Success', 'Image settings saved to camera');
        } catch (e) {
            Alert.alert('Error', 'Failed to save settings');
        }
    };

    const handleDefaultImageSettings = () => {
        const defaults = {
            brightness: 50,
            contrast: 50,
            saturation: 50,
            hue: 50,
            sharpness: 50,
        };
        handleImageSettingsChange(defaults);
    };

    useEffect(() => {
        return () => {
            // Stop PTZ on leave
            const chId = gridCells[activeCellIndex];
            const handle = handlesRef.current[indexToKey(activeCellIndex)];
            if (handle && currentUserId !== null && chId !== null) {
                NvrSdk.ptzControl(
                    currentUserId,
                    Number(chId),
                    NvrSdk.PTZ_ACTION.STOP,
                    0,
                ).catch(() => { });
            }
            // Stop recording if active
            if (isRecording && recHandle) {
                NvrSdk.stopLocalRecord(recHandle).catch(() => { });
                NvrSdk.stopLive(recHandle).catch(() => { });
            }
            // Stop talk if active
            if (talkHandle) {
                NvrSdk.stopTalk(talkHandle).catch(() => { });
            }
            // Stop audio when leaving LiveView
            if (isAudioOn && currentUserId !== null) {
                const ch = gridCells[activeCellIndex];
                if (ch !== null) NvrSdk.stopAudio(currentUserId, ch).catch(() => { });
            }
        };
    }, [
        activeCellIndex,
        currentUserId,
        gridCells,
        isRecording,
        recHandle,
        talkHandle,
        isAudioOn,
    ]);

    // --- AUDIO TOGGLE HANDLER ---
    const handleAudioToggle = () => {
        if (currentUserId === null) return;
        const chId = gridCells[activeCellIndex];
        if (chId === null) return;

        if (isAudioOn) {
            // Turn audio OFF
            NvrSdk.stopAudio(currentUserId, chId).catch(e =>
                console.warn('[Audio] stopAudio failed', e),
            );
            setIsAudioOn(false);
        } else {
            // Turn audio ON for selected channel
            NvrSdk.startAudio(currentUserId, chId).catch(e =>
                console.warn('[Audio] startAudio failed', e),
            );
            setIsAudioOn(true);
        }
    };

    // Reset audio when active channel changes
    useEffect(() => {
        if (isAudioOn && currentUserId !== null) {
            const chId = gridCells[activeCellIndex];
            if (chId !== null) {
                // Switch audio to newly selected channel
                NvrSdk.startAudio(currentUserId, chId).catch(() => { });
            }
        }
    }, [activeCellIndex]);

    // --- RENDERERS ---

    const renderGridContent = () => {
        const size = getGridSize(currentGrid);
        const startIdx = Math.floor(activeCellIndex / size) * size;

        const renderCell = (index: number, flex = 1) => {
            const chId = gridCells[index];
            const isActive = activeCellIndex === index;
            const currentAlert = chId !== null ? aiAlerts[chId] : null;

            const isDragging = draggingIndex === index;
            const isHovered = hoverIndex === index;

            return (
                <View
                    key={`${index}-${chId}`}
                    style={{
                        flex,
                        margin: 1,
                        backgroundColor: '#000',
                        overflow: 'hidden',
                        borderWidth: (isActive || currentAlert) ? 3 : 0,
                        borderColor: currentAlert
                            ? '#FF5252'
                            : (isDragging ? '#FFEB3B' : (isHovered ? '#4CAF50' : THEME.primary)),
                        opacity: isDragging ? 0.3 : 1,
                        zIndex: isDragging ? 100 : (isActive || currentAlert) ? 10 : 1,
                    }}
                    onLayout={e => {
                        const { x, y, width, height } = e.nativeEvent.layout;
                        cellLayouts[index] = { x, y, w: width, h: height };
                    }}
                >
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={() => {
                            setActiveCellIndex(index);
                            const now = Date.now();
                            const isDoubleTap = now - lastTapRef.current < 300;

                            if (isDoubleTap) {
                                // Double Tap Logic
                                if (currentGrid !== '1x1') {
                                    handleGridChange('1x1');
                                } else {
                                    const zoomRef = zoomRefs.current[index];
                                    if (zoomRef) zoomRef.toggleZoom();
                                }
                            } else {
                                // Single Tap Logic
                                if (activeCellIndex === index) {
                                    setShowCellFeatures(prev => !prev);
                                } else {
                                    setActiveCellIndex(index);
                                    setShowCellFeatures(true);
                                }
                            }
                            lastTapRef.current = now;
                        }}
                        onLongPress={() => {
                            if (chId !== null) {
                                Vibration.vibrate(50);
                                setDraggingIndex(index);
                            }
                        }}
                        delayLongPress={500}
                    >
                        {(() => {
                            const chObj = selectedDevice?.channels?.find(
                                (c: any) =>
                                    (typeof c.id === 'string' ? parseInt(c.id) : c.id) === chId,
                            );
                            const isOffline = chObj && chObj.status === 0;

                            if (
                                isLoggedIn &&
                                chId !== null &&
                                (index - startIdx) < loadingCellCount &&
                                currentUserId !== null &&
                                selectedDevice &&
                                !isOffline &&
                                true
                            ) {
                                return (
                                    <View style={{ flex: 1 }}>
                                        <PinchZoomView
                                            ref={el => {
                                                if (el) zoomRefs.current[index] = el;
                                            }}
                                            enabled={currentGrid === '1x1' && isActive}
                                        >
                                            <LivePlayer
                                                key={`dev${selectedDevice?.id}-ch${chId}-${isHD ? 'hd' : 'sd'}`}
                                                userId={currentUserId}
                                                host={selectedDevice?.ip || ''}
                                                username={selectedDevice?.nvrUsername || ''}
                                                password={selectedDevice?.nvrPassword || ''}
                                                channelId={typeof chId === 'string' ? parseInt(chId, 10) : (chId as number)}
                                                streamType={isHD ? 0 : 1}
                                                deviceType={selectedDevice?.type || 'NVR'}
                                                index={index}
                                                aspectRatio={currentGrid === '1x1' ? '1:1' : '16:9'}
                                                muted={!isAudioOn || activeCellIndex !== index}
                                                osdVisible={appLocalSettings?.osd}
                                                originalScale={appLocalSettings?.originalScaleDisplay}
                                                rotation={
                                                    appLocalSettings?.screenRotationCorrection ? 180 : 0
                                                }
                                                onBitrateUpdate={(kbps, fps) => {
                                                    setBitrateData(prev => ({
                                                        ...prev,
                                                        [index]: { kbps, fps },
                                                    }));
                                                }}
                                                onHandleAcquired={handleHandleAcquired}
                                            />
                                        </PinchZoomView>

                                        {currentAlert && (
                                            <View style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                backgroundColor: 'rgba(255, 82, 82, 0.85)',
                                                paddingVertical: 2,
                                                alignItems: 'center',
                                                zIndex: 20
                                            }}>
                                                <Text style={{ color: '#FFF', fontSize: 9, fontWeight: 'bold' }}>
                                                    ⚠️ {(currentAlert.type || 'AI EVENT').replace(/_/g, ' ')}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Audio indicator: shows on cell when audio is active for that channel */}
                                        {(audioActiveIndex === index || (isActive && isAudioOn)) && (
                                            <View
                                                style={{
                                                    position: 'absolute',
                                                    bottom: 8,
                                                    right: 8,
                                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                                    borderRadius: 20,
                                                    padding: 6,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    borderWidth: 1,
                                                    borderColor: 'rgba(255,150,0,0.5)',
                                                }}
                                            >
                                                <Icon
                                                    name={
                                                        isAudioOn || audioActiveIndex === index
                                                            ? 'volume-high'
                                                            : 'volume-off'
                                                    }
                                                    size={currentGrid === '1x1' ? 20 : 14}
                                                    color="#FF9800"
                                                />
                                                {currentGrid === '1x1' && (
                                                    <Text
                                                        style={{
                                                            color: '#FF9800',
                                                            fontSize: 10,
                                                            fontWeight: 'bold',
                                                        }}
                                                    >
                                                        CH{(chId ?? 0) + 1}
                                                    </Text>
                                                )}
                                            </View>
                                        )}

                                        {isActive && isRecording && (
                                            <View style={styles.recIndicator}>
                                                <View style={styles.recDot} />
                                                <Text style={styles.recText}>
                                                    REC{' '}
                                                    {new Date(recordTimer * 1000).toISOString().substr(14, 5)}
                                                </Text>
                                            </View>
                                        )}
                                        {isActive && showCellFeatures && (
                                            <>
                                                {(() => {
                                                    const chObj = selectedDevice?.channels?.find(
                                                        (c: any) =>
                                                            (typeof c.id === 'string' ? parseInt(c.id) : c.id) ===
                                                            chId,
                                                    );
                                                    const chName = chObj?.name || '';
                                                    const hasPtz = chObj?.ptz === true || chObj?.ptzSupport === true || chName.toLowerCase().includes('ptz') || chName.toLowerCase().includes('dome') || chName.toLowerCase().includes('speed');
                                                    const hasLight =
                                                        chName.toLowerCase().includes('bulb') ||
                                                        chName.toLowerCase().includes('light');
                                                    const hasIR =
                                                        chName.toLowerCase().includes('ir') ||
                                                        chName.toLowerCase().includes('infra') ||
                                                        chName.toLowerCase().includes('night');
                                                    const hasTalk =
                                                        hasAudioSupport === true ||
                                                        chName.toLowerCase().includes('mic') ||
                                                        chName.toLowerCase().includes('talk') ||
                                                        chName.toLowerCase().includes('audio') ||
                                                        chName.toLowerCase().includes('securat') ||
                                                        chName.toLowerCase().includes('two-way');

                                                    const isLampOn = lampStatus[index] || false;
                                                    const isIROn = irStatus[index] || false;

                                                    // Adaptive: small buttons for grid, large for 1x1
                                                    const isFullView = currentGrid === '1x1';
                                                    const btnSize = isFullView ? 34 : 24;
                                                    const iconSize = isFullView ? 20 : 14;
                                                    const btnStyle = {
                                                        width: btnSize,
                                                        height: btnSize,
                                                        backgroundColor: 'rgba(0,0,0,0.6)',
                                                        borderRadius: 4,
                                                        justifyContent: 'center' as const,
                                                        alignItems: 'center' as const,
                                                        borderWidth: 1,
                                                        borderColor: 'rgba(255,255,255,0.3)',
                                                    };

                                                    const buttons = [
                                                        <TouchableOpacity
                                                            key="hd" style={{ display: 'none' }}

                                                            onPress={() => setIsHD(!isHD)}
                                                        >
                                                            <Text
                                                                style={{
                                                                    color: '#FFF',
                                                                    fontSize: isFullView ? 12 : 8,
                                                                    fontWeight: 'bold',
                                                                }}
                                                            >
                                                                {isHD ? 'HD' : 'SD'}
                                                            </Text>
                                                        </TouchableOpacity>,
                                                        hasLight && (
                                                            <TouchableOpacity
                                                                key="lamp"
                                                                style={[
                                                                    btnStyle,
                                                                    isLampOn && { backgroundColor: '#FFD700' },
                                                                ]}
                                                                onPress={() => {
                                                                    const handle =
                                                                        handlesRef.current[indexToKey(index)];
                                                                    if (handle && currentUserId) {
                                                                        const chId = gridCells[index];
                                                                        const nextState = !isLampOn;
                                                                        if (chId !== null) {
                                                                            NvrSdk.ptzControl(
                                                                                currentUserId,
                                                                                typeof chId === 'string' ? parseInt(chId, 10) : chId,
                                                                                nextState
                                                                                    ? NvrSdk.PTZ_ACTION.LAMP_ON
                                                                                    : NvrSdk.PTZ_ACTION.LAMP_OFF,
                                                                                1,
                                                                            );
                                                                        }
                                                                        setLampStatus(prev => ({
                                                                            ...prev,
                                                                            [index]: nextState,
                                                                        }));
                                                                    }
                                                                }}
                                                            >
                                                                <Icon
                                                                    name={
                                                                        isLampOn ? 'lightbulb' : 'lightbulb-outline'
                                                                    }
                                                                    size={iconSize}
                                                                    color={isLampOn ? '#000' : '#FFF'}
                                                                />
                                                            </TouchableOpacity>
                                                        ),
                                                        hasIR && (
                                                            <TouchableOpacity
                                                                key="ir"
                                                                style={[
                                                                    btnStyle,
                                                                    isIROn && { backgroundColor: '#FF5252' },
                                                                ]}
                                                                onPress={() => {
                                                                    const handle =
                                                                        handlesRef.current[indexToKey(index)];
                                                                    if (handle && currentUserId) {
                                                                        const chId = gridCells[index];
                                                                        const nextState = !isIROn;
                                                                        if (chId !== null) {
                                                                            NvrSdk.ptzControl(
                                                                                currentUserId,
                                                                                typeof chId === 'string' ? parseInt(chId, 10) : chId,
                                                                                nextState
                                                                                    ? NvrSdk.PTZ_ACTION.AUX_ON
                                                                                    : NvrSdk.PTZ_ACTION.AUX_OFF,
                                                                                1,
                                                                            );
                                                                        }
                                                                        setIrStatus(prev => ({
                                                                            ...prev,
                                                                            [index]: nextState,
                                                                        }));
                                                                    }
                                                                }}
                                                            >
                                                                <Icon
                                                                    name={isIROn ? 'eye' : 'eye-outline'}
                                                                    size={iconSize}
                                                                    color={isIROn ? '#000' : '#FFF'}
                                                                />
                                                            </TouchableOpacity>
                                                        ),
                                                        hasPtz && (
                                                            <TouchableOpacity
                                                                key="ptz"
                                                                style={btnStyle}
                                                                onPress={() => setPtzOpen(true)}
                                                            >
                                                                <Icon
                                                                    name="axis-arrow"
                                                                    size={iconSize}
                                                                    color="#FFF"
                                                                />
                                                            </TouchableOpacity>
                                                        ),
                                                        hasTalk && (
                                                            <>
                                                                <TouchableOpacity
                                                                    key="talk"
                                                                    style={btnStyle}
                                                                    onPress={() => setIntercomVisible(true)}
                                                                >
                                                                    <Icon
                                                                        name="microphone"
                                                                        size={iconSize}
                                                                        color="#FFF"
                                                                    />
                                                                </TouchableOpacity>
                                                            </>
                                                        ),

                                                        <TouchableOpacity
                                                            key="fullscreen"
                                                            style={btnStyle}
                                                            onPress={() => {
                                                                if (currentUserId !== null && selectedDevice) {
                                                                    navigation.navigate('LandscapeLiveView', {
                                                                        userId: currentUserId,
                                                                        deviceId: selectedDevice.id,
                                                                        channelId: chId,
                                                                        deviceName: selectedDevice.name,
                                                                        nvrUsername: selectedDevice.nvrUsername,
                                                                        nvrPassword: selectedDevice.nvrPassword,
                                                                        ip: selectedDevice.ip,
                                                                        type: selectedDevice.type,
                                                                        initialGrid: '1x1',
                                                                        gridCells: gridCells,
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <Icon
                                                                name="fullscreen"
                                                                size={iconSize}
                                                                color="#FFF"
                                                            />
                                                        </TouchableOpacity>,
                                                    ].filter(Boolean);

                                                    if (isFullView) {
                                                        // 1x1: standard horizontal row at top-right
                                                        return (
                                                            <View style={styles.topOverlayRow}>{buttons}</View>
                                                        );
                                                    } else {
                                                        // Grid: compact 2-column grid overlay at top-right, fully clipped
                                                        const rows: any[][] = [];
                                                        for (let i = 0; i < buttons.length; i += 2) {
                                                            rows.push([buttons[i], buttons[i + 1]]);
                                                        }
                                                        return (
                                                            <View
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: 2,
                                                                    right: 2,
                                                                    zIndex: 11,
                                                                    gap: 2,
                                                                }}
                                                            >
                                                                {rows.map((row, ri) => (
                                                                    <View
                                                                        key={ri}
                                                                        style={{ flexDirection: 'row', gap: 2 }}
                                                                    >
                                                                        {row.map(
                                                                            (btn, bi) =>
                                                                                btn && (
                                                                                    <React.Fragment key={bi}>
                                                                                        {btn}
                                                                                    </React.Fragment>
                                                                                ),
                                                                        )}
                                                                    </View>
                                                                ))}
                                                            </View>
                                                        );
                                                    }
                                                })()}

                                                {currentGrid === '1x1' && (
                                                    <View style={styles.sideOverlayColumn}>
                                                        <TouchableOpacity
                                                            style={styles.sideCircularBtn}
                                                            onPress={handleSnapshot}
                                                        >
                                                            <Icon name="camera-outline" size={22} color="#FFF" />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.sideCircularBtn,
                                                                isRecording && { backgroundColor: THEME.primary },
                                                            ]}
                                                            onPress={handleRecordToggle}
                                                        >
                                                            <Icon
                                                                name={isRecording ? 'stop' : 'record'}
                                                                size={22}
                                                                color="#FFF"
                                                            />
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </>
                                        )}
                                    </View>
                                );
                            } else {
                                // Offline or Empty Cell Placeholder
                                return (
                                    <View style={styles.placeholder}>
                                        <Icon name="video-off-outline" size={30} color="#555" />
                                        <Text style={{ color: '#666', fontSize: 10, marginTop: 4 }}>
                                            {chId !== null ? 'Offline / No Data' : 'Empty'}
                                        </Text>
                                    </View>
                                );
                            }
                        })()}
                    </TouchableOpacity>
                </View>
            );
        };

        // --- Unified Uniform Grid Renderer (1x1, 2x2, 3x3, 4x4, 5x5, 6x6, 32) ---
        const isUniform = !currentGrid.includes('+');
        if (isUniform) {
            let cols = 1;
            let rows = 1;

            if (currentGrid === '2x2') cols = 2, rows = 2;
            else if (currentGrid === '3x3') cols = 3, rows = 3;
            else if (currentGrid === '4x4') cols = 4, rows = 4;
            else if (currentGrid === '5x5') cols = 5, rows = 5;
            else if (currentGrid === '6x6') cols = 6, rows = 6;
            else if (currentGrid === '32') cols = 8, rows = 4;

            return (
                <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
                    {Array.from({ length: size }).map((_, i) => (
                        <View key={i} style={{ width: `${100 / cols}%`, height: `${100 / rows}%` }}>
                            {renderCell(startIdx + i)}
                        </View>
                    ))}
                </View>
            );
        }
        if (currentGrid === '1+3') {
            return (
                <View style={{ flex: 1, flexDirection: 'row' }}>
                    <View style={{ flex: 3 }}>{renderCell(startIdx + 0)}</View>
                    <View style={{ flex: 1 }}>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 1)}</View>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 2)}</View>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 3)}</View>
                    </View>
                </View>
            );
        }
        if (currentGrid === '1+5') {
            return (
                <View style={{ flex: 1 }}>
                    <View style={{ flex: 2, flexDirection: 'row' }}>
                        <View style={{ flex: 2 }}>{renderCell(startIdx + 0)}</View>
                        <View style={{ flex: 1 }}>
                            <View style={{ flex: 1 }}>{renderCell(startIdx + 1)}</View>
                            <View style={{ flex: 1 }}>{renderCell(startIdx + 2)}</View>
                        </View>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row' }}>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 3)}</View>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 4)}</View>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 5)}</View>
                    </View>
                </View>
            );
        }
        if (currentGrid === '1+7') {
            return (
                <View style={{ flex: 1 }}>
                    <View style={{ flex: 3, flexDirection: 'row' }}>
                        <View style={{ flex: 3 }}>{renderCell(startIdx + 0)}</View>
                        <View style={{ flex: 1 }}>
                            <View style={{ flex: 1 }}>{renderCell(startIdx + 1)}</View>
                            <View style={{ flex: 1 }}>{renderCell(startIdx + 2)}</View>
                            <View style={{ flex: 1 }}>{renderCell(startIdx + 3)}</View>
                        </View>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row' }}>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 4)}</View>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 5)}</View>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 6)}</View>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 7)}</View>
                    </View>
                </View>
            );
        }
        if (currentGrid === '1+12') {
            return (
                <View style={{ flex: 1 }}>
                    <View style={{ flex: 1, flexDirection: 'row' }}>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 0)}</View>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 1)}</View>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 2)}</View>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 3)}</View>
                    </View>
                    <View style={{ flex: 2, flexDirection: 'row' }}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flex: 1 }}>{renderCell(startIdx + 4)}</View>
                            <View style={{ flex: 1 }}>{renderCell(startIdx + 5)}</View>
                        </View>
                        <View style={{ flex: 2 }}>{renderCell(startIdx + 12)}</View>
                        <View style={{ flex: 1 }}>
                            <View style={{ flex: 1 }}>{renderCell(startIdx + 6)}</View>
                            <View style={{ flex: 1 }}>{renderCell(startIdx + 7)}</View>
                        </View>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row' }}>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 8)}</View>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 9)}</View>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 10)}</View>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 11)}</View>
                    </View>
                </View>
            );
        }
        if (currentGrid === '1+8') {
            return (
                <View style={{ flex: 1 }}>
                    <View style={{ flex: 3, flexDirection: 'row' }}>
                        <View style={{ flex: 3 }}>{renderCell(startIdx + 0)}</View>
                        <View style={{ flex: 1 }}>
                            <View style={{ flex: 1 }}>{renderCell(startIdx + 1)}</View>
                            <View style={{ flex: 1 }}>{renderCell(startIdx + 2)}</View>
                            <View style={{ flex: 1 }}>{renderCell(startIdx + 3)}</View>
                        </View>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row' }}>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 4)}</View>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 5)}</View>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 6)}</View>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 7)}</View>
                        <View style={{ flex: 1 }}>{renderCell(startIdx + 8)}</View>
                    </View>
                </View>
            );
        }
        if (currentGrid === '32') {
            return (
                <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
                    {Array.from({ length: 32 }, (_, i) => i).map(i => (
                        <View key={i} style={{ width: '12.5%', height: '25%' }}>
                            {renderCell(startIdx + i)}
                        </View>
                    ))}
                </View>
            );
        }

        return (
            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', height: '50%' }}>
                    {renderCell(startIdx + 0)}
                </View>
                <View style={{ width: '50%', height: '50%' }}>
                    {renderCell(startIdx + 1)}
                </View>
                <View style={{ width: '50%', height: '50%' }}>
                    {renderCell(startIdx + 2)}
                </View>
                <View style={{ width: '50%', height: '50%' }}>
                    {renderCell(startIdx + 3)}
                </View>
            </View>
        );
    };

    return (
        <View key={deviceId} style={styles.container}>
            {/* SuperLivePlus-style AI Event Banner */}
            <AiEventBanner
                onPressEvent={(event) => {
                    // Tap on event to focus the channel
                    if (event.channelId >= 0) {
                        // Find index of this channel in current grid
                        const idx = gridCells.findIndex(cid => cid === event.channelId);
                        if (idx >= 0) {
                            setActiveCellIndex(idx);
                            setShowCellFeatures(true);
                        } else {
                            // If channel not in grid, swap active cell for it
                            const newCells = [...gridCells];
                            newCells[activeCellIndex] = event.channelId;
                            setGridCells(newCells);
                            setShowCellFeatures(true);
                        }
                    }
                }}
            />

            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="chevron-left" size={28} color={THEME.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {selectedDevice?.name || (allDevices.length > 0 ? (deviceId ? allDevices.find(d => String(d.id) === String(deviceId))?.name : allDevices[0]?.name) : null) || (route.params as any)?.deviceName || 'Live View'}
                </Text>
                <View style={[styles.headerRight, { gap: 10 }]}>
                    <TouchableOpacity
                        onPress={handleRefresh}
                        style={styles.headerIconBtn}
                    >
                        <Icon name="refresh" size={22} color={THEME.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <View style={styles.mainContent}>
                    <View style={[styles.videoCard]} {...gridPanResponder.panHandlers}>
                        <View style={styles.gridContainer}>{renderGridContent()}</View>

                        {/* Media Success Toast Overlay */}
                        {mediaToast && (
                            <TouchableOpacity
                                style={styles.toastOverlay}
                                activeOpacity={0.9}
                                onPress={() => {
                                    setMediaToast(null);
                                    navigation.navigate('Gallery');
                                }}
                            >
                                <View style={styles.toastContent}>
                                    <View style={styles.toastThumbContainer}>
                                        <Image
                                            source={{ uri: 'file://' + mediaToast.path }}
                                            style={styles.toastThumb}
                                            resizeMode="cover"
                                        />
                                    </View>
                                    <Text style={styles.toastText}>
                                        {mediaToast.type === 'picture'
                                            ? 'The picture has been saved. Please click to view.'
                                            : 'The video has been saved. Please click to view'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        {/* Drag Ghost View */}
                        {draggingIndex !== null && (
                            <Animated.View
                                style={{
                                    position: 'absolute',
                                    width: cellLayouts[draggingIndex]?.w || 100,
                                    height: cellLayouts[draggingIndex]?.h || 100,
                                    backgroundColor: 'rgba(168, 50, 50, 0.4)',
                                    borderRadius: 8,
                                    borderWidth: 2,
                                    borderColor: '#FFEB3B',
                                    left: cellLayouts[draggingIndex]?.x || 0,
                                    top: cellLayouts[draggingIndex]?.y || 0,
                                    transform: [
                                        { translateX: dragXY.x },
                                        { translateY: dragXY.y },
                                    ],
                                    zIndex: 1000,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    pointerEvents: 'none',
                                }}
                            >
                                <Icon name="movie-filter" size={40} color="#FFF" />
                                <Text
                                    style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}
                                >
                                    Moving CH {gridCells[draggingIndex]! + 1}
                                </Text>
                            </Animated.View>
                        )}
                    </View>

                    <View style={styles.controlsContainer}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.controlsRow}
                        >
                            <TouchableOpacity
                                style={styles.controlBtnWrapper}
                                onPress={() =>
                                    navigation.navigate('Playback', {
                                        deviceId: selectedDevice?.id || deviceId,
                                        deviceName: selectedDevice?.name || (route.params as any)?.deviceName,
                                    })
                                }
                            >
                                <View style={styles.controlBtn}>
                                    <Icon name="history" size={24} color={THEME.primary} />
                                </View>
                                <Text style={styles.controlLabel}>Playback</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.controlBtnWrapper}
                                onPress={handleSnapshot}
                            >
                                <View style={styles.controlBtn}>
                                    <Icon name="camera-outline" size={24} color={THEME.primary} />
                                </View>
                                <Text style={styles.controlLabel}>Snapshot</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.controlBtnWrapper}
                                onPress={handleRecordToggle}
                            >
                                <View
                                    style={[
                                        styles.controlBtn,
                                        isRecording && { backgroundColor: THEME.primary },
                                    ]}
                                >
                                    <Icon
                                        name={isRecording ? 'stop' : 'record'}
                                        size={22}
                                        color={isRecording ? '#FFF' : THEME.primary}
                                    />
                                </View>
                                <Text style={styles.controlLabel}>
                                    {isRecording ? 'Stop' : 'Record'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.controlBtnWrapper}
                                onPress={() => setIsHD(!isHD)}
                            >
                                <View style={styles.controlBtn}>
                                    <Text
                                        style={{
                                            color: THEME.primary,
                                            fontWeight: 'bold',
                                            fontSize: 13,
                                        }}
                                    >
                                        {isHD ? 'HD' : 'SD'}
                                    </Text>
                                </View>
                                <Text style={styles.controlLabel}>Quality</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.controlBtnWrapper}
                                onPress={() => setGridSelectionOpen(true)}
                            >
                                <View style={styles.controlBtn}>
                                    <Icon
                                        name="view-grid-outline"
                                        size={24}
                                        color={THEME.primary}
                                    />
                                </View>
                                <Text style={styles.controlLabel}>Grid</Text>
                            </TouchableOpacity>
                            {(() => {
                                const chId = gridCells[activeCellIndex];
                                const chObj = selectedDevice?.channels?.find(
                                    (c: any) =>
                                        (typeof c.id === 'string' ? parseInt(c.id) : c.id) ===
                                        chId,
                                );
                                const chName = chObj?.name || '';
                                const hasPtz = chObj?.ptz === true || chObj?.ptzSupport === true || chName.toLowerCase().includes('ptz') || chName.toLowerCase().includes('dome') || chName.toLowerCase().includes('speed');
                                return hasPtz ? (
                                    <TouchableOpacity
                                        style={styles.controlBtnWrapper}
                                        onPress={() => setPtzOpen(!ptzOpen)}
                                    >
                                        <View
                                            style={[
                                                styles.controlBtn,
                                                ptzOpen && { backgroundColor: THEME.primary },
                                            ]}
                                        >
                                            <Icon
                                                name="axis-arrow"
                                                size={24}
                                                color={ptzOpen ? '#FFF' : THEME.primary}
                                            />
                                        </View>
                                        <Text style={styles.controlLabel}>PTZ</Text>
                                    </TouchableOpacity>
                                ) : null;
                            })()}
                            <TouchableOpacity
                                style={styles.controlBtnWrapper}
                                onPress={() => setCameraListOpen(true)}
                            >
                                <View style={styles.controlBtn}>
                                    <Icon name="cctv" size={24} color={THEME.primary} />
                                </View>
                                <Text style={styles.controlLabel}>Cam List</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>

                    <TouchableOpacity
                        style={styles.deviceSelect}
                        onPress={() => setDeviceListOpen(true)}
                    >
                        <Icon
                            name="server"
                            size={16}
                            color={THEME.primary}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={{ color: THEME.primary, fontWeight: 'bold' }}>
                            Tap to change device
                        </Text>
                    </TouchableOpacity>

                    {/* ─── Alarm Message Timeline ─── */}
                    <View style={styles.alarmSection}>
                        <Text style={styles.alarmSectionTitle}>Alarm Message</Text>
                        {liveEvents.length === 0 ? (
                            <View style={styles.alarmEmpty}>
                                <Icon name="bell-sleep-outline" size={36} color="#D0B0B0" />
                                <Text style={styles.alarmEmptyText}>No alarm events yet</Text>
                            </View>
                        ) : (
                            <ScrollView
                                style={styles.alarmListScroll}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={false}
                            >
                                {liveEvents.slice(0, 20).map((event, idx) => {
                                    const timeStr = new Date(event.eventTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                    const iconMap: Record<string, string> = {
                                        MOTION: 'run-fast',
                                        HUMAN_DETECTION: 'human-greeting',
                                        VEHICLE_DETECTION: 'car',
                                        FACE_DETECTION: 'account-box',
                                        FACE_RECOGNITION: 'face-recognition',
                                        INTRUSION: 'shield-home',
                                        REGION_INTRUSION: 'shield-home',
                                        LINE_CROSSING: 'tray-minus',
                                        TAMPERING: 'video-off',
                                        LOITERING: 'clock-alert',
                                        CROWD_DETECTION: 'account-group',
                                        DISK: 'database-off',
                                        OFFLINE: 'camera-off',
                                    };
                                    const iconName = iconMap[event.eventType] || 'bell-ring';
                                    const isLast = idx === liveEvents.slice(0, 20).length - 1;
                                    return (
                                        <View key={event.id} style={styles.alarmRow}>
                                            {/* Timeline dot + connector */}
                                            <View style={styles.alarmTimeline}>
                                                <View style={styles.alarmDot} />
                                                {!isLast && <View style={styles.alarmConnector} />}
                                            </View>
                                            {/* Card */}
                                            <TouchableOpacity
                                                style={styles.alarmCard}
                                                onPress={() => {
                                                    const alarmTime = event.eventTime ? Number(event.eventTime) : Date.now();
                                                    const adjustedStartTime = alarmTime - 10000;
                                                    const adjustedEndTime = alarmTime + 300000; // 5 minutes search window
                                                    navigation.navigate('Playback', {
                                                        deviceId: event.deviceId || selectedDevice?.id || deviceId,
                                                        deviceName: event.deviceName || selectedDevice?.name || (route.params as any)?.deviceName || 'NVR',
                                                        initialChannelId: event.channelId !== undefined ? Number(event.channelId) : 0,
                                                        startTime: adjustedStartTime,
                                                        eventTime: alarmTime,
                                                        endTime: adjustedEndTime,
                                                        eventType: event.eventType || 'MOTION',
                                                        autoPlay: true,
                                                    });
                                                }}
                                            >
                                                <View style={styles.alarmIconBadge}>
                                                    <Icon name={iconName} size={22} color="#A83232" />
                                                </View>
                                                <View style={styles.alarmCardBody}>
                                                    <Text style={styles.alarmEventName}>{event.eventName}</Text>
                                                    <Text style={styles.alarmEventMeta}>{event.channelName} · {timeStr}</Text>
                                                </View>
                                                <Icon name="chevron-right" size={24} color="#A83232" />
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </ScrollView>

            <GridSelection
                visible={gridSelectionOpen}
                onClose={() => setGridSelectionOpen(false)}
                onSelectGrid={handleGridChange}
                currentGrid={currentGrid}
            />

            <DeviceListDrawer
                visible={deviceListOpen}
                onClose={() => setDeviceListOpen(false)}
                onSelectDevice={device => {
                    setDeviceListOpen(false);
                    const currentIdParam = (route.params as any)?.deviceId;
                    const isSameDevice =
                        String(device.id) === String(currentIdParam) ||
                        (currentIdParam === undefined &&
                            selectedDevice &&
                            String(device.id) === String(selectedDevice.id));
                    if (isSameDevice) {
                        triggerCleanDeviceTransition(device);
                    } else {
                        navigation.setParams({
                            deviceId: String(device.id),
                            deviceName: device.name,
                        });
                    }
                }}
            />

            <CameraListDrawer
                visible={cameraListOpen}
                onClose={() => setCameraListOpen(false)}
                device={selectedDevice}
                activeChannelId={gridCells[activeCellIndex]}
                onSelectChannel={chIdStr => {
                    const parsedChId =
                        typeof chIdStr === 'string' ? parseInt(chIdStr, 10) : chIdStr;
                    const newCells = [...gridCells];
                    // Swap if channel is already in the grid
                    const existingIndex = newCells.indexOf(parsedChId);
                    if (existingIndex !== -1 && existingIndex !== activeCellIndex) {
                        newCells[existingIndex] = newCells[activeCellIndex];
                    }
                    newCells[activeCellIndex] = parsedChId;
                    setGridCells(newCells);
                    setCameraListOpen(false);
                }}
            />

            <PtzControlDrawer
                visible={ptzOpen}
                onClose={() => setPtzOpen(false)}
                onAction={handlePtz}
                onStop={handleStopPtz}
                onPreset={handlePreset}
                speed={ptzSpeed}
                onSpeedChange={setPtzSpeed}
                deviceId={selectedDevice?.id}
                channelId={gridCells[activeCellIndex]}
                actions={NvrSdk.PTZ_ACTION}
                presetCmds={NvrSdk.PRESET_CMD}
            />

            <ImageSettingsDrawer
                visible={isImageSettingsVisible}
                onClose={() => setIsImageSettingsVisible(false)}
                settings={imageSettings}
                onSettingsChange={handleImageSettingsChange}
                onSave={handleSaveImageSettings}
                onDefault={handleDefaultImageSettings}
            />

            <BottomBar
                currentUserId={currentUserId}
                currentChannelId={gridCells[activeCellIndex]}
                deviceName={selectedDevice?.name || (route.params as any)?.deviceName}
                audioSupport={hasAudioSupport}
                deviceHost={selectedDevice?.ip}
                devicePort={
                    selectedDevice?.port ? parseInt(String(selectedDevice.port)) : 0
                }
                currentChannelName={
                    selectedDevice?.channels?.find(
                        (c: any) =>
                            (typeof c.id === 'string' ? parseInt(c.id) : c.id) ===
                            gridCells[activeCellIndex],
                    )?.name
                }
                onTalkingChange={talking => {
                    setIsTalking(talking);
                    if (talking) {
                        setAudioActiveIndex(null);
                        if (isAudioOn && currentUserId !== null) {
                            const ch = gridCells[activeCellIndex];
                            if (ch !== null)
                                NvrSdk.stopAudio(currentUserId, ch).catch(() => { });
                            setIsAudioOn(false);
                        }
                    }
                }}
                onAudioToggle={handleAudioToggle}
                isAudioActive={isAudioOn}
            />

            <IntercomModal
                visible={intercomVisible}
                onClose={() => setIntercomVisible(false)}
                allDevices={allDevices}
                selectedDevice={selectedDevice}
                currentUserId={currentUserId}
                currentChannelId={gridCells[activeCellIndex]}
                currentChannelName={
                    selectedDevice?.channels?.find(
                        (c: any) =>
                            (typeof c.id === 'string' ? parseInt(c.id) : c.id) ===
                            gridCells[activeCellIndex],
                    )?.name
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 16,
        marginTop: 40,
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: THEME.primary },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },

    mainContent: { justifyContent: 'center' },
    videoCard: {
        // marginHorizontal: 0,
        borderRadius: 0,
        backgroundColor: '#000',
        elevation: 4,
        overflow: 'hidden',
        aspectRatio: 1,
    },
    gridContainer: { flex: 1, backgroundColor: '#000', position: 'relative' },

    overlayName: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 6,
        borderRadius: 4,
        zIndex: 10,
    },
    overlayText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
    },

    recIndicator: {
        position: 'absolute',
        bottom: 8,
        right: 8,
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

    controlsContainer: { marginHorizontal: 16, height: 110 },
    controlsRow: { alignItems: 'center', paddingRight: 20, flexDirection: 'row' },
    controlBtnWrapper: { alignItems: 'center', marginRight: 16 },
    controlBtn: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF2F2',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        marginBottom: 6,
    },
    controlLabel: { fontSize: 9, color: '#333', fontWeight: 'bold' },

    deviceSelect: {
        alignSelf: 'center',
        padding: 10,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },

    topOverlayRow: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        gap: 6,
        zIndex: 11,
    },
    featureIconBtn: {
        width: 34,
        height: 34,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    featureIconText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    bottomLeftOverlay: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        flexDirection: 'row',
        gap: 6,
        zIndex: 11,
    },
    bitratePill: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    livePill: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    pillText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4CAF50',
        marginRight: 4,
    },
    textSmall: { color: '#666', fontSize: 10, marginTop: 4 },

    sideOverlayColumn: {
        position: 'absolute',
        right: 10,
        top: '25%',
        gap: 15,
        zIndex: 11,
        alignItems: 'center',
    },
    sideCircularBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },

    toastClose: { padding: 5 },

    // ─── Alarm Message Timeline ───────────────────────────────────
    alarmSection: {
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 20,
    },
    alarmSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2E2E5E',
        marginBottom: 18,
    },
    alarmRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 0,
    },
    alarmTimeline: {
        width: 24,
        alignItems: 'center',
        marginRight: 14,
        paddingTop: 6,
    },
    alarmDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: '#C0A0A0',
        backgroundColor: '#FFF',
    },
    alarmConnector: {
        width: 1,
        borderLeftWidth: 1.5,
        borderColor: '#D8C0C0',
        borderStyle: 'dashed' as any,
        flex: 1,
        minHeight: 32,
        marginTop: 4,
        marginBottom: 4,
    },
    alarmListScroll: {
        height: 300,
    },
    alarmCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF5F5',
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        elevation: 1,
        shadowColor: '#A83232',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    alarmIconBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FDEAEA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    alarmCardBody: {
        flex: 1,
    },
    alarmEventName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#2E2E5E',
        marginBottom: 4,
    },
    alarmEventMeta: {
        fontSize: 12,
        color: '#999',
    },
    alarmEmpty: {
        alignItems: 'center',
        paddingVertical: 30,
        gap: 10,
    },
    alarmEmptyText: {
        color: '#C0A0A0',
        fontSize: 14,
        fontWeight: '500',
    },
    toastOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        zIndex: 50,
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    toastThumbContainer: {
        width: 50,
        height: 38,
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
        marginRight: 12,
        backgroundColor: '#111',
    },
    toastThumb: {
        width: '100%',
        height: '100%',
    },
    toastText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
});

