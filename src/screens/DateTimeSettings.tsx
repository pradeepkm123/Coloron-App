import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    Switch,
    Modal,
    FlatList,
    SafeAreaView
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GradientBackground from '../Component/GradientBackground';

type DateTimeSettingsRouteProp = RouteProp<RootStackParamList, 'DateTimeSettings'>;

const DateTimeSettings: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<DateTimeSettingsRouteProp>();
    const { deviceId, deviceName } = route.params;

    const [syncCellphone, setSyncCellphone] = useState(false);
    const [systemTime, setSystemTime] = useState('21-02-2026 14:43:09');
    const [dateFormat, setDateFormat] = useState('Day/Month/Year');
    const [timeFormat, setTimeFormat] = useState('24-Hour');
    const [synchronous, setSynchronous] = useState('Manual');
    const [ntpServer, setNtpServer] = useState('time.windows.com');
    const [timeZone, setTimeZone] = useState('GMT+05:30 Bombay, Calcutta, Madras, New Delhi');
    const [dst, setDst] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<{ field: string, options: string[], title: string } | null>(null);

    const dateFormatOptions = ['Year/Month/Day', 'Month/Day/Year', 'Day/Month/Year'];
    const timeFormatOptions = ['12-Hour', '24-Hour'];
    const synchronousOptions = ['Manual', 'NTP'];
    const ntpServerOptions = ['time.windows.com', 'time.google.com', 'pool.ntp.org'];
    const timeZoneOptions = [
        'GMT-12 West of the International Dateline',
        'GMT-11 UTC',
        'GMT-10 Hawaii, Aleutian Islands',
        'GMT-09 Alaska',
        'GMT-08 Las Vegas, San Francisco, Vancouver',
        'GMT-07 Calgary, Denver, Salt Lake City',
        'GMT-06 Chicago, Dallas, New Orleans',
        'GMT-06 Mexico',
        'GMT-05 New York, Toronto, Washington',
        'GMT-05 Bogota, Lima, Quito',
        'GMT-05 Cuba',
        'GMT-04:30 Venezuela',
        'GMT-04 Atlantic Time',
        'GMT-04 Cuiaba',
        'GMT-04 Georgetown, La Paz, Manaus, San Juan',
        'GMT-04 Asuncion',
        'GMT-04 Santiago',
        'GMT-03:30 Newfoundland',
        'GMT-03 Brasilia, Sao Paulo',
        'GMT-03 Buenos Aires, Cayenne, Fortaleza',
        'GMT-03 Greenland',
        'GMT-03 Montevideo',
        'GMT-02 Noronha Islands, Mid-Atlantic',
        'GMT-01 Azores, Cape Verde Islands',
        'GMT Dublin, Lisbon, London, Monrovia, Reykjavik',
        'GMT+01 Amsterdam, Berlin, Rome, Stockholm, Warsaw',
        'GMT+01 Windhoek',
        'GMT+02 Athens, Kyiv, Helsinki, Amman, Riga',
        'GMT+02 Egypt',
        'GMT+02 Israel',
        'GMT+02 Johannesburg',
        'GMT+02 Lebanon',
        'GMT+02 Syria',
        'GMT+03 Istanbul, Baghdad, Minsk, Kuwait, Riyadh, Nairobi',
        'GMT+03 Moscow, St. Petersburg, Volgograd',
        'GMT+03:30 Iran',
        'GMT+04 Baku',
        'GMT+04 Abu Dhabi, Muscat, Yerevan, Tbilisi, Port Louis',
        'GMT+04:30 Kabul',
        'GMT+05 Islamabad, Karachi, Tashkent',
        'GMT+05:30 Bombay, Calcutta, New Delhi',
        'GMT+05:45 Kathmandu',
        'GMT+06 Astana, Dhaka, Yekaterinburg',
        'GMT+06:30 Yangon',
        'GMT+07 Bangkok, Hanoi, Jakarta, Novosibirsk',
        'GMT+08 Beijing, Hong Kong, Shanghai, Taipei',
        'GMT+09:00 Osaka, Sapporo, Tokyo',
        'GMT+11 Solomon Islands',
        'GMT+11:30 Norfolk',
        'GMT+12 Auckland, Wellington',
        'GMT+12 Fiji',
        'GMT+12 Kamchatka',
        'GMT+12 Marshall Islands, Magadan',
        'GMT+12:45 Chatham',
        'GMT+13 Tongatapu, Nuku\'alofa',
        'GMT+13 Samoa'
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const pad = (n: number) => n < 10 ? '0' + n : n;
            const formatted = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
            setSystemTime(formatted);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const openModal = (field: string, options: string[], title: string) => {
        setModalConfig({ field, options, title });
        setModalVisible(true);
    };

    const handleSelect = (value: string) => {
        if (modalConfig?.field === 'dateFormat') setDateFormat(value);
        if (modalConfig?.field === 'timeFormat') setTimeFormat(value);
        if (modalConfig?.field === 'synchronous') setSynchronous(value);
        if (modalConfig?.field === 'ntpServer') setNtpServer(value);
        if (modalConfig?.field === 'timeZone') setTimeZone(value);
        setModalVisible(false);
    };

    const renderDropdown = (label: string, value: string, onPress: () => void, disabled = false) => (
        <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TouchableOpacity
                style={[styles.dropdown, disabled && styles.disabledDropdown]}
                onPress={onPress}
                disabled={disabled}
            >
                <Text style={[styles.dropdownText, disabled && styles.disabledText]} numberOfLines={1}>{value}</Text>
                <Icon name="menu-down" size={24} color={disabled ? "#CCC" : "#666"} />
            </TouchableOpacity>
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
                        <Text style={styles.headerTitle}>Date and Time</Text>
                        <TouchableOpacity>
                            <Icon name="content-save" size={28} color="#852d2dff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.switchRow}>
                            <Text style={styles.fieldLabel}>Synchronize with cellphone time</Text>
                            <Switch
                                value={syncCellphone}
                                onValueChange={setSyncCellphone}
                                trackColor={{ false: '#DDD', true: 'rgba(170, 61, 61, 1)' }}
                                thumbColor={'#FFF'}
                            />
                        </View>

                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>System Time</Text>
                            <View style={styles.timeValueContainer}>
                                <Text style={[styles.timeText, syncCellphone && styles.disabledText]}>{systemTime}</Text>
                            </View>
                        </View>

                        {renderDropdown('Date Format', dateFormat, () => openModal('dateFormat', dateFormatOptions, 'Date Format'))}

                        {renderDropdown('Time Format', timeFormat, () => openModal('timeFormat', timeFormatOptions, 'Time Format'))}

                        {renderDropdown('Synchronous', synchronous, () => openModal('synchronous', synchronousOptions, 'Synchronous'))}

                        {synchronous === 'NTP' && renderDropdown('NTP Server', ntpServer, () => openModal('ntpServer', ntpServerOptions, 'NTP Server'))}

                        {renderDropdown('Time Zone', timeZone, () => openModal('timeZone', timeZoneOptions, 'Time Zone'))}

                        <View style={styles.switchRow}>
                            <Text style={styles.fieldLabel}>DST</Text>
                            <Switch
                                value={dst}
                                onValueChange={setDst}
                                trackColor={{ false: '#DDD', true: 'rgba(170, 61, 61, 1)' }}
                                thumbColor={'#FFF'}
                            />
                        </View>
                    </ScrollView>

                    <Modal visible={modalVisible} transparent animationType="fade">
                        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalHeaderTitle}>{modalConfig?.title}</Text>
                                </View>
                                <FlatList
                                    data={modalConfig?.options}
                                    keyExtractor={item => item}
                                    renderItem={({ item, index }) => (
                                        <TouchableOpacity
                                            style={[styles.modalItem, index === 0 && { backgroundColor: '#575757ff' }]}
                                            onPress={() => handleSelect(item)}
                                        >
                                            <Text style={[styles.modalItemText, index === 0 && { color: '#FFF' }]}>{item}</Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        </TouchableOpacity>
                    </Modal>
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
        fontSize: 20,
        fontWeight: 'bold',
        color: '#852d2dff',
    },
    backBtn: {
        padding: 5,
    },
    content: {
        flex: 1,
        paddingHorizontal: 15,
        paddingTop: 10,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    fieldLabel: {
        flex: 1.2,
        fontSize: 16,
        color: '#333',
    },
    dropdown: {
        flex: 1.8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 4,
        paddingHorizontal: 10,
        height: 40,
        backgroundColor: '#FFF',
    },
    disabledDropdown: {
        backgroundColor: '#F9F9F9',
        borderColor: '#EEE',
    },
    dropdownText: {
        fontSize: 15,
        color: '#333',
        flex: 1,
    },
    timeValueContainer: {
        flex: 1.8,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 5,
    },
    timeText: {
        fontSize: 16,
        color: '#333',
    },
    disabledText: {
        color: '#CCC',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#fff5f5ff',
        borderRadius: 8,
        overflow: 'hidden',
        maxHeight: '70%',
    },
    modalHeader: {
        backgroundColor: '#791e1eff',
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalHeaderTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalItem: {
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
    },
});

export default DateTimeSettings;
