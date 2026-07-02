import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    TextInput,
    Switch,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';
import { getPPPoEConfig, setPPPoEConfig, ensureDeviceLogin, PPPoEConfig as IPPPoEConfig } from '../services/DeviceConfigService';

type PPPoEConfigRouteProp = RouteProp<RootStackParamList, 'PPPoEConfig'>;

const THEME = {
    primary: '#852d2d',
    light: '#fde8e8',
    grey: '#999',
    border: '#EEE',
    text: '#333',
    bg: '#f2f5f7',
};

const PPPoEConfig: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<PPPoEConfigRouteProp>();
    const { deviceId, deviceName } = route.params;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);

    const [enable, setEnable] = useState(false);
    const [username, setUsername] = useState('');
    const [modifyPassword, setModifyPassword] = useState(false);
    const [password, setPassword] = useState('');

    const loadConfig = useCallback(async () => {
        setLoading(true);
        try {
            const uid = await ensureDeviceLogin(deviceId!);
            setUserId(uid);

            const cfg = await getPPPoEConfig(uid);
            setEnable(cfg.enable);
            setUsername(cfg.username);
            // Don't prefill password for security/UI reasons, or only show placeholders
            setPassword(cfg.password ? '********' : '');
            setModifyPassword(false);
        } catch (e) {
            console.warn('[PPPoEConfig] load failed:', e);
            Alert.alert('Load Failed', 'Could not fetch PPPoE settings from device.');
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
            const cfg: IPPPoEConfig = {
                enable,
                username,
                password: modifyPassword ? password : '', // Only send if modified
            };
            const ok = await setPPPoEConfig(userId, cfg);
            if (ok) {
                Alert.alert('Success', 'PPPoE settings applied to device successfully.');
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
                        <Text style={styles.headerTitle}>PPPoE</Text>
                        <TouchableOpacity style={styles.saveBtn} onPress={loadConfig}>
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
                                    <Text style={styles.sectionTitle}>Basic Settings</Text>
                                </View>

                                <View style={styles.card}>
                                    <View style={styles.row}>
                                        <Text style={styles.rowLabel}>Enable</Text>
                                        <Switch
                                            value={enable}
                                            onValueChange={setEnable}
                                            trackColor={{ false: "#DDD", true: THEME.primary }}
                                            thumbColor={enable ? "#FFF" : "#F4F3F4"}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Username</Text>
                                        <TextInput
                                            style={[styles.input, !enable && styles.inputDisabled]}
                                            value={username}
                                            onChangeText={setUsername}
                                            editable={enable}
                                            placeholder="Enter Username"
                                            placeholderTextColor="#999"
                                        />
                                    </View>

                                    <View style={styles.divider} />

                                    <View style={styles.row}>
                                        <Text style={styles.rowLabel}>Modify Password</Text>
                                        <Switch
                                            value={modifyPassword}
                                            onValueChange={setModifyPassword}
                                            trackColor={{ false: "#DDD", true: THEME.primary }}
                                            thumbColor={modifyPassword ? "#FFF" : "#F4F3F4"}
                                            disabled={!enable}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Password</Text>
                                        <TextInput
                                            style={[styles.input, (!modifyPassword || !enable) && styles.inputDisabled]}
                                            value={password}
                                            onChangeText={setPassword}
                                            editable={modifyPassword && enable}
                                            placeholder={modifyPassword ? "Enter new password" : "*************"}
                                            placeholderTextColor="#999"
                                            secureTextEntry
                                        />
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                    )}

                    <TouchableOpacity style={[styles.applyBtn, saving && { opacity: 0.6 }]} onPress={handleApply} disabled={saving || loading}>
                        {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.applyText}>Apply</Text>}
                    </TouchableOpacity>
                </SafeAreaView>
            </GradientBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.bg },
    safeArea: { flex: 1 },
    header: { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, justifyContent: 'space-between' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: THEME.primary },
    backBtn: { padding: 5 },
    saveBtn: { padding: 5 },
    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: THEME.grey, fontSize: 14 },
    content: { flex: 1 },
    section: { marginTop: 10 },
    sectionHeader: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: THEME.light },
    sectionTitle: { fontSize: 14, color: THEME.primary, fontWeight: 'bold' },
    card: { backgroundColor: '#FFF', padding: 15 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    rowLabel: { fontSize: 16, color: THEME.text, fontWeight: '500' },
    inputGroup: { marginBottom: 15 },
    inputLabel: { fontSize: 12, color: THEME.grey, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { height: 44, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, paddingHorizontal: 15, color: THEME.text, fontSize: 15, backgroundColor: '#F9F9F9' },
    inputDisabled: { backgroundColor: '#F5F5F5', color: '#BBB', borderColor: '#E0E0E0' },
    divider: { height: 1, backgroundColor: THEME.border, marginVertical: 20 },
    applyBtn: { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: THEME.primary, paddingHorizontal: 48, paddingVertical: 13, borderRadius: 8, elevation: 4 },
    applyText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default PPPoEConfig;
