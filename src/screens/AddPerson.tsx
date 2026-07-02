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
    Image,
    Alert,
    Modal,
    NativeModules
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import GradientBackground from '../Component/GradientBackground';

import { personStorage } from '../utils/personStorage';

const { width } = Dimensions.get('window');

const ROLES: ('Staff' | 'VIP' | 'Blacklist' | 'Visitor' | 'Manager')[] = ['Staff', 'VIP', 'Blacklist', 'Visitor', 'Manager'];

const THEME = {
    primary: '#A83232',
    background: '#FAFBFC',
    card: '#FFFFFF',
    text: '#1C1C1E',
    subText: '#8E8E93',
    border: '#EFEFEF'
};

const AddPerson = () => {
    const navigation = useNavigation();
    const [name, setName] = useState('');
    const [role, setRole] = useState<any>('Visitor');
    const [department, setDepartment] = useState('');
    const [notes, setNotes] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [roleModalVisible, setRoleModalVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handlePickImage = () => {
        launchImageLibrary({
            mediaType: 'photo',
            quality: 0.7,
            includeBase64: true
        }, (response) => {
            if (response.assets && response.assets.length > 0) {
                setImage(response.assets[0].uri || null);
            }
        });
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Please enter a name.');
            return;
        }
        if (!image) {
            Alert.alert('Validation Error', 'Please upload a photo for face recognition.');
            return;
        }

        setIsSaving(true);
        try {
            const { NvrSdk } = NativeModules;
            let faceLibraryId = 'local_only';
            if (NvrSdk && NvrSdk.uploadFaceToDevice) {
                try {
                    faceLibraryId = await NvrSdk.uploadFaceToDevice(
                        Date.now().toString(),
                        name.trim(),
                        image
                    );
                } catch (sdkErr) {
                    console.error('[AddPerson] NVR Upload failed:', sdkErr);
                }
            }

            await personStorage.savePerson({
                name: name.trim(),
                role: role,
                department: department.trim(),
                notes: notes.trim(),
                imageUri: image,
                faceLibraryId,
                deviceSn: 'NVR_SERIAL'
            });

            Alert.alert('Success', 'Person registered successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save person.');
        } finally {
            setIsSaving(false);
        }
    };

    const renderInput = (icon: string, label: string, value: string, setValue: (t: string) => void, placeholder: string) => (
        <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.inputBox}>
                <Icon name={icon} size={20} color={THEME.primary} style={{ marginRight: 12 }} />
                <TextInput
                    style={styles.textInput}
                    value={value}
                    onChangeText={setValue}
                    placeholder={placeholder}
                    placeholderTextColor="#ADB5BD"
                />
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea}>

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Icon name="chevron-left" size={28} color={THEME.primary} />
                        </TouchableOpacity>
                        <View style={styles.headerTitles}>
                            <Text style={styles.headerLabel}>AI Registration</Text>
                            <Text style={styles.headerTitle}>Register New Person</Text>
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                        {/* Image Upload Section */}
                        <View style={styles.imageSection}>
                            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
                                {image ? (
                                    <Image source={{ uri: image }} style={styles.previewImage} />
                                ) : (
                                    <View style={styles.placeholderBox}>
                                        <Icon name="face-recognition" size={50} color={THEME.subText} />
                                        <Text style={styles.placeholderText}>Tap to Upload Photo</Text>
                                    </View>
                                )}
                                <View style={styles.editBadge}>
                                    <Icon name="camera" size={16} color="#FFF" />
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.imageHint}>Clear front-facing photo required for AI accuracy</Text>
                        </View>

                        {/* Form Card */}
                        <View style={styles.card}>
                            {renderInput('account-outline', 'Full Name', name, setName, 'e.g. John Doe')}

                            <TouchableOpacity
                                style={styles.inputWrapper}
                                onPress={() => setRoleModalVisible(true)}
                            >
                                <Text style={styles.inputLabel}>Role / Category</Text>
                                <View style={[styles.inputBox, { justifyContent: 'space-between' }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Icon name="shield-account-outline" size={20} color={THEME.primary} style={{ marginRight: 12 }} />
                                        <Text style={[styles.textInput, !role && { color: '#ADB5BD' }]}>{role || 'Select Role'}</Text>
                                    </View>
                                    <Icon name="chevron-down" size={20} color={THEME.subText} />
                                </View>
                            </TouchableOpacity>

                            {renderInput('office-building-marker-outline', 'Department', department, setDepartment, 'e.g. Security, IT, Guest')}

                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>Additional Notes</Text>
                                <View style={[styles.inputBox, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                                    <Icon name="note-text-outline" size={20} color={THEME.primary} style={{ marginRight: 12 }} />
                                    <TextInput
                                        style={[styles.textInput, { height: 80 }]}
                                        value={notes}
                                        onChangeText={setNotes}
                                        placeholder="Add any specific instructions..."
                                        placeholderTextColor="#ADB5BD"
                                        multiline
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionSection}>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                                <Text style={styles.saveBtnText}>{isSaving ? 'PROCESSING...' : 'COMPLETE REGISTRATION'}</Text>
                                <Icon name="check-circle" size={20} color="#FFF" style={{ marginLeft: 10 }} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                                <Text style={styles.cancelBtnText}>Discard</Text>
                            </TouchableOpacity>
                        </View>

                    </ScrollView>
                </SafeAreaView>
            </GradientBackground>

            {/* Role Modal */}
            <Modal visible={roleModalVisible} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setRoleModalVisible(false)}
                >
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Select Category</Text>
                        {ROLES.map(r => (
                            <TouchableOpacity
                                key={r}
                                style={styles.modalItem}
                                onPress={() => { setRole(r); setRoleModalVisible(false); }}
                            >
                                <Text style={[styles.modalItemText, role === r && styles.activeItemText]}>{r}</Text>
                                {role === r && <Icon name="check" size={20} color={THEME.primary} />}
                            </TouchableOpacity>
                        ))}
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
        paddingTop: 10,
        paddingBottom: 20,
    },
    backBtn: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    headerTitles: { flex: 1, marginLeft: 20 },
    headerLabel: { fontSize: 13, color: THEME.subText, fontWeight: '600', letterSpacing: 0.5 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: THEME.text },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    imageSection: { alignItems: 'center', marginVertical: 30 },
    imagePicker: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#FFF',
        elevation: 10,
        shadowColor: THEME.primary,
        shadowOpacity: 0.2,
        shadowRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#FFF'
    },
    previewImage: { width: '100%', height: '100%', borderRadius: 66 },
    placeholderBox: { alignItems: 'center' },
    placeholderText: { fontSize: 11, color: THEME.subText, fontWeight: '700', marginTop: 8 },
    editBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: THEME.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF'
    },
    imageHint: { fontSize: 12, color: THEME.subText, marginTop: 15, fontWeight: '500' },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.05,
    },
    inputWrapper: { marginBottom: 20 },
    inputLabel: { fontSize: 12, fontWeight: '700', color: THEME.subText, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 14,
        height: 54,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#EFEFEF'
    },
    textInput: { flex: 1, fontSize: 15, color: THEME.text, fontWeight: '600' },
    actionSection: { marginTop: 30, gap: 12 },
    saveBtn: {
        height: 58,
        backgroundColor: THEME.primary,
        borderRadius: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: THEME.primary,
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
    cancelBtn: { height: 50, justifyContent: 'center', alignItems: 'center' },
    cancelBtnText: { color: THEME.subText, fontSize: 15, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalCard: { width: '85%', backgroundColor: '#FFF', borderRadius: 24, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
    modalItemText: { fontSize: 16, color: THEME.text, fontWeight: '600' },
    activeItemText: { color: THEME.primary, fontWeight: '800' }
});

export default AddPerson;
