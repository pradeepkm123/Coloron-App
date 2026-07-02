import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Image,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { Device, deviceStorage } from '../utils/deviceStorage';

const PushSettings: React.FC = () => {
    const navigation = useNavigation<any>();
    const [devices, setDevices] = useState<Device[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'All' | 'Favorites'>('All');

    useEffect(() => {
        loadDevices();
    }, []);

    const loadDevices = async () => {
        const devList = await deviceStorage.getDevices();
        setDevices(devList);
    };

    const filteredDevices = devices.filter(d => {
        const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.ip.includes(searchQuery);
        const matchesTab = activeTab === 'All' || d.favorite;
        return matchesSearch && matchesTab;
    });

    const DeviceCard = ({ device }: { device: Device }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                    <Icon name="server-network" size={32} color="#A83232" />
                    <View style={[styles.statusDot, { backgroundColor: device.status === 'Online' ? '#4CAF50' : '#757575' }]} />
                </View>
                <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceMeta}>IP: {device.ip}  |  Port: {device.port}</Text>
                    <Text style={styles.deviceMeta}>Type: {device.type}  |  Ch: {device.channelCount || 16}  |  Proto: TVT</Text>
                </View>
                <TouchableOpacity onPress={() => {/* Toggle Favorite Logic */ }}>
                    <Icon name={device.favorite ? "heart" : "heart-outline"} size={24} color="#A83232" />
                </TouchableOpacity>
            </View>

            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('PushConfig', {
                        deviceId: device.id,
                        deviceName: device.name,
                        channelCount: device.channelCount || device.channels?.length || 16,
                        deviceChannels: device.channels?.map(ch => ({
                            id: typeof ch.id === 'number' ? ch.id : parseInt(ch.id, 10),
                            name: ch.name,
                            online: ch.online
                        })),
                    })}
                >
                    <Icon name="cog-outline" size={20} color="#A83232" />
                    <Text style={styles.actionText}>Push Settings</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('Notifications', { deviceId: device.id })}
                >
                    <Icon name="history" size={20} color="#555" />
                    <Text style={[styles.actionText, { color: '#555' }]}>History</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Push Setting</Text>
                <TouchableOpacity>
                    <Icon name="plus" size={28} color="#A83232" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Icon name="magnify" size={22} color="#999" />
                    <TextInput
                        placeholder="Search devices..."
                        style={styles.input}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <View style={styles.tabBar}>
                <TouchableOpacity
                    onPress={() => setActiveTab('All')}
                    style={[styles.tab, activeTab === 'All' && styles.activeTab]}
                >
                    <Text style={[styles.tabText, activeTab === 'All' && styles.activeTabText]}>All Devices</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('Favorites')}
                    style={[styles.tab, activeTab === 'Favorites' && styles.activeTab]}
                >
                    <Text style={[styles.tabText, activeTab === 'Favorites' && styles.activeTabText]}>Favorites</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.listContainer}>
                {filteredDevices.map(d => <DeviceCard key={String(d.id)} device={d} />)}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF9F9' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#333' },
    searchSection: { paddingHorizontal: 16, marginBottom: 12 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
    },
    input: { flex: 1, marginLeft: 8, fontSize: 16 },
    tabBar: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 },
    tab: { marginRight: 24, paddingVertical: 4 },
    activeTab: { borderBottomWidth: 3, borderBottomColor: '#A83232' },
    tabText: { fontSize: 16, color: '#999', fontWeight: '600' },
    activeTabText: { color: '#A83232', fontWeight: '900' },
    listContainer: { paddingHorizontal: 16, paddingBottom: 20 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        backgroundColor: '#FCECEC',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    deviceInfo: { flex: 1, marginLeft: 16 },
    deviceName: { fontSize: 18, fontWeight: '800', color: '#333' },
    deviceMeta: { fontSize: 12, color: '#777', marginTop: 2 },
    cardActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        height: 48,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    divider: { width: 1, height: '60%', backgroundColor: '#EEE', alignSelf: 'center' },
    actionText: { marginLeft: 8, fontSize: 14, fontWeight: '700', color: '#A83232' }
});

export default PushSettings;
