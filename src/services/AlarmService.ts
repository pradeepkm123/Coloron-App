import { useEffect } from 'react';
import { EventEmitter } from 'events';
import { NativeEventEmitter, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deviceStorage } from '../utils/deviceStorage';
import { authStorage } from '../utils/authStorage';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { API_URL } from '../config/api';

// ─── TVT SDK AI Event Constants ──────────────────────────────────────────────
const SMART_EVENT_TYPES = {
    PEA: 1,    // Perimeter (Line Crossing / Intrusion)
    VFD: 2,    // Face Detection
    AVD: 8,    // Abnormal Video (Tamper)
    IPD: 1027, // PVD (Human/Vehicle Detection - Standard TVT Value)
    VSD: 20,   // Vehicle Special Detection
    LOITER: 9,
    CROWD: 10,
};

// ─── Navigation reference ─────────────────────────────────────────────────────
let navigationRef: any = null;
export const setNavigationRef = (ref: any) => {
    navigationRef = ref;
};

// ─── Shared event emitters ───────────────────────────────────────────────────
export const alarmEmitter = new EventEmitter();
const { TVTSdkModule } = NativeModules;

// Handle potential missing native module to prevent crash during initialization
if (!TVTSdkModule) {
    console.warn('[AlarmService] TVTSdkModule is not available. Native events will not be received.');
}
const nativeEventEmitter = TVTSdkModule ? new NativeEventEmitter(TVTSdkModule) : { addListener: () => ({ remove: () => { } }) } as any;

const ALARM_STORAGE_KEY = 'VMS_ALARMS';
const DEDUPE_MS = 5000;
const recentEvents = new Map<string, number>();

export const subscribeDeviceAlarms = async (dev: any) => {
    try {
        const userId = dev.userId !== undefined ? dev.userId : (dev.loginId !== undefined ? dev.loginId : dev.id);
        if (userId === undefined || userId === null) return;
        const deviceName = dev.deviceName || dev.name || 'NVR';

        console.log(`[AlarmService] Subscribing to AI events for: ${deviceName} (${userId})`);

        // 1. Setup Alarm Channel (SetupAlarmChan)
        await TVTSdkModule.setupAlarmChan(userId);

        // 2. Subscribe all channels to AI events (smartSubscrib)
        await TVTSdkModule.subscribeAllChannels(userId, dev.videoInputNum || 16);

        // 3. Start TVT Alarm Native Notification Service monitoring
        try {
            const { tvtAlarmNotificationService } = require('./TvtAlarmNotificationService');
            await tvtAlarmNotificationService.startMonitoringForDevice({
                ...dev,
                userId,
                deviceName
            });
        } catch (tvtErr: any) {
            console.warn('[AlarmService] Failed to start tvtAlarmNotificationService monitoring:', tvtErr.message);
        }

        return true;
    } catch (err) {
        console.warn(`[AlarmService] Subscription failed for ${dev.deviceName || dev.name}:`, err);
        return false;
    }
};


// ─── Type Mapping (SDK -> Backend Keys) ───────────────────────────────────────
const TYPE_MAPPING: Record<string, string> = {
    'HUMAN_DETECTION':   'human',
    'VEHICLE_DETECTION': 'vehicle',
    'FACE_DETECTION':    'faceDet',
    'FACE_RECOGNITION':  'faceRec',
    'MOTION':            'enabled',
    'SENSOR':            'sensor',
    'AUDIO_ABNORMAL':    'sensor',
    'LINE_CROSSING':     'line',
    'INTRUSION':         'intrusion',
    'LOITERING':         'loitering',
    'TAMPERING':         'tamper',
    'OFFLINE':           'offline',
};

