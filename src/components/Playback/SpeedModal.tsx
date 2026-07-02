import React from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface SpeedModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectSpeed: (speed: number) => void;
    currentSpeed: number;
    isFullscreen?: boolean;
}

const SpeedModal: React.FC<SpeedModalProps> = ({
    visible,
    onClose,
    onSelectSpeed,
    currentSpeed,
    isFullscreen
}) => {
    const speeds = [1, 2, 4, 8, 16];

    const renderLandscape = () => (
        <View style={styles.landscapeOverlay}>
            <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
            <View style={styles.landscapeContent}>
                <View style={styles.landscapeHeader}>
                    <Text style={styles.landscapeTitle}>Speed</Text>
                </View>
                <View style={styles.divider} />

                <View style={{ flex: 1, justifyContent: 'center' }}>
                    {speeds.map((speed) => {
                        const isSelected = Math.abs(currentSpeed) === speed;
                        return (
                            <View key={speed}>
                                <TouchableOpacity
                                    style={[styles.landscapeOption, isSelected && styles.landscapeOptionActive]}
                                    onPress={() => onSelectSpeed(speed)}
                                >
                                    <Text style={[styles.landscapeOptionText, isSelected && styles.activeText]}>
                                        {speed === 1 ? 'Normal' : `${speed}x`}
                                    </Text>
                                </TouchableOpacity>
                                <View style={styles.optionDivider} />
                            </View>
                        );
                    })}
                </View>

                <View style={styles.divider} />
                <TouchableOpacity style={styles.landscapeCancelBtn} onPress={onClose}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderPortrait = () => (
        <View style={styles.speedModalOverlay}>
            <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
            <View style={styles.speedModalContent}>
                <View style={styles.speedHeaderRow}>
                    <Text style={styles.speedModalTitle}>Playback Speed</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Icon name="close" size={24} color="#666" />
                    </TouchableOpacity>
                </View>

                <View style={styles.speedOptionsContainer}>
                    {speeds.map((speed) => (
                        <TouchableOpacity
                            key={speed}
                            style={[
                                styles.speedOptionCircle,
                                Math.abs(currentSpeed) === speed && styles.speedOptionActive
                            ]}
                            onPress={() => onSelectSpeed(speed)}
                        >
                            <Text style={[
                                styles.speedOptionText,
                                Math.abs(currentSpeed) === speed && styles.speedOptionTextActive
                            ]}>
                                {speed}x
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType={isFullscreen ? "fade" : "slide"}
            supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
            onRequestClose={onClose}
        >
            {isFullscreen ? renderLandscape() : renderPortrait()}
        </Modal>
    );
};

const styles = StyleSheet.create({
    speedModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    speedModalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40
    },
    speedHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    speedModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    speedOptionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    speedOptionCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center'
    },
    speedOptionActive: { backgroundColor: '#A83232' },
    speedOptionText: { fontSize: 16, color: '#666', fontWeight: '500' },
    speedOptionTextActive: { color: '#FFF', fontWeight: 'bold' },

    landscapeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)', flexDirection: 'row', justifyContent: 'flex-end' },
    landscapeContent: { width: 300, backgroundColor: 'rgba(20, 20, 25, 0.9)', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
    landscapeHeader: { paddingVertical: 20, alignItems: 'center' },
    landscapeTitle: { color: '#FFF', fontSize: 18, fontWeight: '500' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', width: '100%' },
    landscapeOption: { paddingVertical: 20, alignItems: 'center' },
    landscapeOptionActive: { backgroundColor: 'rgba(0, 234, 255, 0.1)' },
    landscapeOptionText: { color: '#FFF', fontSize: 16 },
    activeText: { color: '#00EAFF', fontWeight: 'bold' },
    optionDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
    landscapeCancelBtn: { paddingVertical: 20, alignItems: 'center' },
    cancelText: { color: '#FFF', fontSize: 16 }
});

export default SpeedModal;
