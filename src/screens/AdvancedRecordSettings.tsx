import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    Switch,
    Modal,
    FlatList
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';

type AdvancedRecordSettingsRouteProp = RouteProp<RootStackParamList, 'AdvancedRecordSettings'>;

interface CameraRecordParams {
    id: string;
    index: number;
    name: string;
    preAlarm: string;
    postAlarm: string;
    expiration: string;
}

const AdvancedRecordSettings: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<AdvancedRecordSettingsRouteProp>();

    const [cycleRecord, setCycleRecord] = useState(true);
    const [streamMode, setStreamMode] = useState('Dual Stream Record');

    const [cameras, setCameras] = useState<CameraRecordParams[]>([
        { id: '1', index: 1, name: 'DATA ENTRY', preAlarm: '5 Secs', postAlarm: '10 Secs', expiration: 'Never Expire' },
        { id: '2', index: 2, name: 'RECEPTION', preAlarm: '5 Secs', postAlarm: '10 Secs', expiration: 'Never Expire' },
        { id: '3', index: 3, name: 'IPCamera', preAlarm: '5 Secs', postAlarm: '10 Secs', expiration: 'Never Expire' },
        { id: '4', index: 4, name: 'FirstFloorBay 1', preAlarm: '5 Secs', postAlarm: '10 Secs', expiration: 'Never Expire' },
    ]);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'stream' | 'preAlarm' | 'postAlarm' | 'expiration' | null>(null);
    const [selectedCamId, setSelectedCamId] = useState<string | null>(null);

    const streamOptions = ['Dual Stream Record', 'Main Stream Record', 'Sub Stream Record'];
    const preAlarmOptions = ['Disable Pre-alarm Record', '3 Secs', '5 Secs'];
    const postAlarmOptions = ['Disable Post-alarm Record', '5 Secs', '10 Secs', '30 Secs', '1 Min', '2 Mins', '5 Mins', '10 Mins'];
    const expirationOptions = ['Never Expire', '1 Day', '2 Days', '1 Week', '1 Month'];

    const openModal = (type: 'stream' | 'preAlarm' | 'postAlarm' | 'expiration', camId: string | null = null) => {
        setModalType(type);
        setSelectedCamId(camId);
        setModalVisible(true);
    };

    const handleSelect = (value: string) => {
        if (modalType === 'stream') {
            setStreamMode(value);
        } else if (selectedCamId) {
            setCameras(prev => prev.map(cam => {
                if (cam.id === selectedCamId) {
                    if (modalType === 'preAlarm') return { ...cam, preAlarm: value };
                    if (modalType === 'postAlarm') return { ...cam, postAlarm: value };
                    if (modalType === 'expiration') return { ...cam, expiration: value };
                }
                return cam;
            }));
        }
        setModalVisible(false);
    };

    const renderDropdownModal = () => {
        let options: string[] = [];
        let title = '';
        if (modalType === 'stream') { options = streamOptions; title = 'Stream Record'; }
        if (modalType === 'preAlarm') { options = preAlarmOptions; title = 'Pre-alarm Record'; }
        if (modalType === 'postAlarm') { options = postAlarmOptions; title = 'Post-alarm Record'; }
        if (modalType === 'expiration') { options = expirationOptions; title = 'Expiration Time'; }

        return (
            <Modal visible={modalVisible} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
                    <View style={styles.modalContent}>
                        {options.map((opt, idx) => (
                            <TouchableOpacity
                                key={opt}
                                style={[styles.modalItem, idx === 0 && { backgroundColor: '#670000ff' }]}
                                onPress={() => handleSelect(opt)}
                            >
                                <Text style={[styles.modalItemText, idx === 0 && { color: '#FFF' }]}>{opt}</Text>
                                {idx < options.length - 1 && <View style={styles.modalDivider} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        );
    };

    const renderCameraItem = ({ item }: { item: CameraRecordParams }) => (
        <View style={styles.cameraRow}>
            <View style={styles.indexContainer}>
                <Text style={styles.indexText}>{item.index}</Text>
            </View>
            <View style={styles.infoContainer}>
                <View style={styles.fieldRow}>
                    <View style={styles.fieldBlock}>
                        <Text style={styles.fieldValueBold}>{item.name}</Text>
                        <Text style={styles.fieldLabel}>Camera Name</Text>
                    </View>
                    <View style={styles.fieldBlock}>
                        <TouchableOpacity style={styles.dropdown} onPress={() => openModal('preAlarm', item.id)}>
                            <Text style={styles.dropdownText}>{item.preAlarm}</Text>
                            <Icon name="menu-down" size={20} color="#666" />
                        </TouchableOpacity>
                        <Text style={styles.fieldLabel}>Pre-alarm Record Time</Text>
                    </View>
                </View>
                <View style={[styles.fieldRow, { marginTop: 12 }]}>
                    <View style={styles.fieldBlock}>
                        <TouchableOpacity style={styles.dropdown} onPress={() => openModal('postAlarm', item.id)}>
                            <Text style={styles.dropdownText}>{item.postAlarm}</Text>
                            <Icon name="menu-down" size={20} color="#666" />
                        </TouchableOpacity>
                        <Text style={styles.fieldLabel}>Post-alarm Record Time</Text>
                    </View>
                    <View style={styles.fieldBlock}>
                        <TouchableOpacity style={styles.dropdown} onPress={() => openModal('expiration', item.id)}>
                            <Text style={styles.dropdownText}>{item.expiration}</Text>
                            <Icon name="menu-down" size={20} color="#666" />
                        </TouchableOpacity>
                        <Text style={styles.fieldLabel}>Expiration Time</Text>
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
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="chevron-left" size={32} color="#852d2dff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Advanced</Text>
                        <TouchableOpacity>
                            <Icon name="content-save" size={28} color="#852d2dff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Advanced Record Settings</Text>
                        </View>
                        <View style={styles.whiteCard}>
                            <View style={styles.switchRow}>
                                <Text style={styles.label}>Cycle Record</Text>
                                <Switch
                                    value={cycleRecord}
                                    onValueChange={setCycleRecord}
                                    trackColor={{ false: '#DDD', true: 'rgba(170, 61, 61, 1)' }}
                                    thumbColor={'#FFF'}
                                />
                            </View>
                            <View style={styles.divider} />
                            <TouchableOpacity style={styles.streamDropdown} onPress={() => openModal('stream')}>
                                <Text style={styles.dropdownText}>{streamMode}</Text>
                                <Icon name="menu-down" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Camera's Record Parameters</Text>
                        </View>
                        <FlatList
                            data={cameras}
                            renderItem={renderCameraItem}
                            keyExtractor={item => item.id}
                            scrollEnabled={false}
                        />
                    </ScrollView>

                    {renderDropdownModal()}
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
    },
    sectionHeader: {
        padding: 15,
        backgroundColor: '#ffededff',
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#000',
    },
    whiteCard: {
        backgroundColor: '#FFF',
        paddingHorizontal: 15,
        paddingBottom: 15,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 50,
    },
    label: {
        fontSize: 16,
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#EEE',
    },
    streamDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 4,
        paddingHorizontal: 10,
        height: 40,
        marginTop: 10,
        width: '50%',
    },
    cameraRow: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        paddingVertical: 15,
        marginBottom: 8,
    },
    indexContainer: {
        width: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    indexText: {
        fontSize: 32,
        color: '#DDD',
        fontWeight: 'bold',
    },
    infoContainer: {
        flex: 1,
        borderLeftWidth: 1,
        borderLeftColor: '#EEE',
        paddingLeft: 12,
    },
    fieldRow: {
        flexDirection: 'row',
    },
    fieldBlock: {
        flex: 1,
    },
    fieldValueBold: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        height: 32,
        textAlignVertical: 'center',
    },
    fieldLabel: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 4,
        paddingHorizontal: 6,
        height: 32,
        width: '90%',
    },
    dropdownText: {
        fontSize: 14,
        color: '#333',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFF',
        width: '70%',
        borderRadius: 4,
        overflow: 'hidden',
    },
    modalItem: {
        paddingVertical: 15,
        paddingHorizontal: 15,
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
    },
    modalDivider: {
        height: 1
    },
});

export default AdvancedRecordSettings;
