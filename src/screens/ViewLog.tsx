import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    Modal,
    FlatList,
    SafeAreaView,
    Dimensions
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GradientBackground from '../Component/GradientBackground';

type ViewLogRouteProp = RouteProp<RootStackParamList, 'ViewLog'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_HEIGHT = 45;

interface LogEntry {
    id: number;
    mainType: string;
    user: string;
    logTime: string;
    content: string;
    details: string;
}

const ViewLog: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<ViewLogRouteProp>();
    const { deviceId, deviceName } = route.params;

    const [isSearching, setIsSearching] = useState(false);
    const [mainType, setMainType] = useState('All');
    const [content, setContent] = useState('All');
    const [startTime, setStartTime] = useState('21-02-2026 00:00:00');
    const [endTime, setEndTime] = useState('21-02-2026 23:59:59');

    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<{ field: string, options: string[], title: string } | null>(null);
    const [dtModalVisible, setDtModalVisible] = useState(false);
    const [activeField, setActiveField] = useState<'start' | 'end' | null>(null);

    // Temp state for picker
    const [tempDate, setTempDate] = useState({
        year: '2026', month: '02', day: '21', hour: '14', min: '50', sec: '00'
    });

    const mainTypeOptions = ['All', 'Alarm', 'Operation', 'Settings', 'Exception'];
    const years = ['2023', '2024', '2025', '2026', '2027', '2028', '2029'];
    const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const mins = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
    const secs = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    const [logs, setLogs] = useState<LogEntry[]>([
        { id: 1, mainType: 'Alarm', user: 'Admin', logTime: '2026-02-21 15:11:43', content: 'Motion Alarm', details: 'FirstFloorBay 1' },
        { id: 2, mainType: 'Alarm', user: 'Admin', logTime: '2026-02-21 15:11:42', content: 'Motion Alarm', details: 'Reception1' },
        { id: 3, mainType: 'Alarm', user: 'Admin', logTime: '2026-02-21 15:11:40', content: 'Motion Alarm', details: 'Corridor A' },
        { id: 4, mainType: 'Operation', user: 'Admin', logTime: '2026-02-21 15:10:05', content: 'Login', details: '192.168.1.15' },
    ]);

    const openModal = (field: string, options: string[], title: string) => {
        setModalConfig({ field, options, title });
        setModalVisible(true);
    };

    const handleSelect = (value: string) => {
        if (modalConfig?.field === 'mainType') setMainType(value);
        setModalVisible(false);
    };

    const openDtPicker = (field: 'start' | 'end') => {
        setActiveField(field);
        const current = field === 'start' ? startTime : endTime;
        const parts = current.split(' ');
        const dateParts = parts[0].split('-');
        const timeParts = parts[1].split(':');
        setTempDate({
            day: dateParts[0],
            month: dateParts[1],
            year: dateParts[2],
            hour: timeParts[0],
            min: timeParts[1],
            sec: timeParts[2]
        });
        setDtModalVisible(true);
    };

    const confirmDt = () => {
        const formatted = `${tempDate.day}-${tempDate.month}-${tempDate.year} ${tempDate.hour}:${tempDate.min}:${tempDate.sec}`;
        if (activeField === 'start') setStartTime(formatted);
        else setEndTime(formatted);
        setDtModalVisible(false);
    };

    const handleSearch = () => {
        setIsSearching(true);
    };

    const renderWheel = (data: string[], key: keyof typeof tempDate, label: string) => (
        <View style={styles.wheelContainer}>
            <Text style={styles.wheelLabel}>{label}</Text>
            <FlatList
                data={data}
                keyExtractor={(item) => key + item}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                getItemLayout={(data, index) => (
                    { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
                )}
                initialScrollIndex={data.indexOf(tempDate[key]) >= 0 ? data.indexOf(tempDate[key]) : 0}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                    if (data[index]) {
                        setTempDate(prev => ({ ...prev, [key]: data[index] }));
                    }
                }}
                renderItem={({ item }) => (
                    <View style={styles.wheelItem}>
                        <StatusBar barStyle="dark-content" />
                        <Text style={[styles.wheelText, tempDate[key] === item && styles.activeWheelText]}>{item}</Text>
                    </View>
                )}
                contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 1.5 }}
            />
        </View>
    );

    const renderLogItem = ({ item }: { item: LogEntry }) => (
        <View style={styles.logContainer}>
            <View style={styles.logIndexHeader}>
                <Text style={styles.logIndexText}>{item.id}</Text>
            </View>
            <View style={styles.logRow}>
                <Text style={styles.logLabel}>Main Type</Text>
                <Text style={styles.logValue}>{item.mainType}</Text>
            </View>
            <View style={styles.logRow}>
                <Text style={styles.logLabel}>User</Text>
                <Text style={styles.logValue}>{item.user}</Text>
            </View>
            <View style={styles.logRow}>
                <Text style={styles.logLabel}>Log Time</Text>
                <Text style={styles.logValue}>{item.logTime}</Text>
            </View>
            <View style={styles.logRow}>
                <Text style={styles.logLabel}>Content</Text>
                <Text style={styles.logValue}>{item.content}</Text>
            </View>
            <View style={[styles.logRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.logLabel}>Details</Text>
                <Text style={styles.logValue}>{item.details}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => isSearching ? setIsSearching(false) : navigation.goBack()}
                            style={styles.backBtn}
                        >
                            <Icon name="chevron-left" size={32} color="#852d2dff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>View Log</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    {isSearching ? (
                        <FlatList
                            data={logs}
                            renderItem={renderLogItem}
                            keyExtractor={item => item.id.toString()}
                            contentContainerStyle={styles.logList}
                            showsVerticalScrollIndicator={false}
                        />
                    ) : (
                        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                            <View style={styles.configCard}>
                                <View style={styles.fieldRow}>
                                    <Text style={styles.fieldLabel}>Main Type</Text>
                                    <TouchableOpacity style={styles.dropdown} onPress={() => openModal('mainType', mainTypeOptions, 'Main Type')}>
                                        <Text style={styles.dropdownText}>{mainType}</Text>
                                        <Icon name="menu-down" size={24} color="#666" />
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
                                    <Text style={styles.fieldLabel}>Content</Text>
                                    <View style={styles.menuRight}>
                                        <Text style={styles.contentValue}>{content}</Text>
                                        <Icon name="chevron-right" size={24} color="#CCC" />
                                    </View>
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.configCard, { marginTop: 15 }]}>
                                <TouchableOpacity style={styles.timeRow} onPress={() => openDtPicker('start')}>
                                    <Text style={styles.fieldLabel}>Start Time</Text>
                                    <Text style={styles.timeValue}>{startTime}</Text>
                                </TouchableOpacity>

                                <View style={styles.divider} />

                                <TouchableOpacity style={styles.timeRow} onPress={() => openDtPicker('end')}>
                                    <Text style={styles.fieldLabel}>End Time</Text>
                                    <Text style={styles.timeValue}>{endTime}</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.searchContainer}>
                                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                                    <Text style={styles.searchBtnText}>Search</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}

                    {/* Selection Modal */}
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

                    {/* DateTime Picker Modal */}
                    <Modal visible={dtModalVisible} transparent animationType="slide">
                        <View style={styles.dtModalOverlay}>
                            <View style={styles.dtPickerContainer}>
                                <View style={styles.dtHeader}>
                                    <TouchableOpacity onPress={() => setDtModalVisible(false)} style={styles.dtBtn}>
                                        <Text style={styles.dtCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={confirmDt} style={styles.dtBtn}>
                                        <Text style={styles.dtOkText}>OK</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.wheelBody}>
                                    <View style={styles.selectionIndicator} pointerEvents="none" />
                                    {renderWheel(years, 'year', 'Y')}
                                    {renderWheel(months, 'month', 'M')}
                                    {renderWheel(days, 'day', 'D')}
                                    {renderWheel(hours, 'hour', 'Hr')}
                                    {renderWheel(mins, 'min', 'Min')}
                                    {renderWheel(secs, 'sec', 'Sec')}
                                </View>
                            </View>
                        </View>
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
        paddingTop: 15,
    },
    configCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 10,
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    fieldLabel: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    dropdown: {
        flex: 1.5,
        flexDirection: 'row',
        backgroundColor: '#F9F9F9',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 4,
        paddingHorizontal: 10,
        height: 38,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownText: {
        fontSize: 16,
        color: '#333',
    },
    menuRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    contentValue: {
        fontSize: 16,
        color: '#999',
        marginRight: 5,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
    },
    timeValue: {
        fontSize: 16,
        color: '#555',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginHorizontal: 15,
    },
    searchContainer: {
        marginTop: 40,
        alignItems: 'center',
        marginBottom: 30,
    },
    searchBtn: {
        backgroundColor: '#912626ff',
        width: 120,
        height: 44,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
    },
    searchBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#fff5f5ff',
        borderRadius: 8,
        overflow: 'hidden',
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
    dtModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    dtPickerContainer: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        paddingBottom: 20,
    },
    dtHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingVertical: 5,
    },
    dtBtn: {
        padding: 15,
    },
    dtCancelText: {
        fontSize: 17,
        color: '#050505ff',
    },
    dtOkText: {
        fontSize: 17,
        color: '#000000ff',
        fontWeight: 'bold',
    },
    wheelBody: {
        flexDirection: 'row',
        height: ITEM_HEIGHT * 4.5,
        paddingHorizontal: 5,
        position: 'relative',
    },
    selectionIndicator: {
        position: 'absolute',
        top: ITEM_HEIGHT * 1.75,
        left: 0,
        right: 0,
        height: ITEM_HEIGHT,
        backgroundColor: '#F0F0F0',
        zIndex: -1,
    },
    wheelContainer: {
        flex: 1,
        alignItems: 'center',
    },
    wheelLabel: {
        fontSize: 12,
        color: '#999',
        marginBottom: 2,
        marginTop: 5,
    },
    wheelItem: {
        height: ITEM_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    wheelText: {
        fontSize: 16,
        color: '#BBB',
    },
    activeWheelText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 18,
    },
    // Log List Styles
    logList: {
        paddingBottom: 20,
    },
    logContainer: {
        backgroundColor: '#FFF',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    logIndexHeader: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    logIndexText: {
        fontSize: 16,
        color: '#333',
        fontWeight: 'bold',
    },
    logRow: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
        alignItems: 'center',
    },
    logLabel: {
        flex: 1,
        fontSize: 15,
        color: '#666',
    },
    logValue: {
        flex: 1.5,
        fontSize: 15,
        color: '#333',
        textAlign: 'right',
    }
});

export default ViewLog;
