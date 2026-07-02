import React from 'react';
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

type ViewDiskInfoRouteProp = RouteProp<RootStackParamList, 'ViewDiskInfo'>;

interface DiskInfoItem {
    id: string;
    diskName: string;
    capacity: string;
    freeSpace: string;
    status: string;
    source: string;
    recordPeriod: string;
}

const ViewDiskInfo: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<ViewDiskInfoRouteProp>();

    const disks: DiskInfoItem[] = [
        {
            id: '1',
            diskName: 'Disk1',
            capacity: '3726',
            freeSpace: '0',
            status: 'RW(Not Encrypted)',
            source: 'Local',
            recordPeriod: '28/01/2026~16/02/2...'
        },
        {
            id: '2',
            diskName: 'Disk2',
            capacity: '3726',
            freeSpace: '0',
            status: 'RW(Not Encrypted)',
            source: 'Local',
            recordPeriod: '09/01/2026~21/02/2...'
        }
    ];

    const renderDiskItem = ({ item }: { item: DiskInfoItem }) => (
        <View style={styles.diskCard}>
            <View style={styles.diskIndex}>
                <Text style={styles.indexText}>{item.id}</Text>
            </View>
            <View style={styles.diskDetails}>
                <View style={styles.detailRow}>
                    <View style={styles.detailCol}>
                        <Text style={styles.detailTitle}>{item.diskName}</Text>
                        <Text style={styles.detailLabel}>Disk</Text>
                    </View>
                    <View style={styles.detailCol}>
                        <Text style={styles.detailTitle}>{item.capacity}</Text>
                        <Text style={styles.detailLabel}>Capacity[GB]</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <View style={styles.detailCol}>
                        <Text style={styles.detailTitle}>{item.freeSpace}</Text>
                        <Text style={styles.detailLabel}>Free Space[GB]</Text>
                    </View>
                    <View style={styles.detailCol}>
                        <Text style={styles.detailTitle}>{item.status}</Text>
                        <Text style={styles.detailLabel}>Status</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <View style={styles.detailCol}>
                        <Text style={styles.detailTitle}>{item.source}</Text>
                        <Text style={styles.detailLabel}>Source</Text>
                    </View>
                    <View style={styles.detailCol}>
                        <Text style={styles.detailTitle}>{item.recordPeriod}</Text>
                        <Text style={styles.detailLabel}>Record Period</Text>
                    </View>
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
                        <Text style={styles.headerTitle}>View Disk Information</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    <FlatList
                        data={disks}
                        renderItem={renderDiskItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                    />

                    <TouchableOpacity style={styles.refreshBtn}>
                        <Text style={styles.refreshText}>refresh</Text>
                    </TouchableOpacity>
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
    listContent: {
        paddingVertical: 10,
    },
    diskCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        marginBottom: 10,
        paddingVertical: 15,
        paddingHorizontal: 10,
        marginHorizontal: 12,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    diskIndex: {
        width: 45,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#F0F0F0',
    },
    indexText: {
        fontSize: 32,
        color: '#852d2dff',
        fontWeight: 'bold',
        opacity: 0.2,
    },
    diskDetails: {
        flex: 1,
        paddingLeft: 15,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    detailCol: {
        flex: 1,
    },
    detailTitle: {
        fontSize: 15,
        color: '#333',
        fontWeight: '600',
    },
    detailLabel: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    refreshBtn: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#213543ff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 6,
        elevation: 4,
    },
    refreshText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});

export default ViewDiskInfo;
