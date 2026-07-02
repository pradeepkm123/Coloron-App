import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    SafeAreaView,
    Modal,
    TextInput,
    Alert
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GradientBackground from '../Component/GradientBackground';

type RebootRouteProp = RouteProp<RootStackParamList, 'Reboot'>;

const Reboot: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<RebootRouteProp>();
    const { deviceId, deviceName } = route.params;

    const [modalVisible, setModalVisible] = useState(false);
    const [password, setPassword] = useState('');

    const handleRebootClick = () => {
        setModalVisible(true);
    };

    const handleConfirmReboot = () => {
        // Logic for reboot
        setModalVisible(false);
        setPassword('');
        Alert.alert('System', 'Reboot command sent. Please wait...');
        // navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Icon name="chevron-left" size={32} color="#852d2dff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Reboot</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    <View style={styles.content}>
                        <View style={styles.rebootBtnWrapper}>
                            <TouchableOpacity style={styles.rebootBtn} onPress={handleRebootClick}>
                                <Text style={styles.rebootBtnText}>Reboot</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.noteContainer}>
                            <Text style={styles.noteText}>
                                Note: The reboot takes about 1 to 3 minutes. The browser will connect to the service automatically after reboot. Please wait!
                            </Text>
                        </View>
                    </View>

                    {/* Auth Modal */}
                    <Modal visible={modalVisible} transparent animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalHeaderTitle}>Administrator authority authentication</Text>
                                </View>

                                <View style={styles.modalBody}>
                                    <View style={styles.inputRow}>
                                        <Text style={styles.inputLabel}>Administrator</Text>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={styles.textInput}
                                                value="admin"
                                                editable={false}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.inputRow}>
                                        <Text style={styles.inputLabel}>Password</Text>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={styles.textInput}
                                                value={password}
                                                onChangeText={setPassword}
                                                secureTextEntry
                                                placeholder=""
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.confirmTextContainer}>
                                        <Text style={styles.confirmText}>Are you sure to reboot the device?</Text>
                                    </View>

                                    <View style={styles.modalFooter}>
                                        <TouchableOpacity style={styles.footerBtn} onPress={handleConfirmReboot}>
                                            <Text style={styles.footerBtnText}>OK</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.footerBtn} onPress={() => setModalVisible(false)}>
                                            <Text style={styles.footerBtnText}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
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
        backgroundColor: '#f2f5f7ff',
    },
    rebootBtnWrapper: {
        backgroundColor: '#FFF',
        height: 50,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    rebootBtn: {
        backgroundColor: '#811d1dff',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 4,
    },
    rebootBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '500',
    },
    noteContainer: {
        padding: 15,
        backgroundColor: '#FFF',
        marginTop: 1,
    },
    noteText: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#FFF',
        borderRadius: 10,
        overflow: 'hidden',
    },
    modalHeader: {
        backgroundColor: '#7b1717ff',
        paddingVertical: 12,
        paddingHorizontal: 15,
    },
    modalHeaderTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '500',
        textAlign: 'center',
    },
    modalBody: {
        padding: 20,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    inputLabel: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    inputWrapper: {
        flex: 1.5,
        borderWidth: 1,
        borderColor: '#CCC',
        borderRadius: 4,
        height: 36,
        paddingHorizontal: 10,
        justifyContent: 'center',
    },
    textInput: {
        fontSize: 16,
        color: '#333',
        padding: 0,
    },
    confirmTextContainer: {
        marginTop: 10,
        marginBottom: 20,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        paddingTop: 15,
    },
    confirmText: {
        fontSize: 16,
        color: '#333',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    footerBtn: {
        backgroundColor: '#a11818ff',
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 20,
        width: '45%',
        alignItems: 'center',
    },
    footerBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});

export default Reboot;
