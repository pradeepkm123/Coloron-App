import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    TextInput,
    Switch,
    ScrollView,
    Modal,
    TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';

type UPnPConfigRouteProp = RouteProp<RootStackParamList, 'UPnPConfig'>;

const UPnPConfig: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<UPnPConfigRouteProp>();
    const { deviceId, deviceName } = route.params;

    const [enabled, setEnabled] = useState(true);
    const [mapType, setMapType] = useState('Auto');
    const [showMapTypeModal, setShowMapTypeModal] = useState(false);

    const [httpPort, setHttpPort] = useState('80');
    const [httpsPort, setHttpsPort] = useState('443');
    const [serverPort, setServerPort] = useState('6036');
    const [rtspPort, setRtspPort] = useState('554');

    const handleSave = () => {
        // Implement save logic
    };

    const renderPortSection = (title: string, externalPort: string, setPort: (val: string) => void, internalPort: string, status: string) => (
        <View style={styles.card}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <View style={styles.portDetails}>
                <View style={styles.row}>
                    <Text style={styles.rowLabel}>Port Type</Text>
                    <Text style={styles.rowValue}>{title}</Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>External Port</Text>
                    <TextInput
                        style={styles.input}
                        value={externalPort}
                        onChangeText={setPort}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.row}>
                    <Text style={styles.rowLabel}>External IP Addr...</Text>
                    <Text style={styles.rowValue}></Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.rowLabel}>Port</Text>
                    <Text style={styles.rowValue}>{internalPort}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.rowLabel}>UPnP Status</Text>
                    <Text style={[styles.rowValue, { color: '#852d2dff' }]}>{status}</Text>
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
                        <Text style={styles.headerTitle}>UPnP</Text>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Icon name="content-save-outline" size={28} color="#852d2dff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        <View style={styles.card}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Basic Settings</Text>
                            </View>
                            <View style={styles.portDetails}>
                                <View style={styles.row}>
                                    <Text style={styles.rowLabel}>Enable</Text>
                                    <Switch
                                        value={enabled}
                                        onValueChange={setEnabled}
                                        trackColor={{ false: "#DDD", true: "#852d2dff" }}
                                        thumbColor={enabled ? "#FFF" : "#F4F3F4"}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Map Type</Text>
                                    <TouchableOpacity
                                        style={styles.dropdown}
                                        onPress={() => setShowMapTypeModal(true)}
                                    >
                                        <Text style={styles.dropdownText}>{mapType}</Text>
                                        <Icon name="menu-down" size={24} color="#333" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {renderPortSection('HTTP Port', httpPort, setHttpPort, '80', 'Not Ready')}
                        {renderPortSection('HTTPS Port', httpsPort, setHttpsPort, '443', 'Not Ready')}
                        {renderPortSection('Server Port', serverPort, setServerPort, '6036', 'Not Ready')}
                        {renderPortSection('RTSP Port', rtspPort, setRtspPort, '554', 'Not Ready')}

                        <View style={{ height: 100 }} />
                    </ScrollView>

                    <TouchableOpacity style={styles.applyBtn} onPress={handleSave}>
                        <Text style={styles.applyText}>Apply</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </GradientBackground>

            <Modal
                visible={showMapTypeModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMapTypeModal(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowMapTypeModal(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <TouchableOpacity
                                style={[styles.modalItem, mapType === 'Auto' && { backgroundColor: '#852d2dff' }]}
                                onPress={() => { setMapType('Auto'); setShowMapTypeModal(false); }}
                            >
                                <Text style={[styles.modalItemText, mapType === 'Auto' && { color: '#FFF' }]}>Auto</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalItem, mapType === 'Manual' && { backgroundColor: '#852d2dff' }]}
                                onPress={() => { setMapType('Manual'); setShowMapTypeModal(false); }}
                            >
                                <Text style={[styles.modalItemText, mapType === 'Manual' && { color: '#FFF' }]}>Manual</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f2f5f7ff',
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
    card: {
        backgroundColor: '#FFF',
        marginHorizontal: 0,
        marginBottom: 10,
        marginTop: 5,
        overflow: 'hidden',
    },
    sectionHeader: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#fde8e8ff',
    },
    sectionTitle: {
        fontSize: 14,
        color: '#852d2dff',
        fontWeight: 'bold',
    },
    portDetails: {
        padding: 15,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    rowLabel: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    rowValue: {
        fontSize: 16,
        color: '#666',
    },
    inputGroup: {
        marginBottom: 15,
        marginTop: 5,
    },
    inputLabel: {
        fontSize: 12,
        color: '#999',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        height: 44,
        borderWidth: 1,
        borderColor: '#EEE',
        borderRadius: 8,
        paddingHorizontal: 15,
        color: '#333',
        fontSize: 15,
        backgroundColor: '#F9F9F9',
    },
    dropdown: {
        height: 44,
        borderWidth: 1,
        borderColor: '#EEE',
        borderRadius: 8,
        paddingHorizontal: 15,
        backgroundColor: '#F9F9F9',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownText: {
        fontSize: 15,
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#EEE',
        marginVertical: 10,
    },
    applyBtn: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        backgroundColor: '#912727ff',
        paddingHorizontal: 40,
        paddingVertical: 12,
        borderRadius: 8,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    applyText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
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
        borderRadius: 12,
        paddingVertical: 10,
        overflow: 'hidden',
    },
    modalItem: {
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        fontWeight: '500',
    }
});

export default UPnPConfig;
