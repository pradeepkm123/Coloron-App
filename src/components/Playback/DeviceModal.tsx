import React from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    Modal,
    ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Device } from '../../utils/deviceStorage';

interface DeviceModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectDevice: (device: Device) => void;
    devices: Device[];
    selectedDeviceId?: string | number;
    isFullscreen?: boolean;
}

const DeviceModal: React.FC<DeviceModalProps> = ({
    visible,
    onClose,
    onSelectDevice,
    devices,
    selectedDeviceId,
    isFullscreen
}) => {
    const renderLandscape = () => (
        <View style={styles.landscapeOverlay}>
            <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
            <View style={styles.landscapeContent}>
                <View style={styles.landscapeHeader}>
                    <View style={styles.landscapeHeaderInner}>
                        <View style={styles.landscapeIconBox}>
                            <Icon name="server" size={20} color="#00EAFF" />
                        </View>
                        <Text style={styles.landscapeHeaderText}>Devices</Text>
                    </View>
                </View>

                <ScrollView style={{ flex: 1 }}>
                    {devices.filter(d => d.isNVR || ['NVR', 'DVR', 'VMS', 'IPC'].includes(d.type)).map((device) => {
                        const isSelected = String(selectedDeviceId) === String(device.id);
                        return (
                            <View key={device.id} style={styles.landscapeItemDivider}>
                                <TouchableOpacity
                                    style={[styles.landscapeItem, isSelected && styles.landscapeItemActive]}
                                    onPress={() => onSelectDevice(device)}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.landscapeItemName, isSelected && styles.activeText]}>
                                            {device.name}
                                        </Text>
                                        <View style={styles.statusRow}>
                                            <View style={[styles.statusDot, { backgroundColor: device.status === 'Online' ? '#00FF94' : '#FF4444' }]} />
                                            <Text style={styles.ipText}>{device.ip || '192.168.1.100'}</Text>
                                        </View>
                                    </View>
                                    {isSelected ? (
                                        <View style={styles.playIconBox}>
                                            <Icon name="play" size={16} color="#000" />
                                        </View>
                                    ) : (
                                        <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.3)" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </ScrollView>

                <View style={styles.landscapeFooter}>
                    <TouchableOpacity style={styles.landscapeCloseBtn} onPress={onClose}>
                        <Text style={styles.closeBtnText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderPortrait = () => (
        <View style={styles.modalOverlay}>
            <View style={styles.portraitContent}>
                <View style={styles.portraitHeader}>
                    <Text style={styles.portraitTitle}>Select Device</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Icon name="close" size={24} color="#4B5563" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 300, width: '100%' }}>
                    {devices.filter(d => d.isNVR || ['NVR', 'DVR', 'VMS', 'IPC'].includes(d.type)).map((device) => {
                        const isSelected = String(selectedDeviceId) === String(device.id);
                        return (
                            <TouchableOpacity
                                key={device.id}
                                style={[styles.portraitItem, isSelected && styles.portraitItemActive]}
                                onPress={() => onSelectDevice(device)}
                            >
                                <View style={styles.portraitItemLeft}>
                                    <View style={{ marginRight: 16 }}>
                                        <Icon name="server" size={28} color="#1F2937" />
                                    </View>
                                    <View>
                                        <Text style={[styles.portraitItemName, isSelected && styles.activePortraitText]}>
                                            {device.name}
                                        </Text>
                                        <Text style={[styles.portraitStatus, { color: device.status === 'Online' ? '#10B981' : '#EF4444' }]}>
                                            {device.status || 'Offline'}
                                        </Text>
                                    </View>
                                </View>
                                {isSelected && (
                                    <View style={styles.checkIconBox}>
                                        <Icon name="check" size={16} color="#FFF" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        </View>
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
            onRequestClose={onClose}
        >
            {isFullscreen ? renderLandscape() : renderPortrait()}
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    portraitContent: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, elevation: 5 },
    portraitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    portraitTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
    portraitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#F3F4F6'
    },
    portraitItemActive: { borderColor: '#DC2626' },
    portraitItemLeft: { flexDirection: 'row', alignItems: 'center' },
    portraitItemName: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
    activePortraitText: { color: '#A83232' },
    portraitStatus: { fontSize: 14, fontWeight: '500' },
    checkIconBox: { backgroundColor: '#000', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

    landscapeOverlay: { flex: 1, flexDirection: 'row' },
    landscapeContent: { width: 320, backgroundColor: 'rgba(20, 20, 25, 0.95)', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' },
    landscapeHeader: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    landscapeHeaderInner: { flexDirection: 'row', alignItems: 'center', padding: 15 },
    landscapeIconBox: { backgroundColor: 'rgba(0,234,255,0.1)', padding: 6, borderRadius: 6, marginRight: 10 },
    landscapeHeaderText: { fontSize: 18, color: '#FFF', fontWeight: 'bold' },
    landscapeItemDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    landscapeItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    landscapeItemActive: { backgroundColor: 'rgba(0,234,255,0.05)' },
    landscapeItemName: { color: '#FFF', fontSize: 16, marginBottom: 4 },
    activeText: { color: '#00EAFF', fontWeight: 'bold' },
    statusRow: { flexDirection: 'row', alignItems: 'center' },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    ipText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
    playIconBox: { backgroundColor: '#00EAFF', padding: 8, borderRadius: 20 },
    landscapeFooter: { padding: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)' },
    landscapeCloseBtn: { width: '100%', alignItems: 'center', paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    closeBtnText: { color: '#FFF', fontWeight: 'bold' }
});

export default DeviceModal;
