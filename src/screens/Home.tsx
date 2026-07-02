import React, { useState, useEffect, useRef } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Circle, Path } from 'react-native-svg';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    TouchableOpacity,
    TextInput,
    Modal,
    Animated,
    Dimensions,
    BackHandler,
    Alert,
    Image,
    ActivityIndicator,
    InteractionManager,
    AppState
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BottomBar from '../Component/BottomBar';
import CustomDrawer from '../Component/CustomDrawer';
import EmptyState from '../Component/EmptyState';
import AddDeviceMenu from '../Component/AddDeviceMenu';
import AddDeviceManually from '../Component/AddDeviceManually';
import DeviceSvg from '../assets/svg/Device.svg';
import DeviceIconSvg from '../assets/svg/Device_Icon.svg';
import LiveViewSvg from '../assets/svg/Live_View.svg';
import LiveIconSvg from '../assets/svg/Live_Icon.svg';
import PlayBackSvg from '../assets/svg/Play_Back.svg';
import PlayBackIconSvg from '../assets/svg/Playback_Icon.svg';
import EventSvg from '../assets/svg/Event.svg';
import EventIconSvg from '../assets/svg/Event_Icon.svg';
import GradientBackground from '../Component/GradientBackground';
import { RootStackParamList } from '../types/navigation';
import Logo from '../assets/svg/Coloron_Logo.svg';
import { api } from '../utils/api';

import { deviceStorage, Device } from '../utils/deviceStorage';
import { DeviceStatusManager } from '../utils/DeviceStatusManager';
import { authStorage } from '../utils/authStorage';
import { useFocusEffect } from '@react-navigation/native';
import { alarmEmitter } from '../services/AlarmService';
import { localSettings } from '../utils/localSettings';

let launchActionDone = false;


// Dummy data removed

const { width, height } = Dimensions.get('window');

type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

const MenuGridIcon: React.FC<{ color?: string; size?: number }> = ({ color = '#A83232', size = 24 }) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M5 7H14"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Path
                d="M5 12H19"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Path
                d="M10 17H19"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
};

