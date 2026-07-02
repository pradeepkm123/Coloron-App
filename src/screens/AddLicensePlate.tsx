import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    StatusBar,
    ScrollView,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    NativeModules
} from 'react-native';
import { anprStorage, LicensePlateEntry } from '../utils/anprStorage';
import { Alert, Modal, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';

const { width } = Dimensions.get('window');

const GROUPS: LicensePlateEntry['group'][] = ['Staff', 'Visitor', 'VIP', 'Blacklist', 'Resident'];

const THEME = {
    primary: '#A83232',
    primaryDark: '#7B2424',
    accent: '#1DB954',
    background: '#F8F9FA',
    card: '#FFFFFF',
    text: '#2C3E50',
    subText: '#95A5A6',
    inputBg: '#F1F3F5',
    border: '#E9ECEF'
};

const AddLicensePlate = () => {
    const navigation = useNavigation();
    const [plate, setPlate] = useState('');
    const [model, setModel] = useState('');
    const [owner, setOwner] = useState('');
    const [phone, setPhone] = useState('');
    const [group, setGroup] = useState<LicensePlateEntry['group']>('Staff');
    const [groupModalVisible, setGroupModalVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!plate.trim()) {
            Alert.alert('Validation Error', 'Please enter a license plate number.');
            return;
        }

        setIsSaving(true);
        try {
            const { NvrSdk } = NativeModules;
            let anprRecordId = 'local_only';
            if (NvrSdk && NvrSdk.uploadPlateToDevice) {
                try {
                    anprRecordId = await NvrSdk.uploadPlateToDevice(
                        plate.trim(),
                        owner.trim()
                    );
                } catch (sdkErr) {
                    console.error('[AddLicensePlate] NVR ANPR Upload failed:', sdkErr);
                }
            }

            await anprStorage.savePlate({
                plateNumber: plate.trim(),
                carModel: model.trim(),
                ownerName: owner.trim(),
                phoneNumber: phone.trim(),
                group: group,
                anprRecordId,
                deviceSn: 'NVR_SERIAL'
            });

            Alert.alert(
                'Success',
                'Vehicle registered successfully!',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save vehicle.');
        } finally {
            setIsSaving(false);
        }
    };

    const renderField = (icon: string, label: string, placeholder: string, value: string, onChangeText: (t: string) => void) => (
        <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.inputContainer}>
                <View style={styles.iconBox}>
                    <Icon name={icon} size={20} color={THEME.primary} />
                </View>
                <TextInput
                    style={styles.textInput}
                    placeholder={placeholder}
                    placeholderTextColor="#ADB5BD"
                    value={value}
                    onChangeText={onChangeText}
                    selectionColor={THEME.primary}
                    autoCapitalize={label === 'Number Plate' ? 'characters' : 'words'}
                />
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <GradientBackground>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.avatarContainerBack}
                        >
                            <Icon name="chevron-left" size={28} color="#A83232" />
                        </TouchableOpacity>

                        <View style={styles.welcomeContainer}>
                            <Text style={styles.welcomeLabel}>Configuration</Text>
                            <Text style={styles.welcomeName}>Add License Plate</Text>
                        </View>

                        <TouchableOpacity style={styles.iconButton}>
                            <Icon name="car-cog" size={24} color="#A83232" />
                        </TouchableOpacity>
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ flex: 1 }}
                    >
                        <ScrollView
                            style={styles.content}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                        >
                            {/* Hero Section */}
                            <View style={styles.heroSection}>
                                <View style={styles.illustrationContainer}>
                                    <Icon name="car-info" size={60} color={THEME.primary} />
                                </View>
                                <Text style={styles.heroTitle}>Vehicle Details</Text>
                                <Text style={styles.heroSubTitle}>Please fill in the information below to register a new license plate in the system.</Text>
                            </View>

                            {/* Form Card */}
                            <View style={styles.card}>
                                {renderField('card-text-outline', 'Number Plate', 'e.g. TN09AB1234', plate, setPlate)}
                                {renderField('car-outline', 'Car Model', 'e.g. Hyundai Creta', model, setModel)}
                                {renderField('account-outline', 'Car Owner', 'Full Name', owner, setOwner)}
                                {renderField('phone-outline', 'Phone Number', 'Contact Number', phone, setPhone)}

                                <TouchableOpacity
                                    style={styles.selectorWrapper}
                                    activeOpacity={0.7}
                                    onPress={() => setGroupModalVisible(true)}
                                >
                                    <View style={styles.selectorLabelGroup}>
                                        <Text style={styles.inputLabel}>Assignment Group</Text>
                                        <Text style={styles.selectorValue}>{group}</Text>
                                    </View>
                                    <Icon name="chevron-right" size={24} color={THEME.subText} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.actionSection}>
                                <TouchableOpacity
                                    onPress={handleSave}
                                    activeOpacity={0.8}
                                    disabled={isSaving}
                                >
                                    <View style={[styles.saveButton, isSaving && { opacity: 0.7 }]}>
                                        <Text style={styles.saveButtonText}>
                                            {isSaving ? 'REGISTERING...' : 'REGISTER VEHICLE'}
                                        </Text>
                                        {!isSaving && <Icon name="check-circle" size={20} color="#FFF" style={{ marginLeft: 10 }} />}
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                                    <Text style={styles.cancelButtonText}>Discard Changes</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </GradientBackground>

            {/* Group Selection Modal */}
            <Modal
                visible={groupModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setGroupModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setGroupModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Group</Text>
                        {GROUPS.map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={styles.modalItem}
                                onPress={() => {
                                    setGroup(item);
                                    setGroupModalVisible(false);
                                }}
                            >
                                <Text style={[styles.modalItemText, group === item && styles.modalItemTextActive]}>
                                    {item}
                                </Text>
                                {group === item && <Icon name="check" size={20} color={THEME.primary} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        marginBottom: 15,
    },
    avatarContainerBack: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#FFE4E1',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    welcomeContainer: {
        flex: 1,
        marginLeft: 15,
    },
    welcomeLabel: {
        fontSize: 13,
        color: '#555',
    },
    welcomeName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#A83232',
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    heroSection: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    illustrationContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    heroSubTitle: {
        fontSize: 13,
        color: '#888',
        textAlign: 'center',
        lineHeight: 18,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        elevation: 4,
        shadowColor: '#A83232',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    inputWrapper: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#888',
        marginBottom: 6,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        height: 50,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    iconBox: {
        width: 45,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    selectorWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8F9FA',
        padding: 14,
        borderRadius: 12,
        marginTop: 5,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    selectorLabelGroup: {
        flex: 1,
    },
    selectorValue: {
        fontSize: 15,
        color: '#333',
        fontWeight: 'bold',
        marginTop: 2,
    },
    actionSection: {
        marginTop: 20,
    },
    saveButton: {
        height: 55,
        borderRadius: 15,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#A83232',
        elevation: 5,
        shadowColor: '#A83232',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    cancelButton: {
        alignItems: 'center',
        marginTop: 15,
        paddingVertical: 10,
    },
    cancelButtonText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalItemText: {
        fontSize: 16,
        color: '#666',
    },
    modalItemTextActive: {
        color: '#A83232',
        fontWeight: 'bold',
    },
});


export default AddLicensePlate;
