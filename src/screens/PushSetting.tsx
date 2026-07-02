
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    TextInput,
    NativeModules
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { deviceStorage, Device } from '../utils/deviceStorage';
import GradientBackground from '../Component/GradientBackground';
import BottomBar from '../Component/BottomBar';

const PushSetting: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [devices, setDevices] = useState<Device[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');

    const handleTestLocalNotification = async () => {
        try {
            console.log('[AI-PUSH] Test Local Notification triggered from UI');
            const { TvtAlarmModule } = NativeModules;
            if (TvtAlarmModule && TvtAlarmModule.testEmitAlarm) {
                await TvtAlarmModule.testEmitAlarm();
            } else {
                console.warn('[AI-PUSH] TvtAlarmModule or testEmitAlarm not found in NativeModules');
            }
        } catch (error) {
            console.error('[AI-PUSH] Test notification error:', error);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            const loadDevices = async () => {
                const storedDevices = await deviceStorage.getDevices();
                setDevices(storedDevices);
            };
            loadDevices();
        }, [])
    );

    const filteredDevices = devices.filter(device => {
        const matchesSearch = (device.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (device.ip || '').includes(searchQuery);
        const matchesTab = activeTab === 'all' || (activeTab === 'favorites' && device.favorite);
        return matchesSearch && matchesTab;
    });

    const handleToggleFavorite = async (deviceId: string | number) => {
        try {
            await deviceStorage.toggleFavorite(deviceId);
            // Refresh list
            const updatedDevices = await deviceStorage.getDevices();
            setDevices(updatedDevices);
        } catch (error) {
            console.error('Failed to toggle favorite', error);
        }
    };

    const handleAddDevice = () => {
        navigation.navigate('DeviceList');
    };

    const handleHistory = () => {
        navigation.navigate('Notifications');
    };

    const renderDeviceItem = (device: Device) => (
        <View key={device.id} style={styles.deviceCard}>
            <TouchableOpacity
                style={styles.cardMain}
                onPress={() => navigation.navigate('DevicePushSetting', { deviceId: device.id, deviceName: device.name })}
            >
                {/* Icon Container */}
                <View style={styles.deviceIconContainer}>
                    <Icon name={device.type === 'NVR' ? "server-network" : "cctv"} size={32} color="#A83232" />
                    <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
                </View>

                {/* Info */}
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.deviceName} numberOfLines={1}>{device.name}</Text>
                        <TouchableOpacity onPress={() => handleToggleFavorite(device.id)}>
                            <Icon name={device.favorite ? "heart" : "heart-outline"} size={20} color="#A83232" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>IP:</Text>
                        <Text style={styles.infoValue}>{device.ip}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Type:</Text>
                        <Text style={styles.infoValue}>{device.type}</Text>
                        <View style={styles.verticalDivider} />
                        <Text style={styles.infoLabel}>Port:</Text>
                        <Text style={styles.infoValue}>{device.port}</Text>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Actions Divider */}
            <View style={styles.divider} />

            {/* Actions Bar (Aesthetic match) */}
            <View style={styles.actionButtonsContainer}>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('DevicePushSetting', { deviceId: device.id, deviceName: device.name })}>
                    <Icon name="cog-outline" size={18} color="#A83232" />
                    <Text style={[styles.actionText, { color: '#A83232' }]}>Push Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleHistory}>
                    <Icon name="history" size={18} color="#555" />
                    <Text style={styles.actionText}>History</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Icon name="arrow-left" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Push Setting</Text>
                        <TouchableOpacity style={styles.addButton} onPress={handleAddDevice}>
                            <Icon name="plus" size={24} color="#A83232" />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Icon name="magnify" size={20} color="#999" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search devices..."
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
                            onPress={() => setActiveTab('all')}
                        >
                            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All Devices</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'favorites' && styles.activeTab]}
                            onPress={() => setActiveTab('favorites')}
                        >
                            <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>Favorites</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Test Button */}
                    <TouchableOpacity
                        style={styles.testButton}
                        onPress={handleTestLocalNotification}
                    >
                        <Icon name="bell-ring-outline" size={18} color="#FFF" />
                        <Text style={styles.testButtonText}>Test Local Notification</Text>
                    </TouchableOpacity>

                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {filteredDevices.length > 0 ? (
                            filteredDevices.map(device => renderDeviceItem(device))
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Icon name="bell-off-outline" size={48} color="#ccc" />
                                <Text style={styles.emptyText}>No devices configured for push</Text>
                            </View>
                        )}
                    </ScrollView>

                    <BottomBar />
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 15,
        marginBottom: 15,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    addButton: {
        padding: 5,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 44,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#333',
        fontSize: 14,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    tab: {
        marginRight: 20,
        paddingBottom: 5,
    },
    activeTab: {
        borderBottomWidth: 1.5,
        borderBottomColor: '#A83232',
    },
    tabText: {
        fontSize: 16,
        color: '#999',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#A83232',
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    deviceCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        marginBottom: 15,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    cardMain: {
        flexDirection: 'row',
        padding: 15,
    },
    deviceIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#FFF5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        position: 'relative',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    cardContent: {
        flex: 1,
        justifyContent: 'center',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    deviceName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    infoLabel: {
        fontSize: 12,
        color: '#888',
        marginRight: 4,
    },
    infoValue: {
        fontSize: 12,
        color: '#555',
        fontWeight: '500',
    },
    verticalDivider: {
        width: 1,
        height: 12,
        backgroundColor: '#ccc',
        marginHorizontal: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        backgroundColor: '#FAFAFA',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 13,
        marginLeft: 6,
        color: '#555',
        fontWeight: '500',
    },
    emptyContainer: {
        paddingTop: 50,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 10,
        color: '#999',
        fontSize: 16,
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#A83232',
        marginHorizontal: 20,
        borderRadius: 12,
        height: 44,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    testButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 8,
    },
});

export default PushSetting;