const Home: React.FC = () => {

    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<HomeScreenRouteProp>();

    const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(route.params?.isAuthenticated || false);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [username, setUsername] = useState('Guest');
    const [menuVisible, setMenuVisible] = useState(false);
    const [addManuallyVisible, setAddManuallyVisible] = useState(false);
    const [initialSN, setInitialSN] = useState<string | undefined>(undefined);
    const [initialDevice, setInitialDevice] = useState<any | undefined>(undefined);
    const [devices, setDevices] = useState<Device[]>([]); // This will now hold RAW devices
    const [expandedDeviceIds, setExpandedDeviceIds] = useState<Set<string>>(new Set()); // Track expanded NVRs

    const [searchQuery, setSearchQuery] = useState('');
    const [totalAlerts, setTotalAlerts] = useState(0);

    // Camera List Popup
    const [camListVisible, setCamListVisible] = useState(false);
    const [selectedDeviceForCamList, setSelectedDeviceForCamList] = useState<Device | null>(null);

    useEffect(() => {
        if (route.params?.scannedSN || (route.params as any)?.scannedDevice) {
            const device = (route.params as any)?.scannedDevice;
            if (device) {
                console.log('Received scanned device:', device);
                setInitialSN(device.serial || device.sn);
                setInitialDevice(device);
                setAddManuallyVisible(true);
            } else if (route.params?.scannedSN) {
                console.log('Received scanned SN:', route.params.scannedSN);
                setInitialSN(route.params.scannedSN);
                setAddManuallyVisible(true);
            }
            navigation.setParams({ scannedSN: undefined, scannedDevice: undefined } as any);
        }
    }, [route.params]);

    // Listen for real-time alarms to update Dashboard count
    useEffect(() => {
        const handleNewAlarm = () => {
            setTotalAlerts(prev => prev + 1);
        };
        alarmEmitter.on('new_alarm', handleNewAlarm);
        return () => {
            alarmEmitter.off('new_alarm', handleNewAlarm);
        };
    }, []);



    useFocusEffect(
        React.useCallback(() => {
            let interactionTask: any;

            const runInitialization = () => {
                const loadData = async () => {
                    // 1. Load Raw Devices (Physical NVRs/IPCs)
                    const rawDevices = await deviceStorage.getDevices();
                    setDevices(rawDevices);

                    // 2. Load Alarms
                    try {
                        const storageKey = await authStorage.getAlarmStorageKey();
                        const alarmData = await AsyncStorage.getItem(storageKey);
                        if (alarmData) {
                            const alarms = JSON.parse(alarmData);
                            // Filter for UNREAD notifications only
                            const unreadCount = alarms.filter((a: any) => !a.isRead).length;
                            setTotalAlerts(unreadCount);
                        } else {
                            setTotalAlerts(0);
                        }
                    } catch (e) {
                        console.error("Error loading alarms:", e);
                    }


                    // 3. Start Monitoring
                    rawDevices.forEach(device => {
                        DeviceStatusManager.startMonitoring(device, async (deviceId, newStatus) => {
                            console.log(`Status update for ${deviceId}: ${newStatus}`);
                            // Update Data Store
                            const currentDevices = await deviceStorage.getDevices();
                            const targetIndex = currentDevices.findIndex(d => String(d.id) === String(deviceId));

                            if (targetIndex !== -1) {
                                if (currentDevices[targetIndex].status !== newStatus) {
                                    currentDevices[targetIndex].status = newStatus;
                                    await deviceStorage.saveDevices(currentDevices);
                                    setDevices(currentDevices); // Update UI with raw devices
                                }
                            }
                        }, 30000);
                    });
                };
                loadData();
            };

            interactionTask = InteractionManager.runAfterInteractions(() => {
                runInitialization();
            });

            return () => {
                if (interactionTask) interactionTask.cancel();
                DeviceStatusManager.stopAll();
            };
        }, [isLoggedIn])
    );

    // Handle Launch Settings and Automatic Connection
    useFocusEffect(
        React.useCallback(() => {
            const handleLaunchLogic = async () => {
                if (launchActionDone) return;

                const appSettings = await localSettings.getSettings();
                const rawDevices = await deviceStorage.getDevices();

                if (rawDevices.length === 0) return;

                // 1. Automatic Connection / Launch Setting: LIVE_VIEW or LAST_PREVIEW
                if (appSettings.automaticConnection || appSettings.launchMode === 'LIVE_VIEW' || appSettings.launchMode === 'LAST_PREVIEW') {
                    // Find first online device or just the first device if none are online yet
                    const targetDevice = rawDevices.find(d => d.status === 'Online') || rawDevices[0];

                    if (targetDevice) {
                        console.log(`[Home] Auto-connecting to: ${targetDevice.name}`);
                        launchActionDone = true;
                        navigation.navigate('LiveView', {
                            deviceId: targetDevice.id,
                            deviceName: targetDevice.name
                        });
                    }
                } else if (appSettings.launchMode === 'DEVICE_LIST') {
                    // Already here, just mark as done
                    launchActionDone = true;
                }
            };

            handleLaunchLogic();
        }, [navigation, isLoggedIn])
    );


    // Authentication & User Data
    useFocusEffect(
        React.useCallback(() => {
            const checkAuth = async () => {
                // If passed via params, we can trust it initially but still verify
                if (route.params?.isAuthenticated !== undefined) {
                    setIsLoggedIn(route.params.isAuthenticated);
                }

                const isAuth = await authStorage.isAuthenticated();
                setIsLoggedIn(isAuth);
                if (isAuth) {
                    const user = await authStorage.getUser();
                    if (user && user.username) {
                        setUsername(user.username);
                    }
                } else {
                    setUsername('Guest');
                }
                setIsAuthLoading(false);
            };
            checkAuth();
        }, [route.params?.isAuthenticated])
    );

    // Back Handler
    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                if (drawerVisible) {
                    setDrawerVisible(false);
                    return true;
                }
                Alert.alert(
                    'Exit App',
                    'Do you want to exit?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'OK', onPress: () => BackHandler.exitApp() }
                    ]
                );
                return true;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [drawerVisible])
    );

    // --- APPSTATE HANDLER (Multitasking support) ---
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                console.log("📱 App backgrounded: Pausing device status monitoring");
                DeviceStatusManager.stopAll();
            } else if (nextAppState === 'active') {
                console.log("📱 App foregrounded: Restarting monitoring");
            }
        });

        return () => subscription.remove();
    }, []);


    // Animation Refs
    const slideAnim = useRef(new Animated.Value(-300)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Animation Logic
    useEffect(() => {
        if (drawerVisible) {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -300,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [drawerVisible]);

    // Helper to toggle NVR expansion
    const toggleNVR = (deviceId: string) => {
        const newSet = new Set(expandedDeviceIds);
        if (newSet.has(deviceId)) {
            newSet.delete(deviceId);
        } else {
            newSet.add(deviceId);
        }
        setExpandedDeviceIds(newSet);
    };

    // Calculate Dashboard Stats
    const totalDevices = devices.length;
    const onlineDevices = devices.filter(d => d.status === 'Online').length;
    const totalChannels = devices.reduce((sum, d) => sum + (d.channels?.length || d.channelCount || 0), 0);

    if (isAuthLoading) {
        return (
            <View style={[styles.mainContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#A83232" />
            </View>
        );
    }

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea}>
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {!isLoggedIn ? (
                            <EmptyState
                                onLoginPress={() => navigation.navigate('Login')}
                                onSignUpPress={() => navigation.navigate('SignUp')}
                                onDemoPress={() => setIsLoggedIn(true)}
                                onNotificationPress={() => navigation.navigate('Notifications')}
                                onAddDevicePress={() => setMenuVisible(true)}
                            />
                        ) : (
                            <>
                                {/* ... Header Code ... */}
                                <View style={styles.header}>
                                    <View style={styles.headerLeft}>
                                        <TouchableOpacity
                                            style={styles.avatarContainer}
                                            onPress={() => setDrawerVisible(true)}
                                        >
                                            <MenuGridIcon color="#A83232" size={24} />
                                        </TouchableOpacity>
                                        <View style={styles.welcomeContainer}>
                                            <Text style={styles.welcomeLabel}>Welcome !</Text>
                                            <Text style={styles.welcomeName}>{username}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.headerRight}>
                                        <TouchableOpacity
                                            style={styles.iconButton}
                                            onPress={() => setMenuVisible(true)}
                                        >
                                            <Icon name="plus" size={24} color="#A83232" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.iconButton}
                                            onPress={() => navigation.navigate('Notifications')}
                                        >
                                            <Icon name="bell-outline" size={24} color="#A83232" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.searchContainer}>
                                    <Icon name="magnify" size={20} color="#A0A0A0" style={{ marginRight: 10 }} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search for Devices by Name or SN"
                                        placeholderTextColor="#A0A0A0"
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                </View>

                                <Text style={styles.sectionTitle}>Status Overview</Text>
                                <View style={styles.statusGrid}>
                                    {[
                                        { label: 'Total Devices', value: totalDevices.toString(), icon: 'cctv', route: 'DeviceList' },
                                        { label: 'Online', value: onlineDevices.toString(), icon: 'wifi', route: 'DeviceList' },
                                        { label: 'Channels', value: totalChannels.toString(), icon: 'television-play', route: 'LiveView' },
                                        { label: 'Alerts', value: totalAlerts.toString(), icon: 'alarm-light-outline', route: 'Notifications' }
                                    ].map((item, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={styles.statusCard}
                                            onPress={() => navigation.navigate(item.route as any)}
                                        >
                                            <View style={styles.statusIconBox}>
                                                <Icon name={item.icon} size={24} color="#7A2828" />
                                            </View>
                                            <View style={styles.statusContent}>
                                                <Text style={styles.statusValue}>{item.value}</Text>
                                                <Text style={styles.statusLabel}>{item.label}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.sectionTitle}>Quick Actions</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionGrid}>
                                    {[
                                        { label: 'Device', Icon: DeviceIconSvg, Bg: DeviceSvg, color: '#a84c60', route: 'DeviceList' },
                                        { label: 'Live View', Icon: LiveIconSvg, Bg: LiveViewSvg, color: '#996538', route: 'LiveView' },
                                        { label: 'Play Back', Icon: PlayBackIconSvg, Bg: PlayBackSvg, color: '#333162', route: 'Playback' },
                                        { label: 'Events', Icon: EventIconSvg, Bg: EventSvg, color: '#105712', route: 'Events' }
                                    ].map((action, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={styles.actionCard}
                                            onPress={() => {
                                                if (action.route === 'Playback' && devices.length > 0) {
                                                    navigation.navigate('Playback', { deviceId: devices[0].id, deviceName: devices[0].name });
                                                } else {
                                                    navigation.navigate(action.route as any);
                                                }
                                            }}
                                        >
                                            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                                                <action.Bg width="100%" height="100%" />
                                            </View>
                                            <View style={{ alignItems: 'center', zIndex: 1 }}>
                                                <action.Icon width={30} height={30} />
                                                <Text style={[styles.actionLabel, { color: action.color, marginTop: 5 }]}>{action.label}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <View style={styles.deviceHeader}>
                                    <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Device List</Text>
                                    <View style={{ flexDirection: 'row' }}>
                                        <TouchableOpacity onPress={() => setActiveTab('all')} style={{ marginRight: 15 }}>
                                            <Text style={[activeTab === 'all' ? styles.tabActive : styles.tabInactive]}>All</Text>
                                            {activeTab === 'all' && <View style={styles.tabIndicator} />}
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => setActiveTab('favorites')}>
                                            <Text style={[activeTab === 'favorites' ? styles.tabActive : styles.tabInactive]}>Favorites</Text>
                                            {activeTab === 'favorites' && <View style={styles.tabIndicator} />}
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {devices
                                    .filter(device => {
                                        const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) || device.ip.includes(searchQuery);
                                        const matchesTab = activeTab === 'all' || (activeTab === 'favorites' && device.favorite);
                                        return matchesSearch && matchesTab;
                                    })
                                    .map((device, idx) => (
                                        <View key={device.id} style={{ marginBottom: 16 }}>
                                            {/* Parent Device Card */}
                                            <View style={styles.premiumDeviceCard}>
                                                <TouchableOpacity
                                                    style={styles.thumbnailContainer}
                                                    onPress={() => navigation.navigate('LiveView', {
                                                        deviceId: device.id,
                                                        deviceName: device.name,
                                                        autoPlay: true
                                                    })}
                                                >
                                                    <View style={styles.thumbnailBackground}>
                                                        {device.thumbnail ? (
                                                            <Image
                                                                source={{ uri: device.thumbnail }}
                                                                style={StyleSheet.absoluteFill}
                                                                resizeMode="cover"
                                                            />
                                                        ) : (
                                                            <Icon
                                                                name={device.isNVR || device.type === 'NVR' ? "server-network" : "cctv"}
                                                                size={40}
                                                                color="#A83232"
                                                            />
                                                        )}
                                                    </View>
                                                </TouchableOpacity>


                                                <View style={styles.deviceInfoContainer}>
                                                    <View style={styles.deviceTitleRow}>
                                                        <Text style={styles.premiumDeviceName} numberOfLines={1}>{device.name}</Text>
                                                        <View style={[styles.statusIndicator, { backgroundColor: device.status === 'Online' ? '#1DB954' : '#FF5252' }]} />
                                                        {device.status === 'Online' && (
                                                            <View style={styles.miniLiveBadge}>
                                                                <Text style={styles.liveBadgeText}>LIVE</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text style={styles.premiumDeviceSub}>
                                                        {device.status === 'Online' ? '● Online' : '● Offline'} {device.isNVR ? `· ${device.channels?.length || 0} Channels` : ''}
                                                    </Text>

                                                    <View style={styles.deviceActionRow}>
                                                        <TouchableOpacity
                                                            style={styles.smallActionBtn}

                                                            onPress={async () => {
                                                                const updatedDevices = devices.map(d => d.id === device.id ? { ...d, favorite: !d.favorite } : d);
                                                                setDevices(updatedDevices);
                                                                await deviceStorage.saveDevices(updatedDevices);
                                                            }}
                                                        >
                                                            <Icon name={device.favorite ? "heart" : "heart-outline"} size={16} color={device.favorite ? "#A83232" : "#8E7D7D"} />
                                                        </TouchableOpacity>
                                                        {device.isNVR && (
                                                            <TouchableOpacity
                                                                style={styles.smallActionBtn}
                                                                onPress={() => {
                                                                    setSelectedDeviceForCamList(device);
                                                                    setCamListVisible(true);
                                                                }}
                                                            >
                                                                <Icon name="video-outline" size={18} color="#A83232" />
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                </View>

                                                <TouchableOpacity style={styles.playBtnContainer} onPress={() => navigation.navigate('LiveView', { deviceId: device.id, deviceName: device.name, autoPlay: true })}>
                                                    <Icon name="play-circle-outline" size={34} color="#A83232" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}

                                {/* Camera List Center Popup */}
                                <Modal
                                    visible={camListVisible}
                                    transparent={true}
                                    animationType="fade"
                                    onRequestClose={() => setCamListVisible(false)}
                                >
                                    <View style={styles.centerPopupOverlay}>
                                        <View style={styles.camListPopup}>
                                            <View style={styles.popupHeader}>
                                                <Text style={styles.popupTitle}>{selectedDeviceForCamList?.name}</Text>
                                                <TouchableOpacity onPress={() => setCamListVisible(false)}>
                                                    <Icon name="close" size={24} color="#8E7D7D" />
                                                </TouchableOpacity>
                                            </View>
                                            <Text style={styles.popupSub}>Select a channel to view</Text>

                                            <ScrollView style={styles.popupScroll} showsVerticalScrollIndicator={false}>
                                                {selectedDeviceForCamList?.channels?.map((channel) => (
                                                    <TouchableOpacity
                                                        key={`${selectedDeviceForCamList.id}_ch${channel.id}`}
                                                        style={styles.popupChannelItem}
                                                        onPress={() => {
                                                            setCamListVisible(false);
                                                            navigation.navigate('LiveView', {
                                                                deviceId: selectedDeviceForCamList.id,
                                                                deviceName: selectedDeviceForCamList.name,
                                                                channelId: channel.id,
                                                                autoPlay: true
                                                            });
                                                        }}
                                                    >
                                                        <View style={styles.popupChannelIcon}>
                                                            <Icon name="camera" size={16} color="#A83232" />
                                                        </View>
                                                        <Text style={styles.popupChannelText}>{channel.name || `Channel ${channel.id + 1}`}</Text>
                                                        <Icon name="chevron-right" size={18} color="#CCC" />
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    </View>
                                </Modal>


                                {devices.filter(device => {
                                    const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) || device.ip.includes(searchQuery);
                                    const matchesTab = activeTab === 'all' || (activeTab === 'favorites' && device.favorite);
                                    return matchesSearch && matchesTab;
                                    return matchesSearch && matchesTab;
                                }).length === 0 && null}

                                <View style={{ height: 100 }} />
                            </>
                        )}
                    </ScrollView>

                    <BottomBar />

                    <Modal
                        visible={drawerVisible}
                        animationType="none"
                        transparent={true}
                        onRequestClose={() => setDrawerVisible(false)}
                    >
                        <View style={styles.drawerOverlay}>
                            <Animated.View style={[styles.drawerBackdrop, { opacity: fadeAnim }]}>
                                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setDrawerVisible(false)} />
                            </Animated.View>
                            <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
                                <CustomDrawer onClose={() => setDrawerVisible(false)} />
                            </Animated.View>
                        </View>
                    </Modal>

                    <AddDeviceMenu
                        visible={menuVisible}
                        onClose={() => setMenuVisible(false)}
                        onScanQRCode={() => {
                            setMenuVisible(false);
                            navigation.navigate('QRScanner');
                        }}
                        onAddManually={() => {
                            setMenuVisible(false);
                            setAddManuallyVisible(true);
                        }}
                        onOnlineDevice={() => {
                            setMenuVisible(false);
                            navigation.navigate('LanSearch');
                        }}
                    />

                    <AddDeviceManually
                        visible={addManuallyVisible}
                        onClose={() => {
                            setAddManuallyVisible(false);
                            setInitialDevice(undefined);
                        }}
                        initialSN={initialSN}
                        initialDevice={initialDevice}
                    />
                </SafeAreaView>
            </GradientBackground>
        </View >
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#fff0f0ff',
    },
    safeArea: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FFE4E1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    welcomeContainer: {},
    welcomeLabel: {
        fontSize: 14,
        color: '#555',
    },
    welcomeName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#A83232',
    },
    headerRight: {
        flexDirection: 'row',
    },
    iconButton: {
        marginLeft: 15,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAE8E8',
        borderRadius: 25,
        paddingHorizontal: 15,
        height: 50,
        marginBottom: 25,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: '#333',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 15,
    },
    statusGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statusCard: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 0,
        borderWidth: 0.4,
        borderColor: '#F0E0E0',
    },
    statusIconBox: {
        width: 48,
        height: 48,
        borderRadius: 10,
        backgroundColor: '#FFF0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    statusContent: {
        flex: 1,
    },
    statusValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4A1D1D',
    },
    statusLabel: {
        fontSize: 11,
        color: '#8E7D7D',
        fontWeight: '600',
        marginTop: 2,
    },
    premiumDeviceCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 0.4,
        borderColor: '#F0E0E0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 0,
    },
    thumbnailContainer: {
        width: 100,
        height: 75,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#F9F9F9',
    },
    thumbnailBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniLiveBadge: {
        backgroundColor: '#A83232',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
        marginLeft: 6,
    },
    liveBadgeText: {
        color: '#FFF',
        fontSize: 8,
        fontWeight: 'bold',
    },
    deviceInfoContainer: {
        flex: 1,
        marginLeft: 15,
    },
    deviceTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    premiumDeviceName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
        marginRight: 8,
        flex: 1,
    },
    statusIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    premiumDeviceSub: {
        fontSize: 11,
        color: '#8E7D7D',
        marginBottom: 6,
        fontWeight: '500',
    },

    deviceActionRow: {
        flexDirection: 'row',
    },
    smallActionBtn: {
        marginRight: 15,
    },
    playBtnContainer: {
        padding: 5,
    },
    actionGrid: {
        flexDirection: 'row',
        marginBottom: 15,
        paddingHorizontal: 0,
    },
    actionCard: {
        width: 110,
        height: 110,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    actionLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    deviceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    tabActive: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#A83232',
    },
    tabInactive: {
        fontSize: 16,
        color: '#A0A0A0',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: -5,
        left: 0,
        width: 20,
        height: 3,
        backgroundColor: '#A83232',
        borderRadius: 2,
    },
    emptyStateContainer: {
        flex: 1,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyStateText: {
        color: '#A0A0A0',
        fontSize: 16,
    },
    deviceCard: {
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    drawerOverlay: {
        flex: 1,
        position: 'relative',
    },
    drawerBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    drawerContainer: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '75%',
        backgroundColor: '#FFFFFF',
        elevation: 5,
    },
    // Popup Styles
    centerPopupOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    camListPopup: {
        width: '100%',
        maxHeight: '70%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    popupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    popupTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    popupSub: {
        fontSize: 13,
        color: '#8E7D7D',
        marginBottom: 20,
    },
    popupScroll: {
        width: '100%',
    },
    popupChannelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#FDF2F2',
    },
    popupChannelIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FFF0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    popupChannelText: {
        flex: 1,
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
});


export default Home;
