import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Modal,
    FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GradientBackground from '../Component/GradientBackground';

type AlarmOutConfigRouteProp = RouteProp<RootStackParamList, 'AlarmOutConfig'>;

const AlarmOutConfig: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<AlarmOutConfigRouteProp>();
    const { deviceId, deviceName, alarmName } = route.params;

    const [schedule, setSchedule] = useState('24x7');
    const [delay, setDelay] = useState('10 Secs');

    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<{ field: string, options: string[], title: string } | null>(null);

    const scheduleOptions = ['24x7', '24x5', '24x2', '<None>'];
    const delayOptions = ['1 Secs', '2 Secs', '3 Secs', '5 Secs', '10 Secs', '30 Secs', '1 Min', '2 Mins', 'Manual'];

    const openModal = (field: string, options: string[], title: string) => {
        setModalConfig({ field, options, title });
        setModalVisible(true);
    };

    const handleSelect = (value: string) => {
        if (modalConfig?.field === 'schedule') setSchedule(value);
        if (modalConfig?.field === 'delay') setDelay(value);
        setModalVisible(false);
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
                        <Text style={styles.headerTitle}>{alarmName}</Text>
                        <TouchableOpacity style={styles.saveBtn}>
                            <Icon name="content-save-outline" size={28} color="#852d2dff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.configItem}>
                            <View style={styles.labelSection}>
                                <Text style={styles.mainLabel}>Schedule</Text>
                                <Text style={styles.subLabel}>{schedule}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.dropdown}
                                onPress={() => openModal('schedule', scheduleOptions, 'Schedule')}
                            >
                                <Text style={styles.dropdownText}>{schedule}</Text>
                                <Icon name="menu-down" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.configItem}>
                            <View style={styles.labelSection}>
                                <Text style={styles.mainLabel}>Delay</Text>
                                <Text style={styles.subLabel}>{delay}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.dropdown}
                                onPress={() => openModal('delay', delayOptions, 'Delay')}
                            >
                                <Text style={styles.dropdownText}>{delay}</Text>
                                <Icon name="menu-down" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </GradientBackground>

            {/* Selection Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalHeaderTitle}>{modalConfig?.title}</Text>
                        </View>
                        <FlatList
                            data={modalConfig?.options}
                            keyExtractor={item => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={() => handleSelect(item)}
                                >
                                    <Text style={styles.modalItemText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
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
        backgroundColor: '#FFF',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    labelSection: {
        flex: 1,
    },
    mainLabel: {
        fontSize: 18,
        color: '#333',
        fontWeight: '500',
    },
    subLabel: {
        fontSize: 14,
        color: '#999',
        marginTop: 2,
    },
    dropdown: {
        flex: 1,
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
        fontSize: 16,
        color: '#333',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#FFF',
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
        borderBottomWidth: 0.5,
        borderBottomColor: '#EEE',
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
    },
});

export default AlarmOutConfig;
