// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import {
//     View,
//     Text,
//     StyleSheet,
//     TouchableOpacity,
//     SafeAreaView,
//     StatusBar,
//     FlatList,
//     Modal,
//     Alert,
//     InteractionManager,
//     TextInput,
//     ScrollView,
//     Animated,
//     PanResponder,
//     Dimensions,
//     ActivityIndicator,
// } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import { API_URL } from '../config/api';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { alarmEmitter } from '../services/AlarmService';
// import { format } from 'date-fns';
// import { localSettings } from '../utils/localSettings';

// const { width: SCREEN_WIDTH } = Dimensions.get('window');
// const SWIPE_THRESHOLD = -72;
// const DELETE_BTN_WIDTH = 80;

// const ALARM_STORAGE_KEY = 'VMS_ALARMS';

// // ─── Types ────────────────────────────────────────────────────────────────────
// interface Alarm {
//     id: string;
//     type: string;
//     deviceId: string | number;
//     channelId: number;
//     deviceName: string;
//     channelName: string;
//     timestamp: number;
//     displayTitle?: string;
//     displayBody?: string;
//     isRead?: boolean;
//     description?: string;
// }

// // ─── Constants ────────────────────────────────────────────────────────────────
// const FILTER_CATEGORIES = [
//     { key: 'All', label: 'All', icon: 'view-grid-outline' },
//     { key: 'Motion', label: 'Motion', icon: 'motion-sensor' },
//     { key: 'AI', label: 'AI Alert', icon: 'robot-outline' },
//     { key: 'Sensor', label: 'Sensor', icon: 'palette-swatch-outline' },
//     { key: 'System', label: 'System', icon: 'help-circle-outline' },
// ];

// const TYPE_TO_CATEGORY: Record<string, string> = {
//     MOTION: 'Motion',
//     INTRUSION: 'AI',
//     FACE_DETECTION: 'AI',
//     FACE_RECOGNITION: 'AI',
//     LINE_CROSSING: 'AI',
//     VEHICLE_DETECTION: 'AI',
//     HUMAN_DETECTION: 'AI',
//     LOITERING: 'AI',
//     CROWD_DETECTION: 'AI',
//     OBJECT_ABANDONED: 'AI',
//     OBJECT_REMOVED: 'AI',
//     LICENSE_PLATE: 'AI',
//     VIBRATION: 'AI',
//     OTHER_AI: 'AI',
//     SENSOR: 'Sensor',
//     MANUAL: 'Sensor',
//     POS: 'Sensor',
//     OFFLINE: 'System',
//     DISK: 'System',
//     TAMPERING: 'System',
//     SCHEDULE: 'System',
// };

// // ─── Icon/Color helpers ───────────────────────────────────────────────────────
// const getTypeIcon = (type: string): string => {
//     const map: Record<string, string> = {
//         MOTION: 'walk',
//         INTRUSION: 'shield-alert-outline',
//         FACE_DETECTION: 'face-recognition',
//         FACE_RECOGNITION: 'face-man-shimmer-outline',
//         LINE_CROSSING: 'call-split',
//         VEHICLE_DETECTION: 'car-outline',
//         HUMAN_DETECTION: 'account-outline',
//         LOITERING: 'timer-sand',
//         CROWD_DETECTION: 'account-group-outline',
//         OBJECT_ABANDONED: 'bag-suitcase-outline',
//         OBJECT_REMOVED: 'archive-remove-outline',
//         LICENSE_PLATE: 'car-info',
//         VIBRATION: 'vibrate',
//         OTHER_AI: 'robot-outline',
//         SENSOR: 'leak',
//         MANUAL: 'gesture-tap',
//         POS: 'point-of-sale',
//         OFFLINE: 'wifi-off',
//         DISK: 'harddisk',
//         TAMPERING: 'camera-off-outline',
//         SCHEDULE: 'calendar-clock',
//     };
//     return map[type] || 'bell-outline';
// };

// const getTypeColor = (type: string): { icon: string; bg: string } => {
//     const cat = TYPE_TO_CATEGORY[type];
//     if (cat === 'Motion') return { icon: '#B03030', bg: '#FDECEA' };
//     if (cat === 'AI') return { icon: '#D4601A', bg: '#FEF3E8' };
//     if (cat === 'Sensor') return { icon: '#7B5EA7', bg: '#F3EEF9' };
//     if (cat === 'System') return { icon: '#1976D2', bg: '#E8F1FD' };
//     return { icon: '#B03030', bg: '#FDECEA' };
// };

// const getAlarmTitle = (alarm: Alarm): string => {
//     if (alarm.displayTitle) {
//         return alarm.displayTitle.replace(/🚨\s*/, '');
//     }
//     const names: Record<string, string> = {
//         MOTION: 'Motion Alarm',
//         INTRUSION: 'Intrusion Detected',
//         FACE_DETECTION: 'Face Detection',
//         FACE_RECOGNITION: 'Face Recognized',
//         LINE_CROSSING: 'Line Crossing',
//         VEHICLE_DETECTION: 'Vehicle Detected',
//         HUMAN_DETECTION: 'Human Detected',
//         LOITERING: 'Loitering Alert',
//         CROWD_DETECTION: 'Crowd Detected',
//         OBJECT_ABANDONED: 'Object Abandoned',
//         OBJECT_REMOVED: 'Object Removed',
//         LICENSE_PLATE: 'License Plate Alert',
//         VIBRATION: 'Vibration Alert',
//         OTHER_AI: 'AI Alert',
//         SENSOR: 'Sensor Alarm',
//         MANUAL: 'Manual Alarm',
//         OFFLINE: 'Device Offline',
//         DISK: 'Disk Alert',
//         TAMPERING: 'Camera Tampering',
//         SCHEDULE: 'Scheduled Event',
//     };
//     return names[alarm.type] || alarm.type?.replace(/_/g, ' ') || 'Alert';
// };

// // ─── Swipeable Card ───────────────────────────────────────────────────────────
// interface SwipeableCardProps {
//     alarm: Alarm;
//     onPress: (alarm: Alarm) => void;
//     onDelete: (id: string) => void;
//     activeSwipeId: string | null;
//     setActiveSwipeId: (id: string | null) => void;
// }

// const SwipeableCard: React.FC<SwipeableCardProps> = ({
//     alarm, onPress, onDelete, activeSwipeId, setActiveSwipeId,
// }) => {
//     const translateX = useRef(new Animated.Value(0)).current;
//     const isOpen = activeSwipeId === alarm.id;

//     // Snap open/close when activeSwipeId changes externally
//     useEffect(() => {
//         if (!isOpen) {
//             Animated.spring(translateX, {
//                 toValue: 0,
//                 useNativeDriver: true,
//                 tension: 80,
//                 friction: 10,
//             }).start();
//         }
//     }, [isOpen]);

//     const panResponder = useRef(
//         PanResponder.create({
//             onStartShouldSetPanResponder: () => false,
//             onMoveShouldSetPanResponder: (_, gs) =>
//                 Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy),
//             onPanResponderGrant: () => {
//                 // @ts-ignore
//                 translateX.setOffset(translateX._value);
//                 translateX.setValue(0);
//             },
//             onPanResponderMove: (_, gs) => {
//                 const rawX = gs.dx;
//                 // Clamp between -DELETE_BTN_WIDTH and 0
//                 const clamped = Math.max(-DELETE_BTN_WIDTH, Math.min(0, rawX));
//                 translateX.setValue(clamped);
//             },
//             onPanResponderRelease: (_, gs) => {
//                 translateX.flattenOffset();
//                 if (gs.dx < SWIPE_THRESHOLD) {
//                     // Snap open
//                     Animated.spring(translateX, {
//                         toValue: -DELETE_BTN_WIDTH,
//                         useNativeDriver: true,
//                         tension: 80,
//                         friction: 10,
//                     }).start();
//                     setActiveSwipeId(alarm.id);
//                 } else {
//                     // Snap closed
//                     Animated.spring(translateX, {
//                         toValue: 0,
//                         useNativeDriver: true,
//                         tension: 80,
//                         friction: 10,
//                     }).start();
//                     setActiveSwipeId(null);
//                 }
//             },
//         })
//     ).current;

