import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Modal,
    FlatList,
    Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GradientBackground from '../Component/GradientBackground';

type AlarmPushConfigRouteProp = RouteProp<RootStackParamList, 'AlarmPushConfig'>;

const AlarmPushConfig: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<AlarmPushConfigRouteProp>();
    const { deviceId, deviceName } = route.params;

    const [enable, setEnable] = useState(false);
    const [pushSchedule, setPushSchedule] = useState('24x7');
    const [modalVisible, setModalVisible] = useState(false);

    const scheduleOptions = ['24x7', '24x5', '24x2', '<None>'];

    const handleSelect = (value: string) => {
        setPushSchedule(value);
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
                        <Text style={styles.headerTitle}>Push Message</Text>
                        <TouchableOpacity style={styles.saveBtn}>
                            <Icon name="content-save-outline" size={28} color="#852d2dff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.configItem}>
                            <Text style={styles.label}>Enable</Text>
                            <Switch
                                value={enable}
                                onValueChange={setEnable}
                                trackColor={{ false: '#DDD', true: '#b51515ff' }}
                                thumbColor={'#FFF'}
                            />
                        </View>
                        <View style={styles.divider} />

                        <View style={styles.configItem}>
                            <Text style={styles.label}>Push Schedule</Text>
                            <TouchableOpacity
                                style={styles.dropdown}
                                onPress={() => setModalVisible(true)}
                            >
                                <Text style={styles.dropdownText}>{pushSchedule}</Text>
                                <Icon name="menu-down" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.divider} />

                        <View style={styles.configItem}>
                            <Text style={styles.label}>Push Server Status</Text>
                            <Text style={styles.statusText}>47.88.102.123:7023 ( Online )</Text>
                        </View>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={[styles.testBtn, !enable && styles.disabledBtn]}
                                disabled={!enable}
                            >
                                <Text style={[styles.testBtnText, !enable && styles.disabledBtnText]}>Test</Text>
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
                            <Text style={styles.modalHeaderTitle}>Push Schedule</Text>
                        </View>
                        <FlatList
                            data={scheduleOptions}
                            keyExtractor={item => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.modalItem,
                                        item === pushSchedule && styles.selectedModalItem
                                    ]}
                                    onPress={() => handleSelect(item)}
                                >
                                    <Text style={[
                                        styles.modalItemText,
                                        item === pushSchedule && styles.selectedModalItemText
                                    ]}>{item}</Text>
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
        marginTop: 10,
    },
    configItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        paddingHorizontal: 15,
        paddingVertical: 12,
    },
    label: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    statusText: {
        fontSize: 14,
        color: '#333',
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
        fontSize: 16,
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
    },
    buttonRow: {
        alignItems: 'flex-end',
        paddingHorizontal: 15,
        marginTop: 15,
    },
    testBtn: {
        backgroundColor: '#670000ff',
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 4,
    },
    disabledBtn: {
        backgroundColor: '#CCC',
    },
    testBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '500',
    },
    disabledBtnText: {
        color: '#eee',
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
        borderRadius: 4,
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
    selectedModalItem: {
        backgroundColor: '#ce8282ff',
    },
    modalItemText: {
        fontSize: 16,
        color: '#ed9696ff',
    },
    selectedModalItemText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
});

export default AlarmPushConfig;
