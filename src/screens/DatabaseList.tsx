import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    StatusBar,
    Image,
    Alert,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { anprStorage, LicensePlateEntry } from '../utils/anprStorage';
import { personStorage, PersonEntry } from '../utils/personStorage';
import GradientBackground from '../Component/GradientBackground';

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
};

const DatabaseList = () => {
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState<'FACE' | 'VEHICLE'>('FACE');
    const [plates, setPlates] = useState<LicensePlateEntry[]>([]);
    const [persons, setPersons] = useState<PersonEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
        const unsubscribe = navigation.addListener('focus', () => {
            fetchData();
        });
        return unsubscribe;
    }, [navigation]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [registeredPlates, registeredPersons] = await Promise.all([
                anprStorage.getPlates(),
                personStorage.getPersons()
            ]);
            setPlates(registeredPlates);
            setPersons(registeredPersons);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePerson = (id: string) => {
        Alert.alert('Delete', 'Remove this person from registry?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await personStorage.deletePerson(id);
                    fetchData();
                }
            }
        ]);
    };

    const handleDeletePlate = (id: string) => {
        Alert.alert('Delete', 'Remove this vehicle from registry?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await anprStorage.deletePlate(id);
                    fetchData();
                }
            }
        ]);
    };

    const getRoleColor = (role: string) => {
        switch (role.toUpperCase()) {
            case 'VIP': return THEME.blue;
            case 'STAFF': return THEME.green;
            case 'BLACKLIST': return THEME.red;
            default: return THEME.orange;
        }
    };

    const renderPersonItem = ({ item }: { item: PersonEntry }) => (
        <View style={styles.card}>
            <Image source={{ uri: item.imageUri }} style={styles.avatar} />
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.subInfo}>{item.department}</Text>
                <View style={[styles.badge, { backgroundColor: getRoleColor(item.role) }]}>
                    <Text style={styles.badgeText}>{item.role}</Text>
                </View>
            </View>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeletePerson(item.id)}>
                <Icon name="trash-can-outline" size={20} color={THEME.red} />
            </TouchableOpacity>
        </View>
    );

    const renderPlateItem = ({ item }: { item: LicensePlateEntry }) => (
        <View style={styles.card}>
            <View style={styles.plateAvatar}>
                <Icon name="car-back" size={30} color={THEME.primary} />
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.plateNumber}</Text>
                <Text style={styles.subInfo}>{item.carModel || 'Unknown Model'} · {item.ownerName}</Text>
                <View style={[styles.badge, { backgroundColor: getRoleColor(item.group) }]}>
                    <Text style={styles.badgeText}>{item.group}</Text>
                </View>
            </View>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeletePlate(item.id)}>
                <Icon name="trash-can-outline" size={20} color={THEME.red} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea}>

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Icon name="chevron-left" size={28} color={THEME.primary} />
                        </TouchableOpacity>
                        <Text style={styles.title}>AI Registries</Text>
                        <TouchableOpacity onPress={fetchData} style={styles.backBtn}>
                            <Icon name="refresh" size={24} color={THEME.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'FACE' && styles.activeTab]}
                            onPress={() => setActiveTab('FACE')}
                        >
                            <Text style={[styles.tabText, activeTab === 'FACE' && styles.activeTabText]}>People ({persons.length})</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'VEHICLE' && styles.activeTab]}
                            onPress={() => setActiveTab('VEHICLE')}
                        >
                            <Text style={[styles.tabText, activeTab === 'VEHICLE' && styles.activeTabText]}>Vehicles ({plates.length})</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color={THEME.primary} style={{ marginTop: 100 }} />
                    ) : (
                        <FlatList
                            data={(activeTab === 'FACE' ? persons : plates) as any}
                            renderItem={activeTab === 'FACE' ? renderPersonItem : renderPlateItem}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.list}
                            ListEmptyComponent={
                                <View style={styles.empty}>
                                    <Icon name="database-outline" size={60} color="#DDD" />
                                    <Text style={styles.emptyText}>No registered {activeTab === 'FACE' ? 'people' : 'vehicles'} found.</Text>
                                </View>
                            }
                        />
                    )}

                </SafeAreaView>
            </GradientBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    title: { fontSize: 20, fontWeight: '800', color: THEME.text },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 15,
        gap: 12,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#EEE',
        alignItems: 'center',
    },
    activeTab: { backgroundColor: THEME.primary },
    tabText: { fontWeight: '700', color: THEME.subText },
    activeTabText: { color: '#FFF' },
    list: { padding: 20 },
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F0F0F0' },
    plateAvatar: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#FDF2F2', justifyContent: 'center', alignItems: 'center' },
    info: { flex: 1, marginLeft: 15 },
    name: { fontSize: 16, fontWeight: '700', color: THEME.text },
    subInfo: { fontSize: 13, color: THEME.subText, marginTop: 2 },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 6,
    },
    badgeText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
    actionBtn: { padding: 5 },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: THEME.subText, marginTop: 15, fontSize: 16 }
});

export default DatabaseList;