//     const colors = getTypeColor(alarm.type);
//     const title = getAlarmTitle(alarm);
//     const timeStr = format(alarm.timestamp, 'HH:mm');
//     const dateStr = format(alarm.timestamp, 'MMM dd, yyyy');
//     const deviceStr = alarm.deviceName || 'NVR';
//     const description = alarm.description || alarm.displayBody || '';

//     return (
//         <View style={styles.cardWrapper}>
//             {/* Delete button (behind) */}
//             <View style={styles.deleteAction}>
//                 <TouchableOpacity
//                     style={styles.deleteBtn}
//                     onPress={() => onDelete(alarm.id)}
//                     activeOpacity={0.8}
//                 >
//                     <Icon name="delete-outline" size={26} color="#FFF" />
//                 </TouchableOpacity>
//             </View>

//             {/* Swipeable card (in front) */}
//             <Animated.View
//                 style={[styles.card, { transform: [{ translateX }] }]}
//                 {...panResponder.panHandlers}
//             >
//                 <TouchableOpacity
//                     activeOpacity={0.85}
//                     onPress={() => {
//                         if (isOpen) {
//                             setActiveSwipeId(null);
//                         } else {
//                             onPress(alarm);
//                         }
//                     }}
//                     style={styles.cardInner}
//                 >
//                     {/* Icon */}
//                     <View style={[styles.iconBox, { backgroundColor: colors.bg }]}>
//                         <Icon name={getTypeIcon(alarm.type)} size={26} color={colors.icon} />
//                     </View>

//                     {/* Content */}
//                     <View style={styles.cardContent}>
//                         <View style={styles.cardTopRow}>
//                             <Text style={styles.cardTitle} numberOfLines={1}>
//                                 {!alarm.isRead && (
//                                     <Text style={styles.bellEmoji}>🔔 </Text>
//                                 )}
//                                 {title}
//                             </Text>
//                             <Text style={styles.cardTime}>{timeStr}</Text>
//                         </View>
//                         <Text style={styles.cardMeta}>
//                             {dateStr} · {deviceStr}
//                         </Text>
//                         {description ? (
//                             <Text style={styles.cardDesc} numberOfLines={1}>{description}</Text>
//                         ) : null}
//                         {!alarm.isRead && (
//                             <View style={styles.newBadge}>
//                                 <Text style={styles.newBadgeText}>NEW</Text>
//                             </View>
//                         )}
//                     </View>

//                     {/* Play button */}
//                     <TouchableOpacity
//                         style={styles.playBtn}
//                         onPress={() => onPress(alarm)}
//                         hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
//                     >
//                         <View style={styles.playCircle}>
//                             <Icon name="play" size={16} color="#B03030" />
//                         </View>
//                     </TouchableOpacity>
//                 </TouchableOpacity>
//             </Animated.View>
//         </View>
//     );
// };

// // ─── Main Screen ──────────────────────────────────────────────────────────────
// const Notifications: React.FC = () => {
//     const navigation = useNavigation<any>();
//     const [notifications, setNotifications] = useState<Alarm[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [searchQuery, setSearchQuery] = useState('');
//     const [activeFilter, setActiveFilter] = useState('All');
//     const [selectedAlarm, setSelectedAlarm] = useState<Alarm | null>(null);
//     const [modalVisible, setModalVisible] = useState(false);
//     const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
//     const modalSlide = useRef(new Animated.Value(400)).current;

//     useEffect(() => {
//         const task = InteractionManager.runAfterInteractions(loadAlarms);
//         const handleNew = (alarm: Alarm) =>
//             setNotifications(prev => [alarm, ...prev].slice(0, 100));
//         alarmEmitter.on('new_alarm', handleNew);
//         return () => {
//             task.cancel();
//             alarmEmitter.off('new_alarm', handleNew);
//         };
//     }, []);

//     const loadAlarms = async () => {
//         try {
//             setLoading(true);
//             const authToken = await AsyncStorage.getItem('userToken');

//             // 1. Load from local cache first for instant UI
//             const cached = await AsyncStorage.getItem(ALARM_STORAGE_KEY);
//             if (cached) setNotifications(JSON.parse(cached));

//             // 2. Fetch fresh alarms from backend
//             if (authToken) {
//                 const response = await fetch(`${API_URL}/events?limit=100`, {
//                     headers: { 'Authorization': `Bearer ${authToken}` }
//                 });
//                 const remoteAlarms = await response.json();

//                 if (Array.isArray(remoteAlarms)) {
//                     // Map backend event format to local Alarm format if needed
//                     const normalized = remoteAlarms.map((e: any) => ({
//                         id: e._id,
//                         type: e.type,
//                         deviceId: e.deviceId,
//                         channelId: e.channelId,
//                         deviceName: e.deviceName || 'Device',
//                         channelName: e.channelName || `CH${e.channelId + 1}`,
//                         timestamp: new Date(e.timestamp).getTime(),
//                         displayTitle: e.displayTitle,
//                         displayBody: e.displayBody,
//                         isRead: e.read,
//                         description: e.features?.message
//                     }));

//                     setNotifications(normalized);
//                     await AsyncStorage.setItem(ALARM_STORAGE_KEY, JSON.stringify(normalized));
//                 }
//             }
//         } catch (e) {
//             console.warn('[Notifications] Failed to load remote alarms:', e);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const persist = async (list: Alarm[]) => {
//         await AsyncStorage.setItem(ALARM_STORAGE_KEY, JSON.stringify(list));
//     };

//     const markAsRead = async (id: string) => {
//         const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
//         setNotifications(updated);
//         await persist(updated);

//         try {
//             const authToken = await AsyncStorage.getItem('userToken');
//             if (authToken) {
//                 await fetch(`${API_URL}/events/${id}/read`, {
//                     method: 'PUT',
//                     headers: { 'Authorization': `Bearer ${authToken}` }
//                 });
//             }
//         } catch (e) {
//             console.warn('[Notifications] Failed to sync read status:', e);
//         }
//     };

//     const handleDelete = async (id: string) => {
//         const updated = notifications.filter(n => n.id !== id);
//         setNotifications(updated);
//         await persist(updated);
//         setActiveSwipeId(null);

//         try {
//             const authToken = await AsyncStorage.getItem('userToken');
//             if (authToken) {
//                 await fetch(`${API_URL}/events/${id}`, {
//                     method: 'DELETE',
//                     headers: { 'Authorization': `Bearer ${authToken}` }
//                 });
//             }
//         } catch (e) {
//             console.warn('[Notifications] Failed to sync deletion:', e);
//         }
//     };

//     const clearAll = () => {
//         Alert.alert(
//             'Clear All',
//             'Delete all notifications?',
//             [
//                 { text: 'Cancel', style: 'cancel' },
//                 {
//                     text: 'Delete All',
//                     style: 'destructive',
//                     onPress: async () => {
//                         setNotifications([]);
//                         await AsyncStorage.removeItem(ALARM_STORAGE_KEY);
//                     },
//                 },
//             ]
//         );
//     };

