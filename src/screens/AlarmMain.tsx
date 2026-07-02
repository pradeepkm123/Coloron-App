import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GradientBackground from '../Component/GradientBackground';

type AlarmMainRouteProp = RouteProp<RootStackParamList, 'AlarmMain'>;

const AlarmMain: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<AlarmMainRouteProp>();
    const { deviceId, deviceName } = route.params;

    const renderMenuItem = (title: string, onPress: () => void) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <Text style={styles.menuItemText}>{title}</Text>
            <Icon name="chevron-right" size={24} color="#CCC" />
        </TouchableOpacity>
    );

    const renderSectionHeader = (title: string) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderTitle}>{title}</Text>
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
                        <Text style={styles.headerTitle}>Alarm</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {renderSectionHeader('Event Notification')}
                        {renderMenuItem('Alarm-out', () => navigation.navigate('AlarmOutList', { deviceId, deviceName }))}
                        <View style={styles.divider} />
                        {renderMenuItem('Display', () => navigation.navigate('AlarmDisplayConfig', { deviceId, deviceName }))}
                        <View style={styles.divider} />
                        {renderMenuItem('Buzzer', () => navigation.navigate('AlarmBuzzerConfig', { deviceId, deviceName }))}
                        <View style={styles.divider} />
                        {renderMenuItem('Push Message', () => navigation.navigate('AlarmPushConfig', { deviceId, deviceName }))}

                        {renderSectionHeader('Motion Alarm')}
                        {renderMenuItem('Alarm Handling Settings', () => navigation.navigate('MotionAlarmList', { deviceId, deviceName }))}

                        {renderSectionHeader('Sensor Alarm')}
                        {renderMenuItem('Alarm Handling Settings', () => navigation.navigate('SensorAlarmList', { deviceId, deviceName }))}

                        {renderSectionHeader('Exception Alarm')}
                        {renderMenuItem('IPC Offline', () => navigation.navigate('IPCOfflineList', { deviceId, deviceName }))}
                        <View style={styles.divider} />
                        {renderMenuItem('Exception Handling Settings', () => navigation.navigate('ExceptionAlarmList', { deviceId, deviceName }))}

                        <View style={{ height: 20 }} />
                    </ScrollView>
                </SafeAreaView>
            </GradientBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#213543ff',
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
    content: {
        flex: 1,
    },
    sectionHeader: {
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: '#efe7e7ff',
    },
    sectionHeaderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 15,
        backgroundColor: '#FFF',
    },
    menuItemText: {
        fontSize: 16,
        color: '#333',
    },
    divider: {
        height: 0.5,
        backgroundColor: '#EEE',
        marginLeft: 15,
    },
});

export default AlarmMain;
