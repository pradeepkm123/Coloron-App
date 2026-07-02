
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    StatusBar,
    SafeAreaView,
    ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';
import NvrSdk from '../native/NvrSdk';
import { deviceStorage } from '../utils/deviceStorage';
import GradientBackground from '../Component/GradientBackground';

const EventChannelSelection: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { deviceId, alarmType, alarmLabel, currentSelected = [] } = route.params;

    const [loading, setLoading] = useState(true);
    const [channels, setChannels] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>(currentSelected);

    useEffect(() => {
        const loadCapabilities = async () => {
            try {
                if (route.params?.availableChannels) {
                    setChannels(route.params.availableChannels.map((c: any) => ({ ...c, supported: true })));
                    setLoading(false);
                    return;
                }

                // 1. Get all channels for the device
                const devices = await deviceStorage.getDevices();
                const device = devices.find(d => String(d.id) === String(deviceId));
                if (!device) return;

                // 2. Fetch or synthesize channels
                // For simplicity, we use the device's channelCount
                const chCount = device.channelCount || 16;
                const baseChannels = [];
                for(let i=0; i<chCount; i++) {
                    baseChannels.push({ id: i, name: `CH ${i+1}`, supported: true });
                }
                
                setChannels(baseChannels);
            } catch (e) {
                console.error('Failed to load channels for selection', e);
            } finally {
                setLoading(false);
            }
        };
        loadCapabilities();
    }, [deviceId, route.params]);

    const toggleChannel = (id: number) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === channels.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(channels.map(c => c.id));
        }
    };

    const handleConfirm = () => {
        // Return result to previous screen
        if (route.params?.onSelect) {
            route.params.onSelect(selectedIds);
        }
        navigation.goBack();
    };

    const renderItem = ({ item }: { item: any }) => {
        const isSelected = selectedIds.includes(item.id);
        return (
            <TouchableOpacity 
                style={styles.channelRow} 
                onPress={() => toggleChannel(item.id)}
                disabled={!item.supported}
            >
                <View style={styles.channelInfo}>
                    <Icon 
                        name="video-outline" 
                        size={22} 
                        color={item.supported ? "#555" : "#CCC"} 
                        style={{ marginRight: 15 }} 
                    />
                    <Text style={[styles.channelName, !item.supported && { color: '#CCC' }]}>
                        {item.name}
                    </Text>
                </View>
                <View style={[
                    styles.checkCircle, 
                    isSelected ? styles.checkCircleActive : styles.checkCircleInactive,
                    !item.supported && { opacity: 0.3 }
                ]}>
                    {isSelected && <Icon name="check" size={16} color="#FFF" />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Icon name="close" size={24} color="#333" />
                        </TouchableOpacity>
                        <View style={styles.headerTitleGroup}>
                            <Text style={styles.headerLabel}>Select Channels</Text>
                            <Text style={styles.headerTitle}>{alarmLabel}</Text>
                        </View>
                        <TouchableOpacity onPress={handleSelectAll} style={styles.selectAllBtn}>
                            <Text style={styles.selectAllText}>
                                {selectedIds.length === channels.length ? "Deselect All" : "Select All"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color="#A83232" />
                        </View>
                    ) : (
                        <FlatList
                            data={channels}
                            renderItem={renderItem}
                            keyExtractor={item => item.id.toString()}
                            contentContainerStyle={styles.listContent}
                            ItemSeparatorComponent={() => <View style={styles.divider} />}
                        />
                    )}

                    {/* Bottom Action */}
                    <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                        <Text style={styles.confirmText}>Confirm ({selectedIds.length})</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </GradientBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 15,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backButton: { padding: 8 },
    headerTitleGroup: { flex: 1, marginLeft: 10 },
    headerLabel: { fontSize: 12, color: '#999', fontWeight: 'bold' },
    headerTitle: { fontSize: 18, color: '#A83232', fontWeight: 'bold' },
    selectAllBtn: { padding: 8 },
    selectAllText: { color: '#A83232', fontWeight: '600', fontSize: 13 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: 20, paddingBottom: 100 },
    channelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
    },
    channelInfo: { flexDirection: 'row', alignItems: 'center' },
    channelName: { fontSize: 16, color: '#333', fontWeight: '500' },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center'
    },
    checkCircleActive: { backgroundColor: '#A83232', borderColor: '#A83232' },
    checkCircleInactive: { backgroundColor: '#FFF', borderColor: '#DDD' },
    divider: { height: 1, backgroundColor: '#F0F0F0' },
    confirmButton: {
        backgroundColor: '#A83232',
        marginHorizontal: 20,
        marginBottom: 20,
        paddingVertical: 16,
        borderRadius: 15,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#A83232',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    confirmText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});

export default EventChannelSelection;