// ─── Main incoming event handler ──────────────────────────────────────────────
export const handleIncomingAlarm = async (event: any) => {
    let { type, channelId, deviceId, timestamp } = event;

    const allDevices = await deviceStorage.getDevices();
    let dev = allDevices.find(
        d => String(d.id) === String(deviceId).trim() || String((d as any).deviceId) === String(deviceId).trim()
    );

    if ((!dev || deviceId === 'unknown') && allDevices.length > 0) {
        dev = allDevices[0];
        deviceId = dev.deviceId || String(dev.id);
    }

    const key = `${deviceId}_${channelId}_${type}`;

    // ── Offline Channel Filtering (Only show offline alarms for active cameras) ──
    if (type === 'OFFLINE') {
        try {
            if (dev && dev.channels) {
                const ch = dev.channels.find((c: any) => Number(c.id) === Number(channelId));
                if (ch) {
                    const isConnected = deviceStorage.filterConnectedChannels([ch]).length > 0;
                    if (!isConnected) {
                        console.log(`[AlarmService] 🔇 Dropping OFFLINE event for empty/unused channel: ${channelId}`);
                        return;
                    }
                }
            }
        } catch (err) {
            console.warn('[AlarmService] Error in offline channel filter:', err);
        }
    }

    // 1. Deduplication
    const now = Date.now();
    if (recentEvents.has(key) && (now - recentEvents.get(key)!) < DEDUPE_MS) {
        return;
    }
    recentEvents.set(key, now);

    console.log(`[AlarmService] 🔥 Processing AI Event: ${type} on CH ${channelId} for ${deviceId}`);

    // 2. Load Filter Settings (Local Cache with Backend Sync)
    let settings: any = null;
    try {
        const { tvtAlarmNotificationService } = require('./TvtAlarmNotificationService');
        settings = await tvtAlarmNotificationService.ensureAndGetPushSettings(deviceId);
    } catch (err) {
        console.warn('[AlarmService] Cache error:', err);
    }

    // 3. Apply Filter
    if (settings) {
        // Check global switch — support both payload shapes
        const globalEnabled =
            settings.global?.enablePush !== false &&
            settings.global?.messageSubscription !== false &&
            settings.enabled !== false;
        if (!globalEnabled) {
            console.log(`[AlarmService] Global push disabled for ${deviceId}, dropping event.`);
            return;
        }

        // Check per-channel per-type setting
        const channelConfig = (settings.channels || []).find((ch: any) => {
            const chId = ch.channelId !== undefined ? Number(ch.channelId) : (ch.id !== undefined ? Number(ch.id) : -1);
            return chId === Number(channelId);
        });

        if (channelConfig) {
            // Define all possible settings keys for a given native event type
            let isEnabled = false;
            if (type === 'MOTION') {
                isEnabled = channelConfig.enabled === true || channelConfig.motion === true;
            } else if (type === 'TAMPERING') {
                isEnabled = channelConfig.tamper === true || channelConfig.tampering === true;
            } else if (type === 'FACE_DETECTION') {
                isEnabled = channelConfig.faceDet === true || channelConfig.face_det === true;
            } else if (type === 'FACE_RECOGNITION') {
                isEnabled = channelConfig.faceRec === true || channelConfig.face_rec === true;
            } else {
                const settingKey = TYPE_MAPPING[type] || type.toLowerCase();
                const camelize = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
                isEnabled =
                    channelConfig[settingKey] === true ||
                    channelConfig[camelize(settingKey)] === true;
            }

            if (!isEnabled) {
                console.log(`[AlarmService] 🔇 Event ${type} ignored for CH ${channelId} (Disabled in settings)`);
                return;
            }
        }
        console.log(`[AlarmService] ✅ Event ${type} MATCHED settings.`);
    }

    // 3. Fetch Device/Channel Names for Display
    const devices = await deviceStorage.getDevices();
    const device = devices.find(d =>
        d.deviceId === deviceId ||
        d.sn === deviceId ||
        (d as any).serialNumber === deviceId ||
        d.id === deviceId
    );
    const deviceName = device?.name || 'VMS Device';
    const channelName = device?.channels?.[channelId]?.name || `CH ${channelId + 1}`;

    const displayTitle = `${type.replace(/_/g, ' ')}`;
    let displayBody = `${deviceName}: Activity detected on ${channelName}`;
    if (event.detailText) {
        displayBody += `\n${event.detailText}`;
    }

    const alarmData = {
        ...event,
        id: `${timestamp}_${Math.random().toString(36).substr(2, 5)}`,
        displayTitle,
        displayBody,
        deviceName,
        channelName,
        read: false
    };

    // 4. Persistent Storage (Alarm History Center)
    try {
        const storageKey = await authStorage.getAlarmStorageKey();
        const stored = await AsyncStorage.getItem(storageKey);
        const history = stored ? JSON.parse(stored) : [];
        const newHistory = [alarmData, ...history].slice(0, 100);
        await AsyncStorage.setItem(storageKey, JSON.stringify(newHistory));
        console.log('[AI-PUSH] Alarm saved:', alarmData);
    } catch (e) {
        console.error('[AlarmService] History save failed:', e);
    }

    // 5. Emit for UI Update
    alarmEmitter.emit('new_alarm', alarmData);

    // 6. High-Priority Local Notification
    await notifee.displayNotification({
        title: displayTitle,
        body: displayBody,
        data: {
            deviceId,
            channelId: String(channelId),
            deviceName,
            type,
            timestamp: String(timestamp),
        },
        android: {
            channelId: 'alarm-channel',
            importance: AndroidImportance.HIGH,
            pressAction: { id: 'default' },
            // Add a small icon if you have one, or use a default
        },
    });
};

