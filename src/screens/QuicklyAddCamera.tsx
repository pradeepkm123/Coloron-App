import React, { useState, useEffect } from 'react';
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
    Platform
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deviceStorage, Device } from '../utils/deviceStorage';
import { authStorage } from '../utils/authStorage';
import * as NvrSdk from '../native/NvrSdk';
import { discoverCameras, DiscoveredDevice } from '../services/DiscoveryService';
import GradientBackground from '../Component/GradientBackground';

type QuicklyAddCameraRouteProp = RouteProp<RootStackParamList, 'QuicklyAddCamera'>;

interface DiscoveredDeviceInfo {
    ip: string;
    port: number;
    subnet: string;
    protocol: string;   
    model: string;
    version: string;
    serial: string;
    manufacturer: string;
    selected: boolean;
    audioSupport?: boolean;
    channelCount?: number;
}

const QuicklyAddCamera: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<QuicklyAddCameraRouteProp>();
    const { deviceId, deviceName } = route.params;

    const [scanning, setScanning] = useState(false);
    const [devices, setDevices] = useState<DiscoveredDeviceInfo[]>([]);
    const [selectedCount, setSelectedCount] = useState(0);

    useEffect(() => {
        handleScan();
    }, []);

    const handleScan = async () => {
        if (scanning) return;

        // Request location permission on Android (Required for LAN discovery)
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: 'Location Permission',
                        message: 'App needs access to your location to scan for cameras on the local network.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    Alert.alert('Permission Denied', 'Location permission is required to scan the local network.');
                    return;
                }
            } catch (err) {
                console.warn(err);
                return;
            }
        }

        setScanning(true);
        setDevices([]);
        setSelectedCount(0);

        try {
            // Run native SDK search and ONVIF UDP discovery in parallel
            const [nativeResults, onvifResults] = await Promise.all([
                NvrSdk.searchDevices(0, 3000).catch(() => []),
                discoverCameras(4000).catch(() => [])
            ]);

            const deviceMap = new Map<string, DiscoveredDeviceInfo>();

            // Process ONVIF UDP results
            onvifResults.forEach((d: DiscoveredDevice) => {
                deviceMap.set(d.ip, {
                    ip: d.ip,
                    port: d.port,
                    subnet: '255.255.255.0',
                    protocol: d.type,
                    model: d.model,
                    manufacturer: d.manufacturer,
                    version: '',
                    serial: d.serial,
                    selected: false
                });
            });

            // Process Native SDK results (overwrite if overlaps to prefer SDK info)
            nativeResults.forEach((d: any) => {
                const serial = d.macAddress ? d.macAddress.replace(/:/g, '').toLowerCase() : (d.serialNumber || '');
                deviceMap.set(d.ipAddress, {
                    ip: d.ipAddress,
                    port: d.netPort || 80,
                    subnet: '255.255.255.0',
                    protocol: d.protocol || 'NVT',
                    model: d.productType || 'IP Camera',
                    manufacturer: d.manufacturer || 'General',
                    version: d.version || '',
                    serial: serial,
                    selected: false
                });
            });

            setDevices(Array.from(deviceMap.values()));
        } catch (error) {
            console.error('Scan failed', error);
            Alert.alert('Scan Failed', 'An error occurred while searching for devices.');
        } finally {
            setScanning(false);
        }
    };

    const toggleSelection = (index: number) => {
        const newDevices = [...devices];
        newDevices[index].selected = !newDevices[index].selected;
        setDevices(newDevices);
        setSelectedCount(newDevices.filter(d => d.selected).length);
    };

    const handleAdd = async () => {
        const selected = devices.filter(d => d.selected);
        if (selected.length === 0) return;

        try {
            const identifier = await authStorage.getUserIdentifier();

            for (const d of selected) {
                const newDevice: Device = {
                    id: `dev_${d.serial || Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    name: d.model || 'IP Camera',
                    type: 'IPC',
                    ip: d.ip,
                    port: d.port.toString(),
                    status: 'Online',
                    favorite: false,
                    sn: d.serial,
                    deviceId: d.serial,
                    userEmail: identifier,
                    protocol: d.protocol as any || 'TVT',
                    model: d.model,
                    version: d.version || '1.0.0',
                    connectMode: 'IP',

                    // Detailed hardware (best effort from scan info)
                    audioSupport: d.audioSupport !== undefined ? d.audioSupport : false,
                    channelCount: d.channelCount || 1,
                    rawData: d // Store discovering info
                };

                console.log(`[QuickAdd] Saving device ${d.ip} with info:`, JSON.stringify(newDevice, null, 2));
                await deviceStorage.addDevice(newDevice);
            }

            Alert.alert('Success', `Successfully added ${selected.length} cameras.`, [
                { text: 'OK', onPress: () => navigation.navigate('Home' as any) }
            ]);
        } catch (error) {
            console.error('Failed to add cameras:', error);
            Alert.alert('Error', 'Failed to save some devices.');
        }
    };

    const renderItem = ({ item, index }: { item: DiscoveredDeviceInfo, index: number }) => (
        <TouchableOpacity
            style={[styles.deviceCard, item.selected && styles.selectedDeviceCard]}
            onPress={() => toggleSelection(index)}
            activeOpacity={0.7}
        >
            <View style={styles.cardContent}>
                <View style={[styles.iconContainer, item.selected && styles.selectedIconContainer]}>
                    <Icon
                        name="video-outline"
                        size={28}
                        color={item.selected ? '#FFF' : '#822020'}
                    />
                </View>
                <View style={styles.cardInfo}>
                    <View style={styles.deviceTitleRow}>
                        <Text style={styles.deviceName}>{item.ip}</Text>
                        <View style={[styles.protocolBadge, item.protocol === 'ONVIF' && styles.onvifBadge]}>
                            <Text style={styles.protocolText}>{item.protocol}</Text>
                        </View>
                    </View>
                    <Text style={styles.deviceModel}>{item.model}</Text>
                    <Text style={styles.deviceDetails}>Port: {item.port}  •  SN: {item.serial}</Text>
                </View>
                <View style={styles.selectionIndicator}>
                    <Icon
                        name={item.selected ? "check-circle" : "circle-outline"}
                        size={26}
                        color={item.selected ? '#822020' : '#CED4DA'}
                    />
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground style={{ flex: 1 }}>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="chevron-left" size={32} color="#852d2dff" />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>Quickly Add Camera</Text>
                            <Text style={styles.headerSubtitle}>{scanning ? 'Scanning Network...' : `${devices.length} Devices Found`}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.saveHeaderButton}
                            disabled={selectedCount === 0 || scanning}
                            onPress={handleAdd}
                        >
                            <Icon name="plus-circle" size={32} color={selectedCount > 0 && !scanning ? "#852d2dff" : "#ccc"} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.cardContainer}>
                        <View style={styles.content}>
                            {scanning ? (
                                <View style={styles.centerContainer}>
                                    <View style={styles.scannerCircle}>
                                        <ActivityIndicator size="large" color="#822020" />
                                    </View>
                                    <Text style={styles.loadingText}>Searching LAN for cameras...</Text>
                                    <Text style={styles.scanningTip}>Ensure your cameras are on the same Wi-Fi network.</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={devices}
                                    renderItem={renderItem}
                                    keyExtractor={(item) => item.ip}
                                    contentContainerStyle={styles.listContent}
                                    showsVerticalScrollIndicator={false}
                                    ListEmptyComponent={
                                        !scanning && (
                                            <View style={styles.centerContainer}>
                                                <View style={styles.emptyIconContainer}>
                                                    <Icon name="camera-off-outline" size={80} color="#DEE2E6" />
                                                </View>
                                                <Text style={styles.emptyTitle}>No Cameras Found</Text>
                                                <Text style={styles.emptySubtitle}>We couldn't find any devices on your local network.</Text>
                                                <TouchableOpacity style={styles.retryButton} onPress={handleScan}>
                                                    <Icon name="refresh" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                                    <Text style={styles.retryText}>Search Again</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )
                                    }
                                />
                            )}
                        </View>

                        {/* Footer (Stats Section) */}
                        {!scanning && devices.length > 0 && (
                            <View style={styles.footer}>
                                <View style={styles.footerStat}>
                                    <Text style={styles.footerValue}>{selectedCount}</Text>
                                    <Text style={styles.footerLabel}>Selected</Text>
                                </View>
                                <View style={styles.footerDivider} />
                                <View style={styles.footerStat}>
                                    <Text style={styles.footerValue}>{devices.length}</Text>
                                    <Text style={styles.footerLabel}>Total Found</Text>
                                </View>
                            </View>
                        )}
                    </View>
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
        height: 70,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'transparent',
        paddingHorizontal: 15,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#852d2dff',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#868E96',
        marginTop: 2,
    },
    backButton: {
        padding: 5,
    },
    saveHeaderButton: {
        padding: 5,
    },
    content: {
        flex: 1,
    },
    cardContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        marginTop: 10,
        overflow: 'hidden',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginTop: -50,
    },
    scannerCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        marginBottom: 20,
    },
    loadingText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#343A40',
        marginBottom: 8,
    },
    scanningTip: {
        fontSize: 14,
        color: '#868E96',
        textAlign: 'center',
    },
    emptyIconContainer: {
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#495057',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#ADB5BD',
        textAlign: 'center',
        marginBottom: 30,
    },
    retryButton: {
        flexDirection: 'row',
        backgroundColor: '#822020',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
        elevation: 3,
    },
    retryText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 15,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 25,
        paddingBottom: 40,
    },
    deviceCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F3F5',
    },
    selectedDeviceCard: {
        borderColor: '#82202040',
        backgroundColor: '#FFF9F9',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 15,
        backgroundColor: '#FFF5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    selectedIconContainer: {
        backgroundColor: '#822020',
    },
    cardInfo: {
        flex: 1,
    },
    deviceTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    deviceName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#212529',
        marginRight: 8,
    },
    protocolBadge: {
        backgroundColor: '#E9ECEF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    onvifBadge: {
        backgroundColor: '#E7F5FF',
    },
    protocolText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#495057',
    },
    deviceModel: {
        fontSize: 14,
        color: '#495057',
        marginBottom: 4,
    },
    deviceDetails: {
        fontSize: 12,
        color: '#ADB5BD',
    },
    selectionIndicator: {
        marginLeft: 12,
    },
    footer: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        paddingVertical: 20,
        paddingHorizontal: 30,
        borderTopWidth: 1,
        borderTopColor: '#F1F3F5',
        alignItems: 'center',
    },
    footerStat: {
        flex: 1,
        alignItems: 'center',
    },
    footerDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#E9ECEF',
    },
    footerLabel: {
        fontSize: 12,
        color: '#ADB5BD',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 4,
    },
    footerValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#212529',
    },
});

export default QuicklyAddCamera;

