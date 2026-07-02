import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, Modal, Animated, Easing, PermissionsAndroid, Alert, Image } from 'react-native';
import { useNavigation, useNavigationState, useIsFocused } from '@react-navigation/native';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as NvrSdk from '../native/NvrSdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { alarmEmitter } from '../services/AlarmService';
import { api } from '../utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const TAB_HEIGHT = 70; // Increased height to accommodate the curve
const CENTER_BUTTON_SIZE = 65;
interface BottomBarProps {
    currentUserId?: number | null;
    currentChannelId?: number | null;
    deviceName?: string;
    currentChannelName?: string;
    audioSupport?: boolean;
    deviceHost?: string;
    devicePort?: number;
    onTalkingChange?: (isTalking: boolean) => void;
    onAudioToggle?: () => void;
    isAudioActive?: boolean;
}

const BottomBar: React.FC<BottomBarProps> = ({
    currentUserId,
    currentChannelId,
    deviceName,
    currentChannelName,
    audioSupport,
    deviceHost,
    devicePort,
    onTalkingChange,
    onAudioToggle,
    isAudioActive = false,
}) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const bottomPadding = insets.bottom || 0;

    // Get current route name
    const state = useNavigationState(state => state);
    const currentRoute = state?.routes[state.index]?.name || 'Home';

    // Premium states: Profile avatar & notifications
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const isFocused = useIsFocused();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await api.getAuthenticatedUser();
                if (user && user.profilePicture) {
                    setProfilePic(user.profilePicture);
                } else {
                    setProfilePic(null);
                }
            } catch (err) {
                console.log("[BottomBar] Error fetching profile pic:", err);
            }
        };

        const checkNotifications = async () => {
            try {
                const stored = await AsyncStorage.getItem('@alarm_history');
                if (stored) {
                    const history = JSON.parse(stored);
                    const unread = history.filter((a: any) => !a.read).length;
                    setUnreadCount(unread);
                }
            } catch (err) {
                console.log("[BottomBar] Error reading alarms:", err);
            }
        };

        if (isFocused) {
            fetchUser();
            checkNotifications();
        }
    }, [isFocused]);

    useEffect(() => {
        const checkNotifications = async () => {
            try {
                const stored = await AsyncStorage.getItem('@alarm_history');
                if (stored) {
                    const history = JSON.parse(stored);
                    const unread = history.filter((a: any) => !a.read).length;
                    setUnreadCount(unread);
                }
            } catch (err) {
                console.log("[BottomBar] Error reading alarms:", err);
            }
        };

        const handleNewAlarm = () => {
            checkNotifications();
        };

        const handleProfilePicUpdate = (newPic: string | null) => {
            setProfilePic(newPic);
        };

        alarmEmitter.on('new_alarm', handleNewAlarm);
        alarmEmitter.on('profile_updated', handleProfilePicUpdate);

        return () => {
            alarmEmitter.off('new_alarm', handleNewAlarm);
            alarmEmitter.off('profile_updated', handleProfilePicUpdate);
        };
    }, []);

    // UI States
    const [showPermissionDialog, setShowPermissionDialog] = useState(false);
    const [showIntercom, setShowIntercom] = useState(false);
    const [isTalking, setIsTalking] = useState(false);
    const [talkHandle, setTalkHandle] = useState<string | null>(null);
    const talkTimerRef = useRef<any>(null);

    useEffect(() => {
        return () => {
            if (talkTimerRef.current) clearTimeout(talkTimerRef.current);
            // We can't easily wait for async cleanup in unmount, 
            // but we can trigger it.
        };
    }, []);

    // Animations
    const intercomAnim = useRef(new Animated.Value(height)).current;
    const micScale = useRef(new Animated.Value(1)).current;
    const rippleAnim = useRef(new Animated.Value(0)).current;

    // Permissions
    const requestMicPermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    {
                        title: "Microphone Permission",
                        message: "App needs access to your microphone for two-way audio",
                        buttonNeutral: "Ask Me Later",
                        buttonNegative: "Cancel",
                        buttonPositive: "OK"
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.warn(err);
                return false;
            }
        }
        return true; // iOS handles automatically
    };

    const handleTwoWayPress = () => {
        if (!currentUserId && currentRoute === 'LiveView') {
            Alert.alert("Intercom", "Please select a camera and wait for connection.");
            return;
        }
        setShowPermissionDialog(true);
    };

    const onPermissionAgree = async () => {
        setShowPermissionDialog(false);
        const granted = await requestMicPermission();
        if (granted) {
            openIntercom();
        } else {
            Alert.alert("Permission Denied", "Microphone access is required for Two-Way audio.");
        }
    };

    const openIntercom = async () => {
        setShowIntercom(true);
        Animated.timing(intercomAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.5)),
        }).start();

        if (currentUserId !== null && currentUserId !== undefined) {
            try {
                console.log("[BottomBar] Auto-starting two way talk session...");
                const channelId = currentChannelId ?? 0;
                const handle = await NvrSdk.startTwoWayTalk(currentUserId, channelId);
                setTalkHandle(handle);
            } catch (err: any) {
                console.warn("[BottomBar] startTwoWayTalk failed:", err);
                Alert.alert("Intercom Error", err.message || "Failed to start intercom session");
                closeIntercom();
            }
        }
    };

    const closeIntercom = async () => {
        if (isTalking) {
            await stopTalking();
        }
        Animated.timing(intercomAnim, {
            toValue: height,
            duration: 300,
            useNativeDriver: true,
        }).start(async () => {
            setShowIntercom(false);
            try {
                await NvrSdk.stopTwoWayTalk();
            } catch (e) {
                console.warn("[BottomBar] stopTwoWayTalk failed:", e);
            }
            setTalkHandle(null);
        });
    };

    const startTalking = async () => {
        if (!currentUserId) {
            Alert.alert("Connection Required", "Device is not connected. Please go to Live View first.");
            return;
        }

        setIsTalking(true);
        onTalkingChange?.(true);

        // Auto-stop after 60 seconds
        talkTimerRef.current = setTimeout(() => {
            Alert.alert("Timeline", "Intercom session reached 60s limit.");
            stopTalking();
        }, 60000);

        Animated.parallel([
            Animated.spring(micScale, {
                toValue: 1.2,
                friction: 3,
                useNativeDriver: true,
            }),
            Animated.loop(
                Animated.sequence([
                    Animated.timing(rippleAnim, {
                        toValue: 1.5,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(rippleAnim, {
                        toValue: 1,
                        duration: 0,
                        useNativeDriver: true,
                    })
                ])
            )
        ]).start();

        try {
            console.log("[BottomBar] startMicSend requested");
            await NvrSdk.startMicSend();
        } catch (e: any) {
            console.error("[BottomBar] startMicSend failed:", e);
            Alert.alert("Mic Error", e.message || "Failed to start microphone transmission");
            stopTalking();
        }
    };

    const stopTalking = async () => {
        if (talkTimerRef.current) {
            clearTimeout(talkTimerRef.current);
            talkTimerRef.current = null;
        }

        setIsTalking(false);
        onTalkingChange?.(false);

        Animated.spring(micScale, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
        }).start();
        rippleAnim.stopAnimation();
        rippleAnim.setValue(0);

        try {
            console.log("[BottomBar] stopMicSend requested");
            await NvrSdk.stopMicSend();
        } catch (e) {
            console.warn("[BottomBar] stopMicSend failed:", e);
        }
    };

    // Custom 4-pointed sparkle star component
    const SparkleStar = ({ size = 28, color = '#FFFFFF' }) => {
        const sparkleStarPath = "M12,2 Q12,12 22,12 Q12,12 12,22 Q12,12 2,12 Q12,12 12,2 Z";
        return (
            <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
                <Path d={sparkleStarPath} />
            </Svg>
        );
    };

    // Curve configuration: gentle upward arch/curve
    const d = `
        M 0,16
        Q ${width / 2},0 ${width},16
        L ${width},${TAB_HEIGHT + bottomPadding}
        L 0,${TAB_HEIGHT + bottomPadding}
        Z
    `;
    const strokePath = `
        M 0,16
        Q ${width / 2},0 ${width},16
    `;

    const isMediaRoute = currentRoute === 'LiveView' || currentRoute === 'Playback';
    const PRIMARY_COLOR = '#A83232'; // Burgundy theme color
    const INACTIVE_COLOR = '#8E7D7D'; // Soft grey-brown theme color

    const renderThreeTabLayout = () => {
        const isHomeActive = currentRoute === 'Home';
        const isSearchActive = currentRoute === 'DeviceList';
        const isProfileActive = currentRoute === 'Profile';

        return (
            <View style={[styles.tabContainer, { paddingBottom: bottomPadding }]}>
                {/* Search Tab */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => navigation.navigate('DeviceList')}
                    activeOpacity={0.8}
                >
                    <Icon
                        name="magnify"
                        size={28}
                        color={isSearchActive ? PRIMARY_COLOR : INACTIVE_COLOR}
                    />
                </TouchableOpacity>

                {/* Home Tab (Center) */}
                <TouchableOpacity
                    style={[styles.tab, { position: 'relative' }]}
                    onPress={() => navigation.navigate('QRScanner')}
                    activeOpacity={0.8}
                >
                    {isHomeActive && (
                        <LinearGradient
                            colors={['rgba(168, 50, 50, 0.25)', 'rgba(168, 50, 50, 0.08)', 'rgba(168, 50, 50, 0)']}
                            style={styles.radialGlow}
                        />
                    )}
                    <View style={{ marginBottom: 2 }}>
                        <Icon name="qrcode-scan" size={24} color={isHomeActive ? PRIMARY_COLOR : INACTIVE_COLOR} />
                    </View>
                    <Text style={[styles.tabLabel, { color: isHomeActive ? PRIMARY_COLOR : INACTIVE_COLOR, fontWeight: isHomeActive ? '700' : '500' }]}>
                        Scan
                    </Text>
                </TouchableOpacity >

                {/* Profile Tab */}
                < TouchableOpacity
                    style={styles.tab}
                    onPress={() => navigation.navigate('Profile')}
                    activeOpacity={0.8}
                >
                    <View style={[styles.avatarWrapper, isProfileActive && styles.avatarActiveBorder]}>
                        {profilePic ? (
                            <Image
                                source={{ uri: profilePic }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <Icon
                                name="account"
                                size={22}
                                color={isProfileActive ? PRIMARY_COLOR : INACTIVE_COLOR}
                            />
                        )}
                        {unreadCount > 0 && <View style={styles.badge} />}
                    </View>
                </TouchableOpacity >
            </View >
        );
    };

    const renderMediaControlLayout = () => {
        const isProfileActive = currentRoute === 'Profile';

        return (
            <View style={[styles.tabContainer, { paddingBottom: bottomPadding }]}>
                {/* Home Tab */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => navigation.navigate('Home')}
                    activeOpacity={0.8}
                >
                    <Icon
                        name="home-outline"
                        size={28}
                        color={INACTIVE_COLOR}
                    />
                </TouchableOpacity>

                {/* Two Way Intercom */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={handleTwoWayPress}
                    activeOpacity={0.8}
                >
                    <Icon
                        name="microphone"
                        size={28}
                        color={isTalking ? '#FF3B30' : INACTIVE_COLOR}
                    />
                    {/* <Text style={[styles.tabLabel, { color: isTalking ? '#FF3B30' : INACTIVE_COLOR, fontSize: 9 }]}>
                        Two Way
                    </Text> */}
                </TouchableOpacity>

                {/* QR Scanner Center Tab (floating center styled elegantly) */}
                <View style={styles.centerButtonContainer}>
                    <TouchableOpacity
                        style={styles.centerButton}
                        onPress={() => navigation.navigate('QRScanner')}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={['#A83232', '#7A2020']}
                            style={styles.centerButtonGradient}
                        >
                            <Icon name="qrcode-scan" size={24} color="#FFFFFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Audio Output Mute/Unmute */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => onAudioToggle?.()}
                    activeOpacity={0.8}
                >
                    <Icon
                        name={isAudioActive ? 'volume-high' : 'volume-off'}
                        size={28}
                        color={isAudioActive ? PRIMARY_COLOR : INACTIVE_COLOR}
                    />
                    {/* <Text style={[styles.tabLabel, { color: isAudioActive ? PRIMARY_COLOR : INACTIVE_COLOR, fontSize: 9 }]}>
                        Audio
                    </Text> */}
                </TouchableOpacity>

                {/* Profile/More Tab */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => navigation.navigate('Profile')}
                    activeOpacity={0.8}
                >
                    <View style={[styles.avatarWrapper, isProfileActive && styles.avatarActiveBorder]}>
                        {profilePic ? (
                            <Image
                                source={{ uri: profilePic }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <Icon
                                name="account"
                                size={22}
                                color={isProfileActive ? PRIMARY_COLOR : INACTIVE_COLOR}
                            />
                        )}
                        {unreadCount > 0 && <View style={styles.badge} />}
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { height: TAB_HEIGHT + 10 + bottomPadding }]}>
            {/* Permission Dialog Modal */}
            <Modal
                transparent={true}
                visible={showPermissionDialog}
                animationType="fade"
                onRequestClose={() => setShowPermissionDialog(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.permissionDialog}>
                        <Text style={styles.permissionText}>
                            The app is about to apply for Recording Permissions, used to related functions for talk of device
                        </Text>
                        <View style={styles.dialogButtons}>
                            <TouchableOpacity
                                style={styles.dialogButton}
                                onPress={() => setShowPermissionDialog(false)}
                            >
                                <Text style={styles.dialogButtonTextCancel}>Don't agree</Text>
                            </TouchableOpacity>
                            <View style={styles.dialogDivider} />
                            <TouchableOpacity
                                style={styles.dialogButton}
                                onPress={onPermissionAgree}
                            >
                                <Text style={styles.dialogButtonTextAgree}>Agree</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Intercom Bottom Sheet Modal */}
            <Modal
                transparent={true}
                visible={showIntercom}
                animationType="none"
                onRequestClose={closeIntercom}
            >
                <View style={styles.intercomOverlay}>
                    <TouchableOpacity style={styles.touchableBackdrop} onPress={closeIntercom} />
                    <Animated.View style={[styles.intercomDrawer, { transform: [{ translateY: intercomAnim }] }]}>
                        {/* Header */}
                        <View style={styles.intercomHeader}>
                            <Text style={styles.intercomTitle}>Intercom</Text>
                            <TouchableOpacity onPress={closeIntercom} style={styles.closeButton}>
                                <Icon name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {/* Device Info */}
                        <View style={styles.deviceInfoContainer}>
                            <View style={styles.deviceRow}>
                                <Icon name="camera" size={22} color={PRIMARY_COLOR} />
                                <Text style={styles.deviceName}>{currentChannelName || `Camera ${currentChannelId !== null ? currentChannelId! + 1 : '1'}`}</Text>
                            </View>
                            <View style={styles.deviceRow}>
                                <Icon name="shield-check" size={16} color="#4CAF50" />
                                <Text style={styles.deviceStatus}>{deviceName || 'NVR'} • Online</Text>
                                {audioSupport !== undefined && (
                                    <View style={[styles.supportBadge, { backgroundColor: audioSupport ? '#4CAF50' : '#FF9800' }]}>
                                        <Text style={styles.supportBadgeText}>{audioSupport ? 'Supports Audio' : 'No Audio Input'}</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Talk Interface */}
                        <View style={styles.talkContainer}>
                            {/* Audio Visualizer (Simple Pulse) */}
                            {isTalking && (
                                <Animated.View style={[styles.ripple, { transform: [{ scale: rippleAnim }] }]} />
                            )}

                            <Text style={styles.talkLimitText}>
                                {isTalking ? "Keep holding to speak..." : "Press or hold the Mic button"}
                            </Text>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPressIn={startTalking}
                                onPressOut={stopTalking}
                                style={styles.micWrapper}
                            >
                                <Animated.View style={[styles.micButton, { transform: [{ scale: micScale }] }]}>
                                    <LinearGradient
                                        colors={isTalking ? ['#ff4d4d', '#aa0e18ff'] : ['#A83232', '#7A2020']}
                                        style={styles.micGradient}
                                    >
                                        <Icon name={isTalking ? "microphone" : "microphone-outline"} size={40} color="#FFF" />
                                    </LinearGradient>
                                </Animated.View>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* Soft Light Curved Top Border Svg */}
            <View style={styles.svgContainer}>
                <Svg width={width} height={TAB_HEIGHT + bottomPadding} style={{ overflow: 'visible' }}>
                    <Defs>
                        {/* Premium Light Rose/White Gradient */}
                        <SvgLinearGradient id="lightBg" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.98" />
                            <Stop offset="1" stopColor="#FFF2F2" stopOpacity="0.99" />
                        </SvgLinearGradient>

                        {/* Soft Rose/Burgundy Line Gradient */}
                        <SvgLinearGradient id="roseGlow" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0%" stopColor="#A83232" stopOpacity="0.05" />
                            <Stop offset="25%" stopColor="#A83232" stopOpacity="0.25" />
                            <Stop offset="50%" stopColor="#A83232" stopOpacity="0.5" />
                            <Stop offset="75%" stopColor="#A83232" stopOpacity="0.25" />
                            <Stop offset="100%" stopColor="#A83232" stopOpacity="0.05" />
                        </SvgLinearGradient>
                    </Defs>

                    {/* Light Background path */}
                    <Path d={d} fill="url(#lightBg)" />

                    {/* Soft strokes for rose reflection */}
                    <Path d={strokePath} stroke="url(#roseGlow)" strokeWidth={4} strokeOpacity={0.3} fill="none" />
                    <Path d={strokePath} stroke="url(#roseGlow)" strokeWidth={1.8} fill="none" />
                </Svg>
            </View>

            {isMediaRoute ? renderMediaControlLayout() : renderThreeTabLayout()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: -10,
        left: 0,
        right: 0,
        height: TAB_HEIGHT + 10,
        backgroundColor: 'transparent',
        elevation: 0,
    },
    svgContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    tabContainer: {
        flexDirection: 'row',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingTop: 8,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: 55,
    },
    tabLabel: {
        fontSize: 10,
        marginTop: 2,
    },
    radialGlow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        top: -30,
        alignSelf: 'center',
        zIndex: -1,
    },
    avatarWrapper: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(168, 50, 50, 0.25)',
        overflow: 'visible',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarActiveBorder: {
        borderColor: '#A83232',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 15,
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 9,
        height: 9,
        borderRadius: 4.5,
        backgroundColor: '#A83232',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    centerButtonContainer: {
        width: width / 5,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -30,
        height: 80,
    },
    centerButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        shadowColor: "#A83232",
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 6,
    },
    centerButtonGradient: {
        flex: 1,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(168, 50, 50, 0.12)',
    },
    // Permission Dialog Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    permissionDialog: {
        backgroundColor: '#FFFFFF',
        width: '82%',
        borderRadius: 16,
        padding: 24,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#F0E0E0',
    },
    permissionText: {
        fontSize: 16,
        color: '#2C3E50',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    dialogButtons: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F0E0E0',
        paddingTop: 16,
    },
    dialogButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
    },
    dialogButtonTextCancel: {
        color: '#8E7D7D',
        fontSize: 16,
    },
    dialogButtonTextAgree: {
        color: '#A83232',
        fontSize: 16,
        fontWeight: 'bold',
    },
    dialogDivider: {
        width: 1,
        backgroundColor: '#F0E0E0',
    },
    // Intercom Drawer Styles
    intercomOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    touchableBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    intercomDrawer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        elevation: 24,
        height: height * 0.45,
        justifyContent: 'flex-start',
        borderTopWidth: 1,
        borderTopColor: '#F0E0E0',
    },
    intercomHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    intercomTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    closeButton: {
        padding: 5,
    },
    deviceInfoContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    deviceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    deviceName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2C3E50',
        marginLeft: 8,
    },
    deviceStatus: {
        fontSize: 14,
        color: '#8E7D7D',
        marginLeft: 6,
        fontWeight: '500',
    },
    talkContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    talkLimitText: {
        color: '#A83232',
        fontSize: 14,
        marginBottom: 20,
        fontWeight: '500',
    },
    micWrapper: {
        width: 96,
        height: 96,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 48,
        backgroundColor: '#FFF0F0',
        borderWidth: 1,
        borderColor: '#F0E0E0',
    },
    micButton: {
        width: 78,
        height: 78,
        borderRadius: 39,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
    },
    micGradient: {
        flex: 1,
        borderRadius: 39,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ripple: {
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: 'rgba(168, 50, 50, 0.18)',
        zIndex: -1,
    },
    supportBadge: {
        marginLeft: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    supportBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    }
});

export default BottomBar;