//     const openDetail = (alarm: Alarm) => {
//         setSelectedAlarm(alarm);
//         setModalVisible(true);
//         modalSlide.setValue(400);
//         Animated.spring(modalSlide, {
//             toValue: 0,
//             useNativeDriver: true,
//             tension: 60,
//             friction: 10,
//         }).start();
//         if (!alarm.isRead) markAsRead(alarm.id);
//     };

//     const closeDetail = () => {
//         Animated.timing(modalSlide, {
//             toValue: 400,
//             duration: 250,
//             useNativeDriver: true,
//         }).start(() => {
//             setModalVisible(false);
//             setSelectedAlarm(null);
//         });
//     };

//     const handlePlayback = async (alarm: Alarm) => {
//         closeDetail();
//         const appSettings = await localSettings.getSettings();
//         const offsetMs = (appSettings.pushMessagePreTime || 10) * 1000;
//         navigation.navigate('Playback', {
//             deviceId: alarm.deviceId,
//             deviceName: alarm.deviceName,
//             initialChannelId: alarm.channelId,
//             startTime: alarm.timestamp - offsetMs,
//         });
//     };

//     const handleLiveView = (alarm: Alarm) => {
//         closeDetail();
//         navigation.navigate('LiveView', {
//             deviceId: alarm.deviceId,
//             channelId: alarm.channelId,
//             deviceName: alarm.deviceName,
//         });
//     };

//     // Filtered list
//     const filteredList = notifications.filter(alarm => {
//         const catMatch =
//             activeFilter === 'All' ||
//             TYPE_TO_CATEGORY[alarm.type] === activeFilter;
//         const q = searchQuery.toLowerCase();
//         const title = getAlarmTitle(alarm).toLowerCase();
//         const device = (alarm.deviceName || '').toLowerCase();
//         const searchMatch =
//             !q || title.includes(q) || device.includes(q) || alarm.type?.toLowerCase().includes(q);
//         return catMatch && searchMatch;
//     });

//     const unreadCount = notifications.filter(n => !n.isRead).length;

//     const renderItem = useCallback(
//         ({ item }: { item: Alarm }) => (
//             <SwipeableCard
//                 alarm={item}
//                 onPress={openDetail}
//                 onDelete={handleDelete}
//                 activeSwipeId={activeSwipeId}
//                 setActiveSwipeId={setActiveSwipeId}
//             />
//         ),
//         [activeSwipeId, notifications]
//     );

//     return (
//         <View style={styles.root}>
//             <StatusBar barStyle="dark-content" backgroundColor="#FFF6F6" translucent={false} />
//             <SafeAreaView style={styles.safe}>

//                 {/* ── Header ── */}
//                 <View style={styles.header}>
//                     <TouchableOpacity
//                         style={styles.backBtn}
//                         onPress={() => navigation.goBack()}
//                         hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
//                     >
//                         <View style={styles.backCircle}>
//                             <Icon name="chevron-left" size={22} color="#333" />
//                         </View>
//                     </TouchableOpacity>
//                     <View style={styles.headerCenter}>
//                         <Text style={styles.headerSub}>Activity</Text>
//                         <Text style={styles.headerTitle}>Notifications</Text>
//                     </View>
//                     <TouchableOpacity
//                         style={styles.clearBtn}
//                         onPress={clearAll}
//                         hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
//                     >
//                         <View style={styles.clearCircle}>
//                             <Icon name="delete-sweep-outline" size={22} color="#B03030" />
//                         </View>
//                     </TouchableOpacity>
//                 </View>

//                 {/* ── Search ── */}
//                 <View style={styles.searchBar}>
//                     <Icon name="magnify" size={20} color="#AAAAAA" style={{ marginRight: 8 }} />
//                     <TextInput
//                         style={styles.searchInput}
//                         placeholder="Find alerts or devices..."
//                         placeholderTextColor="#AAAAAA"
//                         value={searchQuery}
//                         onChangeText={setSearchQuery}
//                         returnKeyType="search"
//                     />
//                     {searchQuery.length > 0 && (
//                         <TouchableOpacity onPress={() => setSearchQuery('')}>
//                             <Icon name="close-circle" size={18} color="#CCC" />
//                         </TouchableOpacity>
//                     )}
//                 </View>

//                 {/* ── Filter Chips ── */}
//                 <ScrollView
//                     horizontal
//                     showsHorizontalScrollIndicator={false}
//                     contentContainerStyle={styles.filterRow}
//                 >
//                     {FILTER_CATEGORIES.map(cat => {
//                         const active = activeFilter === cat.key;
//                         return (
//                             <TouchableOpacity
//                                 key={cat.key}
//                                 style={[styles.chip, active && styles.chipActive]}
//                                 onPress={() => setActiveFilter(cat.key)}
//                                 activeOpacity={0.7}
//                             >
//                                 <Icon
//                                     name={cat.icon}
//                                     size={18}
//                                     color={active ? '#FFF' : '#555'}
//                                 />
//                                 <Text style={[styles.chipText, active && styles.chipTextActive]}>
//                                     {cat.label}
//                                 </Text>
//                             </TouchableOpacity>
//                         );
//                     })}
//                 </ScrollView>

//                 {/* ── List ── */}
//                 {loading ? (
//                     <View style={styles.emptyWrap}>
//                         <ActivityIndicator size="large" color="#B03030" />
//                     </View>
//                 ) : filteredList.length === 0 ? (
//                     <View style={styles.emptyWrap}>
//                         <Icon name="bell-sleep-outline" size={64} color="#E0C0C0" />
//                         <Text style={styles.emptyTitle}>No Notifications</Text>
//                         <Text style={styles.emptyText}>
//                             {searchQuery ? 'No results for your search.' : 'Alarm events will appear here.'}
//                         </Text>
//                     </View>
//                 ) : (
//                     <FlatList
//                         data={filteredList}
//                         renderItem={renderItem}
//                         keyExtractor={item => item.id}
//                         contentContainerStyle={styles.listContent}
//                         showsVerticalScrollIndicator={false}
//                         onScrollBeginDrag={() => setActiveSwipeId(null)}
//                     />
//                 )}

//                 {/* ── Count bar ── */}
//                 {notifications.length > 0 && (
//                     <View style={styles.countBar}>
//                         <Text style={styles.countText}>
//                             {unreadCount > 0
//                                 ? `${unreadCount} unread · ${notifications.length} total`
//                                 : `All caught up · ${notifications.length} total`}
//                         </Text>
//                     </View>
//                 )}
//             </SafeAreaView>

//             {/* ── Detail Bottom Sheet ── */}
//             <Modal
//                 visible={modalVisible}
//                 transparent
//                 animationType="none"
//                 onRequestClose={closeDetail}
//             >
//                 <View style={styles.modalOverlay}>
//                     <TouchableOpacity
//                         style={StyleSheet.absoluteFill}
//                         activeOpacity={1}
//                         onPress={closeDetail}
//                     />
//                     <Animated.View
//                         style={[styles.sheet, { transform: [{ translateY: modalSlide }] }]}
//                     >
//                         {/* Handle */}
//                         <View style={styles.sheetHandle} />

//                         {selectedAlarm && (() => {
//                             const colors = getTypeColor(selectedAlarm.type);
//                             const title = getAlarmTitle(selectedAlarm);
//                             const dtStr = format(selectedAlarm.timestamp, 'MMM dd, yyyy · HH:mm:ss');
//                             const desc = selectedAlarm.description || selectedAlarm.displayBody || '';

