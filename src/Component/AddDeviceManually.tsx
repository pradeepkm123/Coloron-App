
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    Animated,
    Dimensions,
    TouchableWithoutFeedback,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    PanResponder,
    Alert,
    ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NetInfo from "@react-native-community/netinfo";
import { deviceStorage, Device } from '../utils/deviceStorage';
import { secureStore } from '../utils/secureStore';
import * as NvrSdk from '../native/NvrSdk';
import { authStorage } from '../utils/authStorage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

const { height } = Dimensions.get('window');

interface AddDeviceManuallyProps {
    visible: boolean;
    onClose: () => void;
    initialSN?: string;
    initialDevice?: {
        ip: string;
        port: number;
        protocol: string;
        serial: string;
    };
}

type DeviceType = 'IP/Domain Name' | 'NVR' | 'Serial Number';
type DeviceCategory = 'NVR' | 'DVR' | 'XVR' | 'IPC';

const AddDeviceManually: React.FC<AddDeviceManuallyProps> = ({ visible, onClose, initialSN, initialDevice }) => {
    const pan = useRef(new Animated.Value(height)).current;
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    // Form States
    const [activeTab, setActiveTab] = useState<DeviceType>('IP/Domain Name');
    const [deviceCategory, setDeviceCategory] = useState<DeviceCategory>('NVR');
    const [isSaving, setIsSaving] = useState(false);
    const [deviceName, setDeviceName] = useState('');
    const [ipAddress, setIpAddress] = useState('');
    const [port, setPort] = useState('6036');
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [protocol, setProtocol] = useState<'TVT' | 'ONVIF'>('TVT');

    // Default channel counts per device category
    const defaultChannelCount: Record<DeviceCategory, number> = {
        NVR: 16,
        DVR: 8,
        XVR: 32,
        IPC: 1,
    };

    const handleCategorySelect = (cat: DeviceCategory) => {
        setDeviceCategory(cat);
        // IPC uses ONVIF/HTTP port 80 by default; recorders use TVT port 6036
        if (cat === 'IPC') {
            setProtocol('ONVIF');
            setPort('80');
        } else {
            setProtocol('TVT');
            setPort('6036');
        }
    };

    const parseQRString = (qr: string) => {
        const snMatch = qr.match(/<sn>([^<]*)<\/sn>/i);
        const userMatch = qr.match(/<user>([^<]*)<\/user>/i);
        const pwdMatch = qr.match(/<pwd>([^<]*)<\/pwd>/i);

        return {
            sn: snMatch ? snMatch[1] : qr,
            username: userMatch ? userMatch[1] : '',
            password: pwdMatch ? pwdMatch[1] : ''
        };
    };

    useEffect(() => {
        if (visible) {
            if (initialDevice) {
                setIpAddress(initialDevice.ip || '');
                setPort(initialDevice.port ? initialDevice.port.toString() : (initialDevice.protocol === 'ONVIF' ? '80' : '6036'));
                setSerialNumber(initialDevice.serial || '');
                setProtocol(initialDevice.protocol as any || 'TVT');

                if (initialDevice.deviceName) {
                    setDeviceName(initialDevice.deviceName);
                } else if (initialDevice.model) {
                    setDeviceName(initialDevice.model);
                } else {
                    const lastOctet = initialDevice.ip ? initialDevice.ip.split('.').pop() : '';
                    setDeviceName(lastOctet ? `Device_${lastOctet}` : 'TVT Device');
                }

                if (initialDevice.ip) {
                    setActiveTab('IP/Domain Name');
                } else if (initialDevice.serial) {
                    setActiveTab('Serial Number');
                } else {
                    setActiveTab(initialDevice.protocol === 'TVT' ? 'NVR' : 'IP/Domain Name');
                }
            } else if (initialSN) {
                const parsed = parseQRString(initialSN);
                setSerialNumber(parsed.sn);
                if (parsed.username) setUsername(parsed.username);
                if (parsed.password) setPassword(parsed.password);
                setActiveTab('Serial Number');
            }

            Animated.spring(pan, {
                toValue: 0,
                useNativeDriver: true,
                damping: 20,
                stiffness: 90,
            }).start();
        } else {
            Animated.timing(pan, {
                toValue: height,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, initialSN, initialDevice]);

    const handleClose = () => {
        Animated.timing(pan, {
            toValue: height,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const saveDeviceWithData = async (verified: boolean, loginRes?: any) => {
        try {
            const user = await authStorage.getUser();
            const userEmail = user?.email || 'guest';

            const isP2P = activeTab === 'Serial Number';
            const rawSN = loginRes?.deviceInfo?.serialNumber?.trim() || serialNumber.trim();
            
            // Helper to check if serial number is valid (not version, N/A, null, etc.)
            const isValidSN = (sn?: string): boolean => {
                if (!sn) return false;
                const cleaned = sn.trim().toLowerCase();
                if (!cleaned || cleaned === 'n/a' || cleaned === 'null' || cleaned === 'undefined' || cleaned === 'empty') return false;
                // If it looks like a version string (e.g. 1.4.5.46367B210712)
                if (cleaned.includes('.') && cleaned.split('.').length >= 3) return false;
                return true;
            };

            const realSN = isValidSN(rawSN) ? rawSN : '';
            const hostClean = isP2P ? 'p2p' : ipAddress.trim().replace(/\./g, '_');
            const portStr = String(loginRes?.actualPort || port || '6036');

            // Format: TVT_SN12345 or TVT_192_168_1_10_6036
            const deviceId = realSN ? `${protocol}_${realSN}` : `${protocol}_${hostClean}_${portStr}`;

            // Determine channel count: prefer SDK result, fall back to category default
            const sdkChannelCount = loginRes?.deviceInfo?.videoInputNum || loginRes?.channelCount;
            const videoInputNum = sdkChannelCount || defaultChannelCount[deviceCategory] || 1;
            // Any recorder type (NVR / DVR / XVR) is treated as multi-channel
            const isNVR = deviceCategory !== 'IPC' || videoInputNum > 1;

            let channels: any[] | undefined = undefined;
            let activeChannels: number[] = [];
            if (verified && loginRes) {
                try {
                    console.log(`Enumerate channels for user ${loginRes.userId}, total: ${videoInputNum}`);
                    const allChannels = await NvrSdk.getChannels(loginRes.userId);
                    if (allChannels && allChannels.length > 0) {
                        // Store only enabled/online channels
                        const onlineChannels = allChannels.filter(ch => ch.online === true);
                        channels = onlineChannels.map(ch => ({
                            id: ch.id,
                            name: ch.name?.trim() || `CH ${ch.id + 1}`,
                            online: true,
                            channelNo: ch.id + 1,
                            streamType: 1, // Default streamType preference (1 = Sub, 0 = Main)
                            ptzSupport: true,
                            audioSupport: true,
                        }));
                        activeChannels = onlineChannels.map(ch => ch.id + 1);
                    }
                } catch (e) {
                    console.log('Channel enumeration failed, using placeholders');
                }
            }

            if (!channels) {
                channels = Array.from({ length: videoInputNum }).map((_, i) => ({
                    id: i,
                    name: `CH ${i + 1}`,
                    online: true,
                    channelNo: i + 1,
                    streamType: 1,
                    ptzSupport: true,
                    audioSupport: true,
                }));
                activeChannels = Array.from({ length: videoInputNum }).map((_, i) => i + 1);
            }

            // Mark connectMode as IP, DOMAIN, LAN, or NAT
            let mode: 'IP' | 'Domain' | 'LAN' | 'NAT' = 'IP';
            if (isP2P || activeTab === 'NVR' || activeTab === 'Serial Number') {
                mode = 'NAT';
            } else {
                const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
                const isIp = ipRegex.test(ipAddress.trim());
                if (!isIp) {
                    mode = 'Domain';
                } else {
                    const isLanIp = /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(ipAddress.trim());
                    mode = isLanIp ? 'LAN' : 'IP';
                }
            }

            const audioSupport = (loginRes?.deviceInfo?.audioInputNum && loginRes.deviceInfo.audioInputNum > 0) || !!loginRes?.deviceInfo?.audioSupport;

            const newDevice: Device = {
                id: deviceId,
                name: deviceName.trim() || loginRes?.deviceInfo?.deviceName?.trim() || (isP2P ? `SN:${(realSN || '').slice(-4)}` : `IP:${ipAddress}`),
                type: deviceCategory,        // Use the user-selected category as primary type
                deviceCategory: deviceCategory, // Explicit category field
                ip: isP2P ? '' : ipAddress.trim(),
                port: String(loginRes?.actualPort || (isP2P ? '0' : (port || '6036'))),
                status: verified ? 'Online' : 'Connecting',
                favorite: false,
                deviceId: realSN, // Serial Number
                sn: realSN,
                userEmail: userEmail,
                nvrUsername: username.trim(),
                nvrPassword: '*****', // Mask password locally in public profile
                password: '*****',
                isNVR: isNVR,
                channels: channels,
                activeChannels: activeChannels,
                totalChannels: videoInputNum,
                protocol: protocol,
                connectMode: mode,
                model: loginRes?.deviceInfo?.model?.trim() || 'TVT Device',
                version: loginRes?.deviceInfo?.version?.trim(),
                streamType: loginRes?.deviceInfo?.dualStream ? 'Dual Stream' : 'Main Stream',
                audioSupport: audioSupport,
                channelCount: videoInputNum,

                // Detailed Hardware Info
                audioInputNum: loginRes?.deviceInfo?.audioInputNum,
                sensorInputNum: loginRes?.deviceInfo?.sensorInputNum,
                sensorOutputNum: loginRes?.deviceInfo?.sensorOutputNum,
                deviceType: loginRes?.deviceInfo?.deviceType,
                videoInputNum: loginRes?.deviceInfo?.videoInputNum,
                rawData: loginRes?.deviceInfo
            };

            // Save password securely in secureStore using the unique device ID
            console.log(`[secureStore] Saving password securely for ${deviceId}`);
            await secureStore.savePassword(deviceId, password);

            console.log('[AddDevice] Saving detailed device to storage:', JSON.stringify(newDevice, null, 2));
            await deviceStorage.addDevice(newDevice);
            return { success: true, deviceId, isNVR };
        } catch (e) {
            console.error('Save operation failed:', e);
            throw e;
        }
    };

    const handleSave = async () => {
        if (!deviceName.trim()) {
            Alert.alert('Error', 'Please enter a device name');
            return;
        }

        const isP2P = activeTab === 'Serial Number';
        if (!isP2P && !ipAddress.trim()) {
            Alert.alert('Error', 'Please enter IP Address or Domain');
            return;
        }
        if (isP2P && !serialNumber.trim()) {
            Alert.alert('Error', 'Please enter Serial Number');
            return;
        }
        if (!username.trim()) {
            Alert.alert('Error', 'Please enter Username');
            return;
        }

        setIsSaving(true);
        try {
            try {
                await NvrSdk.init();
                console.log("SDK initialized");
            } catch (e) {
                console.log("SDK init failed", e);
                Alert.alert("SDK Error", "Failed to initialize SDK");
                return;
            }

            const netInfo = await NetInfo.fetch();
            const isWifi = netInfo.type === 'wifi';

            // Prepare parameters
            const cleanHost = isP2P ? "" : ipAddress.trim();
            // Set as let to allow dynamic port reassignment when LAN fallback matches a secondary port
            let cleanPort = isP2P ? 0 : (parseInt(port) || (protocol === 'ONVIF' ? 80 : 6036));
            const cleanSN = serialNumber.trim();
            const cleanUser = username.trim();

            const loginParams: NvrSdk.LoginParams = {
                host: cleanHost,
                port: cleanPort,
                username: cleanUser,
                password: password,
                // TVT SDK Login Types: 0: TCP (IP/Domain), 1: P2P, 2: P2P 2.0
                loginType: isP2P ? 2 : (protocol === 'ONVIF' ? 3 : 0),
                sn: cleanSN,
                isWifi: isWifi,
                protocol: protocol
            };

            // Determine if this is a LAN IP
            const isLanIp = /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(cleanHost);

            // Force override settings for pure LAN devices so they don't break
            if (isLanIp && !isP2P) {
                loginParams.loginType = 0; // Pure LAN requires IP Mode
                loginParams.sn = "";
                // Do not force isWifi to false; let it reflect the true state of the device network
            }

            if (isP2P) {
                console.log(`[AddDevice] SN Mode: Using dedicated P2P resolution for ${cleanSN}`);
            } else {
                console.log(`[AddDevice] ${activeTab} LoginParams:`, {
                    ...loginParams, password: '***'
                });
            } let loginRes = null;

            // 1. Connectivity Check (Only for IP/Domain)
            if (!isP2P) {
                const reachable = await NvrSdk.checkConnect(loginParams.host, loginParams.port, 5000);
                if (!reachable && !isLanIp) {
                    throw new Error(`Target unreachable: ${loginParams.host}:${loginParams.port} is not responding. For TVT devices, ensure port 6036 is open.`);
                }
            }

            // 2. SDK Login & Detailed Validation
            let lastErr: any = null;

            if (isP2P) {
                try {
                    console.log(`[AddDevice] Attempting Dedicated SN Login for ${serialNumber.trim()} (Wifi: ${isWifi})...`);
                    const snResult = await NvrSdk.loginBySN(serialNumber.trim(), username.trim(), password, 2, isWifi);

                    if (snResult && snResult.userId >= 0) {
                        console.log(`[AddDevice] ✅ SN Login Success! userId: ${snResult.userId}`);

                        loginRes = {
                            userId: snResult.userId,
                            deviceInfo: {
                                ...snResult,
                                serialNumber: snResult.serialNumber || serialNumber.trim(),
                                deviceName: snResult.deviceName || deviceName || serialNumber.trim(),
                                videoInputNum: snResult.videoInputNum || 8
                            }
                        };
                    }
                } catch (err: any) {
                    lastErr = err;
                    console.log(`[AddDevice] ❌ SN Login fail:`, err.message || "Unknown error");
                }
            } else if (isLanIp) {
                // TVT LAN Optimized Flow: Match SuperLivePlus behavior
                // Server Port 6036 is the standard for TVT SDK.
                const portsToTry = cleanPort && cleanPort !== 6036 ? [cleanPort, 6036] : [6036];

                searchLoop:
                for (const p of portsToTry) {
                    try {
                        console.log(`[AddDevice] Trying LAN login ${loginParams.host}:${p}`);
                        loginParams.port = p;

                        // IMPORTANT
                        // ONLY USE MODE 0
                        loginParams.loginType = 0;

                        loginRes = await NvrSdk.login(loginParams);

                        if (
                            loginRes &&
                            typeof loginRes.userId === "number" &&
                            loginRes.userId >= 0
                        ) {
                            console.log(`[AddDevice] SUCCESS ${loginParams.host}:${p}`);
                            const verifiedRes = loginRes as any;
                            verifiedRes.actualPort = p;
                            verifiedRes.actualType = 0;
                            cleanPort = p;
                            break searchLoop;
                        }
                    } catch (loginErr: any) {
                        lastErr = loginErr;
                        console.log(`[AddDevice] FAIL ${p}`, loginErr?.message);
                    }
                }
            } else {
                // Standard WAN static IP login
                try {
                    loginRes = await NvrSdk.login(loginParams);
                } catch (err) {
                    lastErr = err;
                }
            }

            if (
                !loginRes ||
                typeof loginRes !== "object" ||
                typeof loginRes.userId !== "number" ||
                loginRes.userId < 0
            ) {
                const isGenericFail = lastErr?.message?.includes('(-1)');
                if (!isP2P && isGenericFail) {
                    const errorDetails = lastErr?.message || '';
                    let hint = `Hint: Port ${loginParams.port} is active, but the SDK rejected the login.`;
                    if (errorDetails.includes('SDK Error: 3')) hint = `Troubleshooting:\n1. Ensure "AP Isolation" is DISABLED in router settings.\n2. Verify "Enable SDK / CMS" is checked in NVR settings.`;
                    if (errorDetails.includes('SDK Error: 8')) hint = `Timeout error. The standard port is unresponsive.`;

                    throw new Error(`Device Refused Connection: ${errorDetails}\n\n${hint}`);
                }
                throw lastErr || new Error(`Login rejected by device.`);
            }

            // 3. Save Verified Data
            const saveRes = await saveDeviceWithData(true, loginRes);
            const { deviceId } = saveRes || {};

            // 4. Cleanup and Success
            try {
                if (
                    loginRes &&
                    typeof loginRes.userId === "number" &&
                    loginRes.userId >= 0
                ) {
                    await NvrSdk.logout(loginRes.userId);
                }
            } catch (e) {
                console.log("Logout error", e);
            }

            Alert.alert('Success', 'Device verified and added successfully!', [
                {
                    text: 'OK',
                    onPress: () => {
                        handleClose();
                        // Reset form
                        setDeviceName('');
                        setIpAddress('');
                        setSerialNumber('');
                        setPassword('');

                        if (deviceId) {
                            navigation.replace('LiveView', { deviceId, autoPlay: true });
                        } else {
                            navigation.replace('Home', {});
                        }
                    }
                }
            ]);

        } catch (error: any) {
            console.warn('Add Device Validation Error:', error);
            const errorMsg = error.message || 'Verification failed. Please check credentials and connection.';

            Alert.alert(
                'Verification Failed',
                errorMsg,
                [{ text: 'OK', style: 'default' }]
            );
        } finally {
            setIsSaving(false);
        }
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) pan.setValue(gestureState.dy);
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 150) handleClose();
                else Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
            },
        })
    ).current;

    const renderInput = (label: string, icon: string, value: string, onChangeText: (t: string) => void, secure = false, placeholder?: string) => (
        <View style={styles.inputWrapper}>
            <View style={styles.iconContainer}>
                <Icon name={icon} size={22} color="#666" />
            </View>
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder={`${label}*`}
                    placeholderTextColor="#999"
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={secure}
                />
            </View>
        </View>
    );

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} onRequestClose={handleClose} animationType="none">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
                <TouchableWithoutFeedback onPress={handleClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: pan }] }]}>
                    <View style={styles.handleBarContainer} {...panResponder.panHandlers}>
                        <View style={styles.handleBar} />
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <Text style={styles.title}>Add Device</Text>

                        {renderInput('Device Name', 'cellphone', deviceName, setDeviceName)}

                        {/* ── Step 1: Device Category ── */}
                        <Text style={styles.sectionLabel}>Device Category</Text>
                        <View style={styles.categoryContainer}>
                            {([
                                { key: 'NVR', icon: 'server-network', label: 'NVR' },
                                { key: 'DVR', icon: 'record-rec', label: 'DVR' },
                                { key: 'XVR', icon: 'video-box', label: 'XVR' },
                                { key: 'IPC', icon: 'cctv', label: 'IP Cam' },
                            ] as { key: DeviceCategory; icon: string; label: string }[]).map((cat) => (
                                <TouchableOpacity
                                    key={cat.key}
                                    style={[styles.categoryBtn, deviceCategory === cat.key && styles.activeCategoryBtn]}
                                    onPress={() => handleCategorySelect(cat.key)}
                                >
                                    <Icon
                                        name={cat.icon}
                                        size={20}
                                        color={deviceCategory === cat.key ? '#FFF' : '#A83232'}
                                        style={{ marginBottom: 4 }}
                                    />
                                    <Text style={[styles.categoryBtnText, deviceCategory === cat.key && styles.activeCategoryBtnText]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* ── Step 2: Connection Method ── */}
                        <Text style={styles.sectionLabel}>Connection Method</Text>
                        <View style={styles.tabContainer}>
                            {(['IP/Domain Name', 'NVR', 'Serial Number'] as DeviceType[]).map((tab) => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.tab, activeTab === tab && styles.activeTab]}
                                    onPress={() => setActiveTab(tab)}
                                >
                                    <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.fieldsContainer}>
                            {activeTab !== 'Serial Number' && (
                                <>
                                    <View style={styles.protocolSelection}>
                                        <TouchableOpacity
                                            style={[styles.protocolBtn, protocol === 'TVT' && styles.activeProtocolBtn]}
                                            onPress={() => { setProtocol('TVT'); setPort('6036'); }}
                                        >
                                            <Text style={[styles.protocolBtnText, protocol === 'TVT' && styles.activeProtocolBtnText]}>TVT Private</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.protocolBtn, protocol === 'ONVIF' && styles.activeProtocolBtn]}
                                            onPress={() => { setProtocol('ONVIF'); setPort('80'); }}
                                        >
                                            <Text style={[styles.protocolBtnText, protocol === 'ONVIF' && styles.activeProtocolBtnText]}>ONVIF</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.protocolNote}>
                                        <Icon name="information-outline" size={16} color="#A83232" style={{ marginRight: 6 }} />
                                        <Text style={styles.protocolText}>
                                            {protocol === 'TVT' ? 'Uses TVT Private Protocol (TCP/UDP)' : 'Standard ONVIF Protocol (HTTP/RTSP)'}
                                        </Text>
                                    </View>

                                    {renderInput('IP Address', 'webcam', ipAddress, setIpAddress)}

                                    <TouchableOpacity
                                        style={styles.lanSearchButton}
                                        onPress={() => { handleClose(); navigation.navigate('LanSearch' as any); }}
                                    >
                                        <Icon name="magnify-expand" size={18} color="#A83232" style={{ marginRight: 8 }} />
                                        <Text style={styles.lanSearchButtonText}>Don't know IP? Search in LAN</Text>
                                    </TouchableOpacity>

                                    {renderInput('Port', 'ethernet-cable', port, setPort)}

                                    <View style={styles.inputWrapper}>
                                        <View style={styles.iconContainer}><Icon name="cog-outline" size={22} color="#666" /></View>
                                        <View style={styles.inputContainer}><Text style={{ color: '#999' }}>Brand*</Text></View>
                                        <View style={[styles.inputContainer, { alignItems: 'flex-end' }]}><Text style={{ color: '#333', fontWeight: 'bold' }}>TVT</Text></View>
                                    </View>
                                </>
                            )}

                            {activeTab === 'Serial Number' && renderInput('Serial Number', 'barcode', serialNumber, setSerialNumber)}

                            {renderInput('User Name', 'account', username, setUsername)}
                            {renderInput('Password', 'dots-horizontal', password, setPassword, true)}
                        </View>

                        <TouchableOpacity style={[styles.saveButton, isSaving && { opacity: 0.7 }]} onPress={handleSave} disabled={isSaving}>
                            {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Save</Text>}
                        </TouchableOpacity>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheetContainer: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: height * 0.92,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    handleBarContainer: { alignItems: 'center', marginBottom: 15, paddingVertical: 10 },
    handleBar: { width: 40, height: 5, backgroundColor: '#DDD', borderRadius: 3 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 20 },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    // Category picker (NVR / DVR / XVR / IPC)
    categoryContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 8,
    },
    categoryBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#FFF5F5',
        borderWidth: 1.5,
        borderColor: '#FFD5D5',
    },
    activeCategoryBtn: {
        backgroundColor: '#A83232',
        borderColor: '#A83232',
    },
    categoryBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#A83232',
    },
    activeCategoryBtnText: {
        color: '#FFF',
    },
    tabContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#F1F3F5', borderRadius: 10, padding: 4 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    activeTab: { backgroundColor: '#A83232' },
    tabText: { fontSize: 11, color: '#6C757D', fontWeight: '700' },
    activeTabText: { color: '#FFF' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F3F5', marginBottom: 12, height: 54 },
    iconContainer: { width: 44, justifyContent: 'center' },
    inputContainer: { flex: 1, height: '100%', justifyContent: 'center' },
    input: { fontSize: 16, color: '#212529', height: '100%' },
    fieldsContainer: { marginTop: 5 },
    saveButton: { backgroundColor: '#A83232', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
    saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    scrollContent: { paddingBottom: 40 },
    lanSearchButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF2F2', paddingVertical: 12, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#FFE3E3' },
    lanSearchButtonText: { color: '#A83232', fontWeight: '700' },
    protocolNote: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fcecec', padding: 10, borderRadius: 8, marginBottom: 15 },
    protocolText: { fontSize: 12, color: '#A83232', fontWeight: '500' },
    protocolSelection: { flexDirection: 'row', backgroundColor: '#F5F5F5', borderRadius: 8, padding: 4, marginBottom: 15 },
    protocolBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
    activeProtocolBtn: { backgroundColor: '#FFF' },
    protocolBtnText: { fontSize: 13, color: '#666', fontWeight: '500' },
    activeProtocolBtnText: { color: '#A83232', fontWeight: 'bold' },
});

export default AddDeviceManually;
