import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    TextInput,
    Image,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { api } from '../utils/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SidebarFullSvg from '../assets/svg/sidbar_full.svg';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alarmEmitter } from '../services/AlarmService';
import { deviceStorage } from '../utils/deviceStorage';

export interface ProfileProps {
    onClose?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onClose }) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const insets = useSafeAreaInsets();

    const [username, setUsername] = useState('Guest');
    // ... rest of state ...
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [profilePicture, setProfilePicture] = useState('');
    const [devicesCount, setDevicesCount] = useState(0);
    const [cameraCount, setCameraCount] = useState(0);

    useEffect(() => {
        const fetchUser = async () => {
            const user = await api.getAuthenticatedUser();
            if (user) {
                if (user.username) setUsername(user.username);
                if (user.email) setEmail(user.email);
                if (user.mobileNo) setPhone(user.mobileNo);
                if (user.profilePicture) setProfilePicture(user.profilePicture);
            }
        };
        const fetchStats = async () => {
            try {
                const rawDevices = await deviceStorage.getDevices();
                setDevicesCount(rawDevices.length);
                const totalChannels = rawDevices.reduce((sum, d) => sum + (d.channels?.length || d.channelCount || 0), 0);
                setCameraCount(totalChannels);
            } catch (err) {
                console.error('Error fetching stats in profile:', err);
            }
        };
        fetchUser();
        fetchStats();
    }, []);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const validatePassword = (password: string) => {
        const minLength = password.length >= 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        return {
            minLength,
            hasUpperCase,
            hasLowerCase,
            hasNumber,
            hasSpecial,
            isValid: minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecial
        };
    };

    const handleSave = async () => {
        try {
            const updateData: any = {
                username,
                email,
                mobileNo: phone,
                profilePicture,
            };

            const isPasswordModified = !!newPassword;

            if (newPassword) {
                if (!isEditingPassword) {
                    Alert.alert('Info', 'Click the edit icon next to Change Password to modify password.');
                    return;
                }
                if (newPassword !== confirmPassword) {
                    Alert.alert('Error', 'Passwords do not match');
                    return;
                }
                const strength = validatePassword(newPassword);
                if (!strength.isValid) {
                    Alert.alert('Error', 'Password is too weak. It must be at least 8 characters and include uppercase, lowercase, number, and special character.');
                    return;
                }
                updateData.password = newPassword;
            }

            await api.updateProfile(updateData);
            alarmEmitter.emit('profile_updated', profilePicture);
            
            if (isPasswordModified) {
                Alert.alert('Success', 'Password Changed');
            } else {
                Alert.alert('Success', 'Profile updated successfully');
            }
            
            setNewPassword('');
            setConfirmPassword('');
            setIsEditingPassword(false);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update profile');
        }
    };

    const handleEditPicture = () => {
        launchImageLibrary(
            {
                mediaType: 'photo',
                includeBase64: true,
                quality: 0.5,
                selectionLimit: 1,
            },
            async (response) => {
                if (response.didCancel) {
                    console.log('User cancelled image picker');
                } else if (response.errorCode) {
                    Alert.alert('Image Picker Error', response.errorMessage);
                } else if (response.assets && response.assets.length > 0) {
                    const asset = response.assets[0];
                    if (asset.base64) {
                        const base64Image = `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`;
                        setProfilePicture(base64Image); // Update state instantly, do not upload yet
                    }
                }
            }
        );
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Yes, Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.logout();
                            if (onClose) onClose();
                            navigation.reset({
                                index: 0,
                                routes: [{
                                    name: 'Home',
                                    params: { isAuthenticated: false }
                                }],
                            });
                        } catch (error) {
                            console.error('Logout error:', error);
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Header Section */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                {/* SVG Background */}
                <View style={StyleSheet.absoluteFill}>
                    <SidebarFullSvg width="100%" height="100%" preserveAspectRatio="none" />
                </View>

                {/* Back Button */}
                <TouchableOpacity style={[styles.backButton, { top: insets.top + 20 }]} onPress={onClose}>
                    <Icon name="chevron-left" size={28} color="#FFF" />
                </TouchableOpacity>

                {/* Logout Button */}
                <TouchableOpacity style={[styles.logoutButton, { top: insets.top + 20 }]} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={23} color="#FFF" />
                </TouchableOpacity>

                {/* Profile Picture */}
                <View style={styles.profilePictureContainer}>
                    <View style={styles.profilePicture}>
                        {profilePicture ? (
                            <Image source={{ uri: profilePicture }} style={{ width: '100%', height: '100%', borderRadius: 50 }} />
                        ) : (
                            <Icon name="account" size={60} color="#FFF" />
                        )}
                    </View>
                    <TouchableOpacity style={styles.editIconContainer} onPress={handleEditPicture}>
                        <Icon name="pencil" size={16} color="#A83232" />
                    </TouchableOpacity>
                </View>

                {/* User Name */}
                <Text style={styles.userName}>{username}</Text>

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{devicesCount}</Text>
                        <Text style={styles.statLabel}>{devicesCount === 1 ? 'Device' : 'Devices'}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{cameraCount}</Text>
                        <Text style={styles.statLabel}>{cameraCount === 1 ? 'IP Camera' : 'IP Cameras'}</Text>
                    </View>
                </View>
            </View>

            {/* Content Section */}
            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
                {/* Basic Info */}
                <Text style={styles.sectionTitle}>Basic Info</Text>

                {/* Email Field */}
                <View style={styles.inputContainer}>
                    <Icon name="email-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#999"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                    />
                </View>

                {/* Phone Field */}
                <View style={styles.inputContainer}>
                    <Icon name="phone-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Phone"
                        placeholderTextColor="#999"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />
                </View>


                {/* Change Password Section */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 }}>
                    <Text style={[styles.sectionTitle, { marginBottom: 0, marginTop: 0 }]}>Change password</Text>
                    <TouchableOpacity onPress={() => setIsEditingPassword(!isEditingPassword)}>
                        <Icon name="pencil-outline" size={20} color={isEditingPassword ? '#A83232' : '#666'} />
                    </TouchableOpacity>
                </View>

                {/* New Password Field */}
                <View style={[styles.inputContainer, { backgroundColor: isEditingPassword ? '#FFF' : '#F0F0F0' }]}>
                    <Icon name="key-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Create a New Password"
                        placeholderTextColor="#999"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPassword}
                        editable={isEditingPassword}
                    />
                    {isEditingPassword && (
                        <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                            <Icon name={showNewPassword ? "eye" : "eye-off"} size={20} color="#666" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Confirm Password Field */}
                <View style={[styles.inputContainer, { backgroundColor: isEditingPassword ? '#FFF' : '#F0F0F0' }]}>
                    <Icon name="key-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Confirm the Password"
                        placeholderTextColor="#999"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        editable={isEditingPassword}
                    />
                    {isEditingPassword && (
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                            <Icon name={showConfirmPassword ? "eye" : "eye-off"} size={20} color="#666" />
                        </TouchableOpacity>
                    )}
                </View>

                {isEditingPassword && newPassword.length > 0 && (
                    <View style={{ marginBottom: 12, paddingHorizontal: 4 }}>
                        {!validatePassword(newPassword).isValid ? (
                            <Text style={styles.weakPasswordMessage}>
                                Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
                            </Text>
                        ) : (
                            <Text style={styles.strongPasswordMessage}>
                                ✓ Password strength: Strong
                            </Text>
                        )}
                    </View>
                )}

                {/* Save Button */}
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>

                {/* Bottom Spacing */}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        paddingTop: 20,
        paddingBottom: 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    logoutButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    profilePictureContainer: {
        marginTop: 40,
        position: 'relative',
    },
    profilePicture: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 4,
        borderColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    editIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#A83232',
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFF',
        marginTop: 15,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 20,
    },
    statItem: {
        alignItems: 'center',
        paddingHorizontal: 20,
        flexDirection: 'row',
    },
    statValue: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#FFF',
    },
    statLabel: {
        fontSize: 12,
        color: '#FFF',
        marginTop: 4,
        marginLeft: 10,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
        marginTop: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 6,
        marginBottom: 12,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        height: 50
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#333',
    },
    inputLabel: {
        flex: 1,
        fontSize: 15,
        color: '#333',
    },
    saveButton: {
        backgroundColor: '#A83232',
        borderRadius: 10,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 24,
        marginHorizontal: 0,
        elevation: 3,
        shadowColor: '#A83232',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    weakPasswordMessage: {
        fontSize: 12,
        color: '#D32F2F',
        marginTop: 4,
        lineHeight: 16,
    },
    strongPasswordMessage: {
        fontSize: 12,
        color: '#388E3C',
        marginTop: 4,
        fontWeight: '600',
    },
});

export default Profile;
