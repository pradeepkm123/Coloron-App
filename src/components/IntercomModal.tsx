import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Alert,
    PermissionsAndroid,
    Platform,
    Animated,
    Dimensions,
    Easing,
    SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Device } from '../utils/deviceStorage';
import * as NvrSdk from '../native/NvrSdk';

const { width } = Dimensions.get('window');

const COLORS = {
    primary: '#00BCD4',
    secondary: '#00ACC1',
    background: '#FFFFFF',
    text: '#333',
    subText: '#666',
    border: '#E5E5E5',
    micActive: '#00ACC1'
};

interface IntercomModalProps {
    visible: boolean;
    onClose: () => void;
    allDevices?: Device[]; // Kept for backwards compatibility just in case
    selectedDevice: Device | null;
    currentUserId: number | null;
    currentChannelId?: number | null;
    currentChannelName?: string;
}

const IntercomModal: React.FC<IntercomModalProps> = ({
    visible,
    onClose,
    selectedDevice,
    currentUserId,
    currentChannelId,
    currentChannelName
}) => {
    const [isTalking, setIsTalking] = useState(false);
    const [isStartingTalk, setIsStartingTalk] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [intercomSessionActive, setIntercomSessionActive] = useState(false);
    const talkHandleRef = useRef<string | null>(null);
    const talkActiveRef = useRef(false);

    // Animation Refs
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const waveformBars = useRef(Array.from({ length: 25 }, () => new Animated.Value(0.2))).current;

    useEffect(() => {
        if (visible) {
            startIntercomSession();
        } else {
            cleanup();
        }
    }, [visible, currentUserId, currentChannelId]);

    useEffect(() => {
        if (isTalking) {
            // Pulse Animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.15,
                        duration: 500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    })
                ])
            ).start();

            // Waveform Animation
            const animations = waveformBars.map((bar) =>
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(bar, {
                            toValue: Math.random() * 0.8 + 0.2,
                            duration: 150,
                            useNativeDriver: false
                        }),
                        Animated.timing(bar, {
                            toValue: Math.random() * 0.6 + 0.1,
                            duration: 150,
                            useNativeDriver: false
                        })
                    ])
                )
            );
            animations.forEach(anim => anim.start());
            return () => {
                pulseAnim.stopAnimation();
                pulseAnim.setValue(1);
                animations.forEach(anim => anim.stop());
            };
        } else {
            // Reset
            waveformBars.forEach(bar => bar.setValue(0.2));
            pulseAnim.setValue(1);
        }
    }, [isTalking]);

    const startIntercomSession = async () => {
        if (currentUserId === null || currentUserId < 0) {
            Alert.alert('Error', 'Device is not logged in.');
            onClose();
            return;
        }

        setConnecting(true);
        try {
            const hasPermission = await requestMicPermission();
            if (!hasPermission) {
                Alert.alert('Permission Denied', 'Microphone permission is required for Two-Way Intercom.');
                onClose();
                return;
            }

            const channelId = currentChannelId ?? 0;
            console.log(`[Intercom] Starting intercom session for user ${currentUserId}, channel ${channelId}`);
            
            // Start real SDK talk
            const handle = await NvrSdk.startTwoWayTalk(currentUserId, channelId);
            const handleNum = parseInt(handle, 10);
            
            console.log('[Intercom] startTwoWayTalk returned handle:', handleNum);
            
            if (handleNum > 0) {
                talkHandleRef.current = handle;
                talkActiveRef.current = true;
                setIntercomSessionActive(true);
            } else {
                Alert.alert('Error', `Failed to start intercom (Code: ${handleNum})`);
                onClose();
            }
        } catch (err: any) {
            console.error('[Intercom] startTwoWayTalk failed:', err);
            Alert.alert('Intercom Error', err.message || 'Failed to connect to device intercom.');
            onClose();
        } finally {
            setConnecting(false);
        }
    };

    const cleanup = async () => {
        setIntercomSessionActive(false);
        setIsTalking(false);
        talkActiveRef.current = false;
        try {
            console.log('[Intercom] Stopping two-way talk...');
            await NvrSdk.stopTwoWayTalk();
        } catch (e) {
            console.error('[Intercom] stopTwoWayTalk failed:', e);
        }
        talkHandleRef.current = null;
    };

    const requestMicPermission = async () => {
        if (Platform.OS !== 'android') return true;

        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
                title: 'Microphone Permission',
                message: 'This app needs microphone access for two-way talk.',
                buttonPositive: 'Allow',
                buttonNegative: 'Deny',
            }
        );

        return granted === PermissionsAndroid.RESULTS.GRANTED;
    };

    const handlePressIn = async () => {
        if (!talkActiveRef.current || isTalking || isStartingTalk) return;
        setIsStartingTalk(true);

        try {
            console.log('[Intercom] Starting mic send...');
            await NvrSdk.startMicSend();
            setIsTalking(true);
        } catch (err: any) {
            console.error('[Intercom] startMicSend failed:', err);
            Alert.alert('Mic Error', err.message || 'Failed to start microphone transmission');
        } finally {
            setIsStartingTalk(false);
        }
    };

    const handlePressOut = async () => {
        if (!isTalking) return;
        try {
            console.log('[Intercom] Stopping mic send...');
            await NvrSdk.stopMicSend();
        } catch (err) {
            console.error('[Intercom] stopMicSend failed:', err);
        } finally {
            setIsTalking(false);
        }
    };

    const handleClose = () => {
        cleanup();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="slide"
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.mainContainer}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {selectedDevice?.name || 'Device'}
                    </Text>
                    <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                        <Icon name="close-circle-outline" size={28} color="#000" />
                    </TouchableOpacity>
                </View>

                <View style={styles.activeContent}>
                    {/* Waveform Visualization */}
                    <View style={styles.waveformContainer}>
                        {waveformBars.map((bar, index) => (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.waveformBar,
                                    {
                                        height: bar.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['10%', '100%']
                                        }),
                                        opacity: isTalking ? 1 : 0.3
                                    }
                                ]}
                            />
                        ))}
                    </View>

                    {/* Mic Button */}
                    <View style={styles.micButtonContainer}>
                        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                            <TouchableOpacity
                                style={[styles.micButton, isTalking && styles.micButtonActive]}
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                activeOpacity={1}
                                disabled={isStartingTalk}
                            >
                                <Icon name="microphone-outline" size={60} color="#FFF" />
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    {/* Instruction Text */}
                    <View style={styles.instructionContainer}>
                        <Text style={styles.instructionText}>
                            {isTalking ? 'Talking...' : 'Press on hold the Mic button'}
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: COLORS.background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        paddingTop: Platform.OS === 'ios' ? 40 : 15,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        flex: 1,
        marginRight: 10,
    },
    closeBtn: {
        padding: 5
    },
    activeContent: {
        flex: 1,
        justifyContent: 'space-evenly',
        paddingVertical: 40,
        alignItems: 'center'
    },
    waveformContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        paddingHorizontal: 40,
        gap: 3
    },
    waveformBar: {
        width: 6,
        backgroundColor: '#9DA8FF',
        borderRadius: 3,
        minHeight: 10
    },
    micButtonContainer: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    micButton: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        borderWidth: 6,
        borderColor: 'rgba(0, 188, 212, 0.3)'
    },
    micButtonActive: {
        backgroundColor: COLORS.micActive,
        borderColor: 'rgba(0, 172, 193, 0.5)',
        shadowOpacity: 0.6,
    },
    instructionContainer: {
        alignItems: 'center',
        paddingBottom: 20
    },
    instructionText: {
        color: COLORS.primary,
        fontSize: 18,
        fontWeight: '500'
    }
});

export default IntercomModal;
