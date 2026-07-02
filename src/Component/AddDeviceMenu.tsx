import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface AddDeviceMenuProps {
    visible: boolean;
    onClose: () => void;
    onScanQRCode?: () => void;
    onAddManually?: () => void;
    onOnlineDevice?: () => void;
    position?: { top: number; right: number };
}

const AddDeviceMenu: React.FC<AddDeviceMenuProps> = ({
    visible,
    onClose,
    onScanQRCode,
    onAddManually,
    onOnlineDevice,
    position = { top: 60, right: 20 },
}) => {
    const menuItems = [
        {
            icon: 'qrcode-scan',
            label: 'Scan QR Code',
            onPress: onScanQRCode,
        },
        {
            icon: 'pencil-outline',
            label: 'Add Device Manually',
            onPress: onAddManually,
        },
        {
            icon: 'access-point-network',
            label: 'LAN Search',
            onPress: onOnlineDevice,
        },
    ];

    const handleItemPress = (onPress?: () => void) => {
        if (onPress) {
            onPress();
        }
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.menuContainer, { top: position.top, right: position.right }]}>
                            {menuItems.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.menuItem,
                                        index === menuItems.length - 1 && styles.lastMenuItem,
                                    ]}
                                    onPress={() => handleItemPress(item.onPress)}
                                    activeOpacity={0.7}
                                >
                                    <Icon name={item.icon} size={20} color="#333" style={styles.menuIcon} />
                                    <Text style={styles.menuLabel}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    menuContainer: {
        position: 'absolute',
        backgroundColor: '#FFF',
        borderRadius: 12,
        paddingVertical: 8,
        minWidth: 200,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    lastMenuItem: {
        borderBottomWidth: 0,
    },
    menuIcon: {
        marginRight: 12,
        width: 24,
    },
    menuLabel: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
});

export default AddDeviceMenu;
