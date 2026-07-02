import React, { useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    TouchableOpacity,
    PanResponder,
    Animated,
    Dimensions,
    TouchableWithoutFeedback,
    ScrollView,
    InteractionManager
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ThemedText } from './ThemedText';
import { deviceStorage, Device } from '../utils/deviceStorage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DeviceListDrawerProps {
    visible: boolean;
    onClose: () => void;
    onSelectDevice: (device: Device) => void;
}

const DeviceListDrawer: React.FC<DeviceListDrawerProps> = ({ visible, onClose, onSelectDevice }) => {
    const [devices, setDevices] = React.useState<Device[]>([]);
    const panY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        let interactionTask: any;
        if (visible) {
            interactionTask = InteractionManager.runAfterInteractions(() => {
                const loadDevices = async () => {
                    const storedDevices = await deviceStorage.getDevices();
                    setDevices(storedDevices);
                };
                loadDevices();
            });
        }
        return () => {
            if (interactionTask) interactionTask.cancel();
        };
    }, [visible]);

    useEffect(() => {
        if (visible) {
            Animated.spring(panY, {
                toValue: 0,
                useNativeDriver: true,
                damping: 20,
                stiffness: 90,
            }).start();
        } else {
            Animated.timing(panY, {
                toValue: SCREEN_HEIGHT,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const drawerPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return gestureState.dy > 0;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    panY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 150 || gestureState.vy > 0.5) {
                    Animated.timing(panY, {
                        toValue: SCREEN_HEIGHT,
                        duration: 300,
                        useNativeDriver: true,
                    }).start(onClose);
                } else {
                    Animated.spring(panY, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 0
                    }).start();
                }
            },
        })
    ).current;

    const handleClose = () => {
        Animated.timing(panY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
        }).start(onClose);
    };

    const handleSelect = (device: Device) => {
        onSelectDevice(device);
        handleClose();
    };

    return (
        <Modal
            animationType="none"
            transparent={true}
            visible={visible}
            onRequestClose={handleClose}
        >
            <TouchableWithoutFeedback onPress={handleClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            style={[
                                styles.drawer,
                                { transform: [{ translateY: panY }] }
                            ]}
                        >
                            <View
                                style={styles.drawerHandleContainer}
                                {...drawerPanResponder.panHandlers}
                            >
                                <View style={styles.drawerHandle} />
                            </View>

                            <View style={styles.header}>
                                <ThemedText variant="bold" style={styles.title}>Device List</ThemedText>
                                <Icon name="server" size={20} color="#1a237e" />
                            </View>

                            <ScrollView style={styles.listContainer}>
                                {devices.length > 0 ? (
                                    devices.map((device) => (
                                        <TouchableOpacity
                                            key={device.id}
                                            style={styles.deviceItem}
                                            onPress={() => handleSelect(device)}
                                        >
                                            <View style={styles.deviceInfoLeft}>
                                                <View style={[styles.statusDot, { backgroundColor: device.status === 'Online' ? '#4CAF50' : '#BDBDBD' }]} />
                                                <View>
                                                    <ThemedText variant="semiBold" style={styles.deviceName}>{device.name}</ThemedText>
                                                    <ThemedText style={styles.deviceTime}>{device.ip} {device.isNVR ? `(${device.channels?.length} CH)` : '(IPC)'}</ThemedText>
                                                </View>
                                            </View>
                                            <Icon name="chevron-right" size={24} color="#333" />
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <ThemedText style={{ color: '#999' }}>No devices found</ThemedText>
                                    </View>
                                )}
                                <View style={{ height: 40 }} />
                            </ScrollView>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    drawer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingBottom: 20,
        paddingHorizontal: 20,
        minHeight: 300,
        maxHeight: SCREEN_HEIGHT * 0.7,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    drawerHandleContainer: {
        alignItems: 'center',
        paddingVertical: 15,
        width: '100%',
    },
    drawerHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#e0e0e0',
        borderRadius: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 5
    },
    title: {
        fontSize: 18,
        color: '#1a237e',
        marginRight: 10,
    },
    listContainer: {
        flex: 1,
    },
    deviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 15,
        backgroundColor: '#fafafa',
        borderRadius: 12,
        marginBottom: 10,
    },
    deviceInfoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 15,
    },
    deviceName: {
        fontSize: 14,
        color: '#333',
        marginBottom: 2,
    },
    deviceTime: {
        fontSize: 11,
        color: '#999',
    },
});

export default DeviceListDrawer;
