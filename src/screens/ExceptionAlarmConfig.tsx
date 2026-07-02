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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GradientBackground from '../Component/GradientBackground';

type ExceptionAlarmConfigRouteProp = RouteProp<RootStackParamList, 'ExceptionAlarmConfig'>;

const ExceptionAlarmConfig: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<ExceptionAlarmConfigRouteProp>();
    const { deviceId, deviceName, exceptionName } = route.params;

    const [push, setPush] = useState(true);
    const [buzzer, setBuzzer] = useState(true);
    const [popupMsg, setPopupMsg] = useState(true);
    const [email, setEmail] = useState(false);

    // Modal Control
    const [modalType, setModalType] = useState<'alarmOut' | null>(null);

    // Mock Data
    const alarmOuts = ['AlarmOut1', 'AlarmOut1', 'AlarmOut1', 'AlarmOut1'];
    const [selectedAlarmOuts, setSelectedAlarmOuts] = useState<string[]>([]);

    const toggleAlarmOut = (name: string) => {
        setSelectedAlarmOuts(prev =>
            prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
        );
    };

    const renderDialogContent = () => {
        if (modalType === 'alarmOut') {
            return (
                <View style={styles.modalContent}>
                    <View style={styles.modalHeaderRed}><Text style={styles.modalTitleWhite}>Trigger Alarm-out</Text></View>
                    <FlatList
                        data={alarmOuts}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.checkItem}>
                                <TouchableOpacity
                                    style={[styles.checkbox, selectedAlarmOuts.includes(item) && styles.checkboxSelected]}
                                    onPress={() => toggleAlarmOut(item)}
                                >
                                    {selectedAlarmOuts.includes(item) && <Icon name="check" size={16} color="#a22424ff" />}
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
        }
        return null;
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
                        <Text style={styles.headerTitle}>{exceptionName}</Text>
                        <TouchableOpacity style={styles.saveBtn}>
                            <Icon name="content-save-outline" size={28} color="#852d2dff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        <TouchableOpacity style={styles.navItem} onPress={() => setModalType('alarmOut')}>
                            <View>
                                <Text style={styles.label}>Alarm-out</Text>
                                <Text style={styles.subLabel}>{selectedAlarmOuts.join(', ') || 'OFF'}</Text>
                            </View>
                            <Icon name="chevron-right" size={24} color="#CCC" />
                        </TouchableOpacity>

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
        fontSize: 18,
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
    modalHeaderRed: {
        backgroundColor: '#a22424ff',
        paddingVertical: 15,
        alignItems: 'center',
    },
    modalTitleWhite: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
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
    }
});

export default ExceptionAlarmConfig;
