import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
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
import { getNetworkStatus, getPPPoEConfig, getNATConfig, ensureDeviceLogin } from '../services/DeviceConfigService';

type ViewNetworkStatusRouteProp = RouteProp<RootStackParamList, 'ViewNetworkStatus'>;

const THEME = {
    primary: '#852d2d',
    light: '#fde8e8',
    grey: '#999',
    border: '#EEE',
    text: '#333',
    bg: '#f2f5f7',
};

const ViewNetworkStatus: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<ViewNetworkStatusRouteProp>();
    const { deviceId, deviceName } = route.params;

    const [loading, setLoading] = useState(true);
    const [statusData, setStatusData] = useState({
        linkStatus: 'Unknown',
        pppoe: 'Disable',
        nat: 'Disable',
        totalBandwidth: '1000Mb',
        remainBandwidth: '—',
        sendBandwidth: '—',
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const uid = await ensureDeviceLogin(deviceId!);

            // Fetch network status, PPPoE and NAT statuses
            const [netStat, pppoeCfg, natCfg] = await Promise.all([
                getNetworkStatus(uid).catch(() => ({ linkStatus: 'Offline' })),
                getPPPoEConfig(uid).catch(() => ({ enable: false })),
                getNATConfig(uid).catch(() => ({ enable: false }))
            ]);

            setStatusData({
                linkStatus: netStat.linkStatus,
                pppoe: pppoeCfg.enable ? 'Enable' : 'Disable',
                nat: natCfg.enable ? 'Enable' : 'Disable',
                totalBandwidth: netStat.speed ? `${netStat.speed}` : '1000Mbps',
                remainBandwidth: '—', // Real bandwidth values are usually not accurately exposed in basic XML
                sendBandwidth: '—',
            });

        } catch (e) {
            console.warn('[ViewNetworkStatus] load failed:', e);
            Alert.alert('Load Failed', 'Could not fetch network status from device.');
        } finally {
            setLoading(false);
        }
    }, [deviceId]);

    useEffect(() => { loadData(); }, [loadData]);

    const renderRow = (label: string, value: string, showChevron = false, onPress?: () => void) => (
        <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.valueContainer}>
                <Text style={[styles.value, (value === 'Online' || value === 'Enable') && { color: '#4CAF50' }]}>
                    {value}
                </Text>
                {showChevron && <Icon name="chevron-right" size={20} color="#CCC" />}
            </View>
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
                        <Text style={styles.headerTitle}>View Network Status</Text>
                        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
                            <Icon name="refresh" size={24} color={THEME.primary} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color={THEME.primary} />
                            <Text style={styles.loadingText}>Loading status…</Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.content}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Work Pattern</Text>
                            </View>

                            <View style={styles.card}>
                                {renderRow('Ethernet Port 1', statusData.linkStatus, true, () =>
                                    navigation.navigate('EthernetPortDetails', { deviceId, deviceName, portName: 'Ethernet Port 1' })
                                )}
                                <View style={styles.divider} />
                                {renderRow('PPPoE Status', statusData.pppoe)}
                                <View style={styles.divider} />
                                {renderRow('Total Bandwidth', statusData.totalBandwidth)}
                                <View style={styles.divider} />
                                {renderRow('Real-time Remain Bandwidth', statusData.remainBandwidth)}
                                <View style={styles.divider} />
                                {renderRow('Total Send Bandwidth', statusData.totalBandwidth)}
                                <View style={styles.divider} />
                                {renderRow('Real-time Remain Send Bandwidth', statusData.sendBandwidth)}
                                <View style={styles.divider} />
                                {renderRow('NAT Status', statusData.nat)}
                                <View style={styles.divider} />
                                {renderRow('Push Server Status', '—')}
                            </View>
                        </ScrollView>
                    )}
                </SafeAreaView>
            </GradientBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.bg },
    safeArea: { flex: 1 },
    header: { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, justifyContent: 'space-between' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: THEME.primary },
    backBtn: { padding: 5 },
    refreshBtn: { padding: 5 },
    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: THEME.grey, fontSize: 14 },
    content: { flex: 1 },
    sectionHeader: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#efe7e7ff' },
    sectionTitle: { fontSize: 14, color: '#333', fontWeight: 'bold' },
    card: { backgroundColor: '#FFF' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 16 },
    label: { fontSize: 16, color: '#333', flex: 1 },
    valueContainer: { flexDirection: 'row', alignItems: 'center' },
    value: { fontSize: 16, color: '#666', marginRight: 5 },
    divider: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 15 }
});

export default ViewNetworkStatus;