// ─── React Hook: Global Alarm Monitor (SuperLivePlus Style) ───────────────────
export const useAlarmListener = () => {
    useEffect(() => {
        console.log('[AlarmService] 🚀 Starting Global AI Monitor');

        const sub = nativeEventEmitter.addListener('AI_EVENT', (event: any) => {
            handleIncomingAlarm(event);
        });

        const initMonitoring = async () => {
            try {
                // 🚀 CRITICAL: Initialize SDK first to register callbacks!
                console.log('[AlarmService] 🛠️ Initializing Native SDK...');
                await TVTSdkModule.initSDK();

                const devices = await deviceStorage.getDevices();
                console.log(`[AlarmService] 🔍 Found ${devices.length} devices to monitor`);

                const { deviceSessionManager } = require('./DeviceSessionManager');
                for (const dev of devices) {
                    // Start unified alarm monitoring
                    try {
                        console.log(`[AlarmService] 🔑 Starting Alarm monitor via DeviceSessionManager for: ${dev.name}`);
                        await deviceSessionManager.startAlarmMonitor(String(dev.id));
                    } catch (loginErr) {
                        console.warn(`[AlarmService] ❌ Background startAlarmMonitor failed for ${dev.name}:`, loginErr);
                    }
                }

                // Also start background service to keep SDK alive
                await TVTSdkModule.startBackgroundService();
            } catch (err) {
                console.error('[AlarmService] ❌ SDK Initialization failed:', err);
            }
        };

        initMonitoring();

        return () => {
            sub.remove();
        };
    }, []);
};

// ─── Navigation Logic ────────────────────────────────────────────────────────
const handleNotificationTap = (data: any) => {
    if (!data || !navigationRef) return;
    const alarmTime = data.eventTime ? new Date(data.eventTime).getTime() : Date.now();
    const adjustedStartTime = alarmTime - 10000;
    const adjustedEndTime = alarmTime + 300000; // 5 minutes search window

    navigationRef.navigate('Playback', {
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        initialChannelId: parseInt(data.channelId || '0'),
        startTime: adjustedStartTime,
        eventTime: alarmTime,
        endTime: adjustedEndTime,
        eventType: data.eventType || 'MOTION'
    });
};
