import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    TextInput,
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

type GeneralSettingsRouteProp = RouteProp<RootStackParamList, 'GeneralSettings'>;

const GeneralSettings: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<GeneralSettingsRouteProp>();
    const { deviceId, deviceName: initialDeviceName } = route.params;

    const [deviceName, setDeviceName] = useState('OFFICE NVR');
    const [deviceNo, setDeviceNo] = useState('1');
    const [videoFormat, setVideoFormat] = useState('PAL');
    const [mainOutput, setMainOutput] = useState('1280x1024');
    const [enableWizard, setEnableWizard] = useState(true);
    const [dwellAutomatically, setDwellAutomatically] = useState(false);
    const [waitTime, setWaitTime] = useState('10 Mins');

    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<{ field: string, options: string[], title: string } | null>(null);

    const videoFormatOptions = ['PAL', 'NTSC'];
    const mainOutputOptions = ['1024x768', '1280x1024', '1920x1080', '3840x2160(30)'];
    const waitTimeOptions = ['1 min', '3 min', '5 min', '10 min', '30 min'];

    const openModal = (field: string, options: string[], title: string) => {
        setModalConfig({ field, options, title });
        setModalVisible(true);
    };

    const handleSelect = (value: string) => {
        if (modalConfig?.field === 'videoFormat') setVideoFormat(value);
        if (modalConfig?.field === 'mainOutput') setMainOutput(value);
        if (modalConfig?.field === 'waitTime') setWaitTime(value);
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
                <Text style={[styles.dropdownText, disabled && styles.disabledText]}>{value}</Text>
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
                        <Text style={styles.headerTitle}>General Settings</Text>
                        <TouchableOpacity>
                            <Icon name="content-save" size={28} color="#852d2dff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Device Name</Text>
                            <TextInput
                                style={styles.input}
                                value={deviceName}
                                onChangeText={setDeviceName}
                            />
                        </View>

                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Device No.</Text>
                            <TextInput
                                style={styles.input}
                                value={deviceNo}
                                onChangeText={setDeviceNo}
                                keyboardType="numeric"
                            />
                        </View>

                        {renderDropdown('Video Format', videoFormat, () => openModal('videoFormat', videoFormatOptions, 'Video Format'))}

                        {renderDropdown('Main Output', mainOutput, () => openModal('mainOutput', mainOutputOptions, 'Main Output'))}

                        <View style={styles.switchRow}>
                            <Text style={styles.fieldLabel}>Enable Wizard</Text>
                            <Switch
                                value={enableWizard}
                                onValueChange={setEnableWizard}
                                trackColor={{ false: '#DDD', true: 'rgba(170, 61, 61, 1)' }}
                                thumbColor={'#FFF'}
                            />
                        </View>

                        <View style={styles.switchRow}>
                            <Text style={styles.fieldLabel}>Dwell Automatically</Text>
                            <Switch
                                value={dwellAutomatically}
                                onValueChange={setDwellAutomatically}
                                trackColor={{ false: '#DDD', true: 'rgba(170, 61, 61, 1)' }}
                                thumbColor={'#FFF'}
                            />
                        </View>

                        {renderDropdown(
                            'Wait Time',
                            waitTime,
                            () => openModal('waitTime', waitTimeOptions, 'Wait Time'),
                            !dwellAutomatically
                        )}
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
        paddingVertical: 10,
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
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    input: {
        flex: 1.5,
        height: 40,
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 4,
        paddingHorizontal: 10,
        color: '#333',
        backgroundColor: '#FFF',
    },
    dropdown: {
        flex: 1.5,
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
        width: '80%',
        backgroundColor: '#fff5f5ff',
        borderRadius: 8,
        overflow: 'hidden',
        maxHeight: '60%',
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

export default GeneralSettings;
