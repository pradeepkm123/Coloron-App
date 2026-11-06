import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    Modal,
    FlatList
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';

type ModeSettingsRouteProp = RouteProp<RootStackParamList, 'ModeSettings'>;

const ModeSettings: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<ModeSettingsRouteProp>();
    const { deviceId, deviceName } = route.params || {};


    const [mode, setMode] = useState('Auto');
    const [recordType, setRecordType] = useState('Always(24x7) Record+Motion Record+Sensor Record');
    const [recordTime, setRecordTime] = useState('Manual');

    const [modeModalVisible, setModeModalVisible] = useState(false);
    const [customModalVisible, setCustomModalVisible] = useState(false);
    const [timeModalVisible, setTimeModalVisible] = useState(false);

    const recordTypes = [
        'Motion Record',
        'Sensor Record',
        'Motion Record+Sensor Record',
        'Always(24x7) Record+Motion Record',
        'Always(24x7) Record+Sensor Record',
        'Always(24x7) Record+Motion Record+Sensor Record',
        'Always(24x7) Record+Motion Record+Sensor Record+AI Record'
    ];

    const customModes = [
        'Motion Record',
        'Sensor Record',
        'Always(24x7) Record',
        'AI Record',
        'POS Record'
    ];

    const timeOptions = [
        '1 Min', '5 Mins', '10 Mins', '20 Mins', '30 Mins', '40 Mins', '50 Mins', '1 Hr', '2 Hrs', 'Manual'
    ];

    const renderRadioItem = (label: string, selected: boolean, onPress: () => void) => (
        <TouchableOpacity style={styles.radioRow} onPress={onPress}>
            <Icon
                name={selected ? "radiobox-marked" : "radiobox-blank"}
                size={22}
                color={selected ? "#822020" : "#CED4DA"}
            />
            <Text style={styles.radioLabel}>{label}</Text>
        </TouchableOpacity>
    );

    const renderModalSelector = (title: string, options: string[], visible: boolean, setVisible: (v: boolean) => void, onSelect: (v: string) => void) => (
        <Modal visible={visible} transparent animationType="fade">
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
                <View style={[styles.modalContent, { width: '80%' }]}>
                    <FlatList
                        data={options}
                        keyExtractor={item => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.modalItem} onPress={() => { onSelect(item); setVisible(false); }}>
                                <Text style={styles.modalItemText}>{item}</Text>
                                <View style={styles.modalDivider} />
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
    const [selectedScheduleField, setSelectedScheduleField] = useState<{ camId: string, field: string } | null>(null);

    const [cameraSchedules, setCameraSchedules] = useState([
        { id: '1', name: 'DATA ENTRY', sensor: '24x7', motion: '24x7', timed: '24x7', analytics: '<None>', pos: '24x5' },
        { id: '2', name: 'RECEPTION', sensor: '24x2', motion: '<None>', timed: '<None>', analytics: '<None>', pos: '<None>' },
    ]);

    const scheduleOptions = ['24x7', '24x5', '24x2', '<None>'];

    const handleScheduleSelect = (value: string) => {
        if (selectedScheduleField) {
            setCameraSchedules(prev => prev.map(cam =>
                cam.id === selectedScheduleField.camId
                    ? { ...cam, [selectedScheduleField.field]: value }
                    : cam
            ));
        }
        setScheduleModalVisible(false);
    };

    const renderScheduleSelector = (camId: string, field: string, value: string, label: string) => (
        <View style={styles.scheduleBlock}>
            <TouchableOpacity
                style={styles.scheduleBox}
                onPress={() => {
                    setSelectedScheduleField({ camId, field });
                    setScheduleModalVisible(true);
                }}
            >
                <Text style={styles.scheduleValue}>{value}</Text>
                <Icon name="menu-down" size={20} color="#666" />
            </TouchableOpacity>
            <Text style={styles.scheduleLabel}>{label}</Text>
        </View>
    );

    const renderManualCameraItem = (item: any, index: number) => (
        <View style={styles.cameraScheduleCard}>
            <View style={styles.camIndexContainer}>
                <Text style={styles.camIndexText}>{index + 1}</Text>
            </View>
            <View style={styles.camInfoContainer}>
                <View style={styles.camRow}>
                    <View style={styles.camNameBlock}>
                        <Text style={styles.camNameValue}>{item.name}</Text>
                        <Text style={styles.camNameLabel}>Camera Name</Text>
                    </View>
                    {renderScheduleSelector(item.id, 'sensor', item.sensor, 'Sensor Record Schedule')}
                </View>
                <View style={[styles.camRow, { marginTop: 10 }]}>
                    {renderScheduleSelector(item.id, 'motion', item.motion, 'Motion Record Schedule')}
                    {renderScheduleSelector(item.id, 'timed', item.timed, 'Timed Record Schedule')}
                </View>
                <View style={[styles.camRow, { marginTop: 10 }]}>
                    {renderScheduleSelector(item.id, 'analytics', item.analytics, 'Analytics Record Schedule')}
                    {renderScheduleSelector(item.id, 'pos', item.pos, 'POS Record Schedule')}
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="chevron-left" size={32} color="#852d2dff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Mode Settings</Text>
                        <TouchableOpacity>
                            <Icon name="content-save" size={28} color="#852d2dff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Record Mode</Text>
                            <View style={styles.inputRow}>
                                <Text style={styles.label}>Mode</Text>
                                <TouchableOpacity style={styles.selector} onPress={() => setModeModalVisible(true)}>
                                    <Text style={styles.selectorText}>{mode}</Text>
                                    <Icon name="menu-down" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>

                            {mode === 'Auto' ? (
                                <>
                                    <View style={styles.optionsContainer}>
                                        {recordTypes.map(type => (
                                            renderRadioItem(type, recordType === type, () => setRecordType(type))
                                        ))}
                                    </View>

                                    <TouchableOpacity
                                        style={styles.advancedButton}
                                        onPress={() => setCustomModalVisible(true)}
                                    >
                                        <Text style={styles.advancedButtonText}>Advanced</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <View style={styles.manualListContainer}>
                                    {cameraSchedules.map((cam, idx) => (
                                        <View key={cam.id}>
                                            {renderManualCameraItem(cam, idx)}
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Manual Record Settings</Text>
                            <View style={styles.inputRow}>
                                <Text style={styles.label}>Record Time</Text>
                                <TouchableOpacity style={styles.selector} onPress={() => setTimeModalVisible(true)}>
                                    <Text style={styles.selectorText}>{recordTime}</Text>
                                    <Icon name="menu-down" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Mode Modal */}
                    {renderModalSelector('Mode', ['Manual', 'Auto'], modeModalVisible, setModeModalVisible, setMode)}

                    {/* Time Modal */}
                    {renderModalSelector('Record Time', timeOptions, timeModalVisible, setTimeModalVisible, setRecordTime)}

                    {/* Schedule Selector Modal (Image 3) */}
                    <Modal visible={scheduleModalVisible} transparent animationType="fade">
                        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setScheduleModalVisible(false)}>
                            <View style={[styles.modalContent, { width: '80%', backgroundColor: '#fff5f5ff' }]}>
                                {scheduleOptions.map((opt, idx) => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.scheduleModalItem, idx === 0 && { backgroundColor: '#670000ff' }]}
                                        onPress={() => handleScheduleSelect(opt)}
                                    >
                                        <Text style={[styles.scheduleModalItemText, idx === 0 && { color: '#FFF' }]}>{opt}</Text>
                                        {idx < scheduleOptions.length - 1 && <View style={styles.modalDivider} />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </TouchableOpacity>
                    </Modal>

                    {/* Custom Record Mode Modal */}
                    <Modal visible={customModalVisible} transparent animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={styles.customModalContent}>
                                <View style={styles.customModalHeader}>
                                    <Text style={styles.customModalHeaderText}>Custom Record Mode</Text>
                                </View>
                                <View style={styles.customModalBody}>
                                    {customModes.map(m => (
                                        <View key={m} style={styles.checkboxRow}>
                                            <Icon name="checkbox-blank-circle-outline" size={24} color="#666" />
                                            <Text style={styles.checkboxLabel}>{m}</Text>
                                        </View>
                                    ))}
                                </View>
                                <View style={styles.customModalFooter}>
                                    <TouchableOpacity style={styles.modalFooterBtn} onPress={() => setCustomModalVisible(false)}>
                                        <Text style={styles.modalFooterBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.modalFooterBtn, styles.modalFooterBtnPrimary]} onPress={() => setCustomModalVisible(false)}>
                                        <Text style={styles.modalFooterBtnText}>Add</Text>
                                    </TouchableOpacity>
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
        backgroundColor: '#FFF',
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
        backgroundColor: 'transparent',
    },
    headerTitle: {
        color: '#852d2dff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 5,
    },
    content: {
        flex: 1,
        paddingTop: 10,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        height: 44,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    label: {
        fontSize: 16,
        color: '#333',
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 10,
        flex: 1,
        justifyContent: 'flex-end',
    },
    selectorText: {
        fontSize: 16,
        color: '#333',
        marginRight: 5,
    },
    optionsContainer: {
        paddingHorizontal: 15,
        paddingTop: 10,
    },
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
    },
    radioLabel: {
        fontSize: 15,
        color: '#333',
        marginLeft: 10,
    },
    advancedButton: {
        backgroundColor: '#670000ff',
        width: 100,
        height: 36,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 15,
        marginTop: 15,
    },
    advancedButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderRadius: 4,
        maxHeight: '70%',
    },
    modalItem: {
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
    },
    modalDivider: {
        height: 1,
        backgroundColor: '#EEE',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    customModalContent: {
        width: '80%',
        backgroundColor: '#FFF',
        borderRadius: 12,
        overflow: 'hidden',
    },
    customModalHeader: {
        backgroundColor: '#ff4a4aff',
        paddingVertical: 12,
        alignItems: 'center',
    },
    customModalHeaderText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '500',
    },
    customModalBody: {
        padding: 20,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    checkboxLabel: {
        fontSize: 16,
        color: '#303133',
        marginLeft: 12,
    },
    customModalFooter: {
        flexDirection: 'row',
        padding: 15,
        justifyContent: 'space-between',
    },
    modalFooterBtn: {
        flex: 1,
        height: 44,
        backgroundColor: '#ff4a4aff',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 5,
    },
    modalFooterBtnPrimary: {
        backgroundColor: '#ff4a4aff',
    },
    modalFooterBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '500',
    },
    manualListContainer: {
        paddingTop: 10,
    },
    cameraScheduleCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        marginBottom: 8,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    camIndexContainer: {
        width: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    camIndexText: {
        fontSize: 28,
        color: '#DDD',
        fontWeight: 'bold',
    },
    camInfoContainer: {
        flex: 1,
        paddingLeft: 10,
        borderLeftWidth: 1,
        borderLeftColor: '#EEE',
    },
    camRow: {
        flexDirection: 'row',
    },
    camNameBlock: {
        flex: 1,
    },
    camNameValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#000',
    },
    camNameLabel: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    scheduleBlock: {
        flex: 1,
    },
    scheduleBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 4,
        paddingHorizontal: 8,
        height: 32,
    },
    scheduleValue: {
        fontSize: 14,
        color: '#333',
    },
    scheduleLabel: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    scheduleModalItem: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        backgroundColor: '#FFF',
    },
    scheduleModalItemText: {
        fontSize: 16,
        color: '#333',
    }
});

export default ModeSettings;
