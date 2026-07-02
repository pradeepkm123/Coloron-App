import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    FlatList,
    ActivityIndicator,
    Alert,
    PermissionsAndroid,
    Platform,
    Modal,
    TextInput,
    ScrollView,
    KeyboardAvoidingView
} from 'react-native';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types/navigation';
import GradientBackground from '../Component/GradientBackground';
import { deviceStorage, Device } from '../utils/deviceStorage';
import { secureStore } from '../utils/secureStore';
import { authStorage } from '../utils/authStorage';
import * as NvrSdkBridge from '../native/NvrSdk';
import { discoverCameras } from '../services/DiscoveryService';
import NetInfo from '@react-native-community/netinfo';

const { TVTSdkModule, NvrSdk } = NativeModules;
const eventEmitter = new NativeEventEmitter(NvrSdk || TVTSdkModule);

interface ScannedDeviceInfo {
    ip: string;
    port: number;
    serial: string;
    model: string;
    manufacturer: string;
    protocol: string;
    sdkPort?: number;
    webPort?: number;
    type?: string;
    deviceName?: string;
    channelCount?: number;
    status?: string;
}

const LanSearch: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [scanning, setScanning] = useState(false);
    const [devices, setDevices] = useState<ScannedDeviceInfo[]>([]);
    const isScanningRef = useRef(false);

    // Normalize device fields from any SDK version
    const normalizeDevice = (d: any): ScannedDeviceInfo => {
        // Normalizing raw device

        const ip = d.ip || d.ipAddress || d.sIP || d.deviceIp || d.szIP || '';
        const port = d.port || d.webPort || d.httpPort || d.netPort || d.nPort || d.devicePort || 80;
        const serial = (d.serial || d.serialNumber || d.sSerial || d.szSerial || d.macAddress || '').toString().trim();
        
        let rawModel = d.model || d.deviceName || d.productType || d.sModel || d.devType || d.deviceType;
        let modelStr = 'Network Device';

        if (rawModel !== undefined && rawModel !== null && rawModel !== '') {
            const rawModelStr = String(rawModel).trim();
            if (rawModelStr === '1') {
                modelStr = 'IP Camera (IPC)';
            } else if (rawModelStr === '2') {
                modelStr = 'Network Video Recorder (NVR)';
            } else if (rawModelStr === '3') {
                modelStr = 'Digital Video Recorder (DVR)';
            } else if (!isNaN(Number(rawModelStr))) {
                modelStr = `TVT Device (Type ${rawModelStr})`;
            } else {
                modelStr = rawModelStr;
            }
        }

        const sdkPort = d.sdkPort || d.netPort || d.nPort || 6036;
        const webPort = d.webPort || d.httpPort || d.port || 80;
        const type = d.type || d.deviceTypeStr || (String(rawModel).includes('IPC') ? 'IPC' : 'NVR');

        // Extract metadata
        const deviceName = d.deviceName || d.name || d.devName || '';
        
        // Deduce channel count from model string or other fields
        let channelCount = d.channelCount || d.videoInputNum || d.nChannelCount || 1;
        if (channelCount <= 1 && type !== 'IPC') {
            const match = modelStr.match(/(?:-| |^)(04|08|16|32|64|128)(?=[A-Za-z]|$)/);
            if (match) {
                channelCount = parseInt(match[1], 10);
            } else {
                channelCount = type === 'NVR' ? 8 : 1;
            }
        }
        
        const status = d.status || (d.deviceActivated === 1 ? 'Inactive' : 'Online');

        return {
            ip,
            port: Number(port),
            serial: serial.toString().trim(),
            model: modelStr,
            manufacturer: d.manufacturer || 'TVT',
            protocol: d.protocol || 'TVT',
            sdkPort: Number(sdkPort),
            webPort: Number(webPort),
            type: type,
            deviceName: deviceName,
            channelCount: channelCount,
            status: status
        };
    };

    useEffect(() => {
        if (!isScanningRef.current) {
            handleScan();
        }

        const onFound = (rawDevice: any) => {
            const device = normalizeDevice(rawDevice);
            if (!device.ip) return;

            setDevices((prev) => {
                const exists = prev.find(
                    d => (d.serial && device.serial && d.serial === device.serial) || d.ip === device.ip
                );
                if (exists) return prev;
                console.log('[LanSearch] Adding discovered device:', device.ip, device.serial);
                return [...prev, device];
            });
        };


        const sub2 = eventEmitter.addListener('LAN_DEVICE_FOUND', onFound);

        return () => {
            console.log('[LanSearch] Cleaning up scan...');
            NvrSdkBridge.stopLanSearch();

            sub2.remove();
        };
    }, []);

    const handleScan = async () => {
        if (isScanningRef.current) return;

        try {
            const netInfo = await NetInfo.fetch();
            if (netInfo.isConnected === false) {
                Alert.alert('No Connection', 'Please connect to your local network.');
                return;
            }
        } catch (e) {}

        if (Platform.OS === 'android') {
            try {
                const permissions = [
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
                ];
                await PermissionsAndroid.requestMultiple(permissions);
            } catch (err) {
                console.warn(err);
            }
        }

        isScanningRef.current = true;
        setScanning(true);
        setDevices([]);

        try {
            const cachedList = await NvrSdkBridge.getDiscoveredDevices();
            if (Array.isArray(cachedList) && cachedList.length > 0) {
                setDevices(cachedList.map(normalizeDevice));
            }

            await NvrSdkBridge.startLanSearch({ deviceType: 255 });

            discoverCameras(3000, (onvifDev) => {
                const scanned: ScannedDeviceInfo = {
                    ip: onvifDev.ip,
                    port: onvifDev.port,
                    serial: onvifDev.serial,
                    model: onvifDev.model,
                    manufacturer: onvifDev.manufacturer,
                    protocol: 'ONVIF',
                    sdkPort: onvifDev.port,
                    webPort: onvifDev.port,
                    type: onvifDev.model.includes('Camera') ? 'IPC' : 'NVR'
                };
                setDevices((prev) => {
                    const exists = prev.find(d => d.ip === scanned.ip);
                    return exists ? prev : [...prev, scanned];
                });
            }).catch(e => console.warn(e));

            await new Promise<void>(resolve => setTimeout(resolve, 3000));
        } catch (error) {
            console.error('[LanSearch] Discovery error:', error);
        } finally {
            setScanning(false);
            isScanningRef.current = false;
        }
    };

    const handleSelectDevice = (device: ScannedDeviceInfo) => {
        try {
            NvrSdkBridge.stopLanSearch();
        } catch (e) {}

        const scannedDevice = {
            ip: device.ip,
            port: device.protocol === 'ONVIF' ? (device.webPort || 80) : (device.sdkPort || 6036),
            protocol: device.protocol || 'TVT',
            serial: device.serial,
            model: device.model,
            deviceName: device.deviceName || device.model || 'TVT Device',
        };

        const routes = navigation.getState()?.routes;
        const prevRoute = routes && routes.length > 1 ? routes[routes.length - 2] : null;
        const previousScreen = prevRoute ? prevRoute.name : 'Home';

        navigation.navigate(previousScreen as any, { scannedDevice });
    };

    const renderItem = ({ item }: { item: ScannedDeviceInfo }) => {
        const isIPC = item.type === 'IPC' || item.model.includes('IPC') || item.model.includes('Camera') || item.model.includes('VD201');
        const displayPort = item.protocol === 'ONVIF' ? (item.webPort || 80) : (item.sdkPort || 6036);
        const displayName = item.deviceName || item.model || 'Network Device';
        const isInactive = item.status === 'Inactive';

        return (
            <TouchableOpacity
                style={styles.deviceCard}
                onPress={() => handleSelectDevice(item)}
                activeOpacity={0.7}
            >
                <View style={styles.cardContent}>
                    <View style={styles.iconContainer}>
                        <Icon name={isIPC ? "video-outline" : "server-network"} size={28} color="#822020" />
                    </View>
                    <View style={styles.cardInfo}>
                        <View style={styles.deviceTitleRow}>
                            <Text style={styles.deviceName} numberOfLines={1}>{displayName}</Text>
                            <View style={styles.badgeContainer}>
                                <View style={[styles.protocolBadge, item.protocol === 'ONVIF' && styles.onvifBadge]}>
                                    <Text style={[styles.protocolText, item.protocol === 'ONVIF' && { color: '#1971C2' }]}>{item.protocol}</Text>
                                </View>
                                <View style={[styles.statusBadge, isInactive ? styles.inactiveBadge : styles.onlineBadge]}>
                                    <View style={[styles.statusDot, isInactive ? styles.inactiveDot : styles.onlineDot]} />
                                    <Text style={[styles.statusText, isInactive ? { color: '#868E96' } : { color: '#0CA678' }]}>{item.status || 'Online'}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.metaGrid}>
                            <View style={styles.metaRow}>
                                <View style={styles.metaColumn}>
                                    <Icon name="ip-network" size={14} color="#666" style={styles.metaIcon} />
                                    <Text style={styles.metaLabel}>IP: </Text>
                                    <Text style={styles.metaValue} numberOfLines={1}>{item.ip}</Text>
                                </View>
                                <View style={styles.metaColumn}>
                                    <Icon name="link-variant" size={14} color="#666" style={styles.metaIcon} />
                                    <Text style={styles.metaLabel}>Port: </Text>
                                    <Text style={styles.metaValue}>{displayPort}</Text>
                                </View>
                            </View>
                            <View style={styles.metaRow}>
                                <View style={styles.metaColumn}>
                                    <Icon name="barcode" size={14} color="#666" style={styles.metaIcon} />
                                    <Text style={styles.metaLabel}>SN/MAC: </Text>
                                    <Text style={styles.metaValue} numberOfLines={1}>{item.serial || 'N/A'}</Text>
                                </View>
                                <View style={styles.metaColumn}>
                                    <Icon name="format-list-numbered" size={14} color="#666" style={styles.metaIcon} />
                                    <Text style={styles.metaLabel}>Channels: </Text>
                                    <Text style={styles.metaValue}>{item.channelCount ? `${item.channelCount} CH` : '1 CH'}</Text>
                                </View>
                            </View>
                            <View style={[styles.metaRow, { marginBottom: 0, marginTop: 2 }]}>
                                <View style={[styles.metaColumn, { flex: 2, marginRight: 0 }]}>
                                    <Icon name="cube-outline" size={14} color="#666" style={styles.metaIcon} />
                                    <Text style={styles.metaLabel}>Model: </Text>
                                    <Text style={styles.metaValue} numberOfLines={1}>{item.model}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                    <Icon name="chevron-right" size={24} color="#CED4DA" style={{ marginLeft: 8 }} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground style={{ flex: 1 }}>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="chevron-left" size={32} color="#852d2dff" />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>LAN Search</Text>
                            <Text style={styles.headerSubtitle}>{scanning ? 'Searching...' : `${devices.length} Devices Found`}</Text>
                        </View>
                        <TouchableOpacity onPress={handleScan} disabled={scanning} style={styles.refreshButton}>
                            {scanning ? <ActivityIndicator size="small" color="#852d2dff" /> : <Icon name="refresh" size={26} color="#852d2dff" />}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.contentCard}>
                        <FlatList
                            data={devices}
                            renderItem={renderItem}
                            keyExtractor={(item) => `${item.ip}:${item.port}`}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={
                                <View style={styles.centerContainer}>
                                    {scanning ? (
                                        <>
                                            <ActivityIndicator size="large" color="#822020" style={{ marginBottom: 16 }} />
                                            <Text style={styles.loadingText}>Scanning local network...</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="magnify-close" size={80} color="#DEE2E6" />
                                            <Text style={styles.emptyTitle}>No Devices Found</Text>
                                            <Text style={styles.emptySubtitle}>Ensure devices are on the same Wi-Fi.</Text>
                                        </>
                                    )}
                                </View>
                            }
                        />
                    </View>
                </SafeAreaView>
            </GradientBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    header: { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
    headerTitleContainer: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#852d2dff' },
    headerSubtitle: { fontSize: 12, color: '#868E96' },
    backButton: { padding: 5 },
    refreshButton: { padding: 5, width: 40, alignItems: 'center' },
    contentCard: { flex: 1, backgroundColor: '#F8F9FA', borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: 10, overflow: 'hidden' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, marginTop: 60 },
    loadingText: { marginTop: 15, fontSize: 16, color: '#495057' },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#495057', marginTop: 20 },
    emptySubtitle: { fontSize: 14, color: '#ADB5BD', textAlign: 'center', marginTop: 8 },
    listContent: { padding: 20, paddingBottom: 40 },
    deviceCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
    cardContent: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#FFF5F5', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    cardInfo: { flex: 1 },
    deviceTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    deviceName: { fontSize: 15, fontWeight: 'bold', color: '#212529', flex: 1, marginRight: 8 },
    badgeContainer: { flexDirection: 'row', alignItems: 'center' },
    protocolBadge: { backgroundColor: '#FFF5F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#FFE3E3' },
    onvifBadge: { backgroundColor: '#E7F5FF', borderColor: '#D0EBFF' },
    protocolText: { fontSize: 10, fontWeight: 'bold', color: '#A83232' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6FCF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 },
    inactiveBadge: { backgroundColor: '#F1F3F5' },
    onlineBadge: { backgroundColor: '#E6FCF5' },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
    onlineDot: { backgroundColor: '#0CA678' },
    inactiveDot: { backgroundColor: '#868E96' },
    statusText: { fontSize: 10, fontWeight: 'bold', color: '#0CA678' },
    metaGrid: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#F1F3F5', paddingTop: 8 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    metaColumn: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
    metaIcon: { marginRight: 4 },
    metaLabel: { fontSize: 11, color: '#868E96', fontWeight: '500' },
    metaValue: { fontSize: 11, color: '#495057', fontWeight: '600', flex: 1 }
});

export default LanSearch;
