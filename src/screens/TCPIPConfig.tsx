import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';
import { getTCPIPConfig, setTCPIPConfig, ensureDeviceLogin, TCPIPConfig as ITCPIPConfig } from '../services/DeviceConfigService';

type TCPIPConfigRouteProp = RouteProp<RootStackParamList, 'TCPIPConfig'>;

const THEME = {
    primary: '#852d2d',
    light: '#fde8e8',
    grey: '#999',
    border: '#EEE',
    text: '#333',
    bg: '#f2f5f7',
};

const TCPIPConfig: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<TCPIPConfigRouteProp>();
    const { deviceId, deviceName } = route.params || {};


    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);

    const [obtainIPAuto, setObtainIPAuto] = useState(false);
    const [ipv6Enabled, setIpv6Enabled] = useState(false);
    const [obtainDNSAuto, setObtainDNSAuto] = useState(false);

    const [ipv4, setIpv4] = useState({ address: '', mask: '', gateway: '', preferredDNS: '', alternateDNS: '' });
    const [ipv6, setIpv6] = useState({ address: '', maskLength: '64', gateway: '', preferredDNS: '', alternateDNS: '' });
    const [mtu, setMtu] = useState('1500');
    const [showAdvancedModal, setShowAdvancedModal] = useState(false);
    const [rawXml, setRawXml] = useState('');

    // Load live config from device on mount
    const loadConfig = useCallback(async () => {
        setLoading(true);
        try {
            const uid = await ensureDeviceLogin(deviceId!);
            setUserId(uid);

            const cfg = await getTCPIPConfig(uid);
            setObtainIPAuto(cfg.dhcp);
            setIpv6Enabled(cfg.ipv6Enabled);
            setIpv4({
                address: cfg.ipv4,
                mask: cfg.mask,
                gateway: cfg.gateway,
                preferredDNS: cfg.preferredDNS,
                alternateDNS: cfg.alternateDNS,
            });
            setIpv6({
                address: cfg.ipv6Address,
                maskLength: cfg.ipv6MaskLength || '64',
                gateway: cfg.ipv6Gateway,
                preferredDNS: cfg.ipv6PreferredDNS,
                alternateDNS: cfg.ipv6AlternateDNS,
            });
            setMtu(cfg.mtu || '1500');
        } catch (e) {
            console.warn('[TCPIPConfig] load failed:', e);
            Alert.alert('Load Failed', 'Could not fetch network settings from device.');
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
            const cfg: ITCPIPConfig = {
                dhcp: obtainIPAuto,
                ipv4: ipv4.address,
                mask: ipv4.mask,
                gateway: ipv4.gateway,
                preferredDNS: ipv4.preferredDNS,
                alternateDNS: ipv4.alternateDNS,
                ipv6Enabled,
                ipv6Address: ipv6.address,
                ipv6Gateway: ipv6.gateway,
                ipv6MaskLength: ipv6.maskLength,
                ipv6PreferredDNS: ipv6.preferredDNS,
                ipv6AlternateDNS: ipv6.alternateDNS,
                mtu,
            };
            const ok = await setTCPIPConfig(userId, cfg);
            if (ok) {
                Alert.alert('Success', 'Network settings applied to device successfully.');
            } else {
                Alert.alert('Failed', 'Could not apply settings. Check connection and try again.');
            }
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Apply failed');
        } finally {
            setSaving(false);
        }
    };

    const renderInput = (label: string, value: string, onChange: (v: string) => void, disabled = false) => (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
                style={[styles.input, disabled && styles.inputDisabled]}
                value={value}
                onChangeText={onChange}
                placeholder="—"
                placeholderTextColor="#BBB"
                editable={!disabled}
                keyboardType="numeric"
            />
        </View>
    );

    const renderCheckbox = (label: string, value: boolean, onToggle: (v: boolean) => void) => (
        <TouchableOpacity style={styles.checkboxRow} onPress={() => onToggle(!value)}>
            <Icon name={value ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={value ? THEME.primary : THEME.grey} />
            <Text style={styles.checkboxLabel}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Icon name="chevron-left" size={32} color={THEME.primary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>TCP/IP</Text>
                        <TouchableOpacity style={styles.advancedBtn} onPress={() => setShowAdvancedModal(true)}>
                            <Text style={styles.advancedText}>Advanced</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tabBar}>
                        <View style={styles.activeTab}>
                            <Text style={styles.activeTabText}>Ethernet Port 1</Text>
                        </View>
                        <TouchableOpacity style={styles.refreshBtn} onPress={loadConfig}>
                            <Icon name="refresh" size={20} color={THEME.primary} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color={THEME.primary} />
                            <Text style={styles.loadingText}>Loading from device…</Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>IP Address Settings</Text>
                                </View>
                                <View style={styles.card}>
                                    {renderCheckbox('Obtain an IP address automatically', obtainIPAuto, setObtainIPAuto)}
                                    <View style={styles.splitRow}>
                                        <View style={styles.col}>
                                            <Text style={styles.subHeader}>IPv4</Text>
                                            {renderInput('Address', ipv4.address, v => setIpv4({ ...ipv4, address: v }), obtainIPAuto)}
                                            {renderInput('Subnet Mask', ipv4.mask, v => setIpv4({ ...ipv4, mask: v }), obtainIPAuto)}
                                            {renderInput('Gateway', ipv4.gateway, v => setIpv4({ ...ipv4, gateway: v }), obtainIPAuto)}
                                        </View>
                                        <View style={styles.col}>
                                            <View style={styles.ipv6Header}>
                                                <Text style={styles.subHeader}>IPv6</Text>
                                                {renderCheckbox('Enable', ipv6Enabled, setIpv6Enabled)}
                                            </View>
                                            {renderInput('Address', ipv6.address, v => setIpv6({ ...ipv6, address: v }), !ipv6Enabled)}
                                            {renderInput('Mask Length', ipv6.maskLength, v => setIpv6({ ...ipv6, maskLength: v }), !ipv6Enabled)}
                                            {renderInput('Gateway', ipv6.gateway, v => setIpv6({ ...ipv6, gateway: v }), !ipv6Enabled)}
                                        </View>
                                    </View>

                                    <View style={styles.divider} />

                                    <View style={styles.splitRow}>
                                        <View style={styles.col}>
                                            {renderCheckbox('Obtain DNS automatically', obtainDNSAuto, setObtainDNSAuto)}
                                            {renderInput('Preferred DNS', ipv4.preferredDNS, v => setIpv4({ ...ipv4, preferredDNS: v }), obtainDNSAuto)}
                                            {renderInput('Alternate DNS', ipv4.alternateDNS, v => setIpv4({ ...ipv4, alternateDNS: v }), obtainDNSAuto)}
                                        </View>
                                        <View style={styles.col}>
                                            {renderCheckbox('Auto IPv6 DNS', false, () => {})}
                                            {renderInput('Preferred DNS', ipv6.preferredDNS, v => setIpv6({ ...ipv6, preferredDNS: v }), !ipv6Enabled)}
                                            {renderInput('Alternate DNS', ipv6.alternateDNS, v => setIpv6({ ...ipv6, alternateDNS: v }), !ipv6Enabled)}
                                        </View>
                                    </View>
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

            {/* Advanced Modal */}
            <Modal visible={showAdvancedModal} transparent animationType="fade" onRequestClose={() => setShowAdvancedModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Advanced TCP/IP Settings</Text>
                            <TouchableOpacity onPress={() => setShowAdvancedModal(false)} style={styles.closeBtn}>
                                <Icon name="close" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalContent}>
                            <View style={styles.modalRow}>
                                <Text style={styles.modalLabel}>MTU</Text>
                                <TextInput style={styles.modalInput} value={mtu} onChangeText={setMtu} keyboardType="numeric" />
                            </View>
                        </View>
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowAdvancedModal(false)}>
                                <Text style={styles.modalBtnText}>OK</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f2f5f7' },
    safeArea: { flex: 1 },
    header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, justifyContent: 'space-between' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: THEME.primary },
    backBtn: { padding: 5 },
    advancedBtn: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: '#CCC' },
    advancedText: { fontSize: 13, color: '#666' },
    tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12 },
    activeTab: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 3, borderBottomColor: THEME.primary },
    activeTabText: { fontSize: 13, fontWeight: 'bold', color: THEME.primary },
    refreshBtn: { padding: 8 },
    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: THEME.grey, fontSize: 14 },
    content: { flex: 1 },
    section: { marginTop: 10 },
    sectionHeader: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: THEME.light },
    sectionTitle: { fontSize: 13, color: THEME.primary, fontWeight: 'bold' },
    card: { backgroundColor: '#FFF', padding: 14 },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    checkboxLabel: { fontSize: 13, color: THEME.text, marginLeft: 8 },
    splitRow: { flexDirection: 'row', justifyContent: 'space-between' },
    col: { flex: 0.48 },
    subHeader: { fontSize: 15, fontWeight: 'bold', color: THEME.primary, marginBottom: 8, marginTop: 4 },
    ipv6Header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    inputGroup: { marginBottom: 10 },
    inputLabel: { fontSize: 11, color: THEME.grey, marginBottom: 3 },
    input: { height: 34, borderWidth: 1, borderColor: '#DDD', borderRadius: 4, paddingHorizontal: 8, color: THEME.text, fontSize: 13, backgroundColor: '#F9F9F9' },
    inputDisabled: { backgroundColor: '#F0F0F0', color: '#BBB', borderColor: '#E5E5E5' },
    divider: { height: 1, backgroundColor: '#EEE', marginVertical: 12 },
    applyBtn: { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: THEME.primary, paddingHorizontal: 48, paddingVertical: 13, borderRadius: 8, elevation: 4 },
    applyText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { width: '82%', backgroundColor: '#1a1a1a', borderRadius: 6, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
    modalTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    closeBtn: { backgroundColor: '#FFF', borderRadius: 2, padding: 2 },
    modalContent: { padding: 20 },
    modalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    modalLabel: { color: '#FFF', fontSize: 15, flex: 1 },
    modalInput: { flex: 1.2, height: 36, backgroundColor: '#FFF', color: '#000', paddingHorizontal: 10, borderRadius: 3, fontSize: 14 },
    modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16 },
    modalBtn: { backgroundColor: '#555', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 3 },
    modalBtnText: { color: '#FFF', fontSize: 15 },
});

export default TCPIPConfig;
