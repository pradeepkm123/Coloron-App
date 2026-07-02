import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    FlatList
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';

type ViewRecordStatusRouteProp = RouteProp<RootStackParamList, 'ViewRecordStatus'>;

interface CameraStatus {
    id: string;
    index: number;
    name: string;
    recordStatus: string;
    fps: string;
    bitrateType: string;
    quality: string;
    maxBitrate: string;
    resolution: string;
    recordType: string;
    statusColor?: string;
}

const ViewRecordStatus: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<ViewRecordStatusRouteProp>();
    const { deviceId, deviceName } = route.params;

    const [cameras, setCameras] = useState<CameraStatus[]>([
        { id: '1', index: 1, name: 'DATA ENTRY', recordStatus: 'Record', fps: '25', bitrateType: 'VBR', quality: 'Higher', maxBitrate: '2048Kbps', resolution: '1920x1080', recordType: 'Schedule' },
        { id: '2', index: 2, name: 'DATA ENTRY', recordStatus: 'Record', fps: '25', bitrateType: 'CBR', quality: '--', maxBitrate: '512Kbps', resolution: '704x576', recordType: 'Schedule' },
        { id: '3', index: 3, name: 'RECEPTION', recordStatus: 'Record Off', fps: '--', bitrateType: '--', quality: '--', maxBitrate: '--', resolution: '--', recordType: '--' },
        { id: '4', index: 0, name: 'IPCamera', recordStatus: 'Exception', fps: '', bitrateType: '', quality: '', maxBitrate: '', resolution: '', recordType: '', statusColor: 'red' },
    ]);

    const renderStatusItem = ({ item }: { item: CameraStatus }) => (
        <View style={styles.cameraCard}>
            <View style={styles.indexCol}>
                <Text style={styles.indexText}>{item.index !== 0 ? item.index : ''}</Text>
            </View>
            <View style={styles.infoCol}>
                <View style={styles.row}>
                    <View style={styles.dataBlock}>
                        <Text style={styles.dataValue}>{item.name}</Text>
                        <Text style={styles.dataLabel}>Camera Name</Text>
                    </View>
                    <View style={styles.dataBlock}>
                        <Text style={[styles.dataValue, item.statusColor ? { color: item.statusColor } : (item.recordStatus === 'Record' ? { color: '#333' } : { color: '#999' })]}>
                            {item.recordStatus}
                        </Text>
                        <Text style={styles.dataLabel}>Record Status</Text>
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.dataBlock}>
                        <Text style={styles.dataValue}>{item.fps}</Text>
                        <Text style={styles.dataLabel}>FPS</Text>
                    </View>
                    <View style={styles.dataBlock}>
                        <Text style={styles.dataValue}>{item.bitrateType}</Text>
                        <Text style={styles.dataLabel}>Bitrate Type</Text>
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.dataBlock}>
                        <Text style={styles.dataValue}>{item.quality}</Text>
                        <Text style={styles.dataLabel}>Quality</Text>
                    </View>
                    <View style={styles.dataBlock}>
                        <Text style={styles.dataValue}>{item.maxBitrate}</Text>
                        <Text style={styles.dataLabel}>Max Bitrate</Text>
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.dataBlock}>
                        <Text style={styles.dataValue}>{item.resolution}</Text>
                        <Text style={styles.dataLabel}>Resolution</Text>
                    </View>
                    <View style={styles.dataBlock}>
                        <Text style={styles.dataValue}>{item.recordType}</Text>
                        <Text style={styles.dataLabel}>Type Of Record</Text>
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
                        <Text style={styles.headerTitle}>View Record Status</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    <FlatList
                        data={cameras}
                        renderItem={renderStatusItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                    />

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.refreshBtn}>
                            <Text style={styles.refreshText}>refresh</Text>
                        </TouchableOpacity>
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
        fontSize: 18,
        fontWeight: 'bold',
        color: '#852d2dff',
    },
    backBtn: {
        padding: 5,
    },
    listContent: {
        paddingTop: 10,
    },
    cameraCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        marginBottom: 10,
        paddingVertical: 15,
    },
    indexCol: {
        width: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    indexText: {
        fontSize: 36,
        color: '#DDD',
        fontWeight: 'bold',
    },
    infoCol: {
        flex: 1,
        borderLeftWidth: 1,
        borderLeftColor: '#F0F0F0',
        paddingLeft: 10,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    dataBlock: {
        flex: 1,
        marginRight: 10,
    },
    dataValue: {
        fontSize: 15,
        color: '#333',
        height: 24,
        textAlignVertical: 'center',
        fontWeight: '500',
    },
    dataLabel: {
        fontSize: 11,
        color: '#999',
    },
    footer: {
        height: 60,
        backgroundColor: '#F5F7F9',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: 15,
        borderTopWidth: 1,
        borderTopColor: '#DDD',
    },
    refreshBtn: {
        backgroundColor: '#003567',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 4,
    },
    refreshText: {
        color: '#FFF',
        fontSize: 16,
    }
});

export default ViewRecordStatus;
