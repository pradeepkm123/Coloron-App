import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    FlatList,
    SafeAreaView
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GradientBackground from '../Component/GradientBackground';

type MotionAlarmListRouteProp = RouteProp<RootStackParamList, 'MotionAlarmList'>;

interface MotionAlarmItem {
    id: string;
    channelName: string;
    schedule: string;
    record: string;
    snapshot: string;
    push: string;
    alarmOut: string;
    presetName: string;
    buzzer: string;
    popupVideo: string;
    email: string;
}

const MotionAlarmList: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<MotionAlarmListRouteProp>();
    const { deviceId, deviceName } = route.params || {};


    const channels: MotionAlarmItem[] = [
        { id: '1', channelName: 'DATA ENTRY', schedule: '24x7', record: 'DATA ENTRY', snapshot: 'DATA ENTRY', push: 'ON', alarmOut: 'OFF', presetName: 'OFF', buzzer: 'OFF', popupVideo: 'OFF', email: 'OFF' },
        { id: '2', channelName: 'RECEPTION', schedule: '24x7', record: 'RECEPTION', snapshot: 'RECEPTION', push: 'ON', alarmOut: 'OFF', presetName: 'OFF', buzzer: 'OFF', popupVideo: 'OFF', email: 'OFF' },
        { id: '3', channelName: 'IPCamera', schedule: '24x7', record: 'IPCamera', snapshot: 'IPCamera', push: 'ON', alarmOut: 'OFF', presetName: 'OFF', buzzer: 'OFF', popupVideo: 'OFF', email: 'OFF' },
    ];

    const renderItem = ({ item }: { item: MotionAlarmItem }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.channelName}>{item.channelName}</Text>
                <TouchableOpacity
                    style={styles.configureBtn}
                    onPress={() => navigation.navigate('MotionAlarmConfig', {
                        deviceId,
                        deviceName,
                        channelName: item.channelName
                    })}
                >
                    <Text style={styles.configureText}>Configure</Text>
                    <Icon name="chevron-right" size={20} color="#999" />
                </TouchableOpacity>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.schedule}</Text>
                        <Text style={styles.lab}>Schedule</Text>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.record}</Text>
                        <Text style={styles.lab}>Record</Text>
                    </View>
                </View>
                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.snapshot}</Text>
                        <Text style={styles.lab}>Snapshot</Text>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.push}</Text>
                        <Text style={styles.lab}>Push</Text>
                    </View>
                </View>
                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.alarmOut}</Text>
                        <Text style={styles.lab}>Alarm-out</Text>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.presetName}</Text>
                        <Text style={styles.lab}>Preset Name</Text>
                    </View>
                </View>
                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.buzzer}</Text>
                        <Text style={styles.lab}>Buzzer</Text>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.popupVideo}</Text>
                        <Text style={styles.lab}>Pop-up Video</Text>
                    </View>
                </View>
                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.email}</Text>
                        <Text style={styles.lab}>Email</Text>
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
                        <Text style={styles.headerTitle}>Motion Alarm</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    <FlatList
                        data={channels}
                        renderItem={renderItem}
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
    channelName: {
        fontSize: 16,
        color: '#999',
    },
    configureBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    configureText: {
        fontSize: 14,
        color: '#666',
        marginRight: 5,
    },
    cardBody: {
        padding: 15,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    col: {
        flex: 1,
    },
    val: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    lab: {
        fontSize: 12,
        color: '#999',
    }
});

export default MotionAlarmList;
