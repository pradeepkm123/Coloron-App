
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Switch,
    Modal,
    Dimensions,
    FlatList,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../utils/api';
import { deviceStorage } from '../utils/deviceStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

import GradientBackground from '../Component/GradientBackground';
import { useFocusEffect } from '@react-navigation/native';
import NvrSdk from '../native/NvrSdk';
import { authStorage } from '../utils/authStorage';
import { deviceSessionManager } from '../services/DeviceSessionManager';
import messaging from '@react-native-firebase/messaging';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const THEME = {
    primary: '#A83232',
};

const getAlarmIcon = (type: string) => {
    switch (type) {
        case 'MOTION':
        case 'MOTION_DETECTION':
            return 'run-fast';
        case 'FACE_DETECTION':
            return 'account-box';
        case 'FACE_RECOGNITION':
            return 'face-recognition';
        case 'REGION_INTRUSION':
        case 'INTRUSION':
            return 'shield-home';
        case 'TAMPERING':
            return 'video-off';
        case 'LINE_CROSSING':
            return 'tray-minus';
        case 'VEHICLE_DETECTION':
            return 'car';
        case 'HUMAN_DETECTION':
            return 'human-greeting';
        case 'LICENSE_PLATE':
            return 'card-account-details-outline';
        case 'DISK':
        case 'DISK_ERROR':
            return 'database-off';
        case 'SENSOR_ALARM':
        case 'SENSOR':
            return 'sensor';
        case 'LOITERING':
            return 'clock-alert';
        case 'CROWD_DETECTION':
            return 'account-group';
        default:
            return 'bell-ring';
    }
};

