import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Modal,
    FlatList,
    Dimensions,
    Image,
    ActivityIndicator,
    TextInput,
    Platform,
    Alert,
    NativeModules
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DatePicker from 'react-native-date-picker';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const THEME = {
    primary: '#A83232',
    bg: '#FAFBFC',
    card: '#FFFFFF',
    text: '#1C1C1E',
    subText: '#8E8E93',
    blue: '#007AFF', // VIP
    green: '#34C759', // Staff
    orange: '#FF9500', // Visitor
    red: '#FF3B30',   // Blacklist
    border: '#EFEFEF'
};

import { alarmEmitter } from '../services/AlarmService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { anprStorage } from '../utils/anprStorage';
import { personStorage } from '../utils/personStorage';
import { authStorage } from '../utils/authStorage';

const Events = () => {
    const navigation = useNavigation<any>();
    const [activeTab, setActiveTab] = useState<'FACE' | 'VEHICLE' | 'ALARM'>('FACE');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeRoleFilter, setActiveRoleFilter] = useState('ALL');
    const [events, setEvents] = useState<any[]>([]);
    const [registeredPlates, setRegisteredPlates] = useState<any[]>([]);
    const [registeredPersons, setRegisteredPersons] = useState<any[]>([]);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    const fetchAlarms = async () => {
        setLoading(true);
        try {
            const { TvtAlarmDatabaseModule } = NativeModules;
            const [plates, persons] = await Promise.all([
                anprStorage.getPlates(),
                personStorage.getPersons()
            ]);

            if (plates) setRegisteredPlates(plates);
            if (persons) setRegisteredPersons(persons);

            let alarms = [];
            if (TvtAlarmDatabaseModule && TvtAlarmDatabaseModule.getEvents) {
                alarms = await TvtAlarmDatabaseModule.getEvents();
                console.log(`[Events] Fetched ${alarms.length} events from SQLite.`);
            } else {
                const storageKey = await authStorage.getAlarmStorageKey();
                const stored = await AsyncStorage.getItem(storageKey);
                alarms = stored ? JSON.parse(stored) : [];
                console.log(`[Events] Fetched ${alarms.length} events from AsyncStorage.`);
            }
            setEvents(alarms);
        } catch (e) {
            console.error('Error fetching events:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlarms();

        const unsubscribeFocus = navigation.addListener('focus', () => {
            fetchAlarms();
        });

        const sub = (newAlarm: any) => {
            setEvents(prev => [newAlarm, ...prev].slice(0, 100));
        };
        alarmEmitter.on('new_alarm', sub);
        return () => {
            unsubscribeFocus();
            alarmEmitter.removeListener('new_alarm', sub);
        };
    }, [navigation]);

    // Enrich events with local registry profiles dynamically
    const enrichedEvents = useMemo(() => {
        return events.map(e => {
            let enriched = { ...e };
            const type = e.type || '';
            const title = (e.displayTitle || '').toUpperCase();
            const body = (e.displayBody || '').toUpperCase();
            const detail = (e.detailText || '').toUpperCase();

            // Map SQLite properties if present
            if (e.eventTime) enriched.timestamp = e.eventTime;
            if (e.snapshotPath) enriched.snapshotPath = e.snapshotPath;
            if (e.deviceSn) enriched.deviceId = e.deviceSn;

            if (type.includes('FACE')) {
                const matchedPerson = registeredPersons.find(p => {
                    const name = p.name.toUpperCase();
                    return title.includes(name) || body.includes(name) || detail.includes(name) || (e.name && e.name.toUpperCase().includes(name));
                });
                if (matchedPerson) {
                    enriched.name = matchedPerson.name;
                    enriched.role = matchedPerson.role;
                    enriched.department = matchedPerson.department;
                    enriched.displayTitle = `👤 Face Recognized: ${matchedPerson.name}`;
                    enriched.displayBody = `Role: ${matchedPerson.role} · Dept: ${matchedPerson.department}`;
                    if (matchedPerson.imageUri) {
                        enriched.snapshotPath = matchedPerson.imageUri;
                    }
                } else {
                    enriched.name = e.name || 'Unknown Face';
                    enriched.role = e.role || 'Visitor';
                    enriched.department = 'Office';
                }
            } else if (type === 'LICENSE_PLATE' || type === 'VEHICLE_DETECTION') {
                const eventPlate = e.plateNumber || e.plate || '';
                let plateText = eventPlate.toUpperCase().replace(/\s/g, '');
                if (!plateText) {
                    const plateMatch = (body + ' ' + detail + ' ' + title).match(/[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}|[A-Z0-9]{4,10}/);
                    if (plateMatch) {
                        plateText = plateMatch[0];
                    }
                }

                if (plateText) {
                    const matchedPlate = registeredPlates.find(p => p.plateNumber.toUpperCase().replace(/\s/g, '') === plateText);
                    if (matchedPlate) {
                        enriched.plate = matchedPlate.plateNumber;
                        enriched.name = matchedPlate.ownerName;
                        enriched.role = matchedPlate.group;
                        enriched.model = matchedPlate.carModel;
                        enriched.displayTitle = `🚗 Plate Recognized: ${matchedPlate.plateNumber}`;
                        enriched.displayBody = `Owner: ${matchedPlate.ownerName} (${matchedPlate.group}) · Model: ${matchedPlate.carModel}`;
                    } else {
                        enriched.plate = plateText;
                        enriched.name = e.name || 'Unknown Owner';
                        enriched.role = e.role || 'Visitor';
                    }
                }
            } else {
                enriched.role = e.role || 'Visitor';
                enriched.department = 'Office';
            }
            return enriched;
        });
    }, [events, registeredPersons, registeredPlates]);

    const filteredEvents = useMemo(() => {
        return enrichedEvents.filter(e => {
            // Date Filter
            const eventDate = new Date(e.timestamp);
            if (eventDate.toDateString() !== selectedDate.toDateString()) {
                return false;
            }

            // Tab Filtering
            if (activeTab === 'FACE') {
                const isFaceType = e.type === 'FACE_RECOGNITION' || e.type === 'FACE_DETECTION';
                if (!isFaceType) return false;
            } else if (activeTab === 'VEHICLE') {
                const isVehicleType = e.type === 'LICENSE_PLATE' || e.type === 'VEHICLE_DETECTION';
                if (!isVehicleType) return false;
            } else if (activeTab === 'ALARM') {
                const isFaceOrVehicle = e.type?.includes('FACE') || e.type?.includes('VEHICLE') || e.type === 'LICENSE_PLATE';
                if (isFaceOrVehicle) return false;
            }

            // Role / Group Filtering
            if (activeRoleFilter !== 'ALL') {
                if (activeRoleFilter === 'VEHICLE') {
                    const isVehicle = e.type === 'LICENSE_PLATE' || e.type === 'VEHICLE_DETECTION';
                    if (!isVehicle) return false;
                } else {
                    const matchedRole = (e.role || "").toUpperCase() === activeRoleFilter || 
                                       (e.displayBody || "").toUpperCase().includes(activeRoleFilter);
                    if (!matchedRole) return false;
                }
            }

            // Search
            const matchesQuery = searchQuery.trim() === '' ? true : (
                (e.displayTitle || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (e.displayBody || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (e.deviceName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (e.channelName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (e.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (e.plate || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (e.role || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (e.department || "").toLowerCase().includes(searchQuery.toLowerCase())
            );

            return matchesQuery;
        });
    }, [enrichedEvents, activeTab, searchQuery, activeRoleFilter, selectedDate]);

    // Dynamic Stats
    const stats = useMemo(() => {
        const todayStr = selectedDate.toDateString();
        const dailyEvents = enrichedEvents.filter(e => new Date(e.timestamp).toDateString() === todayStr);
        return {
            total: dailyEvents.length,
            vip: dailyEvents.filter(e => (e.role || "").toUpperCase() === 'VIP' || (e.displayBody || "").toUpperCase().includes('VIP')).length,
            staff: dailyEvents.filter(e => (e.role || "").toUpperCase() === 'STAFF' || (e.displayBody || "").toUpperCase().includes('STAFF')).length,
            visitor: dailyEvents.filter(e => (e.role || "").toUpperCase() === 'VISITOR' || (e.displayBody || "").toUpperCase().includes('VISITOR')).length,
            blacklist: dailyEvents.filter(e => (e.role || "").toUpperCase() === 'BLACKLIST' || (e.displayBody || "").toUpperCase().includes('BLACKLIST')).length,
            vehicle: dailyEvents.filter(e => e.type === 'LICENSE_PLATE' || e.type === 'VEHICLE_DETECTION').length
        };
    }, [enrichedEvents, selectedDate]);

    const getRoleColor = (body: string) => {
        const b = body.toUpperCase();
        if (b.includes('VIP') || b.includes('MANAGER')) return THEME.blue;
        if (b.includes('STAFF')) return THEME.green;
        if (b.includes('BLACKLIST')) return THEME.red;
        if (b.includes('VISITOR')) return THEME.orange;
        return THEME.subText;
    };

    const getRoleLabel = (body: string) => {
        const b = body.toUpperCase();
        if (b.includes('VIP')) return 'VIP';
        if (b.includes('MANAGER')) return 'Manager';
        if (b.includes('STAFF')) return 'Staff';
        if (b.includes('BLACKLIST')) return 'Blacklist';
        if (b.includes('VISITOR')) return 'Visitor';
        return 'Detection';
    };

    const renderEventCard = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => setSelectedEvent(item)}
        >
            <View style={styles.cardImageContainer}>
                <Image
                    source={{ uri: item.snapshotPath || 'https://via.placeholder.com/150?text=No+Image' }}
                    style={styles.cardImage}
                />
                <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.displayBody || "") }]}>
                    <Text style={styles.roleText}>{getRoleLabel(item.displayBody || "")}</Text>
                </View>
                {(item.type === 'FACE_RECOGNITION' || (item.displayBody || "").includes('%')) && (
                    <View style={styles.similarityBadge}>
                        <Text style={styles.similarityText}>Match Found</Text>
                    </View>
                )}
            </View>

            <View style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.displayTitle}</Text>
                    <Icon
                        name={(activeTab === 'FACE') ? 'face-recognition' : 'car-info'}
                        size={20}
                        color={getRoleColor(item.displayBody || "")}
                    />
                </View>

                <Text style={styles.vehicleInfo} numberOfLines={2}>{item.displayBody}</Text>

                <View style={[styles.infoRow, { marginTop: 4 }]}>
                    <Icon name="video-outline" size={14} color={THEME.subText} style={{ marginRight: 6 }} />
                    <Text style={styles.infoText}>{item.deviceName} · {item.channelName}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Icon name="clock-outline" size={14} color={THEME.subText} style={{ marginRight: 6 }} />
                    <Text style={styles.infoText}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </Text>
                </View>

                <View style={styles.cardFooter}>
                    <TouchableOpacity
                        style={styles.footerActionPlayback}
                        onPress={(e) => {
                            e.stopPropagation();
                            navigation.navigate('Playback', {
                                deviceId: item.deviceId,
                                deviceName: item.deviceName,
                                initialChannelId: item.channelId,
                                startTime: item.timestamp - 20000 // 20 seconds seek offset!
                            });
                        }}
                    >
                        <Icon name="motion-play" size={16} color={THEME.primary} style={{ marginRight: 4 }} />
                        <Text style={styles.footerActionTextPlayback}>Playback</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.footerActionLive}
                        onPress={(e) => {
                            e.stopPropagation();
                            navigation.navigate('LiveView', {
                                deviceId: item.deviceId,
                                deviceName: item.deviceName,
                                channelId: item.channelId,
                                channelName: item.channelName,
                                autoPlay: true,
                                fromAlarm: true,
                            });
                        }}
                    >
                        <Icon name="video-outline" size={16} color={THEME.blue} style={{ marginRight: 4 }} />
                        <Text style={styles.footerActionTextLive}>Live</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <LinearGradient colors={['#FFF5F5', '#FAFBFC']} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={styles.safeArea}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                        <Icon name="chevron-left" size={28} color={THEME.text} />
                    </TouchableOpacity>

                    <View style={styles.headerTitles}>
                        <Text style={styles.headerLabel}>AI Analytics</Text>
                        <Text style={styles.headerTitle}>Event Recognition</Text>
                    </View>

                    <View style={styles.headerActionRow}>
                        {/* Database Registry */}
                        <TouchableOpacity
                            style={styles.headerAction}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate('DatabaseList')}
                        >
                            <Icon name="database-eye" size={20} color={THEME.primary} />
                        </TouchableOpacity>

                        {/* Add New */}
                        <TouchableOpacity
                            style={styles.headerAction}
                            activeOpacity={0.8}
                            onPress={() => activeTab === 'FACE' ? navigation.navigate('AddPerson') : navigation.navigate('AddLicensePlate')}
                        >
                            <Icon name="plus" size={22} color={THEME.text} />
                        </TouchableOpacity>

                        {/* Calendar */}
                        <TouchableOpacity
                            style={styles.headerAction}
                            activeOpacity={0.8}
                            onPress={() => setDatePickerOpen(true)}
                        >
                            <Icon name="calendar-month-outline" size={20} color={THEME.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <DatePicker
                    modal
                    open={datePickerOpen}
                    date={selectedDate}
                    mode="date"
                    onConfirm={(date) => {
                        setDatePickerOpen(false);
                        setSelectedDate(date);
                    }}
                    onCancel={() => {
                        setDatePickerOpen(false);
                    }}
                />

                {/* Segmented Tabs Control */}
                <View style={styles.tabBarContainer}>
                    <View style={styles.segmentedContainer}>
                        <TouchableOpacity
                            style={[styles.segmentedTab, activeTab === 'FACE' && styles.segmentedActiveTab]}
                            activeOpacity={0.9}
                            onPress={() => setActiveTab('FACE')}
                        >
                            <Icon name="face-recognition" size={18} color={activeTab === 'FACE' ? '#FFF' : THEME.subText} style={{ marginRight: 6 }} />
                            <Text style={[styles.segmentedTabText, activeTab === 'FACE' && styles.segmentedActiveTabText]}>Faces</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.segmentedTab, activeTab === 'VEHICLE' && styles.segmentedActiveTab]}
                            activeOpacity={0.9}
                            onPress={() => setActiveTab('VEHICLE')}
                        >
                            <Icon name="car-select" size={18} color={activeTab === 'VEHICLE' ? '#FFF' : THEME.subText} style={{ marginRight: 6 }} />
                            <Text style={[styles.segmentedTabText, activeTab === 'VEHICLE' && styles.segmentedActiveTabText]}>ANPR</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchSection}>
                    <View style={styles.searchBar}>
                        <Icon name="magnify" size={20} color="#A0A0A0" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={activeTab === 'FACE' ? "Search by name, role, department..." : "Search number plates..."}
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Icon name="close-circle" size={18} color="#C7C7CC" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Stats Scrollable Row */}
                <View style={{ marginBottom: 16 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}>
                        {/* Total Card */}
                        <View style={[styles.statCard, { backgroundColor: '#F0F7FF', borderColor: '#D0E7FF', borderWidth: 1 }]}>
                            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(42, 142, 252, 0.1)' }]}>
                                <Icon name="layers-outline" size={14} color="#1061C8" />
                            </View>
                            <Text style={[styles.statLabel, { color: '#688BBA' }]}>Total</Text>
                            <Text style={[styles.statValue, { color: '#1061C8' }]}>{stats.total}</Text>
                        </View>

                        {/* VIP Card */}
                        <View style={[styles.statCard, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7', borderWidth: 1 }]}>
                            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                <Icon name="star-outline" size={14} color="#047857" />
                            </View>
                            <Text style={[styles.statLabel, { color: '#5B8C7E' }]}>VIPs</Text>
                            <Text style={[styles.statValue, { color: '#047857' }]}>{stats.vip}</Text>
                        </View>

                        {/* Staff Card */}
                        <View style={[styles.statCard, { backgroundColor: '#EEF2FF', borderColor: '#E0E7FF', borderWidth: 1 }]}>
                            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
                                <Icon name="account-tie-outline" size={14} color="#4F46E5" />
                            </View>
                            <Text style={[styles.statLabel, { color: '#818CF8' }]}>Staff</Text>
                            <Text style={[styles.statValue, { color: '#4F46E5' }]}>{stats.staff}</Text>
                        </View>

                        {/* Visitor Card */}
                        <View style={[styles.statCard, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5', borderWidth: 1 }]}>
                            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
                                <Icon name="account-outline" size={14} color="#EA580C" />
                            </View>
                            <Text style={[styles.statLabel, { color: '#F97316' }]}>Visitors</Text>
                            <Text style={[styles.statValue, { color: '#EA580C' }]}>{stats.visitor}</Text>
                        </View>

                        {/* Blacklist Card */}
                        <View style={[styles.statCard, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2', borderWidth: 1 }]}>
                            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                <Icon name="alert-circle-outline" size={14} color="#B91C1C" />
                            </View>
                            <Text style={[styles.statLabel, { color: '#BA7A7A' }]}>Blacklist</Text>
                            <Text style={[styles.statValue, { color: '#B91C1C' }]}>{stats.blacklist}</Text>
                        </View>

                        {/* Vehicle Card */}
                        <View style={[styles.statCard, { backgroundColor: '#F0FDFA', borderColor: '#CCFBF1', borderWidth: 1 }]}>
                            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(13, 148, 136, 0.1)' }]}>
                                <Icon name="car-outline" size={14} color="#0D9488" />
                            </View>
                            <Text style={[styles.statLabel, { color: '#14B8A6' }]}>Vehicles</Text>
                            <Text style={[styles.statValue, { color: '#0D9488' }]}>{stats.vehicle}</Text>
                        </View>
                    </ScrollView>
                </View>

                {/* Role Chips Filter */}
                <View style={styles.chipsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                        {['ALL', 'VIP', 'STAFF', 'VISITOR', 'BLACKLIST', 'VEHICLE'].map(role => (
                            <TouchableOpacity
                                key={role}
                                style={[styles.roleChip, activeRoleFilter === role && styles.activeRoleChip]}
                                activeOpacity={0.8}
                                onPress={() => setActiveRoleFilter(role)}
                            >
                                <Text style={[styles.roleChipText, activeRoleFilter === role && styles.activeRoleChipText]}>{role}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Result List */}
                <FlatList
                    data={filteredEvents}
                    renderItem={renderEventCard}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <View style={styles.emptyIconContainer}>
                                <Icon name="shield-search" size={48} color="#A83232" />
                            </View>
                            <Text style={styles.emptyTitle}>No Matching Events</Text>
                            <Text style={styles.emptyText}>Any detected faces or vehicles for this date will appear here.</Text>
                        </View>
                    }
                />

            </SafeAreaView>

            {/* Event Details Bottom Sheet Modal */}
            <Modal
                visible={selectedEvent !== null}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedEvent(null)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSelectedEvent(null)}
                >
                    <View style={styles.detailModalContent} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalDragIndicator} />
                        
                        <View style={styles.detailModalHeader}>
                            <Text style={styles.detailModalTitle}>Event Details</Text>
                            <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                                <Icon name="close" size={24} color={THEME.text} />
                            </TouchableOpacity>
                        </View>

                        {selectedEvent && (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
                                <Image
                                    source={{ uri: selectedEvent.snapshotPath || 'https://via.placeholder.com/300?text=No+Image' }}
                                    style={styles.detailImage}
                                    resizeMode="cover"
                                />

                                <View style={styles.detailInfoContainer}>
                                    <View style={styles.detailTitleRow}>
                                        <Text style={styles.detailEventTitle} numberOfLines={2}>
                                            {selectedEvent.displayTitle}
                                        </Text>
                                        <View style={[styles.detailRoleBadge, { backgroundColor: getRoleColor(selectedEvent.displayBody || "") }]}>
                                            <Text style={styles.detailRoleText}>{selectedEvent.role || 'Visitor'}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailGrid}>
                                        {selectedEvent.name && (
                                            <View style={styles.detailGridItem}>
                                                <Text style={styles.detailLabel}>Person Name</Text>
                                                <Text style={styles.detailValue} numberOfLines={1}>{selectedEvent.name}</Text>
                                            </View>
                                        )}
                                        {selectedEvent.plate && (
                                            <View style={styles.detailGridItem}>
                                                <Text style={styles.detailLabel}>License Plate</Text>
                                                <Text style={styles.detailValue} numberOfLines={1}>{selectedEvent.plate}</Text>
                                            </View>
                                        )}
                                        <View style={styles.detailGridItem}>
                                            <Text style={styles.detailLabel}>Role</Text>
                                            <Text style={styles.detailValue}>{selectedEvent.role || 'Visitor'}</Text>
                                        </View>
                                        <View style={styles.detailGridItem}>
                                            <Text style={styles.detailLabel}>Department</Text>
                                            <Text style={styles.detailValue} numberOfLines={1}>{selectedEvent.department || 'Office'}</Text>
                                        </View>
                                        <View style={styles.detailGridItem}>
                                            <Text style={styles.detailLabel}>Camera Name</Text>
                                            <Text style={styles.detailValue} numberOfLines={1}>{selectedEvent.channelName || 'Camera 01'}</Text>
                                        </View>
                                        <View style={styles.detailGridItem}>
                                            <Text style={styles.detailLabel}>Channel</Text>
                                            <Text style={styles.detailValue}>CH {selectedEvent.channelId + 1}</Text>
                                        </View>
                                        <View style={styles.detailGridItem}>
                                            <Text style={styles.detailLabel}>Device Name</Text>
                                            <Text style={styles.detailValue} numberOfLines={1}>{selectedEvent.deviceName || 'NVR_01'}</Text>
                                        </View>
                                        <View style={styles.detailGridItem}>
                                            <Text style={styles.detailLabel}>Confidence Score</Text>
                                            <Text style={styles.detailValue}>{selectedEvent.confidence ? `${selectedEvent.confidence}%` : '95%'}</Text>
                                        </View>
                                        <View style={[styles.detailGridItem, { width: '100%' }]}>
                                            <Text style={styles.detailLabel}>Event Time</Text>
                                            <Text style={styles.detailValue}>
                                                {new Date(selectedEvent.timestamp).toLocaleDateString()} {new Date(selectedEvent.timestamp).toLocaleTimeString()}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Action Buttons */}
                                <View style={styles.modalActionsRow}>
                                    <TouchableOpacity
                                        style={[styles.modalActionButton, styles.modalLiveBtn]}
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            setSelectedEvent(null);
                                            navigation.navigate('LiveView', {
                                                deviceId: selectedEvent.deviceId,
                                                deviceName: selectedEvent.deviceName,
                                                channelId: selectedEvent.channelId,
                                                channelName: selectedEvent.channelName,
                                                autoPlay: true,
                                                fromAlarm: true,
                                            });
                                        }}
                                    >
                                        <Icon name="video-outline" size={20} color="#FFF" />
                                        <Text style={styles.modalActionText}>Live View</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.modalActionButton, styles.modalPlaybackBtn]}
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            setSelectedEvent(null);
                                            navigation.navigate('Playback', {
                                                deviceId: selectedEvent.deviceId,
                                                deviceName: selectedEvent.deviceName,
                                                initialChannelId: selectedEvent.channelId,
                                                startTime: selectedEvent.timestamp - 20000 // 20s seek offset!
                                            });
                                        }}
                                    >
                                        <Icon name="motion-play" size={20} color="#FFF" />
                                        <Text style={styles.modalActionText}>Playback</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={styles.modalExportBtn}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        Alert.alert('Export Successful', 'Snapshot has been exported to Gallery!');
                                    }}
                                >
                                    <Icon name="share-variant-outline" size={20} color={THEME.primary} />
                                    <Text style={styles.modalExportText}>Export Snapshot</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 10 : 20,
        paddingBottom: 15,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    headerTitles: { flex: 1, marginLeft: 16 },
    headerLabel: { fontSize: 11, color: THEME.subText, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: THEME.text, marginTop: 1 },
    headerActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerAction: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    tabBarContainer: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: '#EFEFF4',
        borderRadius: 12,
        padding: 4,
        height: 46,
    },
    segmentedTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    segmentedActiveTab: {
        backgroundColor: THEME.primary,
        elevation: 2,
        shadowColor: '#A83232',
        shadowOpacity: 0.15,
        shadowRadius: 3,
    },
    segmentedTabText: { fontSize: 13, fontWeight: '700', color: THEME.subText },
    segmentedActiveTabText: { color: '#FFF' },
    searchSection: { paddingHorizontal: 24, marginBottom: 16 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 48,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 3,
        borderWidth: 1,
        borderColor: '#F0F0F2',
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: THEME.text, fontWeight: '500' },
    statCard: {
        width: 100,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 16,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    statIconWrapper: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    statValue: { fontSize: 18, fontWeight: '800', marginTop: 1 },
    chipsContainer: {
        marginBottom: 16,
        maxHeight: 40,
    },
    roleChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#F0E0E0',
        marginRight: 8,
        height: 34,
        justifyContent: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.02,
    },
    activeRoleChip: { backgroundColor: THEME.primary, borderColor: THEME.primary },
    roleChipText: { fontSize: 11, fontWeight: '700', color: THEME.subText },
    activeRoleChipText: { color: '#FFF' },
    listContainer: { paddingHorizontal: 24, paddingBottom: 40 },
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 12,
        marginBottom: 14,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        borderWidth: 1,
        borderColor: '#F0F0F2',
    },
    cardImageContainer: {
        position: 'relative',
        marginRight: 14,
    },
    cardImage: {
        width: 90,
        height: 110,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    roleBadge: {
        position: 'absolute',
        bottom: -6,
        alignSelf: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        elevation: 1,
    },
    roleText: { color: '#FFF', fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },
    similarityBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(0,0,0,0.65)',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 4,
    },
    similarityText: { color: '#FFF', fontSize: 8, fontWeight: '700' },
    cardContent: { flex: 1 },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: THEME.text },
    vehicleInfo: { fontSize: 12, color: THEME.subText, marginBottom: 6, fontWeight: '500' },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
    infoText: { fontSize: 12, color: THEME.subText, fontWeight: '500' },
    cardFooter: { flexDirection: 'row', marginTop: 8, borderTopWidth: 1, borderTopColor: '#F5F5F7', paddingTop: 8, gap: 10 },
    footerActionPlayback: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF0F0',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
    },
    footerActionTextPlayback: { fontSize: 12, fontWeight: '700', color: THEME.primary },
    footerActionLive: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0F2FE',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
    },
    footerActionTextLive: { fontSize: 12, fontWeight: '700', color: THEME.blue },
    emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 20 },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFF0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: THEME.text, marginBottom: 6 },
    emptyText: { color: THEME.subText, fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 18 },

    // Detail Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    detailModalContent: {
        width: '100%',
        backgroundColor: '#FFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '90%',
        elevation: 20,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 15,
    },
    modalDragIndicator: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#E5E5EA',
        alignSelf: 'center',
        marginBottom: 16,
    },
    detailModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
        marginBottom: 16,
    },
    detailModalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: THEME.text,
    },
    detailScrollContent: {
        paddingBottom: 24,
    },
    detailImage: {
        width: '100%',
        height: 200,
        borderRadius: 20,
        backgroundColor: '#F2F2F7',
        marginBottom: 16,
    },
    detailInfoContainer: {
        marginBottom: 24,
    },
    detailTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    detailEventTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: THEME.text,
        flex: 1,
        marginRight: 12,
    },
    detailRoleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    detailRoleText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    detailGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    detailGridItem: {
        width: '47%',
        backgroundColor: '#FAFBFC',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F0F0F2',
    },
    detailLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: THEME.subText,
        textTransform: 'uppercase',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '600',
        color: THEME.text,
    },
    modalActionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    modalActionButton: {
        flex: 1,
        height: 50,
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    modalLiveBtn: {
        backgroundColor: THEME.blue,
    },
    modalPlaybackBtn: {
        backgroundColor: THEME.primary,
    },
    modalActionText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    modalExportBtn: {
        width: '100%',
        height: 50,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: THEME.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    modalExportText: {
        color: THEME.primary,
        fontSize: 14,
        fontWeight: '700',
    },
});

export default Events;
