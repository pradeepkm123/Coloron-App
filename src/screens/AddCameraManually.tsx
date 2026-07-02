import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as NvrSdk from '../native/NvrSdk';
import { deviceStorage, Device } from '../utils/deviceStorage';
import { secureStore } from '../utils/secureStore';
import { authStorage } from '../utils/authStorage';

type AddCameraManuallyRouteProp = RouteProp<RootStackParamList, 'AddCameraManually'>;

const AddCameraManually: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<AddCameraManuallyRouteProp>();

    const [deviceType, setDeviceType] = useState<'IP/Domain Name' | 'NVR' | 'Serial Number'>('IP/Domain Name');
    const [protocol, setProtocol] = useState<'TVT Private' | 'ONVIF'>('TVT Private');
    const [deviceName, setDeviceName] = useState('');
    const [ip, setIp] = useState('');
    const [port, setPort] = useState('6036');
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const params = route.params;
        if (params) {
            if (params.scannedDevice) {
                const dev = params.scannedDevice;
                setIp(dev.ip || '');
                setPort(dev.port ? dev.port.toString() : (dev.protocol === 'ONVIF' ? '8899' : '6036'));
                setProtocol(dev.protocol === 'ONVIF' ? 'ONVIF' : 'TVT Private');
                setDeviceName(dev.deviceName || dev.model || 'TVT Device');
                if (dev.serial) {
                    if (dev.ip) {
                        setDeviceType('IP/Domain Name');
                    } else {
                        setDeviceType('Serial Number');
                    }
                }
            } else if (params.scannedSN) {
                setIp(params.scannedSN);
                setDeviceType('Serial Number');
            }
        }
    }, [route.params]);

    const handleDeviceTypeChange = (type: 'IP/Domain Name' | 'NVR' | 'Serial Number') => {
        setDeviceType(type);
        if (type === 'Serial Number' || type === 'NVR') {
            setPort('7968'); // P2P 2.0 default port
            setIp(''); // Clear IP as they need to enter SN
        } else {
            setPort('6036'); // TVT SDK Service port
        }
    };

    const handleProtocolChange = (prot: 'TVT Private' | 'ONVIF') => {
        setProtocol(prot);
        if (prot === 'ONVIF') {
            setPort('8899'); // Common ONVIF port for TVT
        } else {
            setPort(deviceType === 'IP/Domain Name' ? '6036' : '7968');
        }
    };

    const handleSave = async () => {
        if (!ip) {
            Alert.alert('Validation Error', `Please enter the ${deviceType === 'IP/Domain Name' ? 'IP Address' : 'Serial Number'}.`);
            return;
        }

        setIsLoading(true);
        try {
            // SDK Initialization is required to avoid Error 1
            try {
                await NvrSdk.init();
            } catch (initErr) {
                console.warn('[Add] SDK init warning:', initErr);
                // Continue, as some SDKs safely ignore multiple inits
            }

            let loginType = 0;
            let finalHost = ip;
            let finalSn = '';

            if (deviceType === 'IP/Domain Name') {
                loginType = protocol === 'ONVIF' ? 3 : 0;
            } else if (deviceType === 'NVR' || deviceType === 'Serial Number') {
                loginType = 2; // P2P 2.0
                finalSn = ip;
                finalHost = 'c2020.autonat.com';
            }

            console.log(`[Add] Verifying ${finalHost}:${port} (Type: ${loginType}, SN: ${finalSn}) with SDK...`);
            const loginRes = await NvrSdk.login({
                host: finalHost,
                port: parseInt(port),
                username,
                password,
                loginType: loginType,
                sn: finalSn,
            });

            if (loginRes && loginRes.userId >= 0) {
                const isNvr = loginRes.channelCount > 1 || deviceType === 'NVR';
                const devType = isNvr ? 'NVR' : 'IPC';

                const realSN = loginRes.deviceInfo?.serialNumber || finalSn;
                const hostClean = deviceType !== 'IP/Domain Name' ? 'p2p' : ip.trim().replace(/\./g, '_');
                const portStr = port || '6036';
                const deviceId = realSN ? `TVT_${realSN}` : `TVT_${hostClean}_${portStr}`;

                let channels: any[] = [];
                try {
                    const allChannels = await NvrSdk.getChannels(loginRes.userId);
                    if (allChannels && allChannels.length > 0) {
                        channels = allChannels.map(ch => {
                            const hasPtz = ch.ptz ?? (ch.name?.toLowerCase().includes('ptz') || ch.name?.toLowerCase().includes('dome') || ch.name?.toLowerCase().includes('speed') || false);
                            return {
                                id: ch.id,
                                name: ch.name?.trim() || `CH ${ch.id + 1}`,
                                online: ch.online ?? true,
                                channelNo: ch.id + 1,
                                streamType: 1, // Default sub stream
                                ptz: hasPtz,
                                ptzSupport: hasPtz,
                                audioSupport: true,
                            };
                        });
                    }
                } catch (chErr) {
                    console.log('Channel fetch failed, default to empty/placeholders');
                }

                if (channels.length === 0) {
                    channels = Array.from({ length: loginRes.channelCount || 1 }).map((_, i) => ({
                        id: i,
                        name: `CH ${i + 1}`,
                        online: true,
                        channelNo: i + 1,
                        streamType: 1,
                        ptz: false,
                        ptzSupport: false,
                        audioSupport: true,
                    }));
                }

                // Mark connectMode as IP, DOMAIN, LAN, or NAT
                let mode: 'IP' | 'Domain' | 'LAN' | 'NAT' = 'IP';
                if (deviceType !== 'IP/Domain Name') {
                    mode = 'NAT';
                } else {
                    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
                    const isIp = ipRegex.test(ip.trim());
                    if (!isIp) {
                        mode = 'Domain';
                    } else {
                        const isLanIp = /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(ip.trim());
                        mode = isLanIp ? 'LAN' : 'IP';
                    }
                }

                const newDevice: Device = {
                    id: deviceId,
                    name: deviceName || loginRes.deviceInfo?.deviceName || 'New Device',
                    ip: deviceType === 'IP/Domain Name' ? ip : '',
                    port: port,
                    status: 'Online',
                    favorite: false,
                    type: devType,
                    protocol: protocol === 'ONVIF' ? 'ONVIF' : 'TVT',
                    channelCount: loginRes.channelCount,
                    isNVR: isNvr,
                    deviceId: realSN,
                    sn: realSN,
                    username,
                    nvrUsername: username,
                    password: '*****',
                    nvrPassword: '*****',
                    connectMode: mode,
                    channels: channels,
                    model: loginRes.deviceInfo?.model || 'TVT Device',
                    version: loginRes.deviceInfo?.version,
                    audioSupport: (loginRes.deviceInfo?.audioInputNum && loginRes.deviceInfo.audioInputNum > 0) || !!loginRes.deviceInfo?.audioSupport,
                };

                // Save password securely
                await secureStore.savePassword(deviceId, password);

                await deviceStorage.addDevice(newDevice);

                await NvrSdk.logout(loginRes.userId);
                Alert.alert('Success', 'Device verified and added successfully', [
                    { text: 'OK', onPress: () => navigation.replace('LiveView', { deviceId, autoPlay: true }) }
                ]);
            } else {
                Alert.alert('Verification Failed', 'Could not login to device. Please check credentials and network.');
            }
        } catch (error: any) {
            console.error('[Add] SDK Verification Error:', error);
            Alert.alert('Connection Error', error?.message || 'Failed to connect to device');
        } finally {
            setIsLoading(false);
        }
    };

    const renderSegmentedControl = (options: string[], selected: string, onSelect: (val: any) => void) => (
        <View style={styles.segmentedControl}>
            {options.map((option, index) => {
                const isSelected = selected === option;
                return (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.segmentButton,
                            isSelected && styles.segmentButtonSelected,
                            index === 0 && { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
                            index === options.length - 1 && { borderTopRightRadius: 8, borderBottomRightRadius: 8 },
                            index !== options.length - 1 && !isSelected && selected !== options[index + 1] && { borderRightWidth: 1, borderRightColor: '#E9ECEF' }
                        ]}
                        onPress={() => onSelect(option)}
                    >
                        <Text style={[styles.segmentText, isSelected && styles.segmentTextSelected]}>
                            {option}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" translucent={false} />
            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                
                {/* Header matching SuperLivePlus style (Title on left, no back button if root, but we'll add one just in case) */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="chevron-left" size={32} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Add Device</Text>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    
                    {/* Device Name */}
                    <View style={styles.inputRow}>
                        <Icon name="cellphone" size={24} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Device Name*"
                            placeholderTextColor="#999"
                            value={deviceName}
                            onChangeText={setDeviceName}
                        />
                    </View>
                    <View style={styles.divider} />

                    {/* Device Type */}
                    <Text style={styles.sectionLabel}>Device Type</Text>
                    {renderSegmentedControl(['IP/Domain Name', 'NVR', 'Serial Number'], deviceType, handleDeviceTypeChange)}

                    {/* Protocol */}
                    <View style={styles.protocolContainer}>
                        {renderSegmentedControl(['TVT Private', 'ONVIF'], protocol, handleProtocolChange)}
                    </View>

                    {/* Info Alert */}
                    <View style={styles.infoAlert}>
                        <Icon name="information-outline" size={18} color="#C43B3B" style={styles.infoIcon} />
                        <Text style={styles.infoText}>
                            {protocol === 'TVT Private' ? 'Uses TVT Private Protocol (TCP/UDP)' : 'Uses Standard ONVIF Protocol'}
                        </Text>
                    </View>

                    {/* IP/SN Address */}
                    <View style={styles.inputRow}>
                        <Icon name={deviceType === 'IP/Domain Name' ? "map-marker-outline" : "barcode"} size={24} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder={deviceType === 'IP/Domain Name' ? "IP Address*" : "Serial Number*"}
                            placeholderTextColor="#999"
                            value={ip}
                            onChangeText={setIp}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>
                    <View style={styles.divider} />

                    {/* Search LAN / Scan QR Button */}
                    <TouchableOpacity 
                        style={styles.searchLanButton}
                        onPress={() => {
                            if (deviceType === 'IP/Domain Name') {
                                navigation.navigate('LanSearch' as any);
                            } else {
                                navigation.navigate('QRScanner' as any);
                            }
                        }}
                    >
                        <Icon name={deviceType === 'IP/Domain Name' ? "magnify-scan" : "qrcode-scan"} size={20} color="#852d2dff" />
                        <Text style={styles.searchLanText}>
                            {deviceType === 'IP/Domain Name' ? "Don't know IP? Search in LAN" : "Don't know SN? Scan QR Code"}
                        </Text>
                    </TouchableOpacity>

                    {/* Port */}
                    <View style={styles.inputRow}>
                        <Icon name="ethernet-cable" size={24} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Port"
                            placeholderTextColor="#999"
                            value={port}
                            onChangeText={setPort}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={styles.divider} />

                    {/* Brand */}
                    <View style={styles.inputRow}>
                        <Icon name="cog-outline" size={24} color="#666" style={styles.inputIcon} />
                        <Text style={styles.inputPlaceholder}>Brand*</Text>
                        <View style={{ flex: 1 }} />
                        <Text style={styles.brandValueText}>TVT</Text>
                    </View>
                    <View style={styles.divider} />

                    {/* Username */}
                    <View style={styles.inputRow}>
                        <Icon name="account" size={24} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Username*"
                            placeholderTextColor="#999"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>
                    <View style={styles.divider} />

                    {/* Password */}
                    <View style={styles.inputRow}>
                        <Icon name="dots-horizontal" size={24} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password*"
                            placeholderTextColor="#999"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>
                    <View style={styles.divider} />

                </ScrollView>

                {/* Bottom Save Button */}
                <View style={styles.bottomContainer}>
                    <TouchableOpacity
                        style={[styles.saveButtonLarge, (isLoading || !ip) && { opacity: 0.6 }]}
                        onPress={handleSave}
                        disabled={isLoading || !ip}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    backButton: {
        padding: 5,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 55,
    },
    inputIcon: {
        marginRight: 15,
        width: 24,
        textAlign: 'center',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        height: '100%',
    },
    inputPlaceholder: {
        fontSize: 16,
        color: '#999',
    },
    brandValueText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#F5F5F5',
        marginLeft: 39, // Align with text start
    },
    sectionLabel: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginTop: 25,
        marginBottom: 15,
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        height: 40,
    },
    segmentButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    segmentButtonSelected: {
        backgroundColor: '#A83232', // Matches SuperLive dark red
        borderRadius: 8,
    },
    segmentText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6C7A89',
    },
    segmentTextSelected: {
        color: '#FFF',
    },
    protocolContainer: {
        marginTop: 15,
    },
    infoAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF0F0',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 15,
        marginBottom: 25,
    },
    infoIcon: {
        marginRight: 10,
    },
    infoText: {
        color: '#C43B3B',
        fontSize: 13,
        fontWeight: '500',
    },
    searchLanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF0F0',
        paddingVertical: 15,
        borderRadius: 8,
        marginTop: 15,
        marginBottom: 15,
    },
    searchLanText: {
        color: '#852d2dff',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    bottomContainer: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#F5F5F5',
    },
    saveButtonLarge: {
        backgroundColor: '#A83232',
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});

export default AddCameraManually;
