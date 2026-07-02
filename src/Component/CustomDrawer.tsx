import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    LayoutAnimation,
    Platform,
    UIManager,
    Image,
    Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SidebarBgSvg from '../assets/svg/sidebar_bg.svg';
import Profile from '../screens/Profile';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { api } from '../utils/api';

if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CustomDrawerProps {
    onClose: () => void;
}

const CustomDrawer: React.FC<CustomDrawerProps> = ({ onClose }) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [profileVisible, setProfileVisible] = useState(false);
    const [username, setUsername] = useState('Guest');
    const [profilePicture, setProfilePicture] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            const user = await api.getAuthenticatedUser();
            if (user) {
                if (user.username) setUsername(user.username);
                if (user.profilePicture) setProfilePicture(user.profilePicture);
            }
        };
        fetchUser();
    }, [profileVisible]);

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
                            onClose();
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

    // Accordion interaction states
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        'Device & Gallery Hub': true,
        'Communication & Support': true,
        'Remote Configuration': true
    });

    const toggleSection = (header: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedSections(prev => ({
            ...prev,
            [header]: !prev[header]
        }));
    };

    const handleNavigation = (screenName: string) => {
        onClose();
        if (screenName) {
            navigation.navigate(screenName as never);
        }
    };

    const handleHelpClick = () => {
        onClose();
        navigation.navigate('HelpViewer', { fileName: 'App File.pdf', title: 'Help Manual' });
    };

    return (
        <View style={styles.container}>
            {/* Header Section */}
            <View style={styles.header}>
                <View style={styles.headerBg}>
                    <SidebarBgSvg width="100%" height="100%" preserveAspectRatio="none" style={StyleSheet.absoluteFill} />
                </View>

                {/* Avatar / Profile Trigger */}
                <TouchableOpacity
                    style={styles.profileSection}
                    onPress={() => setProfileVisible(true)}
                    activeOpacity={0.8}
                >
                    <View style={[styles.avatarContainer, !profilePicture && { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                        {profilePicture ? (
                            <Image
                                source={{ uri: profilePicture }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <Icon
                                name="account"
                                size={52}
                                color="#FFF"
                            />
                        )}
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{username}</Text>
                        <Icon name="chevron-right" size={20} color="#FFF" />
                    </View>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Section 1: Remote Configuration */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Remote Configuration</Text>
                    <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('RemoteDeviceList')}>
                        <Icon name="cog-transfer-outline" size={22} color="#A83232" style={styles.menuIcon} />
                        <Text style={styles.menuLabel}>Remote Setting</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('Local')}>
                        <Icon name="laptop" size={22} color="#A83232" style={styles.menuIcon} />
                        <Text style={styles.menuLabel}>Local</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                {/* Section 2: Device & Gallery Hub */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.accordionHeader}
                        onPress={() => toggleSection('Device & Gallery Hub')}
                    >
                        <Text style={styles.sectionHeader}>Device & Gallery Hub</Text>
                        <Icon
                            name={expandedSections['Device & Gallery Hub'] ? "chevron-up" : "chevron-down"}
                            size={20}
                            color="#666"
                        />
                    </TouchableOpacity>

                    {expandedSections['Device & Gallery Hub'] && (
                        <View style={styles.accordionContent}>
                            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('DeviceList')}>
                                <Icon name="format-list-bulleted-square" size={22} color="#A83232" style={styles.menuIcon} />
                                <Text style={styles.menuLabel}>Device List</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('Gallery')}>
                                <Icon name="folder-multiple-image" size={22} color="#A83232" style={styles.menuIcon} />
                                <Text style={styles.menuLabel}>Gallery</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={styles.divider} />

                {/* Section 3: Communication & Support */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.accordionHeader}
                        onPress={() => toggleSection('Communication & Support')}
                    >
                        <Text style={styles.sectionHeader}>Communication & Support</Text>
                        <Icon
                            name={expandedSections['Communication & Support'] ? "chevron-up" : "chevron-down"}
                            size={20}
                            color="#666"
                        />
                    </TouchableOpacity>

                    {expandedSections['Communication & Support'] && (
                        <View style={styles.accordionContent}>
                            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('PushSettings')}>
                                <Icon name="cog-outline" size={22} color="#A83232" style={styles.menuIcon} />
                                <Text style={styles.menuLabel}>Push Setting</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('Notifications')}>
                                <Icon name="bell-outline" size={22} color="#A83232" style={styles.menuIcon} />
                                <Text style={styles.menuLabel}>Notifications</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={handleHelpClick}>
                                <Icon name="help-circle-outline" size={22} color="#A83232" style={styles.menuIcon} />
                                <Text style={styles.menuLabel}>Help</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('About')}>
                                <Icon name="information-outline" size={22} color="#A83232" style={styles.menuIcon} />
                                <Text style={styles.menuLabel}>About</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

            </ScrollView>

            {/* Logout Footer */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="logout" size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.logoutText}>Logout</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Profile Modal */}
            <Modal
                visible={profileVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setProfileVisible(false)}
            >
                <Profile onClose={() => setProfileVisible(false)} />
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    header: {
        height: 200,
        position: 'relative',
        marginBottom: 10,
    },
    headerBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    profileSection: {
        position: 'absolute',
        left: 25,
        top: 60,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: '#FFF',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginRight: 5,
    },
    menuContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 10,
        paddingBottom: 20,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    sectionHeader: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
        marginTop: 5,
        fontWeight: '500'
    },
    accordionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
    },
    accordionContent: {
        marginTop: 5,
        paddingLeft: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    menuIcon: {
        width: 30,
        marginRight: 10,
    },
    menuLabel: {
        fontSize: 16,
        color: '#333',
        fontWeight: '400',
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginHorizontal: 20,
        marginVertical: 10,
    },
    footer: {
        padding: 20,
        paddingBottom: 30,
    },
    logoutButton: {
        backgroundColor: '#A83232',
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#A83232',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 3,
    },
    logoutText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CustomDrawer;
