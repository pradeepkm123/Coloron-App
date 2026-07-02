import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    Modal,
    FlatList,
    TextInput
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';

type ScheduleRecordingSettingsRouteProp = RouteProp<RootStackParamList, 'ScheduleRecordingSettings'>;

interface CameraEncodeParams {
    id: string;
    index: number;
    name: string;
    streamType: string;
    encode: string;
    resolution: string;
    fps: string;
    gop: string;
    bitrateType: string;
    quality: string;
    maxBitrate: string;
    audio: string;
}

const ScheduleRecordingSettings: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<ScheduleRecordingSettingsRouteProp>();
    const { deviceId, deviceName } = route.params;

    const [cameras, setCameras] = useState<CameraEncodeParams[]>([
        { id: '1', index: 1, name: 'DATA ENTRY', streamType: 'Main Stream', encode: 'H.265', resolution: '1920x1080', fps: '25', gop: '50', bitrateType: 'VBR', quality: 'Higher', maxBitrate: '2048Kbps', audio: 'ON' },
        { id: '2', index: 2, name: 'RECEPTION', streamType: 'Main Stream', encode: 'H.265', resolution: '1920x1080', fps: '25', gop: '50', bitrateType: 'VBR', quality: 'Higher', maxBitrate: '2048Kbps', audio: 'ON' },
        { id: '3', index: 3, name: 'IPCamera', streamType: 'Main Stream', encode: 'H.265', resolution: '1920x1080', fps: '25', gop: '50', bitrateType: 'VBR', quality: 'Higher', maxBitrate: '2048Kbps', audio: 'ON' },
    ]);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<{ camId: string, field: keyof CameraEncodeParams, options: string[], title: string } | null>(null);

    const [inputModalVisible, setInputModalVisible] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [inputConfig, setInputConfig] = useState<{ camId: string, field: keyof CameraEncodeParams, title: string } | null>(null);

    const fpsOptions = Array.from({ length: 25 }, (_, i) => (25 - i).toString());
    const encodeOptions = ['H.264', 'H.265', 'H.265+'];
    const bitrateTypeOptions = ['VBR', 'CBR'];
    const qualityOptions = ['Lowest', 'Lower', 'Medium', 'Higher', 'Highest'];
    const maxBitrateOptions = ['32kbps', '64kbps', '128kbps', '256kbps', '512kbps', '768kbps', '1024kbps', '1536kbps', '2048Kbps', '3072Kbps', '4096Kbps', '5120Kbps', '6144Kbps', '8192Kbps', '10240Kbps'];
    const streamTypeOptions = ['Main Stream', 'Sub Stream'];
    const audioOptions = ['ON', 'OFF'];

    const openSelector = (camId: string, field: keyof CameraEncodeParams, options: string[], title: string) => {
        setModalConfig({ camId, field, options, title });
        setModalVisible(true);
    };

    const openInput = (camId: string, field: keyof CameraEncodeParams, title: string, current: string) => {
        setInputValue(current);
        setInputConfig({ camId, field, title });
        setInputModalVisible(true);
    };

    const handleSelect = (value: string) => {
        if (modalConfig) {
            setCameras(prev => prev.map(cam =>
                cam.id === modalConfig.camId ? { ...cam, [modalConfig.field]: value } : cam
            ));
        }
        setModalVisible(false);
    };

    const handleInputConfirm = () => {
        if (inputConfig) {
            setCameras(prev => prev.map(cam =>
                cam.id === inputConfig.camId ? { ...cam, [inputConfig.field]: inputValue } : cam
            ));
        }
        setInputModalVisible(false);
    };

    const renderDropdown = (camId: string, field: keyof CameraEncodeParams, value: string, label: string, options: string[]) => (
        <View style={styles.dropdownBlock}>
            <TouchableOpacity style={styles.dropdown} onPress={() => openSelector(camId, field, options, label)}>
                <Text style={styles.dropdownText} numberOfLines={1}>{value}</Text>
                <Icon name="menu-down" size={20} color="#666" />
            </TouchableOpacity>
            <Text style={styles.dropdownLabel}>{label}</Text>
        </View>
    );

    const renderInputBox = (camId: string, field: keyof CameraEncodeParams, value: string, label: string) => (
        <View style={styles.dropdownBlock}>
            <TouchableOpacity style={styles.dropdown} onPress={() => openInput(camId, field, label, value)}>
                <Text style={styles.dropdownText} numberOfLines={1}>{value}</Text>
            </TouchableOpacity>
            <Text style={styles.dropdownLabel}>{label}</Text>
        </View>
    );

    const renderCameraItem = ({ item }: { item: CameraEncodeParams }) => (
        <View style={styles.cameraCard}>
            <View style={styles.indexCol}>
                <Text style={styles.indexText}>{item.index}</Text>
            </View>
            <View style={styles.infoCol}>
                <View style={styles.row}>
                    <View style={styles.dropdownBlock}>
                        <Text style={styles.boldText}>{item.name}</Text>
                        <Text style={styles.dropdownLabel}>Camera Name</Text>
                    </View>
                    <View style={styles.dropdownBlock}>
                        {renderDropdown(item.id, 'streamType', item.streamType, 'Stream Type', streamTypeOptions)}
                    </View>
                </View>

                <View style={styles.row}>
                    {renderDropdown(item.id, 'encode', item.encode, 'Encode', encodeOptions)}
                    {renderInputBox(item.id, 'resolution', item.resolution, 'Resolution')}
                </View>

                <View style={styles.row}>
                    {renderDropdown(item.id, 'fps', item.fps, 'FPS', fpsOptions)}
                    {renderInputBox(item.id, 'gop', item.gop, 'GOP')}
                </View>

                <View style={styles.row}>
                    {renderDropdown(item.id, 'bitrateType', item.bitrateType, 'Bitrate Type', bitrateTypeOptions)}
                    {renderDropdown(item.id, 'quality', item.quality, 'Quality', qualityOptions)}
                </View>

                <View style={styles.row}>
                    {renderDropdown(item.id, 'maxBitrate', item.maxBitrate, 'Max Bitrate', maxBitrateOptions)}
                    <View style={styles.dropdownBlock}>
                        <Text style={styles.smallText}>2358~3930Kbps</Text>
                        <Text style={styles.dropdownLabel}>Bitrate Limit Recommend...</Text>
                    </View>
                </View>

                <View style={styles.row}>
                    {renderDropdown(item.id, 'audio', item.audio, 'Audio', audioOptions)}
                    <View style={styles.dropdownBlock} />
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Icon name="chevron-left" size={32} color="#852d2dff" />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>Schedule Recording Settings</Text>
                        </View>
                        <TouchableOpacity>
                            <Icon name="content-save" size={28} color="#852d2dff" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={cameras}
                        renderItem={renderCameraItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                    />

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Remain Bandwidth: 60 / 112 Mb</Text>
                    </View>

                    {/* Dropdown Modal */}
                    <Modal visible={modalVisible} transparent animationType="fade">
                        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
                            <View style={styles.modalContent}>
                                <FlatList
                                    data={modalConfig?.options}
                                    keyExtractor={item => item}
                                    renderItem={({ item, index }) => (
                                        <TouchableOpacity
                                            style={[styles.modalItem, index === 0 && { backgroundColor: '#670000ff' }]}
                                            onPress={() => handleSelect(item)}
                                        >
                                            <Text style={[styles.modalItemText, index === 0 && { color: '#FFF' }]}>{item}</Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        </TouchableOpacity>
                    </Modal>

                    {/* Input Modal */}
                    <Modal visible={inputModalVisible} transparent animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={styles.customModalContent}>
                                <View style={styles.customModalHeader}>
                                    <Text style={styles.customModalHeaderText}>{inputConfig?.title}</Text>
                                </View>
                                <View style={styles.customModalBody}>
                                    <TextInput
                                        style={styles.textInput}
                                        value={inputValue}
                                        onChangeText={setInputValue}
                                        placeholder="Enter value"
                                        autoFocus
                                    />
                                </View>
                                <View style={styles.customModalFooter}>
                                    <TouchableOpacity style={styles.modalFooterBtn} onPress={() => setInputModalVisible(false)}>
                                        <Text style={styles.modalFooterBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.modalFooterBtn, styles.modalFooterBtnPrimary]} onPress={handleInputConfirm}>
                                        <Text style={styles.modalFooterBtnText}>Confirm</Text>
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
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#852d2dff',
        lineHeight: 20,
    },
    backBtn: {
        padding: 5,
    },
    listContent: {
        paddingTop: 10,
    },
    cameraCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        marginBottom: 10,
        paddingVertical: 15,
    },
    indexCol: {
        width: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    indexText: {
        fontSize: 36,
        color: '#DDD',
        fontWeight: 'bold',
    },
    infoCol: {
        flex: 1,
        borderLeftWidth: 1,
        borderLeftColor: '#F0F0F0',
        paddingLeft: 10,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    dropdownBlock: {
        flex: 1,
        marginRight: 10,
    },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 4,
        paddingHorizontal: 8,
        height: 32,
    },
    dropdownText: {
        fontSize: 14,
        color: '#333',
    },
    dropdownLabel: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    boldText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
        height: 32,
        textAlignVertical: 'center',
    },
    smallText: {
        fontSize: 13,
        color: '#333',
        height: 32,
        textAlignVertical: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff5f5ff',
        width: '75%',
        maxHeight: '70%',
        borderRadius: 4,
        overflow: 'hidden',
    },
    modalItem: {
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
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
    textInput: {
        borderWidth: 1,
        borderColor: '#EEE',
        borderRadius: 8,
        paddingHorizontal: 15,
        height: 48,
        fontSize: 16,
        color: '#333',
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
    footer: {
        height: 50,
        backgroundColor: '#F5F7F9',
        justifyContent: 'center',
        paddingHorizontal: 15,
        borderTopWidth: 1,
        borderTopColor: '#DDD',
    },
    footerText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    }
});

export default ScheduleRecordingSettings;
