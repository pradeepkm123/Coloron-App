import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    FlatList,
    Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';
import { deviceStorage, Device } from '../utils/deviceStorage';

const RemoteDeviceList: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [devices, setDevices] = useState<Device[]>([]);

    useEffect(() => {
        const loadDevices = async () => {
            const storedDevices = await deviceStorage.getDevices();
            setDevices(storedDevices);
        };
        loadDevices();

        const unsubscribe = navigation.addListener('focus', loadDevices);
        return unsubscribe;
    }, [navigation]);

    const renderItem = ({ item }: { item: Device }) => (
        <TouchableOpacity
            style={styles.deviceItem}
            onPress={() => navigation.navigate('RemoteFunctionPanel', { deviceId: item.id, deviceName: item.name })}
        >
            <View style={styles.deviceRow}>
                <Text style={styles.deviceName}>{item.name}</Text>
                <Icon name="chevron-right" size={24} color="#ccc" />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#A83232" translucent />
            <GradientBackground>
                <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="chevron-left" size={28} color="#852d2dff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Remote Setting</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    <View style={styles.content}>
                        {devices.length > 0 ? (
                            <FlatList
                                data={devices}
                                renderItem={renderItem}
                                keyExtractor={item => String(item.id)}
                                contentContainerStyle={styles.listContent}
                            />
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Icon name="server-off" size={48} color="#ccc" />
                                <Text style={styles.emptyText}>No devices available</Text>
                            </View>
                        )}
                    </View>
                </SafeAreaView>
            </GradientBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        elevation: 0,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#852d2dff',
    },
    backButton: {
        padding: 5,
    },
    content: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    listContent: {
        paddingTop: 10,
    },
    deviceItem: {
        backgroundColor: '#FFF',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    deviceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    deviceName: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 50,
    },
    emptyText: {
        marginTop: 10,
        color: '#999',
        fontSize: 16,
    }
});

export default RemoteDeviceList;
