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
    ScrollView,
    TextInput,
    Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { deviceStorage } from '../utils/deviceStorage';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface Preset {
    id: number;
    name: string;
}

interface PtzControlDrawerProps {
    visible: boolean;
    onClose: () => void;
    onAction: (action: number) => void;
    onStop: () => void;
    onPreset: (command: number, index: number) => Promise<void>;
    speed: number;
    onSpeedChange: (speed: number) => void;
    deviceId?: string | number;
    channelId?: number | null;
    actions: {
        UP: number;
        DOWN: number;
        LEFT: number;
        RIGHT: number;
        ZOOM_IN: number;
        ZOOM_OUT: number;
        STOP: number;
    };
    presetCmds: {
        SET: number;
        GO: number;
        DEL: number;
    };
}

const PtzControlDrawer: React.FC<PtzControlDrawerProps> = ({
    visible, onClose, onAction, onStop, onPreset, actions, presetCmds, speed, onSpeedChange, deviceId, channelId
}) => {
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const panY = useRef(new Animated.Value(0)).current;
    const [activeTab, setActiveTab] = useState<'control' | 'preset'>('control');
    const [presets, setPresets] = useState<Preset[]>([]);
    const [isAddPresetVisible, setIsAddPresetVisible] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');

    const sliderWidth = SCREEN_WIDTH - 80;
    const thumbPos = useRef(new Animated.Value((speed - 1) / 7 * sliderWidth)).current;

    useEffect(() => {
        if (visible) {
            panY.setValue(0);
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
                easing: Easing.out(Easing.back(0.5)),
            }).start();
            loadPresets();
        }
    }, [visible, deviceId, channelId]);

    const loadPresets = async () => {
        if (!deviceId || channelId === null || channelId === undefined) return;
        try {
            const data = await deviceStorage.getPresets(deviceId, channelId);
            setPresets(data || []);
        } catch (e) {
            console.error("Load presets failed", e);
        }
    };

    const savePresets = async (newPresets: Preset[]) => {
        if (!deviceId || channelId === null || channelId === undefined) return;
        try {
            await deviceStorage.savePresets(deviceId, channelId, newPresets);
            setPresets(newPresets);
        } catch (e) {
            console.error("Save presets failed", e);
        }
    };

    const handleAddPreset = async () => {
        if (!newPresetName.trim()) return;
        const usedIds = presets.map(p => p.id);
        let nextId = 1;
        while (usedIds.includes(nextId)) nextId++;

        try {
            await onPreset(presetCmds.SET, nextId);
            const updated = [...presets, { id: nextId, name: newPresetName.trim() }];
            await savePresets(updated);
            setNewPresetName('');
            setIsAddPresetVisible(false);
            Alert.alert("Success", "Preset saved successfully");
        } catch (e) {
            Alert.alert("Error", "Failed to set preset");
        }
    };

    const handleDeletePreset = (id: number) => {
        Alert.alert(
            "Delete Preset",
            "Are you sure you want to delete this preset?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await onPreset(presetCmds.DEL, id);
                            const updated = presets.filter(p => p.id !== id);
                            await savePresets(updated);
                        } catch (e) {
                            Alert.alert("Error", "Failed to delete preset");
                        }
                    }
                }
            ]
        );
    };

    const handleGoToPreset = async (id: number) => {
        try {
            await onPreset(presetCmds.GO, id);
        } catch (e) {
            Alert.alert("Error", "Failed to reach preset position");
        }
    };

    useEffect(() => {
        const target = ((speed - 1) / 7) * sliderWidth;
        Animated.spring(thumbPos, {
            toValue: target,
            useNativeDriver: false,
            bounciness: 0
        }).start();
    }, [speed, sliderWidth]);

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
                updateSpeedFromX(touchX);
            },
            onPanResponderRelease: (evt) => {
                const touchX = evt.nativeEvent.locationX;
                updateSpeedFromX(touchX);
            }
        })
    ).current;

    const updateSpeedFromX = (x: number) => {
        let clampedX = Math.max(0, Math.min(x, sliderWidth));
        let newSpeed = Math.round((clampedX / sliderWidth) * 7) + 1;
        if (newSpeed !== speed) {
            onSpeedChange(newSpeed);
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

    const continuousInterval = useRef<NodeJS.Timeout | null>(null);

    const handlePressIn = (action: number) => {
        onAction(action); // Fire immediately
        // Fire continuously every 250ms for smooth uninterrupted PTZ movement
        continuousInterval.current = setInterval(() => {
            onAction(action);
        }, 250);
    };

    const handlePressOut = () => {
        if (continuousInterval.current) {
            clearInterval(continuousInterval.current);
            continuousInterval.current = null;
        }
        onStop();
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

                            <View style={styles.headerRow}>
                                <View style={styles.tabsContainer}>
                                    <TouchableOpacity
                                        style={[styles.tab, activeTab === 'control' && styles.activeTab]}
                                        onPress={() => setActiveTab('control')}
                                    >
                                        <Text style={[styles.tabText, activeTab === 'control' && styles.activeTabText]}>Control</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.tab, activeTab === 'preset' && styles.activeTab]}
                                        onPress={() => setActiveTab('preset')}
                                    >
                                        <Text style={[styles.tabText, activeTab === 'preset' && styles.activeTabText]}>Presets</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity style={styles.closeBtn} onPress={closeAction}>
                                    <Icon name="close" size={24} color="#8E8E93" />
                                </TouchableOpacity>
                            </View>

                            {activeTab === 'control' ? (
                                <View style={styles.controlContent}>
                                    <View style={styles.dpadContainer}>
                                        <View style={styles.dpadV}>
                                            <TouchableOpacity
                                                style={styles.dpadBtn}
                                                onPressIn={() => handlePressIn(actions.UP)}
                                                onPressOut={handlePressOut}
                                            >
                                                <Icon name="chevron-up" size={32} color="#A83232" />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.dpadH}>
                                            <TouchableOpacity
                                                style={styles.dpadBtn}
                                                onPressIn={() => handlePressIn(actions.LEFT)}
                                                onPressOut={handlePressOut}
                                            >
                                                <Icon name="chevron-left" size={32} color="#A83232" />
                                            </TouchableOpacity>

                                            <TouchableOpacity style={styles.okBtn} onPress={handlePressOut}>
                                                <Text style={styles.okText}>OK</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.dpadBtn}
                                                onPressIn={() => handlePressIn(actions.RIGHT)}
                                                onPressOut={handlePressOut}
                                            >
                                                <Icon name="chevron-right" size={32} color="#A83232" />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.dpadV}>
                                            <TouchableOpacity
                                                style={styles.dpadBtn}
                                                onPressIn={() => handlePressIn(actions.DOWN)}
                                                onPressOut={handlePressOut}
                                            >
                                                <Icon name="chevron-down" size={32} color="#A83232" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.zoomRow}>
                                        <TouchableOpacity
                                            style={styles.zoomCard}
                                            onPressIn={() => handlePressIn(actions.ZOOM_OUT)}
                                            onPressOut={handlePressOut}
                                        >
                                            <Icon name="minus" size={24} color="#A83232" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.zoomCard}
                                            onPressIn={() => handlePressIn(actions.ZOOM_IN)}
                                            onPressOut={handlePressOut}
                                        >
                                            <Icon name="plus" size={24} color="#A83232" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.sliderSection}>
                                        <View style={styles.sliderLabels}>
                                            <View style={styles.sliderLabelGroup}>
                                                <Icon name="speedometer-slow" size={18} color="#A83232" />
                                                <Text style={styles.sliderLabelText}>Slow</Text>
                                            </View>
                                            <Text style={styles.speedIndicatorText}>SPEED: {speed}</Text>
                                            <View style={styles.sliderLabelGroup}>
                                                <Text style={styles.sliderLabelText}>Fast</Text>
                                                <Icon name="speedometer" size={18} color="#A83232" />
                                            </View>
                                        </View>

                                        <View style={styles.sliderTrack} {...sliderPanResponder.panHandlers}>
                                            <View style={styles.trackBackground} />
                                            <Animated.View style={[styles.sliderFill, { width: thumbPos }]} />
                                            <Animated.View style={[styles.sliderThumb, { transform: [{ translateX: thumbPos }] }]} />
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.presetContent}>
                                    <ScrollView
                                        style={styles.presetList}
                                        contentContainerStyle={styles.presetListContent}
                                        showsVerticalScrollIndicator={false}
                                    >
                                        {presets.length === 0 ? (
                                            <View style={styles.emptyPresets}>
                                                <Icon name="image-off-outline" size={64} color="#CCC" />
                                                <Text style={styles.emptyText}>No presets saved yet</Text>
                                                <Text style={styles.emptySubText}>Add a preset to save current position</Text>
                                            </View>
                                        ) : (
                                            presets.map((item) => (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    style={styles.presetItem}
                                                    onPress={() => handleGoToPreset(item.id)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.presetIcon}>
                                                        <Icon name="camera-iris" size={26} color="#A83232" />
                                                    </View>
                                                    <View style={styles.presetInfo}>
                                                        <Text style={styles.presetName}>{item.name}</Text>
                                                        <Text style={styles.presetMeta}>Position #{item.id}</Text>
                                                    </View>
                                                    <View style={styles.presetActions}>
                                                        <TouchableOpacity
                                                            style={styles.presetActionBtn}
                                                            onPress={() => handleGoToPreset(item.id)}
                                                        >
                                                            <Icon name="play-circle" size={32} color="#4CAF50" />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={styles.presetActionBtn}
                                                            onPress={() => handleDeletePreset(item.id)}
                                                        >
                                                            <Icon name="trash-can-outline" size={28} color="#FF5252" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </TouchableOpacity>
                                            ))
                                        )}
                                    </ScrollView>

                                    <TouchableOpacity
                                        style={styles.addPresetBtn}
                                        onPress={() => setIsAddPresetVisible(true)}
                                    >
                                        <Icon name="plus" size={24} color="#FFF" />
                                        <Text style={styles.addPresetText}>Add New Preset</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>

            {/* Add Preset Modal */}
            <Modal transparent visible={isAddPresetVisible} animationType="fade" onRequestClose={() => setIsAddPresetVisible(false)}>
                <View style={styles.dialogOverlay}>
                    <View style={styles.dialogBox}>
                        <Text style={styles.dialogTitle}>Save Preset</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Front Door"
                            value={newPresetName}
                            onChangeText={setNewPresetName}
                            autoFocus
                            placeholderTextColor="#8E8E93"
                        />
                        <View style={styles.dialogActions}>
                            <TouchableOpacity
                                style={[styles.dialogBtn, styles.cancelBtn]}
                                onPress={() => setIsAddPresetVisible(false)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.dialogBtn, styles.saveBtn]}
                                onPress={handleAddPreset}
                            >
                                <Text style={styles.saveBtnText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#FCFAF7',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 14,
        paddingBottom: 40,
        maxHeight: SCREEN_HEIGHT * .85,
        minHeight: 500,
        marginBottom: 40,
    },
    dragHandleContainer: { width: '100%', height: 30, alignItems: 'center', justifyContent: 'center' },
    dragHandle: { width: 40, height: 4, backgroundColor: '#E5E5EA', borderRadius: 2 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    tabsContainer: { flexDirection: 'row', backgroundColor: '#F0EDED', borderRadius: 12, padding: 4 },
    tab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
    activeTab: { backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    tabText: { fontSize: 14, color: '#8E8E93', fontWeight: '600' },
    activeTabText: { color: '#A83232' },
    closeBtn: { padding: 4 },

    controlContent: { flex: 1 },
    presetContent: { flex: 1 },

    dpadContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
    dpadV: { zIndex: 2 },
    dpadH: { flexDirection: 'row', alignItems: 'center', gap: 20, marginVertical: 10 },
    dpadBtn: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#FFF1F1', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    okBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#A83232', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
    okText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

    zoomRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -10, marginTop: 20 },
    zoomCard: { width: 56, height: 56, backgroundColor: '#FFF', borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },

    sliderSection: { marginTop: 20, backgroundColor: '#FAF7F5', padding: 20, borderRadius: 24, paddingBottom: 30 },
    sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sliderLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sliderLabelText: { fontSize: 13, color: '#A83232', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    speedIndicatorText: { fontSize: 13, color: '#A83232', fontWeight: '800', textTransform: 'uppercase', opacity: 0.7 },
    sliderTrack: { height: 40, justifyContent: 'center', position: 'relative' },
    trackBackground: { height: 6, backgroundColor: '#E5E5EA', borderRadius: 3, width: '100%', position: 'absolute' },
    sliderFill: { height: 6, backgroundColor: '#A83232', borderRadius: 3, position: 'absolute' },
    sliderThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#A83232', borderWidth: 4, borderColor: '#FFF', position: 'absolute', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, left: -12 },

    // Preset Styles
    presetList: { flex: 1 },
    presetListContent: { paddingBottom: 20 },
    presetItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 18, borderRadius: 24, marginBottom: 15, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    presetIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF1F1', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    presetInfo: { flex: 1 },
    presetName: { fontSize: 18, fontWeight: '900', color: '#1B2141', marginBottom: 2 },
    presetMeta: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
    presetActions: { flexDirection: 'row', gap: 15, alignItems: 'center' },
    presetActionBtn: { padding: 4 },
    addPresetBtn: { flexDirection: 'row', height: 56, backgroundColor: '#A83232', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    addPresetText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 10 },
    emptyPresets: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300 },
    emptyText: { color: '#1B2141', fontSize: 18, marginTop: 15, fontWeight: '700' },
    emptySubText: { color: '#8E8E93', fontSize: 14, marginTop: 5, textAlign: 'center' },

    // Dialog Styles
    dialogOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 30 },
    dialogBox: { width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 24 },
    dialogTitle: { fontSize: 18, fontWeight: '700', color: '#1B2141', marginBottom: 20, textAlign: 'center' },
    input: { height: 56, backgroundColor: '#F5F5F7', borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000', marginBottom: 20 },
    dialogActions: { flexDirection: 'row', gap: 15 },
    dialogBtn: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cancelBtn: { backgroundColor: '#F5F5F7' },
    cancelBtnText: { color: '#8E8E93', fontWeight: '700' },
    saveBtn: { backgroundColor: '#A83232' },
    saveBtnText: { color: '#FFF', fontWeight: '700' }
});

export default PtzControlDrawer;
