import React, { useRef, useEffect, useState } from 'react';
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
    Switch,
    Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ThemedText } from './ThemedText';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AdvancedControlPanelProps {
    visible: boolean;
    onClose: () => void;
}

const AdvancedControlPanel: React.FC<AdvancedControlPanelProps> = ({ visible, onClose }) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const panY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    // Notification Toggle State
    const [notificationEnabled, setNotificationEnabled] = useState(true);

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

    const handleManualAlarm = () => {
        Alert.alert('Manual Alarm', 'Alarm triggered successfully!');
        onClose();
    };

    const handleAddPerson = () => {
        onClose();
        navigation.navigate('DeviceList'); // Placeholder route
    };

    const handleAddLicensePlate = () => {
        onClose();
        navigation.navigate('AddLicensePlate');
    };


    const handleSearchByImage = () => {
        Alert.alert('Smart Search', 'Image Search feature coming soon.');
    };

    const renderMenuItem = (icon: string, label: string, isToggle: boolean = false, onPress?: () => void) => (
        <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={isToggle ? 1 : 0.7}
            onPress={isToggle ? undefined : onPress}
        >
            <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer]}>
                    <Icon name={icon} size={24} color="#5d4037" />
                </View>
                <ThemedText style={styles.menuLabel} variant="semiBold">{label}</ThemedText>
            </View>

            {isToggle ? (
                <Switch
                    trackColor={{ false: "#E0E0E0", true: "#FF3B30" }}
                    thumbColor="#FFF"
                    onValueChange={() => setNotificationEnabled(prev => !prev)}
                    value={notificationEnabled}
                />
            ) : (
                <Icon name="chevron-right" size={24} color="#8E8E93" />
            )}
        </TouchableOpacity>
    );


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
                            {/* Drawer Handle */}
                            <View
                                style={styles.drawerHandleContainer}
                                {...drawerPanResponder.panHandlers}
                            >
                                <View style={styles.drawerHandle} />
                            </View>

                            {/* Header */}
                            <View style={styles.header}>
                                <ThemedText variant="bold" style={styles.title}>Advanced Control Panel</ThemedText>
                            </View>

                            {/* Menu Items */}
                            <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
                                {renderMenuItem('bell-ring-outline', 'Notification', true)}
                                {renderMenuItem('alarm-light-outline', 'Manual Alarm', false, handleManualAlarm)}
                                {renderMenuItem('account-plus-outline', 'Adding Person', false, handleAddPerson)}
                                {renderMenuItem('car-connected', 'Add License Plate', false, handleAddLicensePlate)}
                                {renderMenuItem('image-search-outline', 'Search by Image', false, handleSearchByImage)}
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
        backgroundColor: '#FFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingBottom: 20,
        paddingHorizontal: 20,
        minHeight: 400,
        maxHeight: SCREEN_HEIGHT * 0.85,
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
        marginBottom: 20,
    },
    title: {
        fontSize: 19,
        color: '#1a237e',
        fontWeight: 'bold',
        marginLeft: 5,
    },
    contentContainer: {
        flex: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        paddingHorizontal: 20,
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        marginBottom: 12,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: 18,
    },
    menuLabel: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
    }
});


export default AdvancedControlPanel;
