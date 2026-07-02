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
    ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ThemedText } from './ThemedText';
import { Device, Channel } from '../utils/deviceStorage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CameraListDrawerProps {
    visible: boolean;
    onClose: () => void;
    onSelectChannel?: (channelId: number) => void;
    device: Device | null;
    activeChannelId?: number | null;
}

const CameraListDrawer: React.FC<CameraListDrawerProps> = ({ visible, onClose, onSelectChannel, device, activeChannelId }) => {
    const panY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    const channels = React.useMemo(() => {
        if (!device) return [];
        if (device.isNVR && device.channels) {
            return device.channels;
        } else {
            // IPC: Single channel
            return [{ id: 0, name: device.name, online: device.status === 'Online' }];
        }
    }, [device]);

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

    const handleSelect = (channelId: number) => {
        if (onSelectChannel) {
            onSelectChannel(channelId);
        }
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
                                <Icon name="view-list" size={24} color="#A83232" style={{ marginRight: 10 }} />
                                <ThemedText variant="bold" style={styles.title}>Camera List</ThemedText>
                                {device && (
                                    <ThemedText style={styles.deviceSubtitle}>({device.type})</ThemedText>
                                )}
                            </View>

                            <ScrollView style={styles.listContainer}>
                                {channels.length > 0 ? (
                                    channels.map((channel: Channel) => {
                                        const isActive = activeChannelId === channel.id;
                                        const isOnline = channel.online ?? true;
                                        return (
                                            <TouchableOpacity
                                                key={channel.id}
                                                style={[
                                                    styles.channelItem,
                                                    isActive && styles.activeChannelItem
                                                ]}
                                                onPress={() => handleSelect(channel.id)}
                                            >
                                                <View style={styles.channelInfoLeft}>
                                                    <View style={[
                                                        styles.iconBox,
                                                        isActive ? styles.activeIconBox : (isOnline ? styles.onlineIconBox : styles.offlineIconBox)
                                                    ]}>
                                                        <Icon
                                                            name={isOnline ? "video" : "video-off"}
                                                            size={22}
                                                            color={isActive ? "#FFF" : (isOnline ? "#A83232" : "#999")}
                                                        />
                                                    </View>
                                                    <View>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <ThemedText variant="semiBold" style={[styles.channelName, isActive && { color: "#A83232" }]}>
                                                                {channel.name}
                                                            </ThemedText>
                                                            <View style={[
                                                                styles.statusDot,
                                                                { backgroundColor: isOnline ? '#4CAF50' : '#F44336' }
                                                            ]} />
                                                        </View>
                                                        <ThemedText style={styles.channelId}>Channel {channel.id + 1}</ThemedText>
                                                    </View>
                                                </View>
                                                <Icon
                                                    name={isActive ? "pause-circle" : "play-circle"}
                                                    size={28}
                                                    color={isActive ? "#A83232" : (isOnline ? "#A83232" : "#CCC")}
                                                />
                                            </TouchableOpacity>
                                        );
                                    })
                                ) : (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <ThemedText style={{ color: '#999' }}>No cameras found</ThemedText>
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
    deviceSubtitle: {
        fontSize: 12,
        color: '#666',
        marginLeft: 5,
    },
    listContainer: {
        flex: 1,
    },
    channelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 15,
        backgroundColor: '#FFF',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    activeChannelItem: {
        borderColor: '#A83232',
        backgroundColor: '#FFF8F8',
        borderWidth: 1.5,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    activeIconBox: {
        backgroundColor: '#A83232',
    },
    onlineIconBox: {
        backgroundColor: '#FFF1F1',
    },
    offlineIconBox: {
        backgroundColor: '#F5F5F5',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 8,
    },
    channelInfoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    channelName: {
        fontSize: 15,
        color: '#1A1A1A',
        fontWeight: 'bold',
    },
    channelId: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 2,
    },
});

export default CameraListDrawer;
