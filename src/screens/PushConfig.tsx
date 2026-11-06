import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    StatusBar,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deviceStorage } from '../utils/deviceStorage';
import { authStorage } from '../utils/authStorage';
import { api } from '../utils/api';
import { deviceSessionManager } from '../services/DeviceSessionManager';
import { tvtAlarmNotificationService } from '../services/TvtAlarmNotificationService';
import ChannelSelectionModal from '../components/ChannelSelectionModal';
import NvrSdk from '../native/NvrSdk';
import { API_URL } from '../config/api';

const PushConfig: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { deviceId, deviceName, channelCount: routeChannelCount, deviceChannels: routeChannels } = route.params || {};


    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [globalPush, setGlobalPush] = useState(true);
    const [userSubscription, setUserSubscription] = useState(true);

    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [deviceChannels, setDeviceChannels] = useState<any[]>([]);

    const [eventSettings, setEventSettings] = useState<any>({
        HUMAN_DETECTION: [],
        VEHICLE_DETECTION: [],
        FACE_DETECTION: [],
        FACE_RECOGNITION: [],
        INTRUSION: [],
        LINE_CROSSING: [],
        LOITERING: [],
        CROWD_DETECTION: [],
        TAMPERING: [],
        MOTION: [],
        SENSOR: [],
    });

    const aiEvents = [
        { id: 'HUMAN_DETECTION', label: 'Human Detection', icon: 'account-alert-outline' },
        { id: 'VEHICLE_DETECTION', label: 'Vehicle Detection', icon: 'car-back' },
        { id: 'FACE_DETECTION', label: 'Face Detection', icon: 'face-recognition' },
        { id: 'FACE_RECOGNITION', label: 'Face Recognition', icon: 'account-search-outline' },
        { id: 'INTRUSION', label: 'Region Intrusion', icon: 'shield-alert-outline' },
        { id: 'LINE_CROSSING', label: 'Line Crossing', icon: 'vector-line' },
        { id: 'LOITERING', label: 'Loitering', icon: 'clock-alert-outline' },
        { id: 'CROWD_DETECTION', label: 'Crowd Detection', icon: 'account-group-outline' },
        { id: 'TAMPERING', label: 'Tampering', icon: 'format-paint' },
    ];

    const basicAlarms = [
        { id: 'MOTION', label: 'Motion', icon: 'run-fast' },
        { id: 'SENSOR', label: 'Sensor Alarm', icon: 'help-circle-outline' },
    ];

    const [systemAlarms, setSystemAlarms] = useState({
        offline: true,
        rwError: true,
        diskFull: true,
        noDisk: true,
        pullDisk: true,
        access: true,
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const savePushSetting = async (eventId: string, enabled: boolean, channels: number[] = []) => {
        try {
            const key = `push_settings_${deviceId}`;

            // 1. Save to local AsyncStorage with the flat structure
            const oldData = await AsyncStorage.getItem(key);
            const settings = oldData ? JSON.parse(oldData) : {};
            if (channels.length > 0 || eventId.indexOf('DETECTION') !== -1 || eventId === 'MOTION' || eventId === 'SENSOR' || eventId === 'INTRUSION' || eventId === 'LINE_CROSSING' || eventId === 'LOITERING' || eventId === 'TAMPERING') {
                settings[eventId] = channels;
            } else {
                settings[eventId] = enabled;
            }
            await AsyncStorage.setItem(key, JSON.stringify(settings));
            console.log(`[PushConfig] Saved setting locally: ${eventId} -> enabled=${enabled}, channels=${channels}`);

            // 2. Save to backend MongoDB using the endpoint
            const token = await authStorage.getToken();
            if (token) {
                try {
                    const response = await fetch(`${API_URL}/push-settings/save`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            deviceId: String(deviceId),
                            eventType: eventId,
                            channels: channels,
                            enabled: enabled
                        })
                    });
                    const result = await response.json();
                    console.log(`[PushConfig] Backend save result:`, result);
                } catch (netErr: any) {
                    console.warn(`[PushConfig] Backend save error:`, netErr.message);
                }
            }
        } catch (e) {
            console.error('[PushConfig] Failed to save setting:', e);
        }
    };

    const applyLocalPushSettings = async (
        overrideGlobal?: boolean,
        overrideOffline?: boolean,
        overrideAccess?: boolean,
        overrideUserSub?: boolean
    ) => {
        try {
            const key = `push_settings_${deviceId}`;
            const cached = await AsyncStorage.getItem(key);
            const settings = cached ? JSON.parse(cached) : {};

            const finalGlobal = overrideGlobal !== undefined ? overrideGlobal : globalPush;
            const finalOffline = overrideOffline !== undefined ? overrideOffline : systemAlarms.offline;
            const finalAccess = overrideAccess !== undefined ? overrideAccess : systemAlarms.access;
            const finalUserSub = overrideUserSub !== undefined ? overrideUserSub : userSubscription;

            const channelsPayload = deviceChannels.map(ch => {
                const chId = typeof ch.id === 'number' ? ch.id : Number(ch.id);
                const checkId = chId + 1;
                return {
                    channelId: chId,
                    human: (settings['HUMAN_DETECTION'] || []).includes(checkId),
                    vehicle: (settings['VEHICLE_DETECTION'] || []).includes(checkId),
                    face_det: (settings['FACE_DETECTION'] || []).includes(checkId),
                    face_rec: (settings['FACE_RECOGNITION'] || []).includes(checkId),
                    intrusion: (settings['INTRUSION'] || []).includes(checkId),
                    line: (settings['LINE_CROSSING'] || []).includes(checkId),
                    loitering: (settings['LOITERING'] || []).includes(checkId),
                    crowd: (settings['CROWD_DETECTION'] || []).includes(checkId),
                    tampering: (settings['TAMPERING'] || []).includes(checkId),
                    motion: (settings['MOTION'] || []).includes(checkId),
                    sensor: (settings['SENSOR'] || []).includes(checkId),
                };
            });

            const legacyPayload = {
                global: {
                    enablePush: finalGlobal,
                    messageSubscription: finalUserSub
                },
                enabled: finalGlobal,
                channels: channelsPayload,
                system: {
                    ...systemAlarms,
                    offline: finalOffline,
                    access: finalAccess,
                },
            };

            await AsyncStorage.setItem(`@push_settings_${deviceId}`, JSON.stringify(legacyPayload));
            await tvtAlarmNotificationService.applyPushSettingsForDevice(String(deviceId), legacyPayload);
            try {
                await api.updateDeviceSettings(String(deviceId), legacyPayload);
                console.log('[PushConfig] Compiled push settings synced to backend User Account successfully');
            } catch (apiErr: any) {
                console.warn('[PushConfig] Failed to sync compiled settings to backend User Account:', apiErr.message);
            }
        } catch (e) {
            console.error('[PushConfig] Failed to apply local settings:', e);
        }
    };

    const handleToggleGlobalPush = async (value: boolean) => {
        setGlobalPush(value);
        await savePushSetting('GLOBAL_PUSH', value);
        await applyLocalPushSettings(value, undefined, undefined, undefined);
    };

    const handleToggleUserSubscription = async (value: boolean) => {
        setUserSubscription(value);
        await savePushSetting('USER_SUBSCRIPTION', value);
        await applyLocalPushSettings(undefined, undefined, undefined, value);
    };

    const handleToggleOfflineAlarm = async (value: boolean) => {
        const newSys = { ...systemAlarms, offline: value };
        setSystemAlarms(newSys);
        await savePushSetting('OFFLINE', value);
        await applyLocalPushSettings(undefined, value, undefined);
    };

    const handleToggleAccessAlarm = async (value: boolean) => {
        const newSys = { ...systemAlarms, access: value };
        setSystemAlarms(newSys);
        await savePushSetting('ILLEGAL_ACCESS', value);
        await applyLocalPushSettings(undefined, undefined, value);
    };

    const loadSettings = async () => {
        if (!loading && deviceChannels.length > 0) return; // Prevent redundant loads
        try {
            // --- Phase 1: Fast Load Local/Cached Data ---
            const devices = await deviceStorage.getDevices();
            const dev = devices.find(d => String(d.id) === String(deviceId) || d.serialNumber === deviceId || d.deviceId === deviceId);

            let loadedChannels: any[] = [];

            // 1. Check saved channels on the device object
            if (dev && dev.channels && dev.channels.length > 0) {
                loadedChannels = dev.channels.map((ch: any) => ({
                    ...ch,
                    id: typeof ch.id === 'number' ? ch.id : parseInt(ch.id, 10)
                }));
                console.log('[PushConfig] Fast Load: Using saved channels from device object');
            }
            // 2. Check cached names from navigation params
            else if (routeChannels && routeChannels.length > 0) {
                loadedChannels = routeChannels.map((ch: any) => ({
                    ...ch,
                    id: typeof ch.id === 'number' ? ch.id : parseInt(ch.id, 10)
                }));
                console.log('[PushConfig] Fast Load: Using cached names from route');
            }
            // 3. Fallback to generic numbered channels
            else {
                const count = routeChannelCount || dev?.channelCount || 16;
                loadedChannels = Array.from({ length: count }, (_, i) => ({
                    id: i,
                    name: `CH ${i + 1}`,
                    online: true,
                }));
                console.log('[PushConfig] Fast Load: Using generic fallback list');
            }

            setDeviceChannels(loadedChannels);

            // Load local flat AsyncStorage settings cache
            const cached = await AsyncStorage.getItem(`push_settings_${deviceId}`);
            if (cached) {
                const parsedCache = JSON.parse(cached);
                const cachedEventSettings: any = {
                    HUMAN_DETECTION: [], VEHICLE_DETECTION: [], FACE_DETECTION: [], FACE_RECOGNITION: [],
                    INTRUSION: [], LINE_CROSSING: [], LOITERING: [], CROWD_DETECTION: [],
                    TAMPERING: [], MOTION: [], SENSOR: [],
                };
                let loadedGlobalPush = true;
                let loadedUserSub = true;
                let loadedOffline = true;
                let loadedAccess = true;

                Object.keys(parsedCache).forEach((eventId) => {
                    if (eventId === 'GLOBAL_PUSH') {
                        loadedGlobalPush = parsedCache[eventId] !== false;
                    } else if (eventId === 'USER_SUBSCRIPTION') {
                        loadedUserSub = parsedCache[eventId] !== false;
                    } else if (eventId === 'OFFLINE') {
                        loadedOffline = parsedCache[eventId] !== false;
                    } else if (eventId === 'ILLEGAL_ACCESS') {
                        loadedAccess = parsedCache[eventId] !== false;
                    } else {
                        cachedEventSettings[eventId] = (parsedCache[eventId] || []).map((ch: number) => ch - 1);
                    }
                });

                setGlobalPush(loadedGlobalPush);
                setUserSubscription(loadedUserSub);
                setSystemAlarms({
                    offline: loadedOffline,
                    access: loadedAccess,
                    rwError: true,
                    diskFull: true,
                    noDisk: true,
                    pullDisk: true,
                });
                setEventSettings(cachedEventSettings);
                console.log('[PushConfig] Fast Load: settings loaded from local cache:', cachedEventSettings);
            }

            // Instantly hide loading screen to render UI immediately!
            setLoading(false);

            // --- Phase 2: Silent Background Refresh ---
            backgroundRefresh(dev);

        } catch (err) {
            console.warn('[PushConfig] Error during fast load:', err);
            setLoading(false);
        }
    };

    const backgroundRefresh = async (dev: any) => {
        try {
            // 1. Fetch channel names from SDK in background
            let userId = deviceSessionManager.getUserId(String(deviceId));
            if (userId === null || userId < 0) {
                try {
                    userId = await deviceSessionManager.ensureSession(String(deviceId));
                } catch (e) {
                    console.warn('[PushConfig] Background: Failed to ensure session:', e);
                }
            }

            if (userId !== null && userId >= 0) {
                console.log('[PushConfig] Background: Refreshing names from SDK for userId:', userId);
                try {
                    const channels = await NvrSdk.getChannels(userId);
                    if (channels && channels.length > 0) {
                        const freshChannels = channels.map((ch: any) => ({
                            ...ch,
                            id: typeof ch.id === 'number' ? ch.id : parseInt(ch.id, 10)
                        }));
                        setDeviceChannels(freshChannels);
                        console.log('[PushConfig] Background: fresh channel names loaded');

                        if (dev) {
                            const updatedDev = { ...dev, channels: freshChannels };
                            await deviceStorage.updateDevice(updatedDev);
                        }
                    }
                } catch (sdkErr) {
                    console.warn('[PushConfig] Background: SDK channels refresh failed:', sdkErr);
                }
            }
        } catch (err) {
            console.warn('[PushConfig] Background: SDK connection failed:', err);
        }

        try {
            // 2. Fetch unified saved settings from backend/local cache via Notification Service
            const savedSettings = await tvtAlarmNotificationService.ensureAndGetPushSettings(String(deviceId));
            if (savedSettings) {
                setGlobalPush(savedSettings.enabled !== false);
                setUserSubscription(savedSettings.global?.messageSubscription !== false);
                setSystemAlarms({
                    offline: savedSettings.system?.offline !== false,
                    access: savedSettings.system?.access !== false,
                    rwError: true,
                    diskFull: true,
                    noDisk: true,
                    pullDisk: true,
                });

                const newEventSettings: any = {
                    HUMAN_DETECTION: [],
                    VEHICLE_DETECTION: [],
                    FACE_DETECTION: [],
                    FACE_RECOGNITION: [],
                    INTRUSION: [],
                    LINE_CROSSING: [],
                    LOITERING: [],
                    CROWD_DETECTION: [],
                    TAMPERING: [],
                    MOTION: [],
                    SENSOR: [],
                };

                (savedSettings.channels || []).forEach((ch: any) => {
                    const chId = typeof ch.channelId === 'number' ? ch.channelId : parseInt(ch.channelId, 10);
                    if (ch.human) newEventSettings.HUMAN_DETECTION.push(chId);
                    if (ch.vehicle) newEventSettings.VEHICLE_DETECTION.push(chId);
                    if (ch.faceDet || ch.face_det) newEventSettings.FACE_DETECTION.push(chId);
                    if (ch.faceRec || ch.face_rec) newEventSettings.FACE_RECOGNITION.push(chId);
                    if (ch.intrusion) newEventSettings.INTRUSION.push(chId);
                    if (ch.line) newEventSettings.LINE_CROSSING.push(chId);
                    if (ch.loitering) newEventSettings.LOITERING.push(chId);
                    if (ch.crowd) newEventSettings.CROWD_DETECTION.push(chId);
                    if (ch.tamper || ch.tampering) newEventSettings.TAMPERING.push(chId);
                    if (ch.motion) newEventSettings.MOTION.push(chId);
                    if (ch.sensor) newEventSettings.SENSOR.push(chId);
                });

                setEventSettings(newEventSettings);

                // Update flat AsyncStorage cache
                const flatCache: any = {};
                Object.keys(newEventSettings).forEach(key => {
                    flatCache[key] = newEventSettings[key].map((id: number) => id + 1);
                });
                await AsyncStorage.setItem(`push_settings_${deviceId}`, JSON.stringify({
                    ...flatCache,
                    GLOBAL_PUSH: savedSettings.enabled !== false,
                    USER_SUBSCRIPTION: savedSettings.global?.messageSubscription !== false,
                    OFFLINE: savedSettings.system?.offline !== false,
                    ILLEGAL_ACCESS: savedSettings.system?.access !== false
                }));
                console.log('[PushConfig] Background: settings successfully loaded and synchronized');
            }
        } catch (err) {
            console.warn('[PushConfig] Background: settings refresh from backend failed:', err);
        }
    };

    const handleSave = async () => {
        // With background auto-save on modal Done, handleSave just completes and returns
        Alert.alert('✅ Saved', 'Push notification settings saved successfully.');
        navigation.goBack();
    };

    const updateEventChannels = async (eventId: string, selectedIds: number[]) => {
        const numericIds = selectedIds.map(id => typeof id === 'number' ? id : parseInt(id, 10));

        // 1. Immediately update React state for UI responsiveness
        setEventSettings((prev: any) => ({
            ...prev,
            [eventId]: numericIds
        }));

        // 2. Perform the permanent save flow
        // Map 0-based selection IDs to 1-based Camera numbers
        const selectedChannels = numericIds.map(id => id + 1).sort((a, b) => a - b);
        await savePushSetting(eventId, true, selectedChannels);
        await applyLocalPushSettings();
    };

    const getChannelLabel = (eventId: string) => {
        const selectedIds = eventSettings[eventId] || [];
        const count = selectedIds.length;
        if (count === 0) return 'No Channel';
        // Map 0-based channel IDs to 1-based Camera numbers
        const cameraNumbers = selectedIds.map((id: number) => id + 1).sort((a, b) => a - b);
        return `Camera ${cameraNumbers.join(', ')}`;
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#A83232" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={28} color="#A83232" />
                </TouchableOpacity>
                <View style={styles.headerTitleGroup}>
                    <Text style={styles.headerSubtitle}>Configuration</Text>
                    <Text style={styles.headerTitle}>{deviceName}</Text>
                </View>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    {saving ? (
                        <ActivityIndicator size="small" color="#A83232" />
                    ) : (
                        <Icon name="check" size={28} color="#A83232" />
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.sectionCard}>
                    <View style={styles.settingCard}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingMainLabel}>Enable push message</Text>
                            <Text style={styles.settingSubtext}>Affects all users! Master switch for this device.</Text>
                        </View>
                        <Switch
                            value={globalPush}
                            onValueChange={handleToggleGlobalPush}
                            trackColor={{ false: "#DDD", true: "#FFD7D7" }}
                            thumbColor={globalPush ? "#A83232" : "#FFF"}
                        />
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.settingCard}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingMainLabel}>Message Subscription</Text>
                            <Text style={styles.settingSubtext}>Affects only you. Toggle to receive alerts.</Text>
                        </View>
                        <Switch
                            value={userSubscription}
                            onValueChange={handleToggleUserSubscription}
                            trackColor={{ false: "#DDD", true: "#FFD7D7" }}
                            thumbColor={userSubscription ? "#A83232" : "#FFF"}
                        />
                    </View>
                </View>

                <Text style={styles.sectionHeader}>AI DETECTION</Text>
                <View style={styles.sectionCard}>
                    {aiEvents.map(event => (
                        <TouchableOpacity
                            key={event.id}
                            style={styles.eventRow}
                            onPress={() => setActiveModal(event.id)}
                        >
                            <View style={styles.eventLabelGroup}>
                                <Icon name={event.icon} size={22} color="#666" />
                                <Text style={styles.eventLabel}>{event.label}</Text>
                            </View>
                            <View style={styles.channelBadge}>
                                <Text style={styles.channelLabel}>{getChannelLabel(event.id)}</Text>
                                <Icon name="chevron-right" size={18} color="#CCC" />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionHeader}>BASIC ALARMS</Text>
                <View style={styles.sectionCard}>
                    {basicAlarms.map(event => (
                        <TouchableOpacity
                            key={event.id}
                            style={styles.eventRow}
                            onPress={() => setActiveModal(event.id)}
                        >
                            <View style={styles.eventLabelGroup}>
                                <Icon name={event.icon} size={22} color="#666" />
                                <Text style={styles.eventLabel}>{event.label}</Text>
                            </View>
                            <View style={styles.channelBadge}>
                                <Text style={styles.channelLabel}>{getChannelLabel(event.id)}</Text>
                                <Icon name="chevron-right" size={18} color="#CCC" />
                            </View>
                        </TouchableOpacity>
                    ))}
                    <View style={styles.divider} />
                    <View style={styles.systemRow}>
                        <Text style={styles.systemLabel}>Camera Offline</Text>
                        <Switch value={systemAlarms.offline} onValueChange={handleToggleOfflineAlarm} />
                    </View>
                    <View style={styles.systemRow}>
                        <Text style={styles.systemLabel}>Illegal Access</Text>
                        <Switch value={systemAlarms.access} onValueChange={handleToggleAccessAlarm} />
                    </View>
                </View>
            </ScrollView>

            {/* Modals for Channel Selection */}
            {aiEvents.concat(basicAlarms).map(event => (
                <ChannelSelectionModal
                    key={event.id}
                    visible={activeModal === event.id}
                    onClose={() => setActiveModal(null)}
                    title={event.label}
                    channels={deviceChannels.map(ch => ({
                        id: ch.id,
                        name: ch.name,
                        selected: eventSettings[event.id]?.includes(ch.id)
                    }))}
                    onSave={(selectedIds) => updateEventChannels(event.id, selectedIds)}
                />
            ))}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF9F9' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF9F9',
        justifyContent: 'space-between'
    },
    headerTitleGroup: { flex: 1, marginLeft: 16 },
    headerSubtitle: { fontSize: 13, color: '#999', fontWeight: '600' },
    headerTitle: { fontSize: 18, color: '#A83232', fontWeight: '800' },
    scroll: { paddingBottom: 40 },
    sectionHeader: { fontSize: 13, fontWeight: '900', color: '#888', marginLeft: 20, marginTop: 24, marginBottom: 8, letterSpacing: 1 },
    sectionCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        overflow: 'hidden',
    },
    settingCard: { flexDirection: 'row', padding: 18, alignItems: 'center', justifyContent: 'space-between' },
    settingInfo: { flex: 1, paddingRight: 15 },
    settingMainLabel: { fontSize: 17, fontWeight: '800', color: '#333' },
    settingSubtext: { fontSize: 12, color: '#999', marginTop: 2 },
    divider: { height: 1, backgroundColor: '#F9F9F9', marginHorizontal: 20 },
    eventRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    eventLabelGroup: { flexDirection: 'row', alignItems: 'center' },
    eventLabel: { fontSize: 15, color: '#444', fontWeight: '600', marginLeft: 12 },
    channelBadge: { flexDirection: 'row', alignItems: 'center' },
    channelLabel: { fontSize: 13, color: '#A83232', fontWeight: '700', marginRight: 4 },
    systemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 },
    systemLabel: { fontSize: 15, fontWeight: '600', color: '#555' },
});

export default PushConfig;
