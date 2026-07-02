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

type AlarmBuzzerConfigRouteProp = RouteProp<RootStackParamList, 'AlarmBuzzerConfig'>;

const AlarmBuzzerConfig: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<AlarmBuzzerConfigRouteProp>();
    const { deviceId, deviceName } = route.params;

    const [duration, setDuration] = useState('5 Secs');
    const [modalVisible, setModalVisible] = useState(false);

    const durationOptions = ['3 Secs', '5 Secs', '10 Secs', '30 Secs', '1 Min', '2 Mins', '5 Mins', '10 Mins'];

    const handleSelect = (value: string) => {
        setDuration(value);
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
                        <Text style={styles.headerTitle}>Buzzer</Text>
                        <TouchableOpacity style={styles.saveBtn}>
                            <Icon name="content-save-outline" size={28} color="#852d2dff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.configItem}>
                            <Text style={styles.label}>Duration</Text>
                            <TouchableOpacity
                                style={styles.dropdown}
                                onPress={() => setModalVisible(true)}
                            >
                                <Text style={styles.dropdownText}>{duration}</Text>
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
                            <Text style={styles.modalHeaderTitle}>Duration</Text>
                        </View>
                        <FlatList
                            data={durationOptions}
                            keyExtractor={item => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.modalItem,
                                        item === duration && styles.selectedModalItem
                                    ]}
                                    onPress={() => handleSelect(item)}
                                >
                                    <Text style={[
                                        styles.modalItemText,
                                        item === duration && styles.selectedModalItemText
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
    },
    configItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginTop: 10,
    },
    label: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
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
        height: 0, // Hidden as per screenshot style having only title in blue item
    },
    modalItem: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 0.5,
        borderBottomColor: '#EEE',
    },
    selectedModalItem: {
        backgroundColor: '#670000ff',
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
    },
    selectedModalItemText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    modalHeaderTitle: {
        display: 'none'
    }
});

export default AlarmBuzzerConfig;
