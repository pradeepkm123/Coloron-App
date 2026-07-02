import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    TouchableOpacity,
    PanResponder,
    Animated,
    Dimensions,
    TouchableWithoutFeedback,
    GestureResponderEvent
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ThemedText } from './ThemedText';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PTZControlsProps {
    visible: boolean;
    onClose: () => void;
}

const PTZControls: React.FC<PTZControlsProps> = ({ visible, onClose }) => {
    const [sliderValue, setSliderValue] = useState(0.5); // 0 to 1
    const sliderValueRef = useRef(0.5); // To access current value in PanResponder
    const panY = useRef(new Animated.Value(SCREEN_HEIGHT)).current; // Start off-screen

    // Slider PanResponder
    const sliderWidth = useRef(0);
    const startSliderValue = useRef(0);

    const updateSliderValue = (value: number) => {
        const clamped = Math.max(0, Math.min(1, value));
        setSliderValue(clamped);
        sliderValueRef.current = clamped;
    };

    const sliderPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                startSliderValue.current = sliderValueRef.current;
            },
            onPanResponderMove: (_, gestureState) => {
                if (sliderWidth.current > 0) {
                    const delta = gestureState.dx / sliderWidth.current;
                    updateSliderValue(startSliderValue.current + delta);
                }
            },
        })
    ).current;

    // Open/Close Animation Effect
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

    // Drawer Drag PanResponder
    const drawerPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return gestureState.dy > 0; // Only capture if dragging down
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
                                styles.ptzDrawer,
                                { transform: [{ translateY: panY }] }
                            ]}
                        >
                            {/* Drawer Handle Area - Draggable */}
                            <View
                                style={styles.drawerHandleContainer}
                                {...drawerPanResponder.panHandlers}
                            >
                                <View style={styles.drawerHandle} />
                            </View>

                            {/* Header */}
                            <View style={styles.ptzHeader}>
                                <ThemedText variant="bold" style={styles.ptzTitle}>PTZ Control</ThemedText>
                                <View style={styles.zoomControlsShort}>
                                    <TouchableOpacity style={styles.zoomBtnSmall}>
                                        <Icon name="magnify-minus-outline" size={20} color="#5d4037" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.zoomBtnSmall}>
                                        <Icon name="magnify-plus-outline" size={20} color="#5d4037" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Main D-Pad Control */}
                            <View style={styles.dPadContainer}>
                                <View style={styles.dPadBackground}>
                                    {/* Up */}
                                    <TouchableOpacity style={[styles.dPadBtn, styles.dPadUp]}>
                                        <Icon name="menu-up" size={40} color="#A83232" />
                                    </TouchableOpacity>

                                    {/* Down */}
                                    <TouchableOpacity style={[styles.dPadBtn, styles.dPadDown]}>
                                        <Icon name="menu-down" size={40} color="#A83232" />
                                    </TouchableOpacity>

                                    {/* Left */}
                                    <TouchableOpacity style={[styles.dPadBtn, styles.dPadLeft]}>
                                        <Icon name="menu-left" size={40} color="#A83232" />
                                    </TouchableOpacity>

                                    {/* Right */}
                                    <TouchableOpacity style={[styles.dPadBtn, styles.dPadRight]}>
                                        <Icon name="menu-right" size={40} color="#A83232" />
                                    </TouchableOpacity>

                                    {/* Center OK */}
                                    <TouchableOpacity style={styles.dPadCenter}>
                                        <ThemedText style={styles.dPadCenterText}>OK</ThemedText>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Additional Slider/Controls */}
                            <View style={styles.ptzBottomControls}>
                                <View style={styles.ptzSliderRow}>
                                    <Icon name="minus-circle-outline" size={24} color="#A83232" />
                                    <ThemedText style={styles.sliderLabel}>Min</ThemedText>

                                    {/* Interactive Slider */}
                                    <View
                                        style={styles.sliderTrackContainer}
                                        onLayout={(e) => sliderWidth.current = e.nativeEvent.layout.width}
                                        {...sliderPanResponder.panHandlers}
                                    >
                                        <View style={styles.sliderTrack}>
                                            <View
                                                style={[
                                                    styles.sliderFill,
                                                    { width: `${sliderValue * 100}%` }
                                                ]}
                                            />
                                            <View
                                                style={[
                                                    styles.sliderThumb,
                                                    { left: `${sliderValue * 95}%` } // 95% to keep thumb inside
                                                ]}
                                            />
                                        </View>
                                    </View>

                                    <ThemedText style={styles.sliderLabel}>Max</ThemedText>
                                    <Icon name="plus-circle-outline" size={24} color="#A83232" />
                                </View>
                            </View>
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
    ptzDrawer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingBottom: 40,
        paddingHorizontal: 20,
        minHeight: 450,
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
    ptzHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    ptzTitle: {
        fontSize: 18,
        color: '#1a237e',
    },
    zoomControlsShort: {
        flexDirection: 'row',
    },
    zoomBtnSmall: {
        width: 40,
        height: 40,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    dPadContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
    },
    dPadBackground: {
        width: 220,
        height: 220,
        backgroundColor: '#fafafabd',
        borderRadius: 110,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dPadBtn: {
        position: 'absolute',
        width: 55,
        height: 55,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#efeded79',
        borderRadius: 30,
        shadowColor: '#a83232',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    dPadUp: {
        top: 10,
    },
    dPadDown: {
        bottom: 10,
    },
    dPadLeft: {
        left: 10,
    },
    dPadRight: {
        right: 10,
    },
    dPadCenter: {
        width: 60,
        height: 60,
        borderRadius: 35,
        backgroundColor: '#A83232',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#A83232',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    dPadCenterText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    ptzBottomControls: {
        marginTop: 20,
        paddingHorizontal: 10,
    },
    ptzSliderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fafafa',
        padding: 10,
        borderRadius: 15,
    },
    sliderLabel: {
        fontSize: 14,
        color: '#A83232',
        fontWeight: '500',
        marginHorizontal: 10,
    },
    sliderTrackContainer: {
        flex: 1,
        height: 30, // Increased touch area
        justifyContent: 'center',
        marginHorizontal: 10,
    },
    sliderTrack: {
        height: 4,
        backgroundColor: '#e0e0e0',
        borderRadius: 2,
        position: 'relative',
    },
    sliderFill: {
        height: '100%',
        backgroundColor: '#A83232',
        borderRadius: 2,
    },
    sliderThumb: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#A83232',
        position: 'absolute',
        top: -6,
    },
});

export default PTZControls;
