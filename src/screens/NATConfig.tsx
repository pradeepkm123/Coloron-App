import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Switch,
    ScrollView,
    Modal,
    FlatList,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { deviceStorage } from '../utils/deviceStorage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';
import QRCode from 'react-native-qrcode-svg';
import { getNATConfig, setNATConfig, ensureDeviceLogin, NATConfig as INATConfig } from '../services/DeviceConfigService';

type NATConfigRouteProp = RouteProp<RootStackParamList, 'NATConfig'>;

const THEME = {
    primary: '#852d2d',
    light: '#fde8e8',
    grey: '#999',
    border: '#EEE',
    text: '#333',
    bg: '#f2f5f7',
};

const NAT_SERVER_OPTIONS = [
    'NAT2.0(d2020.autonat....)',
    'NAT1.0(nat.autonat....)',
    'Custom',
];

const NATConfig: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<NATConfigRouteProp>();
    const { deviceId, deviceName } = route.params;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);

    const [enable, setEnable] = useState(false);
    const [natServerAddr, setNatServerAddr] = useState(NAT_SERVER_OPTIONS[0]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [serialNumber, setSerialNumber] = useState('');

    const loadConfig = useCallback(async () => {
        setLoading(true);
        try {
            const uid = await ensureDeviceLogin(deviceId!);
            setUserId(uid);
            
            const devices = await deviceStorage.getDevices();
            const dev = devices.find((d: any) => String(d.id) === String(deviceId)) as any;
            // Set SN from device info
            if (dev) {
                setSerialNumber(dev.serialNumber || dev.sn || dev.deviceId || '');
            }

            const cfg = await getNATConfig(uid);
            setEnable(cfg.enable);
        } catch (e) {
            console.warn('[NATConfig] load failed:', e);
            Alert.alert('Load Failed', 'Could not fetch NAT settings from device.');
        } finally {
            setLoading(false);
        }
    }, [deviceId]);

    useEffect(() => { loadConfig(); }, [loadConfig]);

    const handleApply = async () => {
        if (userId === null) {
            Alert.alert('Not Connected', 'Device is not logged in. Open Live View first.');
            return;
        }
        setSaving(true);
        try {
            const cfg: INATConfig = {
                enable,
                natStatus: '',
                externalIP: '',
                externalPort: ''
            };
            const ok = await setNATConfig(userId, cfg);
            if (ok) {
                Alert.alert('Success', 'NAT settings applied to device successfully.');
            } else {
                Alert.alert('Failed', 'Could not apply settings. Check connection and try again.');
            }
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Apply failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Icon name="chevron-left" size={32} color={THEME.primary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>NAT</Text>
                        <TouchableOpacity style={styles.refreshBtn} onPress={loadConfig}>
                            <Icon name="refresh" size={24} color={THEME.primary} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color={THEME.primary} />
                            <Text style={styles.loadingText}>Loading from device…</Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.content}>
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>NAT Settings</Text>
                                </View>

                                <View style={styles.card}>
                                    {/* Enable Toggle */}
                                    <View style={styles.row}>
                                        <Text style={styles.rowLabel}>Enable</Text>
                                        <Switch
                                            value={enable}
                                            onValueChange={setEnable}
                                            trackColor={{ false: "#DDD", true: THEME.primary }}
                                            thumbColor={enable ? "#FFF" : "#F4F3F4"}
                                        />
                                    </View>

                                    <View style={styles.divider} />

                                    {/* NAT Server Addr Dropdown */}
                                    <View style={styles.dropdownGroup}>
                                        <Text style={styles.inputLabel}>NAT Server Addr</Text>
                                        <TouchableOpacity
                                            style={[styles.dropdownBtn, !enable && styles.dropdownBtnDisabled]}
                                            onPress={() => enable && setShowDropdown(true)}
                                            disabled={!enable}
                                        >
                                            <Text style={[styles.dropdownText, !enable && styles.dropdownTextDisabled]} numberOfLines={1}>
                                                {natServerAddr}
                                            </Text>
                                            <Icon name="menu-down" size={24} color={enable ? "#666" : "#BBB"} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.divider} />

                                    {/* Info Text */}
                                    <Text style={styles.infoText}>
                                        Please use the mobile client to scan the code to add a device.
                                    </Text>

                                    {/* QR Code */}
                                    {serialNumber ? (
                                        <View style={styles.qrContainer}>
                                            <QRCode
                                                value={serialNumber}
                                                size={180}
                                                backgroundColor="white"
                                                color="black"
                                            />
                                        </View>
                                    ) : (
                                        <View style={[styles.qrContainer, styles.qrPlaceholder]}>
                                            <Text style={styles.qrPlaceholderText}>No Serial Number Available</Text>
                                        </View>
                                    )}

                                    <View style={styles.divider} />

                                    {/* Serial Number */}
                                    <Text style={styles.serialText}>{serialNumber || 'N/A'}</Text>
                                </View>
                            </View>
                            <View style={{ height: 100 }} />
                        </ScrollView>
                    )}

                    <TouchableOpacity style={[styles.applyBtn, saving && { opacity: 0.6 }]} onPress={handleApply} disabled={saving || loading}>
                        {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.applyText}>Apply</Text>}
                    </TouchableOpacity>
                </SafeAreaView>
            </GradientBackground>

            {/* Dropdown Modal */}
            <Modal
                visible={showDropdown}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDropdown(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowDropdown(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>NAT Server Addr</Text>
                        <FlatList
                            data={NAT_SERVER_OPTIONS}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.modalItem,
                                        item === natServerAddr && styles.modalItemSelected,
                                    ]}
                                    onPress={() => {
                                        setNatServerAddr(item);
                                        setShowDropdown(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.modalItemText,
                                            item === natServerAddr && styles.modalItemTextSelected,
                                        ]}
                                    >
                                        {item}
                                    </Text>
                                    {item === natServerAddr && (
                                        <Icon name="check" size={20} color={THEME.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.bg },
    safeArea: { flex: 1 },
    header: { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, justifyContent: 'space-between' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: THEME.primary },
    backBtn: { padding: 5 },
    refreshBtn: { padding: 5 },
    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: THEME.grey, fontSize: 14 },
    content: { flex: 1 },
    section: { marginTop: 10 },
    sectionHeader: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: THEME.light },
    sectionTitle: { fontSize: 14, color: THEME.primary, fontWeight: 'bold' },
    card: { backgroundColor: '#FFF', padding: 15 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
    rowLabel: { fontSize: 16, color: THEME.text, fontWeight: '500' },
    divider: { height: 1, backgroundColor: THEME.border, marginVertical: 15 },
    dropdownGroup: { marginBottom: 5 },
    inputLabel: { fontSize: 12, color: THEME.grey, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    dropdownBtn: { height: 44, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9F9F9' },
    dropdownBtnDisabled: { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0' },
    dropdownText: { fontSize: 15, color: THEME.text, flex: 1 },
    dropdownTextDisabled: { color: '#BBB' },
    infoText: { fontSize: 14, color: '#666', marginBottom: 15, lineHeight: 20 },
    qrContainer: { alignItems: 'flex-start', paddingVertical: 10 },
    qrPlaceholder: { width: 180, height: 180, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
    qrPlaceholderText: { color: '#999', textAlign: 'center' },
    serialText: { fontSize: 16, color: THEME.text, fontWeight: '500' },
    applyBtn: { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: THEME.primary, paddingHorizontal: 48, paddingVertical: 13, borderRadius: 8, elevation: 4 },
    applyText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '80%', backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 15, maxHeight: 300, elevation: 5 },
    modalTitle: { fontSize: 16, fontWeight: 'bold', color: THEME.primary, paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    modalItemSelected: { backgroundColor: THEME.light },
    modalItemText: { fontSize: 15, color: THEME.text, flex: 1 },
    modalItemTextSelected: { color: THEME.primary, fontWeight: '600' }
});

export default NATConfig;
