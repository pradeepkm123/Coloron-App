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

type ExceptionAlarmListRouteProp = RouteProp<RootStackParamList, 'ExceptionAlarmList'>;

interface ExceptionItem {
    id: string;
    exceptionName: string;
    alarmOut: string;
    push: string;
    buzzer: string;
    popupMsg: string;
    email: string;
}

const ExceptionAlarmList: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<ExceptionAlarmListRouteProp>();
    const { deviceId, deviceName } = route.params;

    const exceptions: ExceptionItem[] = [
        { id: '1', exceptionName: 'IP Address Conflict', alarmOut: 'OFF', push: 'ON', buzzer: 'ON', popupMsg: 'ON', email: 'OFF' },
        { id: '2', exceptionName: 'Disk IO Error', alarmOut: 'OFF', push: 'ON', buzzer: 'ON', popupMsg: 'ON', email: 'OFF' },
        { id: '3', exceptionName: 'Disk Full', alarmOut: 'OFF', push: 'ON', buzzer: 'ON', popupMsg: 'ON', email: 'OFF' },
        { id: '4', exceptionName: 'Illegal Access', alarmOut: 'OFF', push: 'ON', buzzer: 'ON', popupMsg: 'ON', email: 'OFF' },
        { id: '5', exceptionName: 'No Disk', alarmOut: 'OFF', push: 'ON', buzzer: 'ON', popupMsg: 'ON', email: 'OFF' },
    ];

    const renderItem = ({ item }: { item: ExceptionItem }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.exceptionName}>{item.exceptionName}</Text>
                <TouchableOpacity
                    style={styles.configureBtn}
                    onPress={() => navigation.navigate('ExceptionAlarmConfig', {
                        deviceId,
                        deviceName,
                        exceptionName: item.exceptionName
                    })}
                >
                    <Text style={styles.configureText}>Configure</Text>
                    <Icon name="chevron-right" size={20} color="#999" />
                </TouchableOpacity>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.alarmOut}</Text>
                        <Text style={styles.lab}>Alarm-out</Text>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.push}</Text>
                        <Text style={styles.lab}>Push</Text>
                    </View>
                </View>
                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.buzzer}</Text>
                        <Text style={styles.lab}>Buzzer</Text>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.popupMsg}</Text>
                        <Text style={styles.lab}>Pop-up Message Box</Text>
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
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Icon name="chevron-left" size={32} color="#852d2dff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Exception Handling Settings</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    <FlatList
                        data={exceptions}
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
        fontSize: 18,
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
    exceptionName: {
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

export default ExceptionAlarmList;
