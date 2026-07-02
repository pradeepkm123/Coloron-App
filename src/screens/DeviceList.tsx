
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    TextInput,
    Dimensions,
    Alert,
    Modal,
    Image,
    ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GradientBackground from '../Component/GradientBackground';
import BottomBar from '../Component/BottomBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddDeviceMenu from '../Component/AddDeviceMenu';
import AddDeviceManually from '../Component/AddDeviceManually';
import { deviceStorage, Device } from '../utils/deviceStorage';
import { api } from '../utils/api';
import { useFocusEffect } from '@react-navigation/native';
import { DeviceStatusManager, DeviceStatus } from '../utils/DeviceStatusManager';
import NvrSdk from '../native/NvrSdk';
import { deviceSessionManager } from '../services/DeviceSessionManager';
import { 
    getDeviceBasicInfo, 
    getTCPIPConfig, 
    getNetworkStatus, 
    getHddInfo, 
    getAlarmStatus, 
    getRecordStatus 
} from '../services/DeviceConfigService';

// Dummy data removed

const DeviceList: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [devices, setDevices] = useState<Device[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
    const [loading, setLoading] = useState(true);

    // Status State
    const [deviceStatuses, setDeviceStatuses] = useState<Record<string, DeviceStatus>>({});

    // Action States
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [configModalVisible, setConfigModalVisible] = useState(false);
    const [camListVisible, setCamListVisible] = useState(false);
    const [selectedDeviceForCamList, setSelectedDeviceForCamList] = useState<Device | null>(null);
    const [editName, setEditName] = useState('');

    useFocusEffect(
        React.useCallback(() => {
            const loadDevices = async () => {
                setLoading(true);
                try {
                    // 1. Get local devices first for fast UI
                    const storedDevices = await deviceStorage.getDevices();
                    setDevices(storedDevices);

                    // Start background silent auto-login for selected/recent devices
                    deviceSessionManager.autoLoginRecentDevices(storedDevices).catch(() => {});

                    // 2. Start Monitoring Status locally
                    storedDevices.forEach(d => {
                        DeviceStatusManager.startMonitoring(d, (id, status) => {
                            setDeviceStatuses(prev => ({ ...prev, [id]: status }));
                        });
                    });

                    // 3. Sync from Cloud
                    console.log("[DeviceList] Syncing with cloud...");
                    const cloudDevices = await api.syncDevices();
                    if (cloudDevices && cloudDevices.length > 0) {
                        // Intelligent Merge: Cloud overrides local for synced fields
                        // This ensures "Any Other Device" updates are reflected here.
                        await deviceStorage.saveDevices(cloudDevices);
                        setDevices(cloudDevices);
                    }
                } catch (e) {
                    console.warn("[DeviceList] Cloud sync failed or error loading devices", e);
                } finally {
                    setLoading(false);
                }
            };
            loadDevices();

            return () => {
                // Cleanup if needed
            };
        }, [])
    );


    // Add Device / Menu States
    const [menuVisible, setMenuVisible] = useState(false);
    const [addManuallyVisible, setAddManuallyVisible] = useState(false);
    const [scannedSN, setScannedSN] = useState('');
    const [initialDevice, setInitialDevice] = useState<any | undefined>(undefined);
    const [scannerVisible, setScannerVisible] = useState(false);
    const [notificationsVisible, setNotificationsVisible] = useState(false);

    const route = useRoute<RouteProp<RootStackParamList, 'DeviceList'>>();

    useEffect(() => {
        if (route.params?.scannedSN || (route.params as any)?.scannedDevice) {
            const device = (route.params as any)?.scannedDevice;
            if (device) {
                console.log('Received scanned device in DeviceList:', device);
                setScannedSN(device.serial || device.sn);
                setInitialDevice(device);
                setAddManuallyVisible(true);
            } else if (route.params?.scannedSN) {
                setScannedSN(route.params.scannedSN);
                setAddManuallyVisible(true);
            }
            navigation.setParams({ scannedSN: undefined, scannedDevice: undefined } as any);
        }
    }, [route.params]);


    const confirmDelete = (id: string | number) => {
        Alert.alert(
            "Delete Device",
            "Are you sure you want to delete this device? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => handleDelete(id) }
            ]
        );
    };

    const handleDelete = async (id: string | number) => {
        const updatedDevices = devices.filter(d => d.id !== id);
        setDevices(updatedDevices);
        await deviceStorage.saveDevices(updatedDevices);
        DeviceStatusManager.stopMonitoring(String(id));
        // Also remove from cloud so it doesn't come back on next sync
        api.deleteDevice(String(id));
    };

    const toggleFavorite = async (id: string | number) => {
        const updatedDevices = devices.map(d => d.id === id ? { ...d, favorite: !d.favorite } : d);
        setDevices(updatedDevices);
        await deviceStorage.saveDevices(updatedDevices);
    };

    const handleEditPress = (device: Device) => {
        setSelectedDevice(device);
        setEditName(device.name);
        setEditModalVisible(true);
    };

    const handleSaveEdit = async () => {
        if (selectedDevice && editName.trim()) {
            const updatedDevices = devices.map(d => d.id === selectedDevice.id ? { ...d, name: editName } : d);
            setDevices(updatedDevices);
            await deviceStorage.saveDevices(updatedDevices);
            setEditModalVisible(false);
            setSelectedDevice(null);
        }
    };

    // Config Form State
    const [configForm, setConfigForm] = useState({
        ip: '', subnet: '', gateway: '', dns: '',
        resolution: '1920x1080 (1080P)', bitrate: 'VBR', fps: '30',
        motionEnabled: true, sensitivity: 'High', alarmDuration: '10s',
        deviceName: '', timezone: '(UTC+00:00) London', language: 'English'
    });

    // Selector Modal State
    const [selectorVisible, setSelectorVisible] = useState(false);
    const [selectorTitle, setSelectorTitle] = useState('');
    const [selectorOptions, setSelectorOptions] = useState<string[]>([]);
    const [currentField, setCurrentField] = useState<keyof typeof configForm | null>(null);

    // Initial Load Form Data
    useEffect(() => {
        if (selectedDevice) {
            setConfigForm(prev => ({
                ...prev,
                ip: selectedDevice.ip,
                deviceName: selectedDevice.name,
                // defaults for others
                subnet: '255.255.255.0', gateway: '192.168.1.1', dns: '8.8.8.8',
                resolution: '1920x1080 (1080P)', bitrate: 'VBR', fps: '30',
                motionEnabled: true, sensitivity: 'High', alarmDuration: '10s',
                timezone: '(UTC+00:00) London', language: 'English'
            }));
        }
    }, [selectedDevice]);

    const updateField = (field: keyof typeof configForm, value: any) => {
        setConfigForm(prev => ({ ...prev, [field]: value }));
    };

    const openSelector = (title: string, field: keyof typeof configForm, options: string[]) => {
        setSelectorTitle(title);
        setCurrentField(field);
        setSelectorOptions(options);
        setSelectorVisible(true);
    };

    const handleSelectOption = (option: string) => {
        if (currentField) {
            updateField(currentField, option);
        }
        setSelectorVisible(false);
    };

    const renderDropdown = (label: string, value: string, field: keyof typeof configForm, options: string[]) => (
        <>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity style={styles.mockDropdown} onPress={() => openSelector(label, field, options)}>
                <Text style={{ color: '#333' }}>{value}</Text>
                <Icon name="chevron-down" size={20} color="#ccc" />
            </TouchableOpacity>
        </>
    );

    // Config Modal State
    const [configView, setConfigView] = useState<'main' | 'basic_info' | 'channel_status' | 'network_info' | 'alarm_status' | 'recording_status' | 'disk_info' | 'cloud_upgrade' | 'change_password'>('main');

    // Fetch Config Data on demands
    const [channelsStatus, setChannelsStatus] = useState<any[]>([]);
    const [loadingConfig, setLoadingConfig] = useState(false);
    const configUserIdRef = useRef<number>(-1);

    // Dynamic config info states
    const [basicInfo, setBasicInfo] = useState<any>(null);
    const [networkInfo, setNetworkInfo] = useState<any>(null);
    const [alarmStatus, setAlarmStatus] = useState<any>(null);
    const [recordingStatus, setRecordingStatus] = useState<any>(null);
    const [diskInfo, setDiskInfo] = useState<any[]>([]);

    const handleConfigPress = async (device: Device) => {
        setSelectedDevice(device);
        setConfigView('main');
        setConfigModalVisible(true);
        setLoadingConfig(true);
        setChannelsStatus([]);
        setBasicInfo(null);
        setNetworkInfo(null);
        setAlarmStatus(null);
        setRecordingStatus(null);
        setDiskInfo([]);

        try {
            const res = await NvrSdk.login({
                host: device.ip,
                port: Number(device.port || '6036'),
                username: device.username || 'admin',
                password: device.password || '123456',
                sn: (device as any).sn || device.deviceId || '',
                loginType: device.connectMode === 'P2P' ? 2 : 0,
                protocol: device.protocol || 'TVT',
            });

            if (res.userId >= 0) {
                configUserIdRef.current = res.userId;
                
                // Load info in parallel for fast loading
                const [chs, bInfo, netConfig, netStatus, hdd, alStatus, recStatus] = await Promise.all([
                    NvrSdk.getChannels(res.userId).catch(() => []),
                    getDeviceBasicInfo(res.userId).catch(() => null),
                    getTCPIPConfig(res.userId).catch(() => null),
                    getNetworkStatus(res.userId).catch(() => null),
                    getHddInfo(res.userId).catch(() => []),
                    getAlarmStatus(res.userId).catch(() => null),
                    getRecordStatus(res.userId).catch(() => [])
                ]);

                setChannelsStatus(chs || []);
                setBasicInfo(bInfo);
                setNetworkInfo(netConfig || netStatus ? { ...netConfig, ...netStatus } : null);
                setDiskInfo(hdd);
                setAlarmStatus(alStatus);
                setRecordingStatus(recStatus);
            }
        } catch (err) {
            console.warn('[Config] Failed to fetch live info:', err);
        } finally {
            setLoadingConfig(false);
        }
    };

    const closeConfigModal = () => {
        if (configUserIdRef.current >= 0) {
            console.log('[DeviceList] Closing config: Preserving userId for background service', configUserIdRef.current);
            configUserIdRef.current = -1;
        }
        setConfigModalVisible(false);
    };

    const renderConfigContent = () => {
        if (loadingConfig && configView !== 'main') {
            return <ActivityIndicator size="large" color="#A83232" style={{ marginVertical: 40 }} />;
        }

        switch (configView) {
            case 'basic_info':
                return (
                    <ScrollView style={{ paddingVertical: 10 }}>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Device Name</Text><Text style={styles.configDetailValue}>{basicInfo?.deviceName || selectedDevice?.name || '---'}</Text></View>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Device ID</Text><Text style={styles.configDetailValue}>{configUserIdRef.current >= 0 ? configUserIdRef.current : '1'}</Text></View>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Model</Text><Text style={styles.configDetailValue}>{basicInfo?.model || selectedDevice?.model || '---'}</Text></View>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Serial Number</Text><Text style={styles.configDetailValue}>{basicInfo?.serialNumber || selectedDevice?.deviceId || '---'}</Text></View>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Device Type</Text><Text style={styles.configDetailValue}>{basicInfo?.deviceType || selectedDevice?.type || '---'}</Text></View>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Channel Count</Text><Text style={styles.configDetailValue}>{basicInfo?.channelCount || selectedDevice?.channelCount || '---'}</Text></View>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Firmware Version</Text><Text style={styles.configDetailValue}>{basicInfo?.firmwareVersion || selectedDevice?.version || '---'}</Text></View>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Hardware Version</Text><Text style={styles.configDetailValue}>{basicInfo?.hardwareVersion || '---'}</Text></View>
                    </ScrollView>
                );
            case 'channel_status':
                return (
                    <ScrollView style={{ paddingVertical: 10 }}>
                        {channelsStatus.length === 0 ? (
                            <Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>No Channels Discovered</Text>
                        ) : (
                            channelsStatus.map((ch, i) => (
                                <View key={i} style={{ marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 10 }}>
                                    <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Camera Name</Text><Text style={styles.configDetailValue}>{ch.name}</Text></View>
                                    <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Status</Text><Text style={[styles.configDetailValue, { color: ch.online ? '#4CAF50' : '#F44336' }]}>{ch.online ? 'Online' : 'Offline'}</Text></View>
                                    <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Motion Detected</Text><Text style={styles.configDetailValue}>No Alarm</Text></View>
                                    <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Recording Status</Text><Text style={styles.configDetailValue}>{ch.online ? 'Device is Recording' : 'No Video'}</Text></View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                );
            case 'network_info':
                return (
                    <ScrollView style={{ paddingVertical: 10 }}>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Link Status</Text><Text style={[styles.configDetailValue, { color: (networkInfo?.linkStatus || 'connected').toLowerCase() === 'connected' ? '#4CAF50' : '#F44336' }]}>{networkInfo?.linkStatus || 'Connected'}</Text></View>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>IP Address</Text><Text style={styles.configDetailValue}>{networkInfo?.ipv4 || selectedDevice?.ip || '---'}</Text></View>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Subnet Mask</Text><Text style={styles.configDetailValue}>{networkInfo?.mask || '255.255.255.0'}</Text></View>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Gateway</Text><Text style={styles.configDetailValue}>{networkInfo?.gateway || '---'}</Text></View>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Preferred DNS</Text><Text style={styles.configDetailValue}>{networkInfo?.preferredDNS || '8.8.8.8'}</Text></View>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>DHCP Status</Text><Text style={styles.configDetailValue}>{networkInfo?.dhcp ? 'Enabled' : 'Disabled'}</Text></View>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>MAC Address</Text><Text style={styles.configDetailValue}>{networkInfo?.macAddress || '28:2C:02:62:71:F6'}</Text></View>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Link Speed</Text><Text style={styles.configDetailValue}>{networkInfo?.speed || '100 Mbps'}</Text></View>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Device Port</Text><Text style={styles.configDetailValue}>{selectedDevice?.port || '6036'}</Text></View>
                    </ScrollView>
                );
            case 'disk_info':
                return (
                    <ScrollView style={{ paddingVertical: 10 }}>
                        {diskInfo.length === 0 ? (
                            <Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>No Disk Discovered</Text>
                        ) : (
                            diskInfo.map((disk, i) => (
                                <View key={i} style={{ marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 10 }}>
                                    <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Disk HDD</Text><Text style={styles.configDetailValue}>Disk {disk.index}</Text></View>
                                    <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Capacity</Text><Text style={styles.configDetailValue}>{disk.capacity}</Text></View>
                                    <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Free Space</Text><Text style={styles.configDetailValue}>{disk.freeSpace}</Text></View>
                                    <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Read/Write Type</Text><Text style={styles.configDetailValue}>{disk.type}</Text></View>
                                    <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Status</Text><Text style={[styles.configDetailValue, { color: disk.status.toLowerCase() === 'normal' ? '#4CAF50' : '#F44336' }]}>{disk.status}</Text></View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                );
            case 'alarm_status':
                return (
                    <ScrollView style={{ paddingVertical: 10 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10, paddingHorizontal: 15 }}>Motion Detection</Text>
                        {alarmStatus?.motion?.map((ch: any, i: number) => (
                            <View key={`motion_${i}`} style={styles.configDetailRow}>
                                <Text style={styles.configDetailLabel}>{ch.name}</Text>
                                <Text style={[styles.configDetailValue, { color: ch.active ? '#F44336' : '#666' }]}>
                                    {ch.active ? 'Motion Detected' : 'No Motion'}
                                </Text>
                            </View>
                        ))}

                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 10, paddingHorizontal: 15 }}>Video Loss</Text>
                        {alarmStatus?.videoLoss?.map((ch: any, i: number) => (
                            <View key={`vloss_${i}`} style={styles.configDetailRow}>
                                <Text style={styles.configDetailLabel}>{ch.name}</Text>
                                <Text style={[styles.configDetailValue, { color: ch.active ? '#F44336' : '#4CAF50' }]}>
                                    {ch.active ? 'Video Loss Active' : 'Normal'}
                                </Text>
                            </View>
                        ))}

                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 10, paddingHorizontal: 15 }}>Alarm Sensors</Text>
                        {alarmStatus?.alarmIn?.map((sensor: any, i: number) => (
                            <View key={`alarmIn_${i}`} style={styles.configDetailRow}>
                                <Text style={styles.configDetailLabel}>{sensor.name}</Text>
                                <Text style={[styles.configDetailValue, { color: sensor.active ? '#F44336' : '#666' }]}>
                                    {sensor.active ? 'Triggered' : 'Normal'}
                                </Text>
                            </View>
                        ))}

                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 10, paddingHorizontal: 15 }}>System Diagnostics</Text>
                        {alarmStatus?.exceptions?.map((ex: any, i: number) => (
                            <View key={`ex_${i}`} style={styles.configDetailRow}>
                                <Text style={styles.configDetailLabel}>{ex.type}</Text>
                                <Text style={[styles.configDetailValue, { color: ex.active ? '#F44336' : '#4CAF50' }]}>
                                    {ex.active ? 'Exception Active' : 'Normal'}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                );
            case 'recording_status':
                return (
                    <ScrollView style={{ paddingVertical: 10 }}>
                        {recordingStatus?.length === 0 ? (
                            <Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>No Recording Information</Text>
                        ) : (
                            recordingStatus?.map((ch: any, i: number) => (
                                <View key={i} style={{ marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 10 }}>
                                    <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Channel Name</Text><Text style={styles.configDetailValue}>{ch.name}</Text></View>
                                    <View style={styles.configDetailRow}>
                                        <Text style={styles.configDetailLabel}>Recording Status</Text>
                                        <Text style={[styles.configDetailValue, { color: ch.recording ? '#4CAF50' : '#F44336', fontWeight: 'bold' }]}>
                                            {ch.recording ? 'Recording' : 'Stopped'}
                                        </Text>
                                    </View>
                                    <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Recording Mode</Text><Text style={styles.configDetailValue}>{ch.mode}</Text></View>
                                    <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Stream Type</Text><Text style={styles.configDetailValue}>{ch.stream}</Text></View>
                                    <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Frame Rate</Text><Text style={styles.configDetailValue}>{ch.fps} FPS</Text></View>
                                    <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Bitrate</Text><Text style={styles.configDetailValue}>{ch.bitrate}</Text></View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                );
            case 'cloud_upgrade':
                return (
                    <ScrollView style={{ paddingVertical: 10 }}>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Current Version</Text><Text style={styles.configDetailValue}>{basicInfo?.firmwareVersion || '1.4.5.46367B210712'}</Text></View>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>Cloud Server Status</Text><Text style={[styles.configDetailValue, { color: '#4CAF50' }]}>Connected</Text></View>
                        <View style={styles.configDetailRow}><Text style={styles.configDetailLabel}>New Update</Text><Text style={styles.configDetailValue}>Latest Version Installed</Text></View>
                        <TouchableOpacity 
                            style={[styles.modalBtn, styles.saveBtn, { marginTop: 25, alignSelf: 'center', width: '90%' }]}
                            onPress={() => Alert.alert('Check Updates', 'Your device is up to date.')}
                        >
                            <Text style={styles.saveBtnText}>Check for Updates</Text>
                        </TouchableOpacity>
                    </ScrollView>
                );
            case 'change_password':
                return (
                    <ScrollView style={{ paddingVertical: 10, paddingHorizontal: 15 }}>
                        <Text style={styles.label}>Current Password</Text>
                        <TextInput style={styles.input} secureTextEntry placeholder="Enter current password" placeholderTextColor="#999" />
                        
                        <Text style={styles.label}>New Password</Text>
                        <TextInput style={styles.input} secureTextEntry placeholder="Enter new password" placeholderTextColor="#999" />

                        <Text style={styles.label}>Confirm New Password</Text>
                        <TextInput style={styles.input} secureTextEntry placeholder="Confirm new password" placeholderTextColor="#999" />

                        <TouchableOpacity 
                            style={[styles.modalBtn, styles.saveBtn, { marginTop: 25 }]}
                            onPress={() => {
                                Alert.alert('Success', 'Password changed successfully!');
                                setConfigView('main');
                            }}
                        >
                            <Text style={styles.saveBtnText}>Change Password</Text>
                        </TouchableOpacity>
                    </ScrollView>
                );
            case 'main':
            default:
                return (
                    <ScrollView style={{ marginTop: 10 }} showsVerticalScrollIndicator={false}>
                        {[
                            { id: 'basic_info', name: 'Basic Info', icon: 'information-outline' },
                            { id: 'channel_status', name: 'Channel Status', icon: 'camera-outline' },
                            { id: 'alarm_status', name: 'Alarm Status', icon: 'bell-outline' },
                            { id: 'recording_status', name: 'Recording Status', icon: 'record-circle-outline' },
                            { id: 'network_info', name: 'Network Info', icon: 'ip' },
                            { id: 'disk_info', name: 'Disk Information', icon: 'harddisk' },
                            { id: 'cloud_upgrade', name: 'Device Cloud Upgrades', icon: 'cloud-upload-outline' },
                            { id: 'change_password', name: 'Change Device Password', icon: 'lock-outline' },
                        ].map(item => (
                            <TouchableOpacity key={item.id} style={styles.configItem} onPress={() => setConfigView(item.id as any)}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    {/* <Icon name={item.icon} size={22} color="#A83232" style={styles.configIcon} /> */}
                                    <Text style={[styles.configLabel, { marginLeft: 5 }]}>{item.name}</Text>
                                </View>
                                <Icon name="chevron-right" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                );
        }
    };

    const renderConfigHeader = () => (
        <View style={styles.modalHeaderRow}>
            {configView !== 'main' ? (
                <TouchableOpacity onPress={() => setConfigView('main')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="arrow-left" size={24} color="#333" />
                    <Text style={[styles.modalTitle, { marginBottom: 0, marginLeft: 10 }]}>{configView.charAt(0).toUpperCase() + configView.slice(1)}</Text>
                </TouchableOpacity>
            ) : (
                <Text style={styles.modalTitle}>Configuration</Text>
            )}
            <TouchableOpacity onPress={closeConfigModal}>
                <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
        </View>
    );

    const filteredDevices = devices.filter(device => {
        const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) || device.ip.includes(searchQuery);
        const matchesTab = activeTab === 'all' || (activeTab === 'favorites' && device.favorite);
        return matchesSearch && matchesTab;
    });

    const renderDeviceItem = (device: Device) => {
        const realStatus = deviceStatuses[device.id] || 'Offline';
        const isOnline = realStatus === 'Online';

        // Resolve the effective category from deviceCategory (new) or type (legacy)
        const category = (device as any).deviceCategory || device.type || 'NVR';
        const isMultiChannel = ['NVR', 'DVR', 'XVR', 'VMS'].includes(category);

        // Category → icon map
        const categoryIcon: Record<string, string> = {
            NVR: 'server-network',
            DVR: 'record-rec',
            XVR: 'video-box',
            IPC: 'cctv',
            VMS: 'server-network',
        };
        const iconName = device.thumbnail ? undefined : (categoryIcon[category] || 'cctv');

        // Category → badge color
        const badgeColor: Record<string, string> = {
            NVR: '#1565C0',
            DVR: '#6A1B9A',
            XVR: '#2E7D32',
            IPC: '#E65100',
            VMS: '#1565C0',
        };
        const typeBadgeColor = badgeColor[category] || '#555';

        return (
            <View key={device.id} style={styles.deviceCard}>
                <TouchableOpacity
                    style={styles.cardMain}
                    onPress={() => {
                        console.log('Navigating to LiveView for device:', device.id, device.name);
                        navigation.navigate('LiveView', { deviceId: device.id, deviceName: device.name, autoPlay: true });
                    }}
                >
                    {/* Icon / Thumbnail */}
                    <View style={styles.deviceIconContainer}>
                        {device.thumbnail ? (
                            <Image source={{ uri: device.thumbnail }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                        ) : (
                            <Icon name={iconName!} size={32} color="#A83232" />
                        )}
                        <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#4CAF50' : '#9E9E9E' }]} />
                    </View>

                    {/* Info */}
                    <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.deviceName} numberOfLines={1}>{device.name}</Text>
                            <TouchableOpacity onPress={(e) => {
                                e.stopPropagation();
                                toggleFavorite(device.id);
                            }}>
                                <Icon name={device.favorite ? "heart" : "heart-outline"} size={20} color="#A83232" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>IP:</Text>
                            <Text style={styles.infoValue}>{device.ip || 'P2P'}</Text>
                            <View style={styles.verticalDivider} />
                            <Text style={styles.infoLabel}>Port:</Text>
                            <Text style={styles.infoValue}>{device.port}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            {/* Device type badge */}
                            <View style={[styles.typeBadge, { backgroundColor: typeBadgeColor }]}>
                                <Text style={styles.typeBadgeText}>{category}</Text>
                            </View>
                            {isMultiChannel && (
                                <>
                                    <View style={styles.verticalDivider} />
                                    <Text style={styles.infoLabel}>Ch:</Text>
                                    <Text style={styles.infoValue}>{device.channels?.length || device.channelCount || 0}</Text>
                                </>
                            )}
                            <View style={styles.verticalDivider} />
                            <Text style={styles.infoLabel}>Proto:</Text>
                            <Text style={styles.infoValue}>{device.protocol || 'TVT'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Model:</Text>
                            <Text style={[styles.infoValue, { flex: 1 }]} numberOfLines={1}>{device.model || 'N/A'}</Text>
                            <View style={styles.verticalDivider} />
                            <Text style={styles.infoLabel}>Ver:</Text>
                            <Text style={[styles.infoValue, { flex: 1 }]} numberOfLines={1}>{device.version || 'N/A'}</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Actions Divider */}
                <View style={styles.divider} />

                {/* Actions Bar */}
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleEditPress(device)}>
                        <Icon name="pencil-outline" size={20} color="#555" />
                        <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('LiveView', { deviceId: device.id, deviceName: device.name, autoPlay: true })}>
                        <Icon name="play-circle-outline" size={20} color="#A83232" />
                        <Text style={[styles.actionText, { color: '#A83232' }]}>View</Text>
                    </TouchableOpacity>
                    {/* Show Channels for any multi-channel recorder: NVR, DVR, XVR */}
                    {isMultiChannel && (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                                setSelectedDeviceForCamList(device);
                                setCamListVisible(true);
                            }}
                        >
                            <Icon name="video-outline" size={20} color="#A83232" />
                            <Text style={[styles.actionText, { color: '#A83232' }]}>Channels</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleConfigPress(device)}>
                        <Icon name="cog-outline" size={20} color="#555" />
                        <Text style={styles.actionText}>Config</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => confirmDelete(device.id)}>
                        <Icon name="trash-can-outline" size={20} color="#555" />
                        <Text style={styles.actionText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Home', { isAuthenticated: true })}>
                            <Icon name="arrow-left" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Device List</Text>
                        <TouchableOpacity style={styles.addButton} onPress={() => setMenuVisible(true)}>
                            <Icon name="plus" size={24} color="#A83232" />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Icon name="magnify" size={20} color="#999" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search devices..."
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
                            onPress={() => setActiveTab('all')}
                        >
                            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All Devices</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'favorites' && styles.activeTab]}
                            onPress={() => setActiveTab('favorites')}
                        >
                            <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>Favorites</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#A83232" />
                            <Text style={styles.loadingText}>Loading devices...</Text>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                            {filteredDevices.length > 0 ? (
                                filteredDevices.map(device => renderDeviceItem(device))
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Icon name="server-off" size={48} color="#ccc" />
                                    <Text style={styles.emptyText}>No devices found</Text>
                                </View>
                            )}
                        </ScrollView>
                    )}

                    <BottomBar />

                    {/* Add Device Menu & Modals */}
                    <AddDeviceMenu
                        visible={menuVisible}
                        onClose={() => setMenuVisible(false)}
                        onScanQRCode={() => {
                            setMenuVisible(false);
                            navigation.navigate('QRScanner');
                        }}
                        onAddManually={() => setAddManuallyVisible(true)}
                        onOnlineDevice={() => {
                            setMenuVisible(false);
                            navigation.navigate('LanSearch' as never);
                        }}
                    />

                    <AddDeviceManually
                        visible={addManuallyVisible}
                        onClose={() => {
                            setAddManuallyVisible(false);
                            setInitialDevice(undefined);
                        }}
                        initialSN={scannedSN}
                        initialDevice={initialDevice}
                    />



                    {/* Edit Modal */}
                    <Modal
                        visible={editModalVisible}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setEditModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Edit Device</Text>
                                <Text style={styles.label}>Device Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editName}
                                    onChangeText={setEditName}
                                    placeholder="Enter Device Name"
                                />
                                <View style={styles.modalActions}>
                                    <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setEditModalVisible(false)}>
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveEdit}>
                                        <Text style={styles.saveBtnText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {/* Config Modal */}
                    <Modal
                        visible={configModalVisible}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={closeConfigModal}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={[styles.modalContent, { height: '60%' }]}>
                                {renderConfigHeader()}
                                {configView === 'main' && selectedDevice && (
                                    <Text style={styles.configSubtitle}>{selectedDevice.name}</Text>
                                )}
                                <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                                    {renderConfigContent()}
                                </ScrollView>
                                {configView !== 'main' && configView !== 'basic_info' && configView !== 'channel_status' && configView !== 'network_info' && (
                                    <TouchableOpacity
                                        style={[styles.modalBtn, styles.saveBtn, { marginTop: 10 }]}
                                        onPress={() => {
                                            Alert.alert('Success', 'Settings saved successfully!');
                                            setConfigView('main');
                                        }}
                                    >
                                        <Text style={styles.saveBtnText}>Save Changes</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </Modal>


                    {/* Selector Modal */}
                    <Modal
                        visible={selectorVisible}
                        animationType="fade"
                        transparent={true}
                        onRequestClose={() => setSelectorVisible(false)}
                    >
                        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectorVisible(false)}>
                            <View style={[styles.modalContent, { height: 'auto', maxHeight: '50%', backgroundColor: '#FFF', width: '80%', alignSelf: 'center', borderRadius: 15 }]}>
                                <Text style={[styles.modalTitle, { textAlign: 'center' }]}>{selectorTitle}</Text>
                                <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                                    {selectorOptions.map((option, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={{ paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'center' }}
                                            onPress={() => handleSelectOption(option)}
                                        >
                                            <Text style={{ fontSize: 16, color: '#333' }}>{option}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <TouchableOpacity style={{ paddingVertical: 15, alignItems: 'center' }} onPress={() => setSelectorVisible(false)}>
                                    <Text style={{ color: '#A83232', fontSize: 16, fontWeight: 'bold' }}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </Modal>

                    {/* Camera List Popup */}
                    <Modal
                        visible={camListVisible}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setCamListVisible(false)}
                    >
                        <View style={styles.centerPopupOverlay}>
                            <View style={styles.camListPopup}>
                                <View style={styles.popupHeader}>
                                    <Text style={styles.popupTitle}>{selectedDeviceForCamList?.name}</Text>
                                    <TouchableOpacity onPress={() => setCamListVisible(false)}>
                                        <Icon name="close" size={24} color="#8E7D7D" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.popupSub}>Select a channel to view</Text>

                                <ScrollView style={styles.popupScroll} showsVerticalScrollIndicator={false}>
                                    {selectedDeviceForCamList?.channels?.map((channel) => (
                                        <TouchableOpacity
                                            key={`${selectedDeviceForCamList.id}_ch${channel.id}`}
                                            style={styles.popupChannelItem}
                                            onPress={() => {
                                                setCamListVisible(false);
                                                navigation.navigate('LiveView', {
                                                    deviceId: selectedDeviceForCamList.id,
                                                    deviceName: selectedDeviceForCamList.name,
                                                    channelId: channel.id,
                                                    autoPlay: true
                                                });
                                            }}
                                        >
                                            <View style={styles.popupChannelIcon}>
                                                <Icon name="camera" size={16} color="#A83232" />
                                            </View>
                                            <Text style={styles.popupChannelText}>{channel.name || `Channel ${channel.id + 1}`}</Text>
                                            <Icon name="chevron-right" size={18} color="#CCC" />
                                        </TouchableOpacity>
                                    ))}
                                    {(!selectedDeviceForCamList?.channels || selectedDeviceForCamList.channels.length === 0) && (
                                        <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>No channels found. Try clicking 'View' or 'Config' to refresh.</Text>
                                    )}
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>

                </SafeAreaView>
            </GradientBackground>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        marginBottom: 15,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    addButton: {
        padding: 5,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 44,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#333',
        fontSize: 14,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    tab: {
        marginRight: 20,
        paddingBottom: 5,
    },
    activeTab: {
        borderBottomWidth: 1.5,
        borderBottomColor: '#A83232',
    },
    tabText: {
        fontSize: 16,
        color: '#999',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#A83232',
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    deviceCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        marginBottom: 15,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardMain: {
        flexDirection: 'row',
        padding: 15,
    },
    deviceIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#FFF5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        position: 'relative',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    cardContent: {
        flex: 1,
        justifyContent: 'center',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    deviceName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    infoLabel: {
        fontSize: 12,
        color: '#888',
        marginRight: 4,
    },
    infoValue: {
        fontSize: 12,
        color: '#555',
        fontWeight: '500',
    },
    typeBadge: {
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: 6,
    },
    typeBadgeText: {
        fontSize: 10,
        color: '#FFF',
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    verticalDivider: {
        width: 1,
        height: 12,
        backgroundColor: '#ccc',
        marginHorizontal: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        backgroundColor: '#FAFAFA',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 12,
        marginLeft: 6,
        color: '#555',
        fontWeight: '500',
    },
    emptyContainer: {
        paddingTop: 50,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 10,
        color: '#999',
        fontSize: 16,
    },
    /* Modal Styles */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        elevation: 5,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    configSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
    },
    label: {
        fontSize: 14,
        color: '#555',
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
        marginBottom: 20,
    },
    mockDropdown: {
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: '#f0f0f0',
        marginRight: 10,
    },
    saveBtn: {
        backgroundColor: '#A83232',
        marginLeft: 10,
    },
    cancelBtnText: {
        color: '#666',
        fontWeight: 'bold',
    },
    saveBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    /* Config Items */
    configItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    configIcon: {
        marginRight: 15,
        width: 30,
        textAlign: 'center',
    },
    configLabel: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    // Popup Styles
    centerPopupOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    camListPopup: {
        width: '100%',
        maxHeight: '70%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    popupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    popupTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    popupSub: {
        fontSize: 13,
        color: '#8E7D7D',
        marginBottom: 20,
    },
    popupScroll: {
        width: '100%',
    },
    popupChannelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#FDF2F2',
    },
    popupChannelIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FFF0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    popupChannelText: {
        flex: 1,
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    configDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'center',
    },
    configDetailLabel: {
        fontSize: 14,
        color: '#64748B',
    },
    configDetailValue: {
        fontSize: 14,
        color: '#0F172A',
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 15,
        color: '#666',
        fontWeight: '500',
    },
});

export default DeviceList;
