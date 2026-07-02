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

type AlarmDisplayConfigRouteProp = RouteProp<RootStackParamList, 'AlarmDisplayConfig'>;

const AlarmDisplayConfig: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<AlarmDisplayConfigRouteProp>();
    const { deviceId, deviceName } = route.params;

    const [videoDuration, setVideoDuration] = useState('10 Secs');
    const [msgDuration, setMsgDuration] = useState('10 Secs');
    const [dontShowLater, setDontShowLater] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<{ field: string, options: string[], title: string } | null>(null);

    const videoDurationOptions = ['5 Secs', '10 Secs', '15 Secs', '20 Secs', '30 Secs', '40 Secs', '1 Min', '2 Mins', '3 Mins'];
    const msgDurationOptions = ['3 Secs', '6 Secs', '10 Secs', '15 Secs', '20 Secs', '30 Secs', '40 Secs', '1 Min', '2 Mins'];

    const openModal = (field: string, options: string[], title: string) => {
        setModalConfig({ field, options, title });
        setModalVisible(true);
    };

    const handleSelect = (value: string) => {
        if (modalConfig?.field === 'videoDuration') setVideoDuration(value);
        if (modalConfig?.field === 'msgDuration') setMsgDuration(value);
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
                        <Text style={styles.headerTitle}>Display</Text>
                        <TouchableOpacity style={styles.saveBtn}>
                            <Icon name="content-save-outline" size={28} color="#852d2dff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Pop-up Video</Text>
                        </View>
                        <View style={styles.configItem}>
                            <Text style={styles.label}>Duration</Text>
                            <TouchableOpacity
                                style={styles.dropdown}
                                onPress={() => openModal('videoDuration', videoDurationOptions, 'Duration')}
                            >
                                <Text style={styles.dropdownText}>{videoDuration}</Text>
                                <Icon name="menu-down" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Pop-up Message Box</Text>
                        </View>
                        <View style={styles.configItem}>
                            <Text style={styles.label}>Don't show later</Text>
                            <Switch
                                value={dontShowLater}
                                onValueChange={setDontShowLater}
                                trackColor={{ false: '#DDD', true: '#852d2dff' }}
                                thumbColor={dontShowLater ? '#FFF' : '#F4F3F4'}
                            />
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.configItem}>
                            <Text style={styles.label}>Duration</Text>
                            <TouchableOpacity
                                style={styles.dropdown}
                                onPress={() => openModal('msgDuration', msgDurationOptions, 'Duration')}
                            >
                                <Text style={styles.dropdownText}>{msgDuration}</Text>
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
    sectionHeader: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: 'transparent',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
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

export default AlarmDisplayConfig;
