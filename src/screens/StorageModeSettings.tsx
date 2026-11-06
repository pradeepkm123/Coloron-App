import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';

type StorageModeSettingsRouteProp = RouteProp<RootStackParamList, 'StorageModeSettings'>;

interface GroupItem {
    id: string;
    diskCount: string;
    cameraCount: string;
}

const StorageModeSettings: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<StorageModeSettingsRouteProp>();
    const { deviceId, deviceName } = route.params || {};


    const [storageMode, setStorageMode] = useState('Group');

    const groups: GroupItem[] = [
        { id: '1', diskCount: '2', cameraCount: '15' },
        { id: '2', diskCount: '0', cameraCount: '0' },
    ];

    const renderGroupItem = ({ item }: { item: GroupItem }) => (
        <View style={styles.groupCard}>
            <View style={styles.groupHeader}>
                <Text style={styles.groupIndex}>Group {item.id}</Text>
                <TouchableOpacity
                    style={styles.configureBtn}
                    onPress={() => navigation.navigate('StorageGroupConfig', {
                        deviceId,
                        deviceName,
                        groupName: `Group${item.id}`
                    })}
                >
                    <Text style={styles.configureText}>Configure</Text>
                    <Icon name="chevron-right" size={20} color="#852d2dff" />
                </TouchableOpacity>
            </View>
            <View style={styles.groupBody}>
                <View style={styles.col}>
                    <Icon name="harddisk" size={24} color="#852d2dff" style={{ marginBottom: 5 }} />
                    <Text style={styles.val}>{item.diskCount}</Text>
                    <Text style={styles.lab}>Disk</Text>
                </View>
                <View style={styles.col}>
                    <Icon name="cctv" size={24} color="#852d2dff" style={{ marginBottom: 5 }} />
                    <Text style={styles.val}>{item.cameraCount}</Text>
                    <Text style={styles.lab}>Camera</Text>
                </View>
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
                            <Icon name="chevron-left" size={32} color="#852d2dff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Storage Mode</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    <View style={styles.modeSelector}>
                        <Text style={styles.modeLabel}>Storage Mode</Text>
                        <TouchableOpacity style={styles.modeDropdown}>
                            <Text style={styles.modeText}>{storageMode}</Text>
                            <Icon name="menu-down" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={groups}
                        renderItem={renderGroupItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                    />
                </SafeAreaView>
            </GradientBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f2f5f7ff',
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
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#852d2dff',
    },
    backBtn: {
        padding: 5,
    },
    modeSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: 'rgba(255,255,255,0.7)',
        marginBottom: 10,
    },
    modeLabel: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
    },
    modeDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#CCC',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 40,
        minWidth: 120,
        backgroundColor: '#FFF',
        justifyContent: 'space-between',
    },
    modeText: {
        fontSize: 15,
        color: '#333',
    },
    listContent: {
        paddingBottom: 20,
    },
    groupCard: {
        backgroundColor: '#FFF',
        marginBottom: 12,
        marginHorizontal: 15,
        borderRadius: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        overflow: 'hidden',
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
        backgroundColor: '#FCFCFC',
    },
    groupIndex: {
        fontSize: 17,
        color: '#333',
        fontWeight: 'bold',
    },
    configureBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    configureText: {
        fontSize: 14,
        color: '#852d2dff',
        fontWeight: '600',
        marginRight: 2,
    },
    groupBody: {
        flexDirection: 'row',
        paddingVertical: 20,
        paddingHorizontal: 10,
    },
    col: {
        flex: 1,
        alignItems: 'center',
    },
    val: {
        fontSize: 22,
        color: '#333',
        fontWeight: 'bold',
    },
    lab: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
        textTransform: 'uppercase',
    }
});

export default StorageModeSettings;