const DevicePushSetting: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<RouteProp<RootStackParamList, 'DevicePushSetting'>>();
    const { deviceId, deviceName } = route.params;

    const [saving, setSaving] = useState(false);

    const [settings, setSettings] = useState({
        enablePush: true,
        messageSubscription: true,
        cameraOffline: true,
        diskError: true,
        diskFull: true,
        noDisk: true,
        pullOutDisk: true,
        illegalAccess: true,
        ipConflict: true,
        networkDisconnection: true,
    });

    const [modalVisible, _setModalVisible] = useState(false);
    const [modalTitle, _setModalTitle] = useState('');
    const [modalType, _setModalType] = useState<'channel' | 'sensor'>('channel');

    const [capabilities, setCapabilities] = useState<{ alarmType: string, supportedChannels: number[] }[]>([]);

    const [channels, setChannels] = useState<any[]>([]);
    const [sensors, setSensors] = useState<any[]>([]);

    // Helper formatting label based on SuperLive behavior
    const getAlarmRowLabel = (_alarmType: string, selectedCount: number, channelIds: number[]) => {

        // If no channels at all, then truly No Channel
        if (channels.length === 0) return 'No Channel';

        const total = channels.length;

        if (selectedCount === 0) return `Select Channel (0/${total})`;
        if (selectedCount === total) return 'Open All';

        return channelIds
            .filter(id => id !== undefined && id !== null && !isNaN(Number(id)))
            .map(id => Number(id) + 1)
            .sort((a, b) => a - b)
            .join(', ');
    };

    // Load settings on focus
    useFocusEffect(
        React.useCallback(() => {
            const loadSettings = async () => {
                const docId = String(deviceId).trim();

                // 1. Get current User Identifier to enable user-specific storage
                const identifier = await authStorage.getUserIdentifier();

                // 2. Login to device to get real SDK capabilities
                const devices = await deviceStorage.getDevices();
                const targetDevice = devices.find(d => String(d.id) === docId);

                if (targetDevice) {
                    try {
                        const userId = await deviceSessionManager.ensureSession(docId);
                        if (userId >= 0) {
                            // A. Try to get specifically what alarm types the NVR supports per channel
                            const sdkCapabilities = await NvrSdk.getPushCapabilities(userId);

                            // B. Get channels regardless
                            const sdkChannels = await NvrSdk.getChannels(userId);
                            const channelIds = (sdkChannels || []).map((ch: any) =>
                                typeof ch.id === 'string' ? parseInt(ch.id) : ch.id
                            );

                            if (sdkCapabilities && sdkCapabilities.alarmTypes && sdkCapabilities.alarmTypes.length > 0) {
                                // SDK returned real capability data
                                const channelIds = (sdkChannels || []).map((ch: any) =>
                                    typeof ch.id === 'string' ? parseInt(ch.id) : ch.id
                                );
                                setCapabilities(
                                    sdkCapabilities.alarmTypes.map((cap: any) => ({
                                        alarmType: cap.alarmType,
                                        supportedChannels: cap.supportedChannels || channelIds
                                    }))
                                );
                            } else {
                                // Unified Fallback: synthesise — every channel supports every alarm type
                                const ALL_ALARM_TYPES = [
                                    'MOTION', 'HUMAN_DETECTION', 'VEHICLE_DETECTION',
                                    'FACE_DETECTION', 'FACE_RECOGNITION',
                                    'REGION_INTRUSION', 'INTRUSION', 'LINE_CROSSING',
                                    'LOITERING', 'CROWD_DETECTION', 'TAMPERING', 'SENSOR',
                                ];
                                const effectiveChannelIds = channelIds.length > 0 ? channelIds : [0, 1, 2, 3];
                                setCapabilities(
                                    ALL_ALARM_TYPES.map(alarmType => ({ alarmType, supportedChannels: effectiveChannelIds }))
                                );
                            }

                            if (sdkChannels && sdkChannels.length > 0) {
                                const newChannels = sdkChannels.map((ch: any) => ({
                                    id: ch.id.toString(),
                                    name: ch.name || `CH ${typeof ch.id === 'number' ? ch.id + 1 : ch.id}`,
                                    online: ch.online,
                                    enabled: false,
                                    tamper: false,
                                    intrusion: false,
                                    line: false,
                                    objDet: false,
                                    faceDet: false,
                                    human: false,
                                    vehicle: false,
                                    faceRec: false,
                                    loitering: false,
                                    crowd: false,
                                    motion: false,
                                }));
                                setChannels(newChannels);
                            }

                            // ── CRITICAL: Open the alarm channel + subscribe each channel ──
                            // Without this the NVR never delivers alarms to the SDK callback
                            await NvrSdk.startAlarmMonitor(userId);
                            console.log('[PushSetting] Alarm channel was armed via TvtAlarmNotificationService');

                            // Auto-subscribe this device so the backend fans-out to this user
                            api.updateDeviceSettings(docId, { subscribed: true }).catch(() => { });
                        }
                    } catch (e) {
                        console.warn('Silent login for capabilities failed', e);
                        // Fallback: If login failed but we know the channel count from list screen, synthesize
                        const chCount = targetDevice.channelCount || (targetDevice.isNVR ? 16 : 4);
                        if (channels.length === 0) {
                            const synthChannels = [];
                            for (let i = 0; i < chCount; i++) {
                                synthChannels.push({
                                    id: String(i),
                                    name: `CH ${i + 1}`,
                                    online: true,
                                    enabled: false, motion: false, human: false, vehicle: false, faceDet: false, faceRec: false, intrusion: false, line: false, loitering: false, crowd: false, tamper: false
                                });
                            }
                            setChannels(synthChannels);

                            const ALL_ALARM_TYPES = [
                                'MOTION', 'HUMAN_DETECTION', 'VEHICLE_DETECTION',
                                'FACE_DETECTION', 'FACE_RECOGNITION',
                                'REGION_INTRUSION', 'INTRUSION', 'LINE_CROSSING',
                                'LOITERING', 'CROWD_DETECTION', 'TAMPERING', 'SENSOR',
                            ];
                            setCapabilities(
                                ALL_ALARM_TYPES.map(alarmType => ({ alarmType, supportedChannels: synthChannels.map(c => parseInt(c.id)) }))
                            );
                        }
                    }
                }

                // 3. Load Local Overrides (User-Specific)
                const saved = await deviceStorage.getPushSettings(docId, identifier);
                if (saved) {
                    if (saved.global) setSettings(prev => ({ ...prev, ...saved.global }));
                    if (saved.channels) {
                        setChannels(prev => prev.map(ch => {
                            const sCh = saved.channels.find((sc: any) => String(sc.id) === String(ch.id));
                            return sCh ? { ...ch, ...sCh } : ch;
                        }));
                    }
                    if (saved.sensors) setSensors(saved.sensors);
                } else {
                    // Fallback to user-defined structured format
                    try {
                        const userSavedStr = await AsyncStorage.getItem(`push_settings_${docId}`);
                        if (userSavedStr) {
                            const userSaved = JSON.parse(userSavedStr);
                            if (userSaved && userSaved.channels && typeof userSaved.channels === 'object') {
                                setChannels(prev => prev.map(ch => {
                                    const oneBasedKey = String(Number(ch.id) + 1);
                                    const enabledTypes = userSaved.channels[oneBasedKey] || [];
                                    return {
                                        ...ch,
                                        enabled: enabledTypes.includes("MOTION"),
                                        motion: enabledTypes.includes("MOTION"),
                                        human: enabledTypes.includes("HUMAN_DETECTION"),
                                        vehicle: enabledTypes.includes("VEHICLE_DETECTION"),
                                        faceDet: enabledTypes.includes("FACE_DETECTION"),
                                        faceRec: enabledTypes.includes("FACE_RECOGNITION"),
                                        intrusion: enabledTypes.includes("INTRUSION"),
                                        line: enabledTypes.includes("LINE_CROSSING"),
                                        loitering: enabledTypes.includes("LOITERING"),
                                        crowd: enabledTypes.includes("CROWD_DETECTION"),
                                        tamper: enabledTypes.includes("TAMPERING")
                                    };
                                }));
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to parse user format settings in fallback:', e);
                    }
                }
            };

            loadSettings();
        }, [deviceId])
    );

    // Helper to format flat user push settings structure
    const saveUserPushSettings = async (targetDeviceId: string, currentChannels: any[]) => {
        try {
            const userChannelsFormat: Record<string, string[]> = {};
            currentChannels.forEach((ch: any) => {
                const oneBasedKey = String(Number(ch.id) + 1);
                const activeTypes: string[] = [];
                if (ch.enabled || ch.motion) activeTypes.push("MOTION");
                if (ch.human) activeTypes.push("HUMAN_DETECTION");
                if (ch.vehicle) activeTypes.push("VEHICLE_DETECTION");
                if (ch.faceDet) activeTypes.push("FACE_DETECTION");
                if (ch.faceRec) activeTypes.push("FACE_RECOGNITION");
                if (ch.intrusion) activeTypes.push("INTRUSION");
                if (ch.line) activeTypes.push("LINE_CROSSING");
                if (ch.loitering) activeTypes.push("LOITERING");
                if (ch.crowd) activeTypes.push("CROWD_DETECTION");
                if (ch.tamper) activeTypes.push("TAMPERING");

                if (activeTypes.length > 0) {
                    userChannelsFormat[oneBasedKey] = activeTypes;
                }
            });
            const userPushSettings = {
                deviceId: String(targetDeviceId),
                channels: userChannelsFormat
            };
            await AsyncStorage.setItem(`push_settings_${targetDeviceId}`, JSON.stringify(userPushSettings));
        } catch (e) {
            console.warn('[DevicePushSetting] Failed to save user format settings:', e);
        }
    };

    // Autosave to local storage for real-time AlarmService reactivity (User-Specific)
    React.useEffect(() => {
        const autoSave = async () => {
            const identifier = await authStorage.getUserIdentifier();
            const payload = {
                global: settings,
                channels: channels,
                sensors: sensors
            };
            await deviceStorage.savePushSettings(String(deviceId).trim(), payload, identifier);
            await AsyncStorage.setItem(`@push_settings_${deviceId}`, JSON.stringify(payload));
            await saveUserPushSettings(String(deviceId).trim(), channels);

            // Dynamically apply settings to TvtAlarmNotificationService as they toggle in real-time
            try {
                const { tvtAlarmNotificationService } = require('../services/TvtAlarmNotificationService');
                await tvtAlarmNotificationService.applyPushSettingsForDevice(String(deviceId), payload);
            } catch (err) {
                console.warn('[DevicePushSetting] Real-time settings apply failed:', err);
            }
        };
        autoSave();
    }, [settings, channels, sensors, deviceId]);

    const handleSave = async () => {
        setSaving(true);
        const docId = String(deviceId).trim();
        try {
            const identifier = await authStorage.getUserIdentifier();
            const payload = {
                global: settings,
                channels: channels,
                sensors: sensors
            };

            // 1. Save to local storage (Immediate persistence for this user)
            await deviceStorage.savePushSettings(docId, payload, identifier);

            // 1B. Save to standard legacy key for broad compatibility
            await AsyncStorage.setItem(`@push_settings_${docId}`, JSON.stringify(payload));
            await saveUserPushSettings(docId, channels);

            // 2. Try to sync with backend (Path B - Cloud Push)
            await api.updateDeviceSettings(docId, payload);

            // 3. WRITE TO NVR SDK (Path A - Runtime Arming)
            const devices = await deviceStorage.getDevices();
            const targetDevice = devices.find(d => String(d.id) === docId);
            if (targetDevice) {
                try {
                    const userId = await deviceSessionManager.ensureSession(docId);
                    if (userId >= 0) {
                        await NvrSdk.savePushConfig(userId, payload);
                        // Open alarm channel so SDK starts delivering events immediately
                        await NvrSdk.startAlarmMonitor(userId);
                        console.log('[PushSetting] Saved push config to NVR successfully');
                    }
                } catch (sdkErr) {
                    console.warn('SDK configuration write failed', sdkErr);
                }
            }

            // 4. Update the TvtAlarmNotificationService configurations dynamically
            try {
                const { tvtAlarmNotificationService } = require('../services/TvtAlarmNotificationService');
                await tvtAlarmNotificationService.applyPushSettingsForDevice(String(deviceId), payload);
                console.log('[DevicePushSetting] Dynamic apply push settings complete.');
            } catch (serviceErr) {
                console.warn('[DevicePushSetting] Dynamic apply push settings failed:', serviceErr);
            }

            Alert.alert("Successfully modified", "Your push settings have been synchronized with the device and cloud.");
        } catch (e) {
            console.log("Sync error:", e);
            Alert.alert("Saved Locally", "Settings saved on phone, but failed to sync entirely.");
        } finally {
            setSaving(false);
        }
    };

    const toggleSetting = async (key: keyof typeof settings) => {
        const newValue = !settings[key];
        setSettings(prev => ({ ...prev, [key]: newValue }));

        if (key === 'enablePush' && newValue === true) {
            try {
                console.log('[PushSetting] 🚀 Enabling Master Push Switch...');
                // 1. Get FCM Token
                const token = await messaging().getToken();
                if (token) {
                    // 2. Register with Backend
                    await api.registerFcmToken(token);
                    console.log('[PushSetting] ✅ FCM Token registered with backend');
                }
            } catch (e) {
                console.warn('[PushSetting] FCM Registration failed:', e);
            }
        }
    };

    const navigateToSelection = (title: string, alarmType: string, field: string, currentSelected: number[]) => {
        navigation.navigate('EventChannelSelection', {
            deviceId,
            alarmType,
            alarmLabel: title,
            currentSelected,
            availableChannels: channels.map(c => ({
                id: typeof c.id === 'string' ? parseInt(c.id) : c.id,
                name: c.name
            })),
            onSelect: (newSelection: number[]) => {
                setChannels(prev => prev.map(ch => ({
                    ...ch,
                    [field]: newSelection.includes(typeof ch.id === 'string' ? parseInt(ch.id) : ch.id)
                })));
            }
        });
    };

    const renderToggleItem = (label: string, value: boolean, onToggle: () => void, subLabel?: string, iconName?: string) => (
        <View style={styles.settingItemStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {iconName && <Icon name={iconName} size={22} color={!!value ? THEME.primary : '#CCC'} style={{ marginRight: 12 }} />}
                <View style={{ flex: 1 }}>
                    <Text style={[styles.settingLabel, !value && { color: '#999' }]}>{label}</Text>
                    {subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
                </View>
            </View>
            <Switch
                value={!!value}
                onValueChange={onToggle}
                trackColor={{ false: '#D1D1D1', true: '#A83232' }}
                thumbColor="#FFF"
            />
        </View>
    );

    const renderChevronItem = (label: string, alarmTypeStr: string, field: string) => {
        const selectedChannels = channels.filter(c => c[field]).map(c => typeof c.id === 'string' ? parseInt(c.id) : c.id);
        const rowLabel = getAlarmRowLabel(alarmTypeStr, selectedChannels.length, selectedChannels);
        const iconName = getAlarmIcon(alarmTypeStr);
        return (
            <TouchableOpacity style={styles.settingItemStyle} onPress={() => {
                if (channels.length > 0) navigateToSelection(label, alarmTypeStr, field, selectedChannels);
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Icon name={iconName} size={22} color={rowLabel === 'No Channel' ? '#CCC' : THEME.primary} style={{ marginRight: 12 }} />
                    <Text style={[styles.settingLabel, rowLabel === 'No Channel' && { color: '#CCC' }]}>{label}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.valueLabel, rowLabel === 'No Channel' && { color: '#CCC' }]}>{rowLabel}</Text>
                    {rowLabel !== 'No Channel' && <Icon name="chevron-right" size={24} color="#CCC" />}
                </View>
            </TouchableOpacity>
        );
    };

    const renderModalItem = ({ item }: { item: any }) => {
        // Find if enabled based on modalTitle
        let isEnabled = false;
        if (modalTitle === 'Tampering') isEnabled = item.tamper;
        else if (modalTitle === 'Region Intrusion') isEnabled = item.intrusion;
        else if (modalTitle === 'Line Crossing') isEnabled = item.line;
        else if (modalTitle === 'Motion') isEnabled = item.enabled;
        else if (modalTitle === 'Object Detection') isEnabled = item.objDet;
        else if (modalTitle === 'Face Detection') isEnabled = item.faceDet;
        else if (modalTitle === 'Face Recognition') isEnabled = item.faceRec;
        else if (modalTitle === 'Human Detection') isEnabled = item.human;
        else if (modalTitle === 'Vehicle Detection') isEnabled = item.vehicle;
        else if (modalTitle === 'Loitering') isEnabled = item.loitering;
        else if (modalTitle === 'Crowd Detection') isEnabled = item.crowd;
        else if (modalType === 'sensor') isEnabled = item.enabled;

        const handleToggle = () => {
            if (modalType === 'sensor') {
                setSensors(prev => prev.map(s => s.id === item.id ? { ...s, enabled: !s.enabled } : s));
            } else {
                setChannels(prev => prev.map(c => {
                    if (c.id !== item.id) return c;
                    if (modalTitle === 'Tampering') return { ...c, tamper: !c.tamper };
                    if (modalTitle === 'Region Intrusion') return { ...c, intrusion: !c.intrusion };
                    if (modalTitle === 'Line Crossing') return { ...c, line: !c.line };
                    if (modalTitle === 'Object Detection') return { ...c, objDet: !c.objDet };
                    if (modalTitle === 'Face Detection') return { ...c, faceDet: !c.faceDet };
                    if (modalTitle === 'Face Recognition') return { ...c, faceRec: !c.faceRec };
                    if (modalTitle === 'Human Detection') return { ...c, human: !c.human };
                    if (modalTitle === 'Vehicle Detection') return { ...c, vehicle: !c.vehicle };
                    if (modalTitle === 'Loitering') return { ...c, loitering: !c.loitering };
                    if (modalTitle === 'Crowd Detection') return { ...c, crowd: !c.crowd };
                    if (modalTitle === 'Motion') return { ...c, enabled: !c.enabled };
                    return c;
                }));
            }
        };

        return (
            <TouchableOpacity style={styles.modalListItem} onPress={handleToggle}>
                <View style={styles.modalIconLabel}>
                    <Icon name={modalType === 'channel' ? "video-outline" : "alarm-bell"} size={22} color="#555" style={{ marginRight: 15 }} />
                    <Text style={[styles.modalItemText, !isEnabled && { color: '#999' }]}>{item.name}</Text>
                </View>
                <View style={[styles.checkCircle, isEnabled ? styles.checkCircleActive : styles.checkCircleInactive]}>
                    {isEnabled && <Icon name="check" size={16} color="#FFF" />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.avatarContainerBack} onPress={() => navigation.goBack()}>
                            <Icon name="arrow-left" size={24} color="#A83232" />
                        </TouchableOpacity>
                        <View style={styles.welcomeContainer}>
                            <Text style={styles.welcomeLabel}>Configuration</Text>
                            <Text style={styles.headerTitle} numberOfLines={1}>{deviceName}</Text>
                        </View>
                        <TouchableOpacity onPress={handleSave} style={styles.iconButton} disabled={saving}>
                            {saving ? <ActivityIndicator color="#A83232" size="small" /> : <Icon name="content-save-check" size={26} color="#A83232" />}
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.sectionCard}>
                            {renderToggleItem(
                                "Enable push message",
                                settings.enablePush,
                                () => toggleSetting('enablePush'),
                                "Affects all users! If you don't want any notifications, please turn this off!",
                                "bell-ring"
                            )}
                            <View style={styles.divider} />
                            {renderToggleItem(
                                "Message Subscription",
                                settings.messageSubscription,
                                () => toggleSetting('messageSubscription'),
                                "Affects only current user! If you turn this off, you won't receive notifications from devices.",
                                "account-check"
                            )}
                        </View>

                        {/* Intelligent Analysis Section */}
                        <View style={styles.sectionCard}>
                            {renderChevronItem("Human Detection", "HUMAN_DETECTION", "human")}
                            <View style={styles.divider} />
                            {renderChevronItem("Vehicle Detection", "VEHICLE_DETECTION", "vehicle")}
                            <View style={styles.divider} />
                            {renderChevronItem("Face Detection", "FACE_DETECTION", "faceDet")}
                            <View style={styles.divider} />
                            {renderChevronItem("Face Recognition", "FACE_RECOGNITION", "faceRec")}
                            <View style={styles.divider} />
                            {renderChevronItem("Region Intrusion", "REGION_INTRUSION", "intrusion")}
                            <View style={styles.divider} />
                            {renderChevronItem("Line Crossing", "LINE_CROSSING", "line")}
                            <View style={styles.divider} />
                            {renderChevronItem("Loitering", "LOITERING", "loitering")}
                            <View style={styles.divider} />
                            {renderChevronItem("Crowd Detection", "CROWD_DETECTION", "crowd")}
                            <View style={styles.divider} />
                            {renderChevronItem("Tampering", "TAMPERING", "tamper")}
                        </View>

                        <View style={styles.subHeader}>
                            <Text style={styles.subHeaderText}>BASIC ALARMS</Text>
                        </View>

                        <View style={styles.sectionCard}>
                            {renderChevronItem("Motion", "MOTION", "enabled")}
                            <View style={styles.divider} />
                            {/* Sensor implementation pending specific screen */}
                            <TouchableOpacity style={styles.settingItemStyle} onPress={() => Alert.alert("Sensors", "Sensor configuration coming soon")}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <Icon name="sensor" size={22} color={THEME.primary} style={{ marginRight: 12 }} />
                                    <Text style={styles.settingLabel}>Sensor Alarm</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={styles.valueLabel}>No Channel</Text>
                                    <Icon name="chevron-right" size={24} color="#CCC" />
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.subHeader}>
                            <Text style={styles.subHeaderText}>NVR HEALTH MONITORING</Text>
                        </View>

                        <View style={styles.sectionCard}>
                            {renderToggleItem("Camera Offline", settings.cameraOffline, () => toggleSetting('cameraOffline'), undefined, "camera-off")}
                            <View style={styles.divider} />
                            {renderToggleItem("Disk R/W Error", settings.diskError, () => toggleSetting('diskError'), undefined, "alert-circle-outline")}
                            <View style={styles.divider} />
                            {renderToggleItem("Disk Full", settings.diskFull, () => toggleSetting('diskFull'), undefined, "database")}
                            <View style={styles.divider} />
                            {renderToggleItem("No Disk", settings.noDisk, () => toggleSetting('noDisk'), undefined, "database-minus")}
                            <View style={styles.divider} />
                            {renderToggleItem("Pull Out Disk", settings.pullOutDisk, () => toggleSetting('pullOutDisk'), undefined, "tray-arrow-up")}
                            <View style={styles.divider} />
                            {renderToggleItem("IP Address Conflict", settings.ipConflict, () => toggleSetting('ipConflict'), undefined, "lan-disconnect")}
                            <View style={styles.divider} />
                            {renderToggleItem("Network Disconnection", settings.networkDisconnection, () => toggleSetting('networkDisconnection'), undefined, "wifi-off")}
                            <View style={styles.divider} />
                            {renderToggleItem("Illegal Access", settings.illegalAccess, () => toggleSetting('illegalAccess'), undefined, "lock-alert")}
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </SafeAreaView>
            </GradientBackground>

            {/* Selection Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => _setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{modalTitle}</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    if (modalType === 'sensor') {
                                        const allOn = sensors.every(s => s.enabled);
                                        setSensors(prev => prev.map(s => ({ ...s, enabled: !allOn })));
                                    } else {
                                        setChannels(prev => prev.map(c => {
                                            const allOnForType =
                                                modalTitle === 'Tampering' ? prev.every(x => x.tamper) :
                                                    modalTitle === 'Region Intrusion' ? prev.every(x => x.intrusion) :
                                                        modalTitle === 'Line Crossing' ? prev.every(x => x.line) :
                                                            modalTitle === 'Motion' ? prev.every(x => x.enabled) : false;

                                            if (modalTitle === 'Tampering') return { ...c, tamper: !allOnForType };
                                            if (modalTitle === 'Region Intrusion') return { ...c, intrusion: !allOnForType };
                                            if (modalTitle === 'Line Crossing') return { ...c, line: !allOnForType };
                                            if (modalTitle === 'Human Detection') return { ...c, human: !allOnForType };
                                            if (modalTitle === 'Vehicle Detection') return { ...c, vehicle: !allOnForType };
                                            if (modalTitle === 'Face Detection') return { ...c, faceDet: !allOnForType };
                                            if (modalTitle === 'Face Recognition') return { ...c, faceRec: !allOnForType };
                                            if (modalTitle === 'Loitering') return { ...c, loitering: !allOnForType };
                                            if (modalTitle === 'Crowd Detection') return { ...c, crowd: !allOnForType };
                                            if (modalTitle === 'Motion') return { ...c, enabled: !allOnForType };
                                            return c;
                                        }));
                                    }
                                }}
                                style={styles.selectAllContainer}
                            >
                                <View style={[
                                    styles.checkCircle,
                                    (modalType === 'sensor'
                                        ? sensors.every(s => s.enabled)
                                        : modalTitle === 'Tampering' ? channels.every(c => c.tamper) :
                                            modalTitle === 'Region Intrusion' ? channels.every(c => c.intrusion) :
                                                modalTitle === 'Line Crossing' ? channels.every(c => c.line) :
                                                    modalTitle === 'Human Detection' ? channels.every(c => c.human) :
                                                        modalTitle === 'Vehicle Detection' ? channels.every(c => c.vehicle) :
                                                            modalTitle === 'Face Detection' ? channels.every(c => c.faceDet) :
                                                                modalTitle === 'Face Recognition' ? channels.every(c => c.faceRec) :
                                                                    modalTitle === 'Loitering' ? channels.every(c => c.loitering) :
                                                                        modalTitle === 'Crowd Detection' ? channels.every(c => c.crowd) :
                                                                            modalTitle === 'Motion' ? channels.every(c => c.enabled) : false
                                    ) ? styles.checkCircleActive : styles.checkCircleInactive
                                ]}>
                                    {(modalType === 'sensor'
                                        ? sensors.every(s => s.enabled)
                                        : modalTitle === 'Tampering' ? channels.every(c => c.tamper) :
                                            modalTitle === 'Region Intrusion' ? channels.every(c => c.intrusion) :
                                                modalTitle === 'Line Crossing' ? channels.every(c => c.line) :
                                                    modalTitle === 'Human Detection' ? channels.every(c => c.human) :
                                                        modalTitle === 'Vehicle Detection' ? channels.every(c => c.vehicle) :
                                                            modalTitle === 'Face Detection' ? channels.every(c => c.faceDet) :
                                                                modalTitle === 'Face Recognition' ? channels.every(c => c.faceRec) :
                                                                    modalTitle === 'Loitering' ? channels.every(c => c.loitering) :
                                                                        modalTitle === 'Crowd Detection' ? channels.every(c => c.crowd) :
                                                                            modalTitle === 'Motion' ? channels.every(c => c.enabled) : false) && <Icon name="check" size={16} color="#FFF" />}
                                </View>
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={modalType === 'channel' ? channels : sensors}
                            renderItem={renderModalItem}
                            keyExtractor={item => item.id.toString()}
                            ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
                            style={styles.modalList}
                        />

                        <TouchableOpacity
                            style={styles.closeModalButton}
                            onPress={() => _setModalVisible(false)}
                        >
                            <Text style={styles.closeModalButtonText}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 15,
    },
    avatarContainerBack: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#FFE4E1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeContainer: { flex: 1, marginLeft: 15 },
    welcomeLabel: { fontSize: 13, color: '#666', fontWeight: '500' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#A83232' },
    iconButton: {
        width: 45,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22.5,
        backgroundColor: '#FAE8E8',
    },
    content: { flex: 1 },
    sectionCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 15,
        borderRadius: 20,
        marginBottom: 20,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#A83232',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    subHeader: {
        paddingHorizontal: 25,
        paddingVertical: 10,
        marginBottom: 5,
    },
    subHeaderText: {
        fontSize: 12,
        color: '#888',
        fontWeight: 'bold',
        letterSpacing: 1.2,
    },
    settingItemStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    settingLabel: {
        fontSize: 16,
        color: '#1A2b3C',
        fontWeight: '600',
    },
    subLabel: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
        lineHeight: 16,
    },
    valueLabel: {
        fontSize: 14,
        color: '#A83232',
        marginRight: 8,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginHorizontal: 20,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: SCREEN_HEIGHT * 0.8,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1A2b3C',
    },
    selectAllContainer: {
        padding: 8,
        backgroundColor: '#FAE8E8',
        borderRadius: 12,
    },
    modalList: {
        paddingVertical: 10,
    },
    modalListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        paddingHorizontal: 24,
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    modalIconLabel: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginHorizontal: 24,
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkCircleActive: {
        backgroundColor: '#A83232',
        borderColor: '#A83232',
    },
    checkCircleInactive: {
        backgroundColor: '#FFF',
        borderColor: '#DDD',
    },
    closeModalButton: {
        backgroundColor: '#A83232',
        paddingVertical: 16,
        alignItems: 'center',
        marginHorizontal: 24,
        marginTop: 10,
        borderRadius: 20,
        elevation: 4,
        shadowColor: '#A83232',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    closeModalButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
});

export default DevicePushSetting;
