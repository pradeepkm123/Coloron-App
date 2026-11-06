import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    FlatList,
    Modal,
    TextInput,
    ScrollView
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';
import { deviceStorage, Device } from '../utils/deviceStorage';
import { DeviceStatusManager, DeviceStatus } from '../utils/DeviceStatusManager';

const EditCamera: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const [devices, setDevices] = useState<Device[]>([]);
    const [deviceStatuses, setDeviceStatuses] = useState<Record<string, DeviceStatus>>({});

    useFocusEffect(
        React.useCallback(() => {
            const loadDevices = async () => {
                const storedDevices = await deviceStorage.getDevicesWithChannels();
                setDevices(storedDevices);

                storedDevices.forEach(d => {
                    DeviceStatusManager.startMonitoring(d, (id, status) => {
                        setDeviceStatuses(prev => ({ ...prev, [id]: status }));
                    });
                });
            };
            loadDevices();
        }, [])
    );



    const renderHeader = () => (
        <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { width: 40 }]}>No.</Text>
            <Text style={[styles.headerCell, { width: 150 }]}>Camera Name</Text>
            <Text style={[styles.headerCell, { width: 120 }]}>Address</Text>
            <Text style={[styles.headerCell, { width: 80 }]}>Port</Text>
            <Text style={[styles.headerCell, { width: 80 }]}>Status</Text>
            <Text style={[styles.headerCell, { width: 100 }]}>Protocol</Text>
            <Text style={[styles.headerCell, { width: 120 }]}>Model</Text>

        </View>
    );

    const renderItem = ({ item, index }: { item: Device, index: number }) => {
        const isOnline = deviceStatuses[item.id] === 'Online';
        return (
            <View style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#F8F9FA' : '#FFF' }]}>
                <Text style={[styles.cell, { width: 40, textAlign: 'center' }]}>{index + 1}</Text>
                <Text style={[styles.cell, { width: 150 }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.cell, { width: 120 }]} numberOfLines={1}>{item.ip || item.sn}</Text>
                <Text style={[styles.cell, { width: 80, textAlign: 'center' }]}>{item.port}</Text>
                <Text style={[styles.cell, { width: 80, textAlign: 'center', color: isOnline ? '#4CAF50' : '#FF3B30', fontWeight: 'bold' }]}>
                    {deviceStatuses[item.id] || 'Offline'}
                </Text>
                <Text style={[styles.cell, { width: 100, textAlign: 'center' }]}>{item.protocol === 'TVT' ? 'Secura' : item.protocol || 'Secura'}</Text>
                <Text style={[styles.cell, { width: 120, textAlign: 'center' }]} numberOfLines={1}>{item.model || '-'}</Text>

            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="chevron-left" size={32} color="#852d2dff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Device Table View</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={styles.cardContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                            <View>
                                {renderHeader()}
                                <FlatList
                                    data={devices}
                                    renderItem={renderItem}
                                    keyExtractor={item => String(item.id)}
                                    showsVerticalScrollIndicator={false}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </GradientBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E9EEF2',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        justifyContent: 'space-between',
        backgroundColor: 'transparent',
    },
    headerTitle: {
        color: '#852d2dff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 5,
    },
    cardContainer: {
        flex: 1,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        marginTop: 10,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F1F3F5',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    headerCell: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#495057',
        textAlign: 'center',
        paddingHorizontal: 5,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F3F5',
    },
    cell: {
        fontSize: 13,
        color: '#343A40',
        paddingHorizontal: 5,
    },
    actionCell: {
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default EditCamera;
