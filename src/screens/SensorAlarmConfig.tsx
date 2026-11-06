import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Modal,
    FlatList,
    Switch,
    ScrollView,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GradientBackground from '../Component/GradientBackground';

type SensorAlarmConfigRouteProp = RouteProp<RootStackParamList, 'SensorAlarmConfig'>;

const { width } = Dimensions.get('window');

const SensorAlarmConfig: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<SensorAlarmConfigRouteProp>();
    const { deviceId, deviceName, sensorName } = route.params || {};


    const [schedule, setSchedule] = useState('24x7');
    const [type, setType] = useState('NO');
    const [duration, setDuration] = useState('30 Secs');
    const [popupVideoVal, setPopupVideoVal] = useState('OFF');

    const [enable, setEnable] = useState(true);
    const [push, setPush] = useState(true);
    const [buzzer, setBuzzer] = useState(false);
    const [popupMsg, setPopupMsg] = useState(true);
    const [email, setEmail] = useState(false);

    // Modal Control
    const [modalType, setModalType] = useState<'schedule' | 'type' | 'duration' | 'popupVideo' | 'record' | 'snapshot' | 'alarmOut' | 'preset' | null>(null);

    // Mock Data
    const channels = ['DATA ENTRY', 'RECEPTION', 'IPCamera', 'FirstFloorBay 1', 'Reception1', 'MainEntrance'];
    const alarmOuts = ['AlarmOut1', 'AlarmOut1', 'AlarmOut1', 'AlarmOut1'];
    const presets = [
        { camera: 'PTZ', options: ['None', 'Preset 1', 'Preset 2'] },
        { camera: 'COLOR ON', options: ['None', 'Preset 1', 'Preset 2'] }
    ];

    const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
    const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([]);
    const [selectedAlarmOuts, setSelectedAlarmOuts] = useState<string[]>([]);
    const [selectedPresets, setSelectedPresets] = useState<Record<string, string>>({
        'PTZ': 'None',
        'COLOR ON': 'None'
    });

    const toggleItem = (name: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
        setList(prev => prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]);
    };

    const renderDialogContent = () => {
        switch (modalType) {
            case 'schedule':
            case 'type':
            case 'duration':
            case 'popupVideo':
                let options: string[] = [];
                let currentVal = '';
                let setter: (v: string) => void = () => { };
                let title = '';

                if (modalType === 'schedule') {
                    options = ['24x7', '24x5', '24x2', '<None>'];
                    currentVal = schedule;
                    setter = setSchedule;
                    title = 'Schedule';
                } else if (modalType === 'type') {
                    options = ['NO', 'NC'];
                    currentVal = type;
                    setter = setType;
                    title = 'Type';
                } else if (modalType === 'duration') {
                    options = ['1 Sec', '2 Secs', '5 Secs', '10 Secs', '20 Secs', '30 Secs', '1 Min', '2 Mins'];
                    currentVal = duration;
                    setter = setDuration;
                    title = 'Duration';
                } else if (modalType === 'popupVideo') {
                    options = ['OFF', ...channels];
                    currentVal = popupVideoVal;
                    setter = setPopupVideoVal;
                    title = 'Pop-up Video';
                }

                return (
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}><Text style={styles.modalTitle}>{title}</Text></View>
                        <FlatList
                            data={options}
                            keyExtractor={i => i}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => { setter(item); setModalType(null); }}>
                                    <Text style={[styles.modalItemText, item === currentVal && { color: '#a22424ff', fontWeight: 'bold' }]}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                );
            case 'record':
            case 'snapshot':
            case 'alarmOut':
                const data = (modalType === 'record' || modalType === 'snapshot') ? channels : alarmOuts;
                const selected = modalType === 'record' ? selectedRecords : modalType === 'snapshot' ? selectedSnapshots : selectedAlarmOuts;
                const toggleSetter = modalType === 'record' ? setSelectedRecords : modalType === 'snapshot' ? setSelectedSnapshots : setSelectedAlarmOuts;
                const dialogTitle = modalType === 'record' ? 'Trigger Record' : modalType === 'snapshot' ? 'Trigger Snapshot' : 'Trigger Alarm-out';

                return (
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderRed}><Text style={styles.modalTitleWhite}>{dialogTitle}</Text></View>
                        <FlatList
                            data={data}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <View style={styles.checkItem}>
                                    <TouchableOpacity
                                        style={[styles.checkbox, selected.includes(item) && styles.checkboxSelected]}
                                        onPress={() => toggleItem(item, selected, toggleSetter)}
                                    >
                                        {selected.includes(item) && <Icon name="check" size={16} color="#a22424ff" />}
                                    </TouchableOpacity>
                                    <Text style={styles.checkText}>{item}</Text>
                                </View>
                            )}
                        />
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.modalBtn} onPress={() => setModalType(null)}><Text style={styles.modalBtnTextRed}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.modalBtn} onPress={() => setModalType(null)}><Text style={styles.modalBtnTextRed}>OK</Text></TouchableOpacity>
                        </View>
                    </View>
                );
            case 'preset':
                return (
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderRed}><Text style={styles.modalTitleWhite}>Trigger Preset</Text></View>
                        <View style={styles.presetTableHeader}>
                            <Text style={styles.tableHeaderLab}>Camera Name</Text>
                            <Text style={styles.tableHeaderLab}>Preset Name</Text>
                        </View>
                        {presets.map(cam => (
                            <View key={cam.camera} style={styles.presetTableRow}>
                                <Text style={styles.presetCamName}>{cam.camera}</Text>
                                <View style={styles.presetDropdown}>
                                    <Text>{selectedPresets[cam.camera]}</Text>
                                    <Icon name="menu-down" size={20} color="#666" />
                                </View>
                            </View>
                        ))}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.modalBtn} onPress={() => setModalType(null)}><Text style={styles.modalBtnTextRed}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.modalBtn} onPress={() => setModalType(null)}><Text style={styles.modalBtnTextRed}>OK</Text></TouchableOpacity>
                        </View>
                    </View>
                );
            default: return null;
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Icon name="chevron-left" size={32} color="#852d2dff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{sensorName}</Text>
                        <TouchableOpacity style={styles.saveBtn}>
                            <Icon name="content-save-outline" size={28} color="#852d2dff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        <View style={styles.configItem}>
                            <Text style={styles.label}>Schedule</Text>
                            <TouchableOpacity style={styles.dropdown} onPress={() => setModalType('schedule')}>
                                <Text style={styles.dropdownText}>{schedule}</Text>
                                <Icon name="menu-down" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.configItem}>
                            <Text style={styles.label}>Type</Text>
                            <TouchableOpacity style={styles.dropdown} onPress={() => setModalType('type')}>
                                <Text style={styles.dropdownText}>{type}</Text>
                                <Icon name="menu-down" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.configItem}>
                            <Text style={styles.label}>Duration</Text>
                            <TouchableOpacity style={styles.dropdown} onPress={() => setModalType('duration')}>
                                <Text style={styles.dropdownText}>{duration}</Text>
                                <Icon name="menu-down" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.configItem}>
                            <Text style={styles.label}>Pop-up Video</Text>
                            <TouchableOpacity style={styles.dropdown} onPress={() => setModalType('popupVideo')}>
                                <Text style={styles.dropdownText}>{popupVideoVal}</Text>
                                <Icon name="menu-down" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.navItem} onPress={() => setModalType('record')}>
                            <View>
                                <Text style={styles.label}>Record</Text>
                                <Text style={styles.subLabel}>{selectedRecords.join(', ') || 'OFF'}</Text>
                            </View>
                            <Icon name="chevron-right" size={24} color="#CCC" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.navItem} onPress={() => setModalType('snapshot')}>
                            <View>
                                <Text style={styles.label}>Snapshot</Text>
                                <Text style={styles.subLabel}>{selectedSnapshots.join(', ') || 'OFF'}</Text>
                            </View>
                            <Icon name="chevron-right" size={24} color="#CCC" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.navItem} onPress={() => setModalType('alarmOut')}>
                            <View>
                                <Text style={styles.label}>Alarm-out</Text>
                                <Text style={styles.subLabel}>{selectedAlarmOuts.join(', ') || 'OFF'}</Text>
                            </View>
                            <Icon name="chevron-right" size={24} color="#CCC" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.navItem} onPress={() => setModalType('preset')}>
                            <View>
                                <Text style={styles.label}>Preset Name</Text>
                                <Text style={styles.subLabel}>OFF</Text>
                            </View>
                            <Icon name="chevron-right" size={24} color="#CCC" />
                        </TouchableOpacity>

                        <View style={styles.switchItem}>
                            <Text style={styles.label}>Enable</Text>
                            <Switch value={enable} onValueChange={setEnable} trackColor={{ false: '#DDD', true: '#a01c1cff' }} thumbColor="#FFF" />
                        </View>
                        <View style={styles.switchItem}>
                            <Text style={styles.label}>Push</Text>
                            <Switch value={push} onValueChange={setPush} trackColor={{ false: '#DDD', true: '#a01c1cff' }} thumbColor="#FFF" />
                        </View>
                        <View style={styles.switchItem}>
                            <Text style={styles.label}>Buzzer</Text>
                            <Switch value={buzzer} onValueChange={setBuzzer} trackColor={{ false: '#DDD', true: '#a01c1cff' }} thumbColor="#FFF" />
                        </View>
                        <View style={styles.switchItem}>
                            <Text style={styles.label}>Pop-up Message Box</Text>
                            <Switch value={popupMsg} onValueChange={setPopupMsg} trackColor={{ false: '#DDD', true: '#a01c1cff' }} thumbColor="#FFF" />
                        </View>
                        <View style={styles.switchItem}>
                            <Text style={styles.label}>Email</Text>
                            <Switch value={email} onValueChange={setEmail} trackColor={{ false: '#DDD', true: '#a01c1cff' }} thumbColor="#FFF" />
                        </View>
                    </ScrollView>

                    <Modal visible={modalType !== null} transparent animationType="fade">
                        <View style={styles.overlay}>
                            {renderDialogContent()}
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
    saveBtn: {
        padding: 5,
    },
    content: {
        flex: 1,
    },
    configItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    switchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    label: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    subLabel: {
        fontSize: 14,
        color: '#999',
    },
    dropdown: {
        width: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#CCC',
        borderRadius: 4,
        paddingHorizontal: 10,
        height: 40,
    },
    dropdownText: {
        fontSize: 14,
        color: '#333',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#FFF',
        borderRadius: 8,
        overflow: 'hidden',
    },
    modalHeader: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    modalHeaderRed: {
        backgroundColor: '#a22424ff',
        paddingVertical: 15,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalTitleWhite: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    modalItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
    },
    checkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 0.5,
        borderBottomColor: '#EEE',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: '#CCC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    checkboxSelected: {
        borderColor: '#a22424ff',
    },
    checkText: {
        fontSize: 16,
        color: '#333',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    modalBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
    },
    modalBtnTextRed: {
        color: '#aa1f1fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    presetTableHeader: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#F8F9FA',
    },
    tableHeaderLab: {
        flex: 1,
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    presetTableRow: {
        flexDirection: 'row',
        padding: 15,
        alignItems: 'center',
        borderBottomWidth: 0.5,
        borderBottomColor: '#EEE',
    },
    presetCamName: {
        flex: 1,
        textAlign: 'center',
        fontSize: 14,
    },
    presetDropdown: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#CCC',
        borderRadius: 4,
        paddingHorizontal: 8,
        height: 30,
    }
});

export default SensorAlarmConfig;
