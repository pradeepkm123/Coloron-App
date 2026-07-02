import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    TouchableWithoutFeedback,
    Easing,
    PanResponder,
    Text,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageSettings {
    brightness: number;
    hue: number;
    saturation: number;
    contrast: number;
    sharpness: number;
}

interface ImageSettingsDrawerProps {
    visible: boolean;
    onClose: () => void;
    settings: ImageSettings;
    onSettingsChange: (settings: ImageSettings) => void;
    onSave: () => void;
    onDefault: () => void;
}

const ImageSettingsDrawer: React.FC<ImageSettingsDrawerProps> = ({
    visible, onClose, settings, onSettingsChange, onSave, onDefault
}) => {
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const panY = useRef(new Animated.Value(0)).current;
    const [activeTab, setActiveTab] = useState<'brightness' | 'hue' | 'saturation' | 'contrast' | 'sharpness'>('brightness');

    const sliderWidth = SCREEN_WIDTH - 80;
    const thumbPos = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            panY.setValue(0);
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
                easing: Easing.out(Easing.back(0.5)),
            }).start();
        }
    }, [visible]);

    useEffect(() => {
        const value = settings[activeTab];
        const target = (value / 100) * sliderWidth;
        Animated.spring(thumbPos, {
            toValue: target,
            useNativeDriver: false,
            bounciness: 0
        }).start();
    }, [activeTab, settings, sliderWidth]);

    const drawerPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) panY.setValue(gestureState.dy);
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 120 || gestureState.vy > 0.5) {
                    closeAction();
                } else {
                    Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
                }
            },
        })
    ).current;

    const sliderPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (evt) => {
                const touchX = evt.nativeEvent.locationX;
                updateValueFromX(touchX);
            },
            onPanResponderRelease: (evt) => {
                const touchX = evt.nativeEvent.locationX;
                updateValueFromX(touchX);
            }
        })
    ).current;

    const updateValueFromX = (x: number) => {
        let clampedX = Math.max(0, Math.min(x, sliderWidth));
        let newValue = Math.round((clampedX / sliderWidth) * 100);
        if (newValue !== settings[activeTab]) {
            onSettingsChange({
                ...settings,
                [activeTab]: newValue
            });
        }
    };

    const closeAction = () => {
        Animated.timing(slideAnim, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.in(Easing.ease),
        }).start(onClose);
    };

    const getTitle = () => {
        switch (activeTab) {
            case 'brightness': return 'Bright';
            case 'hue': return 'Hue';
            case 'saturation': return 'Saturation';
            case 'contrast': return 'Contrast';
            case 'sharpness': return 'Sharpness';
            default: return '';
        }
    };

    return (
        <Modal transparent visible={visible} onRequestClose={closeAction} animationType="none">
            <TouchableWithoutFeedback onPress={closeAction}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            style={[
                                styles.sheet,
                                { transform: [{ translateY: Animated.add(slideAnim, panY) }] }
                            ]}
                        >
                            <View style={styles.dragHandleContainer} {...drawerPanResponder.panHandlers}>
                                <View style={styles.dragHandle} />
                            </View>

                            <View style={styles.content}>
                                <View style={styles.titleRow}>
                                    <Text style={styles.title}>{getTitle()}</Text>
                                </View>

                                <View style={styles.sliderSection}>
                                    <View style={styles.sliderContainer}>
                                        <View style={styles.sliderTrack} {...sliderPanResponder.panHandlers}>
                                            <View style={styles.trackBackground} />
                                            <Animated.View style={[styles.sliderFill, { width: thumbPos }]} />
                                            <Animated.View style={[styles.sliderThumb, { transform: [{ translateX: thumbPos }] }]} />
                                        </View>
                                        <Text style={styles.valueText}>{settings[activeTab]}</Text>
                                    </View>
                                </View>

                                <View style={styles.tabsRow}>
                                    <TouchableOpacity
                                        style={[styles.tabBtn, activeTab === 'brightness' && styles.activeTabBtn]}
                                        onPress={() => setActiveTab('brightness')}
                                    >
                                        <Icon name="white-balance-sunny" size={30} color={activeTab === 'brightness' ? '#32A8A8' : '#8E8E93'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.tabBtn, activeTab === 'hue' && styles.activeTabBtn]}
                                        onPress={() => setActiveTab('hue')}
                                    >
                                        <Icon name="chart-bubble" size={30} color={activeTab === 'hue' ? '#32A8A8' : '#8E8E93'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.tabBtn, activeTab === 'saturation' && styles.activeTabBtn]}
                                        onPress={() => setActiveTab('saturation')}
                                    >
                                        <Icon name="blur" size={30} color={activeTab === 'saturation' ? '#32A8A8' : '#8E8E93'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.tabBtn, activeTab === 'contrast' && styles.activeTabBtn]}
                                        onPress={() => setActiveTab('contrast')}
                                    >
                                        <Icon name="contrast-circle" size={30} color={activeTab === 'contrast' ? '#32A8A8' : '#8E8E93'} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.modesRow}>
                                    <TouchableOpacity style={styles.modeBtn}>
                                        <Icon name="palette-outline" size={28} color="#32A8A8" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.modeBtn}>
                                        <Icon name="blur" size={28} color="#8E8E93" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.modeBtn}>
                                        <Icon name="image-filter-hdr" size={28} color="#8E8E93" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.modeBtn}>
                                        <Icon name="image-filter-rotate" size={28} color="#8E8E93" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.modeBtn}>
                                        <Icon name="lightbulb-outline" size={28} color="#E5E5EA" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.modeBtn}>
                                        <Icon name="target" size={28} color="#E5E5EA" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.footer}>
                                    <TouchableOpacity style={styles.footerBtn} onPress={onDefault}>
                                        <Text style={styles.footerBtnText}>Default</Text>
                                    </TouchableOpacity>
                                    <View style={styles.footerDivider} />
                                    <TouchableOpacity style={styles.footerBtn} onPress={closeAction}>
                                        <Text style={styles.footerBtnText}>Close</Text>
                                    </TouchableOpacity>
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
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
    },
    dragHandleContainer: { width: '100%', height: 30, alignItems: 'center', justifyContent: 'center' },
    dragHandle: { width: 40, height: 4, backgroundColor: '#E5E5EA', borderRadius: 2 },
    content: { paddingHorizontal: 20 },
    titleRow: { alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 18, color: '#333', fontWeight: '500' },
    sliderSection: {
        height: 180,
        justifyContent: 'center',
        backgroundColor: '#F7F9FC',
        marginHorizontal: -20,
        paddingHorizontal: 40,
        marginBottom: 10
    },
    sliderContainer: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    sliderTrack: { flex: 1, height: 40, justifyContent: 'center', position: 'relative' },
    trackBackground: { height: 2, backgroundColor: '#D1D1D6', borderRadius: 1, width: '100%', position: 'absolute' },
    sliderFill: { height: 2, backgroundColor: '#32A8A8', borderRadius: 1, position: 'absolute' },
    sliderThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D1D6', position: 'absolute', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, left: -12 },
    valueText: { fontSize: 16, color: '#333', width: 30, textAlign: 'right' },

    tabsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, backgroundColor: '#FFF' },
    tabBtn: { padding: 10 },
    activeTabBtn: {},

    modesRow: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#F2F2F7', paddingVertical: 15, backgroundColor: '#FFF' },
    modeBtn: { padding: 5 },

    footer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F2F2F7', height: 60, backgroundColor: '#FFF' },
    footerDivider: { width: 1, backgroundColor: '#F2F2F7' },
    footerBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    footerBtnText: { fontSize: 16, color: '#333' }
});

export default ImageSettingsDrawer;
