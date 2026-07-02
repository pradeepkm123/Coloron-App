import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    Modal,
    TouchableWithoutFeedback,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';
import { getStreamConfig, ensureDeviceLogin } from '../services/DeviceConfigService';
import { getDeviceInfo } from '../native/NvrSdk';

type SubStreamSettingsRouteProp = RouteProp<RootStackParamList, 'SubStreamSettings'>;

interface ChannelSettings {
    id: number;
    title: string;
    cameraName: string;
    streamType: string;
    encode: string;
    resolution: string;
    fps: string;
    gop: string;
    bitrateType: string;
    quality: string;
}

const THEME = {
    primary: '#852d2d',
    light: '#fde8e8',
    grey: '#999',
    border: '#EEE',
    text: '#333',
    bg: '#f2f5f7',
};

const SubStreamSettings: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<SubStreamSettingsRouteProp>();
    const { deviceId } = route.params;

    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<number | null>(null);
    const [channels, setChannels] = useState<ChannelSettings[]>([]);

    const [activeDropdown, setActiveDropdown] = useState<{ channelId: number, field: keyof ChannelSettings, options: string[] } | null>(null);

    const ENCODE_OPTIONS = Array.from({ length: 30 }, (_, i) => (i + 1).toString());
    const FPS_OPTIONS = ['VBR', 'CBR'];
    const BITRATE_TYPE_OPTIONS = ['32kbps', '64kbps', '256kbps', '384kbps', '512kbps', '768kbps', '1024kbps'];
    const CAMERA_NAME_OPTIONS = ['H.265', 'H.264', 'H.265+', 'H.264+'];
    const STREAM_TYPE_OPTIONS = ['1080P', '720P', '704x576', '480x240', '352x288'];

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const uid = await ensureDeviceLogin(deviceId!);
            setUserId(uid);

            const dInfo = await getDeviceInfo(uid);
            const count = dInfo.channelCount || 4;

            const loadedChannels: ChannelSettings[] = [];
            for (let i = 0; i < count; i++) {
                // Fetch SubStream (streamType = 1)
                const streamConf = await getStreamConfig(uid, i, 1).catch(() => null);
                loadedChannels.push({
                    id: i + 1,
                    title: `CH ${i + 1}`,
                    cameraName: streamConf?.encode || 'H.265',
                    streamType: streamConf?.resolution || '704x576',
                    encode: streamConf?.fps || '25',
                    resolution: streamConf?.resolution || '704x576',
                    fps: 'VBR',
                    gop: 'Medium',
                    bitrateType: streamConf?.bitrate || '512Kbps',
                    quality: 'Medium',
                });
            }
            setChannels(loadedChannels);
        } catch (e) {
            console.warn('[SubStreamSettings] load failed:', e);
            Alert.alert('Load Failed', 'Could not fetch stream settings from device.');
        } finally {
            setLoading(false);
        }
    }, [deviceId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSelectOption = (option: string) => {
        if (!activeDropdown) return;
        const { channelId, field } = activeDropdown;
        setChannels(prev => prev.map(ch => ch.id === channelId ? { ...ch, [field]: option } : ch));
        setActiveDropdown(null);
    };

    const handleSave = () => {
        Alert.alert('Save', 'Applying stream settings via transparentConfig is not fully implemented for channels yet.');
    };

    const renderDropdownField = (label: string, value: string, channelId: number, field: keyof ChannelSettings, options: string[]) => (
        <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setActiveDropdown({ channelId, field, options })}
            >
                <Text style={styles.dropdownText}>{value}</Text>
                <Icon name="menu-down" size={20} color="#666" />
            </TouchableOpacity>
        </View>
    );

    const renderInputField = (label: string, value: string) => (
        <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={styles.inputBox}>
                <Text style={styles.inputText}>{value}</Text>
            </View>
        </View>
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
                        <Text style={styles.headerTitle}>Stream Settings</Text>
                        <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity style={styles.actionBtn} onPress={loadData}>
                                <Icon name="refresh" size={24} color={THEME.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
                                <Icon name="content-save-outline" size={24} color={THEME.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {loading ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color={THEME.primary} />
                            <Text style={styles.loadingText}>Loading settings…</Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.content}>
                            {channels.map((ch) => (
                                <View key={ch.id} style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <View style={styles.idCircle}>
                                            <Text style={styles.idText}>{ch.id}</Text>
                                        </View>
                                        <View style={styles.titleContainer}>
                                            <Text style={styles.channelTitleText}>{ch.title}</Text>
                                            <Text style={styles.subStreamText}>Sub Stream</Text>
                                        </View>
                                    </View>

                                    <View style={styles.fieldsGrid}>
                                        <View style={styles.row}>
                                            {renderDropdownField('Encode Type', ch.cameraName, ch.id, 'cameraName', CAMERA_NAME_OPTIONS)}
                                            {renderDropdownField('Resolution', ch.streamType, ch.id, 'streamType', STREAM_TYPE_OPTIONS)}
                                        </View>
                                        <View style={styles.row}>
                                            {renderDropdownField('FPS', ch.encode, ch.id, 'encode', ENCODE_OPTIONS)}
                                            {renderInputField('Actual Res', ch.resolution)}
                                        </View>
                                        <View style={styles.row}>
                                            {renderDropdownField('Bitrate Ctrl', ch.fps, ch.id, 'fps', FPS_OPTIONS)}
                                            {renderDropdownField('GOP', ch.gop, ch.id, 'gop', ['Higher', 'High', 'Medium', 'Low'])}
                                        </View>
                                        <View style={styles.row}>
                                            {renderDropdownField('Bitrate', ch.bitrateType, ch.id, 'bitrateType', BITRATE_TYPE_OPTIONS)}
                                            {renderInputField('Quality', ch.quality)}
                                        </View>
                                    </View>
                                </View>
                            ))}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    )}
                </SafeAreaView>
            </GradientBackground>

            <Modal visible={!!activeDropdown} transparent animationType="fade" onRequestClose={() => setActiveDropdown(null)}>
                <TouchableWithoutFeedback onPress={() => setActiveDropdown(null)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <ScrollView style={{ maxHeight: 400 }}>
                                {activeDropdown?.options.map((opt, idx) => (
                                    <TouchableOpacity key={idx} style={styles.modalItem} onPress={() => handleSelectOption(opt)}>
                                        <Text style={styles.modalItemText}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.bg },
    safeArea: { flex: 1 },
    header: { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, justifyContent: 'space-between' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: THEME.primary },
    backBtn: { padding: 5 },
    actionBtn: { padding: 8 },
    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: THEME.grey, fontSize: 14 },
    content: { flex: 1, paddingHorizontal: 10, paddingTop: 10 },
    card: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, flexDirection: 'row' },
    cardHeader: { width: 80, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10 },
    idCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME.light, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    idText: { fontSize: 18, fontWeight: 'bold', color: THEME.primary },
    titleContainer: { alignItems: 'center' },
    channelTitleText: { fontSize: 13, fontWeight: 'bold', color: THEME.text, textAlign: 'center' },
    subStreamText: { fontSize: 11, color: THEME.primary, marginTop: 2 },
    fieldsGrid: { flex: 1, paddingLeft: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    fieldContainer: { width: '48%' },
    fieldLabel: { fontSize: 11, color: THEME.grey, marginBottom: 4 },
    dropdown: { height: 36, borderWidth: 1, borderColor: THEME.border, borderRadius: 6, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FDFDFD' },
    dropdownText: { fontSize: 13, color: THEME.text },
    inputBox: { height: 36, borderWidth: 1, borderColor: '#EEE', borderRadius: 6, paddingHorizontal: 8, justifyContent: 'center', backgroundColor: '#F5F5F5' },
    inputText: { fontSize: 13, color: '#777' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '80%', backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 10, overflow: 'hidden' },
    modalItem: { paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    modalItemText: { fontSize: 16, color: THEME.text, textAlign: 'center' }
});

export default SubStreamSettings;