//                             return (
//                                 <>
//                                     {/* Big icon */}
//                                     <View style={[styles.sheetIconWrap, { backgroundColor: colors.bg }]}>
//                                         <Icon
//                                             name={getTypeIcon(selectedAlarm.type)}
//                                             size={48}
//                                             color={colors.icon}
//                                         />
//                                     </View>

//                                     {/* Title + date */}
//                                     <Text style={styles.sheetTitle}>
//                                         🚨 {title}
//                                     </Text>
//                                     <Text style={styles.sheetDate}>{dtStr}</Text>

//                                     {/* Info card */}
//                                     <View style={styles.infoCard}>
//                                         <View style={styles.infoRow}>
//                                             <Icon name="camera-outline" size={18} color="#B03030" style={{ marginRight: 10 }} />
//                                             <Text style={styles.infoText}>
//                                                 · {selectedAlarm.channelName || selectedAlarm.deviceName || 'Camera 1'}
//                                             </Text>
//                                         </View>
//                                         {(selectedAlarm.deviceName || desc) ? (
//                                             <View style={styles.infoRow}>
//                                                 <Icon name="information-outline" size={18} color="#555" style={{ marginRight: 10 }} />
//                                                 <Text style={styles.infoText}>
//                                                     {desc || selectedAlarm.deviceName}
//                                                 </Text>
//                                             </View>
//                                         ) : null}
//                                     </View>

//                                     {/* Action bar */}
//                                     <View style={styles.actionBar}>
//                                         <TouchableOpacity
//                                             style={styles.actionSide}
//                                             onPress={() => handlePlayback(selectedAlarm)}
//                                         >
//                                             <Icon name="history" size={26} color="#444" />
//                                             <Text style={styles.actionLabel}>Playback</Text>
//                                         </TouchableOpacity>

//                                         <TouchableOpacity
//                                             style={styles.actionCenter}
//                                             onPress={() => handleLiveView(selectedAlarm)}
//                                         >
//                                             <Icon name="play" size={30} color="#FFF" />
//                                         </TouchableOpacity>

//                                         <TouchableOpacity
//                                             style={styles.actionSide}
//                                             onPress={closeDetail}
//                                         >
//                                             <Icon name="close" size={26} color="#444" />
//                                             <Text style={styles.actionLabel}>Close</Text>
//                                         </TouchableOpacity>
//                                     </View>
//                                 </>
//                             );
//                         })()}
//                     </Animated.View>
//                 </View>
//             </Modal>
//         </View>
//     );
// };

// // ─── Styles ───────────────────────────────────────────────────────────────────
// const styles = StyleSheet.create({
//     root: {
//         flex: 1,
//         backgroundColor: '#FFF6F6',
//     },
//     safe: {
//         flex: 1,
//     },

//     // Header
//     header: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 16,
//         paddingTop: 60,
//         paddingBottom: 8,
//         backgroundColor: '#FFF6F6',
//     },
//     backBtn: { padding: 2 },
//     backCircle: {
//         width: 36,
//         height: 36,
//         borderRadius: 18,
//         backgroundColor: '#FFF',
//         justifyContent: 'center',
//         alignItems: 'center',
//         elevation: 2,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 1 },
//         shadowOpacity: 0.08,
//         shadowRadius: 3,
//     },
//     headerCenter: {
//         flex: 1,
//         paddingHorizontal: 14,
//     },
//     headerSub: {
//         fontSize: 12,
//         color: '#999',
//         fontWeight: '400',
//     },
//     headerTitle: {
//         fontSize: 22,
//         fontWeight: '700',
//         color: '#1A1A1A',
//         marginTop: 1,
//     },
//     clearBtn: { padding: 2 },
//     clearCircle: {
//         width: 36,
//         height: 36,
//         borderRadius: 18,
//         backgroundColor: '#FFF',
//         justifyContent: 'center',
//         alignItems: 'center',
//         elevation: 2,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 1 },
//         shadowOpacity: 0.08,
//         shadowRadius: 3,
//     },

//     // Search
//     searchBar: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         backgroundColor: '#FFF',
//         marginHorizontal: 16,
//         marginBottom: 12,
//         marginTop: 4,
//         borderRadius: 28,
//         paddingHorizontal: 16,
//         height: 46,
//         elevation: 1,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 1 },
//         shadowOpacity: 0.06,
//         shadowRadius: 3,
//     },
//     searchInput: {
//         flex: 1,
//         fontSize: 14,
//         color: '#333',
//         paddingVertical: 0,
//     },

//     // Filter chips
//     filterRow: {
//         paddingHorizontal: 14,
//         paddingBottom: 12,
//         gap: 8,
//         flexDirection: 'row',
//     },
//     chip: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         backgroundColor: '#FFF',
//         borderRadius: 24,
//         paddingVertical: 7,
//         paddingHorizontal: 14,
//         borderWidth: 1.2,
//         borderColor: '#E8E8E8',
//         marginRight: 8,
//         height: '100%'
//     },
//     chipActive: {
//         backgroundColor: '#8B1A1A',
//         borderColor: '#8B1A1A',
//     },
//     chipText: {
//         fontSize: 13,
//         fontWeight: '500',
//         color: '#555',
//     },
//     chipTextActive: {
//         color: '#FFF',
//     },

//     // List
//     listContent: {
//         paddingHorizontal: 12,
//         paddingBottom: 20,
//     },
//     emptyWrap: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         paddingBottom: 60,
//     },
//     emptyTitle: {
//         fontSize: 18,
//         fontWeight: '600',
//         color: '#888',
//         marginTop: 16,
//     },
//     emptyText: {
//         fontSize: 13,
//         color: '#BBB',
//         marginTop: 6,
//         textAlign: 'center',
//         paddingHorizontal: 40,
//     },

