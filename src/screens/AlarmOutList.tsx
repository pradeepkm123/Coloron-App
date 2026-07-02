import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GradientBackground from '../Component/GradientBackground';

type AlarmOutListRouteProp = RouteProp<RootStackParamList, 'AlarmOutList'>;

interface AlarmOutItem {
    id: string;
    alias: string;
    camera: string;
    schedule: string;
    delay: string;
}

const AlarmOutList: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<AlarmOutListRouteProp>();
    const { deviceId, deviceName } = route.params;

    const alarmOuts: AlarmOutItem[] = [
        { id: '1', alias: 'AlarmOut1', camera: 'Local-1', schedule: '24x7', delay: '10 Secs' },
        { id: '2', alias: 'AlarmOut1', camera: 'SECURA', schedule: '24x7', delay: '10 Secs' },
        { id: '3', alias: 'AlarmOut1', camera: 'PTZ', schedule: '24x7', delay: '10 Secs' },
        { id: '4', alias: 'AlarmOut1', camera: 'COLOR ON', schedule: '24x7', delay: '10 Secs' },
    ];

    const renderItem = ({ item }: { item: AlarmOutItem }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.aliasText}>{item.alias}</Text>
                <TouchableOpacity
                    style={styles.configureBtn}
                    onPress={() => navigation.navigate('AlarmOutConfig', {
                        deviceId,
                        deviceName,
                        alarmName: item.alias
                    })}
                >
                    <Text style={styles.configureBtnText}>Configure</Text>
                    <Icon name="chevron-right" size={20} color="#999" />
                </TouchableOpacity>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.valText}>{item.schedule}</Text>
                        <Text style={styles.labText}>Schedule</Text>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.valText}>{item.camera}</Text>
                        <Text style={styles.labText}>Camera</Text>
                    </View>
                </View>
                <View style={[styles.row, { marginTop: 10 }]}>
                    <View style={styles.col}>
                        <Text style={styles.valText}>{item.delay}</Text>
                        <Text style={styles.labText}>Delay</Text>
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
                        <Text style={styles.headerTitle}>Alarm-out</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    <FlatList
                        data={alarmOuts}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                </SafeAreaView>
            </GradientBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eef1f4ff',
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
    card: {
        backgroundColor: '#FFF',
        marginBottom: 10,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    aliasText: {
        fontSize: 16,
        color: '#999',
    },
    configureBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    configureBtnText: {
        fontSize: 16,
        color: '#666',
        marginRight: 2,
    },
    cardBody: {
        padding: 15,
    },
    row: {
        flexDirection: 'row',
    },
    col: {
        flex: 1,
    },
    valText: {
        fontSize: 18,
        color: '#000',
        fontWeight: '400',
    },
    labText: {
        fontSize: 14,
        color: '#999',
        marginTop: 2,
    }
});

export default AlarmOutList;
