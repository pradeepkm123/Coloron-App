
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Switch,
    Alert,
    Platform,
    Modal,
    TextInput,
    Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';
import { localSettings, LocalSettings } from '../utils/localSettings';

const { width } = Dimensions.get('window');

const Local: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [settings, setSettings] = useState<LocalSettings | null>(null);

    // Modal states for numeric/text editing
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingKey, setEditingKey] = useState<keyof LocalSettings | null>(null);
    const [tempValue, setTempValue] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await localSettings.getSettings();
        setSettings(data);
    };

    const updateSetting = async (key: keyof LocalSettings, value: any) => {
        if (!settings) return;
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        await localSettings.saveSettings({ [key]: value });
    };

    const handleOpenEdit = (key: keyof LocalSettings, label: string) => {
        if (!settings) return;
        setEditingKey(key);
        setTempValue(String(settings[key]));
        setEditModalVisible(true);
    };

    const handleSaveEdit = () => {
        if (!editingKey) return;
        let value: any = tempValue;
        if (typeof settings?.[editingKey] === 'number') {
            value = parseInt(tempValue) || 0;
        }
        updateSetting(editingKey, value);
        setEditModalVisible(false);
    };

    const renderSettingItem = (
        icon: string,
        label: string,
        key?: keyof LocalSettings,
        value?: string | number,
        onPress?: () => void,
        description?: string
    ) => {
        if (!settings) return null;
        const isToggle = key !== undefined && typeof settings[key] === 'boolean';

        return (
            <TouchableOpacity
                style={styles.settingItem}
                onPress={onPress}
                activeOpacity={onPress ? 0.7 : 1}
                disabled={!onPress && isToggle}
            >
                <View style={[styles.iconBox, { backgroundColor: '#FCECEC' }]}>
                    <Icon name={icon} size={22} color="#A83232" />
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.label}>{label}</Text>
                    {description && <Text style={styles.description}>{description}</Text>}
                </View>

                <View style={styles.rightAction}>
                    {isToggle ? (
                        <Switch
                            trackColor={{ false: "#E0E0E0", true: "#FBD5D5" }}
                            thumbColor={settings[key!] ? "#A83232" : "#F4F3F4"}
                            onValueChange={(val) => updateSetting(key!, val)}
                            value={settings[key!] as boolean}
                            style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                        />
                    ) : (
                        <View style={styles.valueRow}>
                            {value !== undefined && <Text style={styles.valueText} numberOfLines={1}>{value}</Text>}
                            <Icon name="chevron-right" size={20} color="#CCC" />
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (!settings) return null;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <GradientBackground>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.avatarContainerBack}
                        >
                            <Icon name="chevron-left" size={28} color="#A83232" />
                        </TouchableOpacity>

                        <View style={styles.welcomeContainer}>
                            <Text style={styles.welcomeLabel}>Configuration</Text>
                            <Text style={styles.welcomeName}>Local Settings</Text>
                        </View>

                        <TouchableOpacity style={styles.iconButton}>
                            <Icon name="cog-outline" size={24} color="#A83232" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        <Text style={styles.sectionTitle}>Notifications & Alerts</Text>
                        <View style={styles.card}>
                            {renderSettingItem('bell-badge-outline', 'Notification Permissions', undefined, 'Enable', () => localSettings.openSystemNotificationSettings(), 'System-level notification access')}
                            {renderSettingItem('bell-ring-outline', 'Foreground Notification', 'notificationGlobal', undefined, undefined, 'Show alerts while app is active')}
                        </View>

                        <Text style={styles.sectionTitle}>Video & Playback</Text>
                        <View style={styles.card}>
                            {renderSettingItem('history', 'Playback Pre-Time', undefined, `${settings.pushMessagePreTime}s`, () => handleOpenEdit('pushMessagePreTime', 'Pre-Push Seconds'), 'Start playback before event (sec)')}
                            {renderSettingItem('quality-high', 'Resolution Adaption', 'resolutionAdaption', undefined, undefined, 'Auto switch quality on poor network')}
                            {renderSettingItem('video-3d-variant', 'Original Scale', 'originalScaleDisplay', undefined, undefined, 'Display video in native aspect ratio')}
                            {renderSettingItem('closed-caption', 'OSD', 'osd', undefined, undefined, 'Show name, time, bitrate on video')}
                        </View>

                        <Text style={styles.sectionTitle}>Storage & Captures</Text>
                        <View style={styles.card}>
                            {renderSettingItem('database', 'Reserved Space', undefined, `${settings.reservedDiskSpace}MB`, () => handleOpenEdit('reservedDiskSpace', 'Space in MB'), 'Minimum storage to keep free')}
                            {renderSettingItem('sync', 'Loop Recording', 'loopRecording', undefined, undefined, 'Overwrite oldest local files')}
                            {renderSettingItem('camera-outline', 'Snap Num', undefined, settings.snapNum, () => handleOpenEdit('snapNum', 'Snapshot Count'), 'Photos per snapshot action')}
                            {renderSettingItem('view-grid-plus-outline', 'Split Snap', 'splitSnap', undefined, undefined, 'Snapshot each channel in multi-view')}
                        </View>

                        <Text style={styles.sectionTitle}>Camera Operation</Text>
                        <View style={styles.card}>
                            {renderSettingItem('axis-arrow', 'Reverse Control', 'ptzReverseControl', undefined, undefined, 'Invert PTZ joystick directions')}
                            {renderSettingItem('gesture-tap', 'PTZ Gesture Prompts', 'ptzGesturePrompts', undefined, undefined, 'Visual guides for PTZ control')}
                            {renderSettingItem('link-variant', 'Automatic Connection', 'automaticConnection', undefined, undefined, 'Connect to last device on launch')}
                            {renderSettingItem('screen-rotation', 'Lock Landscape', 'landscapeMode', undefined, undefined, 'Force landscape UI for viewing')}
                            {renderSettingItem('image-edit', 'Rotation Correction', 'screenRotationCorrection', undefined, undefined, 'Fix rotated camera installation')}
                        </View>

                        <Text style={styles.sectionTitle}>System</Text>
                        <View style={styles.card}>
                            {renderSettingItem('star-outline', 'Favorites', undefined, undefined, () => navigation.navigate('DeviceList'))}
                            {renderSettingItem('wifi-cog', 'WiFi Configuration', undefined, undefined, () => Alert.alert('WIFI Config', 'Please connect to device AP for configuration.'))}
                            {renderSettingItem('rocket-launch-outline', 'Launch Setting', undefined, settings.launchMode, () => {
                                const modes: LocalSettings['launchMode'][] = ['LAST_PREVIEW', 'DEVICE_LIST', 'LIVE_VIEW'];
                                const currentIndex = modes.indexOf(settings.launchMode);
                                const nextIndex = (currentIndex + 1) % modes.length;
                                updateSetting('launchMode', modes[nextIndex]);
                            }, 'App behavior on startup')}
                            {renderSettingItem('web', 'Domain', undefined, settings.domain, () => handleOpenEdit('domain', 'Server Domain'), 'Cloud / P2P server endpoint')}
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </SafeAreaView>
            </GradientBackground>

            {/* Editing Modal */}
            <Modal
                transparent
                visible={editModalVisible}
                animationType="fade"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Setting</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={tempValue}
                            onChangeText={setTempValue}
                            keyboardType={typeof settings[editingKey || 'domain'] === 'number' ? 'numeric' : 'default'}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalBtn} onPress={() => setEditModalVisible(false)}>
                                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleSaveEdit}>
                                <Text style={styles.modalBtnTextSave}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        marginBottom: 15,
    },
    avatarContainerBack: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#FFE4E1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeContainer: {
        flex: 1,
        marginLeft: 15,
    },
    welcomeLabel: {
        fontSize: 13,
        color: '#555',
    },
    welcomeName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#A83232',
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#A83232',
        marginTop: 20,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#A83232',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#FDF2F2',
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    textContainer: {
        flex: 1,
    },
    label: {
        fontSize: 15,
        color: '#333333',
        fontWeight: '600',
    },
    description: {
        fontSize: 12,
        color: '#8C8C8C',
        marginTop: 2,
    },
    rightAction: {
        marginLeft: 8,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: 120,
    },
    valueText: {
        fontSize: 14,
        color: '#A83232',
        fontWeight: '600',
        marginRight: 6,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    modalInput: {
        width: '100%',
        height: 50,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#333',
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalBtn: {
        flex: 1,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    modalBtnSave: {
        backgroundColor: '#A83232',
        marginLeft: 12,
    },
    modalBtnTextCancel: {
        color: '#666',
        fontWeight: '600',
    },
    modalBtnTextSave: {
        color: '#FFF',
        fontWeight: '600',
    },
});

export default Local;