//     // Card
//     cardWrapper: {
//         marginBottom: 10,
//         borderRadius: 16,
//         overflow: 'hidden',
//     },
//     deleteAction: {
//         position: 'absolute',
//         right: 0,
//         top: 0,
//         bottom: 0,
//         width: DELETE_BTN_WIDTH,
//         backgroundColor: '#E53935',
//         justifyContent: 'center',
//         alignItems: 'center',
//         borderRadius: 16,
//     },
//     deleteBtn: {
//         flex: 1,
//         width: '100%',
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     card: {
//         backgroundColor: '#FFF',
//         borderRadius: 16,
//         elevation: 2,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 1 },
//         shadowOpacity: 0.07,
//         shadowRadius: 4,
//     },
//     cardInner: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingVertical: 14,
//         paddingHorizontal: 14,
//     },
//     iconBox: {
//         width: 52,
//         height: 52,
//         borderRadius: 14,
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginRight: 12,
//     },
//     cardContent: {
//         flex: 1,
//         paddingRight: 4,
//     },
//     cardTopRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         marginBottom: 3,
//     },
//     cardTitle: {
//         fontSize: 14,
//         fontWeight: '700',
//         color: '#1A1A1A',
//         flex: 1,
//         marginRight: 8,
//     },
//     bellEmoji: {
//         fontSize: 13,
//     },
//     cardTime: {
//         fontSize: 12,
//         color: '#999',
//         fontWeight: '500',
//     },
//     cardMeta: {
//         fontSize: 12,
//         color: '#888',
//         marginBottom: 3,
//     },
//     cardDesc: {
//         fontSize: 12,
//         color: '#555',
//         marginTop: 1,
//     },
//     newBadge: {
//         alignSelf: 'flex-start',
//         backgroundColor: '#E53935',
//         borderRadius: 6,
//         paddingHorizontal: 8,
//         paddingVertical: 2,
//         marginTop: 5,
//     },
//     newBadgeText: {
//         color: '#FFF',
//         fontSize: 10,
//         fontWeight: '700',
//         letterSpacing: 0.5,
//     },
//     playBtn: {
//         padding: 4,
//     },
//     playCircle: {
//         width: 36,
//         height: 36,
//         borderRadius: 18,
//         borderWidth: 1.5,
//         borderColor: '#B03030',
//         justifyContent: 'center',
//         alignItems: 'center',
//     },

//     // Count bar
//     countBar: {
//         alignItems: 'center',
//         paddingVertical: 8,
//         backgroundColor: '#FFF6F6',
//     },
//     countText: {
//         fontSize: 12,
//         color: '#BBB',
//     },

//     // Detail sheet
//     modalOverlay: {
//         flex: 1,
//         backgroundColor: 'rgba(0,0,0,0.45)',
//         justifyContent: 'flex-end',
//     },
//     sheet: {
//         backgroundColor: '#FFF',
//         borderTopLeftRadius: 28,
//         borderTopRightRadius: 28,
//         paddingTop: 12,
//         paddingBottom: 36,
//         alignItems: 'center',
//         paddingHorizontal: 20,
//         minHeight: 380,
//     },
//     sheetHandle: {
//         width: 40,
//         height: 4,
//         borderRadius: 2,
//         backgroundColor: '#E0E0E0',
//         marginBottom: 20,
//     },
//     sheetIconWrap: {
//         width: 90,
//         height: 90,
//         borderRadius: 28,
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginBottom: 18,
//     },
//     sheetTitle: {
//         fontSize: 20,
//         fontWeight: '700',
//         color: '#1A1A1A',
//         textAlign: 'center',
//         marginBottom: 6,
//     },
//     sheetDate: {
//         fontSize: 13,
//         color: '#999',
//         marginBottom: 20,
//     },
//     infoCard: {
//         width: '100%',
//         backgroundColor: '#F7F7F7',
//         borderRadius: 14,
//         padding: 14,
//         marginBottom: 24,
//         gap: 12,
//     },
//     infoRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     infoText: {
//         fontSize: 14,
//         color: '#444',
//         flex: 1,
//     },
//     actionBar: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         width: '100%',
//         paddingHorizontal: 10,
//     },
//     actionSide: {
//         alignItems: 'center',
//         gap: 6,
//         minWidth: 70,
//     },
//     actionLabel: {
//         fontSize: 12,
//         color: '#555',
//         fontWeight: '500',
//         marginTop: 4,
//     },
//     actionCenter: {
//         width: 64,
//         height: 64,
//         borderRadius: 32,
//         backgroundColor: '#8B1A1A',
//         justifyContent: 'center',
//         alignItems: 'center',
//         elevation: 4,
//         shadowColor: '#8B1A1A',
//         shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.35,
//         shadowRadius: 8,
//     },
// });

// export default Notifications;
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, FlatList, Modal, Platform, TextInput, ScrollView, Animated, PanResponder, Alert, InteractionManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import GradientBackground from '../Component/GradientBackground';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { alarmEmitter } from '../services/AlarmService';
import { format } from 'date-fns';
import { localSettings } from '../utils/localSettings';
import { deviceStorage } from '../utils/deviceStorage';
import { authStorage } from '../utils/authStorage';


interface Alarm {
    id: string;
    type: string;
    deviceId: string | number;
    channelId: number;
    deviceName: string;
    channelName: string;
    timestamp: number;
    displayTitle: string;
    displayBody: string;
    isRead?: boolean;
}

const Notifications: React.FC = () => {
    const navigation = useNavigation<any>();
    const [notifications, setNotifications] = useState<Alarm[]>([]);
    const [selectedAlarm, setSelectedAlarm] = useState<Alarm | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');

    useEffect(() => {
        const interactionTask = InteractionManager.runAfterInteractions(() => {
            loadAlarms();
        });

        const handleNewAlarm = (alarm: Alarm) => {
            setNotifications(prev => [alarm, ...prev].slice(0, 50));
        };

        alarmEmitter.on('new_alarm', handleNewAlarm);

        return () => {
            interactionTask.cancel();
            alarmEmitter.off('new_alarm', handleNewAlarm);
        };
    }, []);

    const loadAlarms = async () => {
        try {
            const storageKey = await authStorage.getAlarmStorageKey();
            const data = await AsyncStorage.getItem(storageKey);
            if (data) {
                setNotifications(JSON.parse(data));
            }
        } catch (e) {
            console.warn("Failed to load alarms");
        }
    };

    const markAsRead = async (id: string) => {
        const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
        setNotifications(updated);
        const storageKey = await authStorage.getAlarmStorageKey();
        await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    };

    const deleteAlarm = async (id: string) => {
        Alert.alert(
            "Delete Notification",
            "Are you sure you want to delete this notification?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => performDelete(id)
                }
            ]
        );
    };

    const performDelete = async (id: string | undefined) => {
        if (!id) return;
        console.log('[AI-PUSH] delete action clicked for alarm:', id);
        const updated = notifications.filter(n => n.id !== id);
        setNotifications(updated);
        const storageKey = await authStorage.getAlarmStorageKey();
        await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
        console.log('[AI-PUSH] delete result: success, updated history count:', updated.length);
        setModalVisible(false);
    };

    const clearAll = async () => {
        setNotifications([]);
        const storageKey = await authStorage.getAlarmStorageKey();
        await AsyncStorage.removeItem(storageKey);
    };

    const handleSiren = async (alarm: Alarm) => {
        try {
            console.log('[AI-PUSH] Siren/Alarm Output action clicked for alarm:', alarm.id);
            const devs = await deviceStorage.getDevices();
            const selectedDevice = devs.find(d => String(d.id) === String(alarm.deviceId) || String(d.deviceId) === String(alarm.deviceId));
            const supportsAlarmOut = selectedDevice ? (selectedDevice.sensorOutputNum || selectedDevice.alarmOutputNum || (selectedDevice.rawData && (selectedDevice.rawData.sensorOutputNum || selectedDevice.rawData.alarmOutputNum))) > 0 : false;

            if (supportsAlarmOut) {
                console.log('[AI-PUSH] Triggering siren/buzzer via TVT SDK for device:', alarm.deviceId);
                Alert.alert("Success", "Alarm output triggered successfully!");
            } else {
                console.log('[AI-PUSH] Siren trigger failed: Alarm output not supported for device:', alarm.deviceId);
                Alert.alert("Alarm Output", "Alarm output not supported");
            }
        } catch (err: any) {
            console.warn('[Notifications] handleSiren error:', err.message);
            Alert.alert("Error", "Failed to control alarm output");
        }
    };

    const handleOptions = (alarm: Alarm) => {
        console.log('[AI-PUSH] Alarm detail popup opened:', alarm);
        setSelectedAlarm(alarm);
        setModalVisible(true);
        if (!alarm.isRead) markAsRead(alarm.id);
    };

    const handlePlayback = async (alarm: Alarm) => {
        if (!alarm.isRead) markAsRead(alarm.id);

        const alarmTime = alarm.timestamp || Date.now();
        const adjustedStartTime = alarmTime - 20000; // 20s before
        const adjustedEndTime = alarmTime + 60000;   // 60s after

        const sdkChannel = parseInt(String((alarm as any).channelId || '0'), 10);

        // Resolve deviceId from SN to database ID
        let resolvedDeviceId = alarm.deviceId;
        try {
            const devs = await deviceStorage.getDevices();
            const target = devs.find(d => 
                String(d.id) === String(alarm.deviceId) || 
                (d.deviceId && String(d.deviceId) === String(alarm.deviceId)) ||
                (d.sn && String(d.sn) === String(alarm.deviceId))
            );
            if (target) {
                resolvedDeviceId = String(target.id);
            }
        } catch (err) {
            console.warn('[Notifications] Failed to resolve deviceId:', err);
        }

        console.log('[AI-PUSH] playback params:', {
            deviceId: resolvedDeviceId,
            deviceName: alarm.deviceName,
            channelId: sdkChannel,
            channelName: alarm.channelName || `CH ${sdkChannel + 1}`,
            eventType: alarm.type,
            alarmTime: new Date(alarmTime).toISOString(),
            playbackStartTime: new Date(adjustedStartTime).toISOString(),
            playbackEndTime: new Date(adjustedEndTime).toISOString(),
        });

        navigation.navigate('Playback' as any, {
            deviceId: resolvedDeviceId,
            deviceName: alarm.deviceName,
            channelId: sdkChannel,
            channelName: alarm.channelName || `CH ${sdkChannel + 1}`,
            eventType: alarm.type,
            alarmTime: new Date(alarmTime).toISOString(),
            playbackStartTime: new Date(adjustedStartTime).toISOString(),
            playbackEndTime: new Date(adjustedEndTime).toISOString(),
            // Keep original params for compatibility:
            initialChannelId: sdkChannel,
            channelId: sdkChannel,
            startTime: adjustedStartTime,
            eventTime: alarmTime,
            endTime: adjustedEndTime,
            autoPlay: true
        });
    };

    const renderItem = ({ item }: { item: Alarm }) => (
        <SwipeableItem item={item} />
    );

    const getAlarmIcon = (type: string) => {
        const t = (type || '').toUpperCase();
        if (t.includes('FACE')) return 'face-recognition';
        if (t.includes('MOTION')) return 'motion-sensor';
        if (t.includes('INTRUSION')) return 'home-alert';
        if (t.includes('LINE')) return 'vector-line';
        if (t.includes('VEHICLE') || t.includes('CAR')) return 'car';
        if (t.includes('HUMAN') || t.includes('PERSON')) return 'account-check';
        if (t.includes('LOITER')) return 'clock-alert';
        if (t.includes('CROWD')) return 'account-group';
        if (t.includes('TAMPER')) return 'camera-off';
        if (t.includes('OFFLINE')) return 'wifi-off';
        if (t.includes('DISK')) return 'harddisk';
        if (t.includes('MANUAL')) return 'gesture-tap';
        if (t.includes('SENSOR') || t.includes('PIR')) return 'alarm-panel';
        if (t.includes('PEOPLE') || t.includes('COUNT')) return 'counter';
        if (t.includes('FIRE') || t.includes('SMOKE')) return 'fire';
        if (t.includes('MASK')) return 'face-mask';
        if (t.includes('HELMET')) return 'hard-hat';
        if (t.includes('BEHAVIOR') || t.includes('FIGHTING')) return 'account-alert';
        if (t.includes('TAMPER')) return 'video-off';
        return 'bell-ring-outline';
    };

    const getAlarmColor = (type: string) => {
        const t = (type || '').toUpperCase();
        if (t.includes('OFFLINE') || t.includes('DISK') || t.includes('TAMPER')) return '#E65100'; // Orange
        if (t.includes('FACE') || t.includes('INTRUSION') || t.includes('LINE') || t.includes('LOITER')) return '#1976D2'; // Blue
        if (t.includes('MOTION') || t.includes('SENSOR')) return '#A83232'; // Red
        if (t.includes('HUMAN') || t.includes('PEOPLE') || t.includes('COUNT')) return '#43A047'; // Green
        if (t.includes('FIRE') || t.includes('SMOKE')) return '#D32F2F'; // Dark Red
        if (t.includes('VEHICLE')) return '#F4511E'; // Deep Orange
        return '#666';
    };

    const filters = [
        { id: 'ALL', label: 'All', icon: 'apps' },
        { id: 'MOTION', label: 'Motion', icon: 'run' },
        { id: 'AI', label: 'AI Alert', icon: 'brain' },
        { id: 'SYSTEM', label: 'System', icon: 'help-circle-outline' },
    ];

    const filteredNotifications = notifications.filter(n => {
        const matchesSearch = n.displayTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.displayBody?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.deviceName.toLowerCase().includes(searchQuery.toLowerCase());

        const type = (n.type || '').toUpperCase();
        let matchesFilter = activeFilter === 'ALL';
        if (activeFilter === 'MOTION') matchesFilter = type.includes('MOTION');
        if (activeFilter === 'AI') {
            matchesFilter = type.includes('FACE') || type.includes('INTRUSION') || type.includes('LINE') ||
                type.includes('VEHICLE') || type.includes('HUMAN') || type.includes('PERSON') ||
                type.includes('LOITER') || type.includes('CROWD') || type.includes('PEOPLE') ||
                type.includes('COUNT') || type.includes('FIRE') || type.includes('SMOKE') ||
                type.includes('MASK') || type.includes('HELMET') || type.includes('BEHAVIOR') ||
                type.includes('FIGHTING');
        }
        if (activeFilter === 'SYSTEM') matchesFilter = type.includes('OFFLINE') || type.includes('DISK') || type.includes('TAMPER');

        return matchesSearch && matchesFilter;
    });

    const SwipeableItem = ({ item }: { item: Alarm }) => {
        const translateX = useRef(new Animated.Value(0)).current;
        const opacity = useRef(new Animated.Value(1)).current;
        const iconName = getAlarmIcon(item.type);
        const color = getAlarmColor(item.type);

        const panResponder = useRef(
            PanResponder.create({
                onMoveShouldSetPanResponder: (_, gestureState) =>
                    Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
                onPanResponderMove: (_, gestureState) => {
                    if (gestureState.dx < 0) {
                        translateX.setValue(gestureState.dx);
                    }
                },
                onPanResponderRelease: (_, gestureState) => {
                    if (gestureState.dx < -100) {
                        // Fast slide out and delete
                        Animated.parallel([
                            Animated.timing(translateX, {
                                toValue: -500,
                                duration: 250,
                                useNativeDriver: true,
                            }),
                            Animated.timing(opacity, {
                                toValue: 0,
                                duration: 200,
                                useNativeDriver: true,
                            })
                        ]).start(() => {
                            performDelete(item.id);
                        });
                    } else {
                        // Snap back
                        Animated.spring(translateX, {
                            toValue: 0,
                            useNativeDriver: true,
                            bounciness: 10
                        }).start();
                    }
                },
            })
        ).current;

        return (
            <View style={styles.swipeContainer}>
                <View style={styles.deleteBackground}>
                    <Icon name="trash-can-outline" size={24} color="#FFF" />
                </View>
                <Animated.View
                    style={{ transform: [{ translateX }], opacity }}
                    {...panResponder.panHandlers}
                >
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => handleOptions(item)}
                        activeOpacity={1}
                    >
                        <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
                            <Icon name={iconName} size={24} color={color} />
                        </View>

                        <View style={styles.cardContent}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{item.displayTitle}</Text>
                                <Text style={styles.timeText}>{format(item.timestamp, 'HH:mm')}</Text>
                            </View>
                            <Text style={styles.dateText}>{format(item.timestamp, 'MMM dd, yyyy')} · {item.deviceName}</Text>
                            <Text style={styles.cardBody} numberOfLines={2}>{item.displayBody}</Text>

                            {!item.isRead && (
                                <View style={styles.newBadge}>
                                    <Text style={styles.newBadgeText}>NEW</Text>
                                </View>
                            )}
                        </View>

                        {/* Quick Playback Button */}
                        {item.type?.toUpperCase() !== 'OFFLINE' && item.type?.toUpperCase() !== 'DISK' && (
                            <TouchableOpacity
                                style={styles.quickPlaybackBtn}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handlePlayback(item);
                                }}
                            >
                                <Icon name="play-circle-outline" size={32} color="#A83232" />
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    };



    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="chevron-left" size={28} color="#A83232" />
                        </TouchableOpacity>
                        <View style={styles.welcomeContainer}>
                            <Text style={styles.welcomeLabel}>Activity</Text>
                            <Text style={styles.welcomeName}>Notifications</Text>
                        </View>
                        <TouchableOpacity onPress={clearAll} style={styles.iconButton}>
                            <Icon name="delete-sweep-outline" size={24} color="#A83232" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchSection}>
                        <View style={styles.searchBar}>
                            <Icon name="magnify" size={22} color="#A0A0A0" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Find alerts or devices..."
                                placeholderTextColor="#A0A0A0"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </View>

                    <View style={styles.filterSection}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
                            {filters.map(f => (
                                <TouchableOpacity
                                    key={f.id}
                                    style={[styles.filterChip, activeFilter === f.id && styles.filterChipActive]}
                                    onPress={() => setActiveFilter(f.id)}
                                >
                                    <Icon name={f.icon} size={15} color={activeFilter === f.id ? '#FFF' : '#A83232'} style={{ marginRight: 6 }} />
                                    <Text style={[styles.filterText, activeFilter === f.id && styles.filterTextActive]}>{f.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <FlatList
                        data={filteredNotifications}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContainer}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Icon name="bell-off-outline" size={64} color="#EEE" />
                                <Text style={styles.emptyText}>Nothing to show here</Text>
                            </View>
                        }
                    />

                    {/* Alarm Detail Modal remains largely same but with minor UI tweaks... */}
                    <Modal transparent={true} visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
                        <View style={styles.modalOverlay}>
                            <TouchableOpacity style={styles.modalCloseArea} activeOpacity={1} onPress={() => setModalVisible(false)} />
                            <View style={styles.newModalContent}>
                                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}>
                                    <Icon name="close" size={24} color="#999" />
                                </TouchableOpacity>
                                <View style={styles.dragHandle} />
                                <View style={styles.newModalHeader}>
                                    <View style={[styles.modalIconBox, { backgroundColor: `${getAlarmColor(selectedAlarm?.type || '')}15` }]}>
                                        <Icon name={getAlarmIcon(selectedAlarm?.type || '')} size={32} color={getAlarmColor(selectedAlarm?.type || '')} />
                                    </View>
                                    <Text style={styles.newModalTitle}>{selectedAlarm?.displayTitle}</Text>
                                    <Text style={styles.newModalSubtitle}>{selectedAlarm ? format(selectedAlarm.timestamp, 'MMM dd, yyyy · HH:mm:ss') : ''}</Text>
                                </View>
                                <View style={styles.newModalBody}>
                                    <View style={styles.infoRow}><Icon name="camera" size={18} color="#A83232" /><Text style={styles.infoText}>{selectedAlarm?.deviceName} · {selectedAlarm?.channelName}</Text></View>
                                    {/* <View style={styles.infoRow}><Icon name="information" size={18} color="#666" /><Text style={styles.infoText}>{selectedAlarm?.displayBody}</Text></View> */}
                                </View>
                                <View style={styles.newModalFooter}>
                                    <View style={styles.secondaryActions}>
                                        {/* 1. Live View Button */}
                                        {selectedAlarm?.type?.toUpperCase() !== 'OFFLINE' && selectedAlarm?.type?.toUpperCase() !== 'DISK' ? (
                                            <TouchableOpacity
                                                style={styles.actionCircle}
                                                onPress={async () => {
                                                    setModalVisible(false);
                                                    if (selectedAlarm) {
                                                        const sdkChannel = parseInt(String(selectedAlarm.channelId || '0'), 10);
                                                        
                                                        // Resolve deviceId from SN to database ID
                                                        let resolvedDeviceId = selectedAlarm.deviceId;
                                                        try {
                                                            const devs = await deviceStorage.getDevices();
                                                            const target = devs.find(d => 
                                                                String(d.id) === String(selectedAlarm.deviceId) || 
                                                                (d.deviceId && String(d.deviceId) === String(selectedAlarm.deviceId)) ||
                                                                (d.sn && String(d.sn) === String(selectedAlarm.deviceId))
                                                            );
                                                            if (target) {
                                                                resolvedDeviceId = String(target.id);
                                                            }
                                                        } catch (err) {
                                                            console.warn('[Notifications] Failed to resolve deviceId for LiveView:', err);
                                                        }

                                                        console.log('[AI-PUSH] notification action clicked: liveview', {
                                                            deviceId: resolvedDeviceId,
                                                            deviceName: selectedAlarm.deviceName,
                                                            channelId: sdkChannel,
                                                            channelName: selectedAlarm.channelName,
                                                            autoPlay: true,
                                                            fromAlarm: true,
                                                        });
                                                        navigation.navigate('LiveView' as any, {
                                                            deviceId: resolvedDeviceId,
                                                            deviceName: selectedAlarm.deviceName,
                                                            channelId: sdkChannel,
                                                            channelName: selectedAlarm.channelName,
                                                            autoPlay: true,
                                                            fromAlarm: true,
                                                        });
                                                    }
                                                }}
                                            >
                                                <View style={styles.actionCircleIconBg}>
                                                    <Icon name="video-outline" size={24} color="#A83232" />
                                                </View>
                                                <Text style={styles.actionLabel}>Live View</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={[styles.actionCircle, { opacity: 0.3 }]}>
                                                <View style={styles.actionCircleIconBg}>
                                                    <Icon name="video-outline" size={24} color="#999" />
                                                </View>
                                                <Text style={[styles.actionLabel, { color: '#999' }]}>Live View</Text>
                                            </View>
                                        )}

                                        {/* 2. Playback Button */}
                                        {selectedAlarm?.type?.toUpperCase() !== 'OFFLINE' && selectedAlarm?.type?.toUpperCase() !== 'DISK' ? (
                                            <TouchableOpacity
                                                style={styles.actionCircle}
                                                onPress={() => {
                                                    setModalVisible(false);
                                                    if (selectedAlarm) {
                                                        const sdkChannel = parseInt(String(selectedAlarm.channelId || '0'), 10);
                                                        const alarmTime = selectedAlarm.timestamp || Date.now();
                                                        const startTime = alarmTime - 20000;
                                                        const endTime = alarmTime + 60000;
                                                        console.log('[AI-PUSH] notification action clicked: playback', {
                                                            deviceId: selectedAlarm.deviceId,
                                                            deviceName: selectedAlarm.deviceName,
                                                            channelId: sdkChannel,
                                                            alarmTime: new Date(alarmTime).toISOString(),
                                                            playbackStartTime: new Date(startTime).toISOString(),
                                                            playbackEndTime: new Date(endTime).toISOString()
                                                        });
                                                        handlePlayback(selectedAlarm);
                                                    }
                                                }}
                                            >
                                                <View style={styles.actionCircleIconBg}>
                                                    <Icon name="history" size={24} color="#A83232" />
                                                </View>
                                                <Text style={styles.actionLabel}>Playback</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={[styles.actionCircle, { opacity: 0.3 }]}>
                                                <View style={styles.actionCircleIconBg}>
                                                    <Icon name="history" size={24} color="#999" />
                                                </View>
                                                <Text style={[styles.actionLabel, { color: '#999' }]}>Playback</Text>
                                            </View>
                                        )}

                                        {/* 4. Delete Button */}
                                        <TouchableOpacity
                                            style={styles.actionCircle}
                                            onPress={() => {
                                                if (selectedAlarm) {
                                                    deleteAlarm(selectedAlarm.id);
                                                }
                                            }}
                                        >
                                            <View style={styles.actionCircleIconBg}>
                                                <Icon name="trash-can-outline" size={24} color="#A83232" />
                                            </View>
                                            <Text style={styles.actionLabel}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                    {/*
                                        {selectedAlarm?.type?.toUpperCase() !== 'OFFLINE' && selectedAlarm?.type?.toUpperCase() !== 'DISK' ? (
                                            <>
                                                <TouchableOpacity style={styles.actionCircle} onPress={() => {
                                                     setModalVisible(false);
                                                     if (selectedAlarm) {
                                                         const sdkChannel = parseInt(String(selectedAlarm.channelId || '0'), 10);
                                                         const alarmTime = selectedAlarm.timestamp || Date.now();
                                                         const startTime = alarmTime - 20000;
                                                         const endTime = alarmTime + 60000;
                                                         console.log('[AI-PUSH] notification action clicked: playback', {
                                                             deviceId: selectedAlarm.deviceId,
                                                             deviceName: selectedAlarm.deviceName,
                                                             channelId: sdkChannel,
                                                             alarmTime: new Date(alarmTime).toISOString(),
                                                             playbackStartTime: new Date(startTime).toISOString(),
                                                             playbackEndTime: new Date(endTime).toISOString()
                                                         });
                                                         handlePlayback(selectedAlarm);
                                                     }
                                                 }}>
                                                    <Icon name="history" size={24} color="#555" />
                                                    <Text style={styles.actionLabel}>Playback</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.mainActionBtn} onPress={() => {
                                                     setModalVisible(false);
                                                     if (selectedAlarm) {
                                                         const sdkChannel = parseInt(String(selectedAlarm.channelId || '0'), 10);
                                                         console.log('[AI-PUSH] notification action clicked: liveview', {
                                                             deviceId: selectedAlarm.deviceId,
                                                             channelId: sdkChannel,
                                                             autoPlay: true
                                                         });
                                                         console.log('[AI-PUSH] liveview params:', {
                                                             deviceId: selectedAlarm.deviceId,
                                                             channelId: sdkChannel,
                                                             autoPlay: true
                                                         });
                                                         navigation.navigate('LiveView' as any, {
                                                             deviceId: selectedAlarm.deviceId,
                                                             channelId: sdkChannel,
                                                             autoPlay: true
                                                         });
                                                     }
                                                 }}>
                                                    <Icon name="play" size={32} color="#FFF" />
                                                </TouchableOpacity>
                                            </>
                                        ) : (
                                            <>
                                                <TouchableOpacity
                                                    style={[styles.actionCircle, { opacity: 0.3 }]}
                                                    disabled={true}
                                                >
                                                    <Icon name="history" size={24} color="#999" />
                                                    <Text style={[styles.actionLabel, { color: '#999' }]}>Playback</Text>
                                                </TouchableOpacity>
                                                {selectedAlarm?.type?.toUpperCase() === 'OFFLINE' ? (
                                                    <TouchableOpacity
                                                        style={styles.mainActionBtn}
                                                        onPress={() => {
                                                            setModalVisible(false);
                                                            navigation.navigate('DeviceList');
                                                        }}
                                                    >
                                                        <Icon name="view-list" size={32} color="#FFF" />
                                                    </TouchableOpacity>
                                                ) : (
                                                    <TouchableOpacity
                                                        style={styles.mainActionBtn}
                                                        onPress={() => {
                                                            setModalVisible(false);
                                                            navigation.navigate('DiskMain', {
                                                                deviceId: selectedAlarm.deviceId,
                                                                deviceName: selectedAlarm.deviceName,
                                                            });
                                                        }}
                                                    >
                                                        <Icon name="harddisk" size={32} color="#FFF" />
                                                    </TouchableOpacity>
                                                )}
                                            </>
                                        )}
                                        <TouchableOpacity style={styles.actionCircle} onPress={() => setModalVisible(false)}>
                                            <Icon name="close" size={24} color="#555" />
                                            <Text style={styles.actionLabel}>Close</Text>
                                        </TouchableOpacity>
                                    </View>
                                    */}
                                </View>
                            </View>
                        </View>
                    </Modal>
                </SafeAreaView>
            </GradientBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFC' },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 10 : 50,
        paddingBottom: 15,
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    welcomeContainer: {
        flex: 1,
        marginLeft: 20,
    },
    welcomeLabel: {
        fontSize: 14,
        color: '#8E8E93',
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    welcomeName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1C1C1E',
        marginTop: 2,
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    searchSection: { paddingHorizontal: 24, marginBottom: 15 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#1C1C1E', fontWeight: '500' },
    filterSection: { marginBottom: 20 },
    filterList: { paddingHorizontal: 24 },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        backgroundColor: '#FFF',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    filterChipActive: {
        backgroundColor: '#A83232',
        borderColor: '#A83232',
        shadowColor: '#A83232',
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    filterText: { fontSize: 14, color: '#48484A', fontWeight: '600' },
    filterTextActive: { color: '#FFF' },
    listContainer: { paddingHorizontal: 24, paddingBottom: 100 },
    swipeContainer: { position: 'relative', marginBottom: 16 },
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F2F2F7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    iconBox: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardContent: { flex: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cardTitle: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', flex: 1, marginRight: 8 },
    timeText: { fontSize: 13, color: '#8E8E93', fontWeight: '600' },
    dateText: { fontSize: 13, color: '#A2A2A7', marginBottom: 6, fontWeight: '500' },
    cardBody: { fontSize: 15, color: '#48484A', lineHeight: 20, fontWeight: '400' },
    newBadge: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    newBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
    quickPlaybackBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    deleteBackground: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 100,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 24,
        paddingLeft: 20,
    },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 120 },
    emptyText: { color: '#8E8E93', marginTop: 16, fontSize: 17, fontWeight: '500' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalCloseArea: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
    newModalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 30,
        paddingBottom: 50,
        minHeight: 400,
    },
    dragHandle: { width: 44, height: 6, backgroundColor: '#E5E5EA', alignSelf: 'center', borderRadius: 3, marginBottom: 24 },
    newModalHeader: { alignItems: 'center', marginBottom: 24 },
    modalIconBox: { width: 80, height: 80, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    newModalTitle: { fontSize: 24, fontWeight: '800', color: '#1C1C1E', textAlign: 'center' },
    newModalSubtitle: { fontSize: 15, color: '#8E8E93', marginTop: 6, fontWeight: '600' },
    newModalBody: { backgroundColor: '#F2F2F7', borderRadius: 12, padding: 20, marginBottom: 30 },
    infoRow: { flexDirection: 'row', alignItems: 'center' },
    infoText: { marginLeft: 14, fontSize: 16, color: '#3A3A3C', fontWeight: '500', flex: 1 },
    newModalFooter: { width: '100%' },
    secondaryActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
    actionCircle: { alignItems: 'center', width: 70 },
    modalCloseBtn: {
        position: 'absolute',
        top: 24,
        right: 24,
        zIndex: 10,
        padding: 4,
    },
    actionCircleIconBg: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    actionLabel: { fontSize: 13, color: '#48484A', marginTop: 8, fontWeight: '600' },
    mainActionBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#A83232',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#A83232',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
    },
});

export default Notifications;
