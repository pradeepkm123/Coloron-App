import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    SafeAreaView,
    Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GradientBackground from '../Component/GradientBackground';

const PrivacyPolicy: React.FC = () => {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <GradientBackground>
                <SafeAreaView style={styles.safeArea}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="arrow-left" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Privacy Statement</Text>
                        <View style={{ width: 30 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <Text style={styles.policyTitle}>Coloron Privacy Policy</Text>
                        <Text style={styles.effectiveDate}>Effective Date: June 10, 2026</Text>

                        <Text style={styles.sectionTitle}>Overview</Text>
                        <Text style={styles.text}>Welcome to Coloron.</Text>
                        <Text style={styles.text}>
                            Coloron is a Video Management System (VMS) application that allows users to connect, monitor, and manage surveillance devices including NVRs, DVRs, XVRs, IP Cameras, and other supported security products.
                        </Text>
                        <Text style={styles.text}>
                            We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how Coloron collects, uses, stores, and protects your information when you use our mobile application, desktop software, websites, cloud services, and related products.
                        </Text>
                        <Text style={styles.text}>
                            By using Coloron, you agree to the collection and use of information in accordance with this Privacy Policy.
                        </Text>

                        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
                        
                        <Text style={styles.subSectionTitle}>1.1 Account Information</Text>
                        <Text style={styles.text}>When you register for a Coloron account, we may collect:</Text>
                        <Text style={styles.bulletItem}>• Email Address</Text>
                        <Text style={styles.bulletItem}>• Phone Number</Text>
                        <Text style={styles.bulletItem}>• Username</Text>
                        <Text style={styles.bulletItem}>• Password (encrypted)</Text>
                        <Text style={styles.bulletItem}>• Profile Picture (optional)</Text>
                        <Text style={styles.text}>This information is used to:</Text>
                        <Text style={styles.bulletItem}>• Create your account</Text>
                        <Text style={styles.bulletItem}>• Authenticate login requests</Text>
                        <Text style={styles.bulletItem}>• Provide account recovery services</Text>
                        <Text style={styles.bulletItem}>• Manage your account settings</Text>

                        <Text style={styles.subSectionTitle}>1.2 Device Information</Text>
                        <Text style={styles.text}>When adding surveillance devices to Coloron, we may collect:</Text>
                        <Text style={styles.bulletItem}>• Device Serial Number (SN)</Text>
                        <Text style={styles.bulletItem}>• Device Model</Text>
                        <Text style={styles.bulletItem}>• Device Name</Text>
                        <Text style={styles.bulletItem}>• Device IP Address</Text>
                        <Text style={styles.bulletItem}>• NAT/P2P Information</Text>
                        <Text style={styles.bulletItem}>• Device Firmware Version</Text>
                        <Text style={styles.bulletItem}>• Channel Information</Text>
                        <Text style={styles.bulletItem}>• Device Status (Online/Offline)</Text>
                        <Text style={styles.text}>This information is necessary for:</Text>
                        <Text style={styles.bulletItem}>• Device management</Text>
                        <Text style={styles.bulletItem}>• Remote access</Text>
                        <Text style={styles.bulletItem}>• Device sharing</Text>
                        <Text style={styles.bulletItem}>• Firmware upgrades</Text>
                        <Text style={styles.bulletItem}>• Technical support</Text>

                        <Text style={styles.subSectionTitle}>1.3 Network Information</Text>
                        <Text style={styles.text}>To establish communication between your device and surveillance equipment, Coloron may collect:</Text>
                        <Text style={styles.bulletItem}>• Public IP Address</Text>
                        <Text style={styles.bulletItem}>• Local Network Information</Text>
                        <Text style={styles.bulletItem}>• Wi-Fi SSID</Text>
                        <Text style={styles.bulletItem}>• Network Connection Status</Text>
                        <Text style={styles.text}>This information is used only for:</Text>
                        <Text style={styles.bulletItem}>• Device discovery</Text>
                        <Text style={styles.bulletItem}>• LAN Search</Text>
                        <Text style={styles.bulletItem}>• P2P Connections</Text>
                        <Text style={styles.bulletItem}>• NAT Traversal</Text>
                        <Text style={styles.bulletItem}>• Connectivity diagnostics</Text>

                        <Text style={styles.sectionTitle}>2. Cloud Services</Text>
                        <Text style={styles.text}>If you enable cloud-based services, Coloron may collect:</Text>
                        <Text style={styles.bulletItem}>• Device Identifiers</Text>
                        <Text style={styles.bulletItem}>• Device Logs</Text>
                        <Text style={styles.bulletItem}>• Event Logs</Text>
                        <Text style={styles.bulletItem}>• Push Notification Tokens</Text>
                        <Text style={styles.bulletItem}>• Cloud Service Usage Information</Text>
                        <Text style={styles.text}>Cloud services are used for:</Text>
                        <Text style={styles.bulletItem}>• Device synchronization</Text>
                        <Text style={styles.bulletItem}>• Notification delivery</Text>
                        <Text style={styles.bulletItem}>• Remote access</Text>
                        <Text style={styles.bulletItem}>• Account backup</Text>
                        <Text style={styles.bulletItem}>• Firmware update management</Text>

                        <Text style={styles.sectionTitle}>3. AI Event Notifications</Text>
                        <Text style={styles.text}>Coloron supports intelligent event detection including:</Text>
                        <Text style={styles.bulletItem}>• Motion Detection, Human Detection, Vehicle Detection</Text>
                        <Text style={styles.bulletItem}>• Face Detection, Face Recognition</Text>
                        <Text style={styles.bulletItem}>• Intrusion Detection, Line Crossing, Loitering Detection, Crowd Detection</Text>
                        <Text style={styles.bulletItem}>• Camera Tampering, Camera Offline Alerts, Disk Failure Alerts</Text>
                        <Text style={styles.text}>When these features are enabled, Coloron may process:</Text>
                        <Text style={styles.bulletItem}>• Event Time</Text>
                        <Text style={styles.bulletItem}>• Device Serial Number</Text>
                        <Text style={styles.bulletItem}>• Channel Number</Text>
                        <Text style={styles.bulletItem}>• Event Type</Text>
                        <Text style={styles.bulletItem}>• Event Snapshot Images</Text>
                        <Text style={styles.text}>This information is used solely to provide alarm notifications and event playback functionality.</Text>

                        <Text style={styles.sectionTitle}>4. Live View and Playback</Text>
                        <Text style={styles.text}>Coloron provides real-time video streaming and playback services.</Text>
                        <Text style={styles.text}>When using these services:</Text>
                        <Text style={styles.bulletItem}>• Video streams are transmitted securely.</Text>
                        <Text style={styles.bulletItem}>• Playback requests may be processed through cloud or direct device connections.</Text>
                        <Text style={styles.bulletItem}>• Video content is not stored by Coloron unless cloud storage services are enabled.</Text>

                        <Text style={styles.sectionTitle}>5. Local Recording and Snapshots</Text>
                        <Text style={styles.text}>
                            Coloron allows users to capture snapshots, record live video, and save recordings locally. These files are stored on your device and are accessible only by authorized users of the device.
                        </Text>
                        <Text style={styles.text}>Required permissions: Storage Permission and Photo Gallery Access.</Text>

                        <Text style={styles.sectionTitle}>6. Camera Permission</Text>
                        <Text style={styles.text}>
                            Coloron may request camera access for QR Code Scanning, Device Addition, and Profile Photo Upload. The camera is not used in the background without your consent.
                        </Text>

                        <Text style={styles.sectionTitle}>7. Microphone Permission</Text>
                        <Text style={styles.text}>
                            Coloron supports Two-Way Talk functionality. When enabled, audio is transmitted only while the user actively uses the microphone feature and is not recorded or stored by Coloron unless explicitly requested by the user.
                        </Text>

                        <Text style={styles.sectionTitle}>8. Storage Permission</Text>
                        <Text style={styles.text}>
                            Storage access may be required for saving recordings, saving snapshots, exporting videos, and downloading playback clips. Coloron accesses only files required for these features.
                        </Text>

                        <Text style={styles.sectionTitle}>9. Push Notifications</Text>
                        <Text style={styles.text}>
                            Coloron may send notifications regarding Motion Detection, Human Detection, Vehicle Detection, Face Recognition, Device Offline Alerts, Storage Alerts, and System Notifications. To provide notifications, we may collect Firebase Cloud Messaging (FCM) Token, Device Identifier, and Notification Preferences.
                        </Text>

                        <Text style={styles.sectionTitle}>10. Third-Party Services</Text>
                        <Text style={styles.text}>
                            Coloron may integrate third-party services including Google Firebase (Push Notifications, Analytics, Crash Reporting), Google Play Services, and CCTV Device SDK Providers. Only the information required for device communication is processed.
                        </Text>

                        <Text style={styles.sectionTitle}>11. Cookies and Similar Technologies</Text>
                        <Text style={styles.text}>
                            Coloron websites and cloud services may use Cookies, Local Storage, and Session Identifiers to maintain login sessions, improve user experience, store preferences, and analyze application performance.
                        </Text>

                        <Text style={styles.sectionTitle}>12. Data Sharing</Text>
                        <Text style={styles.text}>
                            Coloron does not sell personal information. Information may be shared only with your consent, for technical support, to comply with legal obligations, or to protect users and systems from security threats.
                        </Text>

                        <Text style={styles.sectionTitle}>13. Data Security</Text>
                        <Text style={styles.text}>
                            Coloron uses industry-standard security measures including HTTPS Encryption, TLS Secure Communication, Encrypted Authentication Tokens, Role-Based Access Controls, and Secure Cloud Infrastructure.
                        </Text>

                        <Text style={styles.sectionTitle}>14. Data Retention</Text>
                        <Text style={styles.text}>
                            Coloron retains information only for as long as necessary to provide services, meet legal requirements, resolve disputes, and improve product performance. Users may request account deletion at any time.
                        </Text>

                        <Text style={styles.sectionTitle}>15. Children's Privacy</Text>
                        <Text style={styles.text}>
                            Coloron is not intended for children under 18 years of age. We do not knowingly collect personal information from minors without parental or guardian consent.
                        </Text>

                        <Text style={styles.sectionTitle}>16. User Rights</Text>
                        <Text style={styles.text}>
                            Users may request access to personal information, correction of inaccurate information, deletion of account information, withdrawal of consent, or export of account data. Requests may be submitted through Coloron customer support.
                        </Text>

                        <Text style={styles.sectionTitle}>17. Changes to This Privacy Policy</Text>
                        <Text style={styles.text}>
                            Coloron may update this Privacy Policy periodically. Updated versions will be published within the application and on official websites. Continued use of the service after updates constitutes acceptance of the revised policy.
                        </Text>

                        <Text style={styles.sectionTitle}>18. Contact Us</Text>
                        <Text style={styles.text}>Coloron VMS</Text>
                        <Text style={styles.bulletItem}>• Email: support@coloron.com</Text>
                        <Text style={styles.bulletItem}>• Website: www.coloron.com</Text>
                        <Text style={styles.bulletItem}>• Support Team: Coloron Technical Support</Text>
                    </ScrollView>
                </SafeAreaView>
            </GradientBackground>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 20,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        color: '#333',
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
        paddingBottom: 60,
    },
    policyTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 6,
        textAlign: 'center',
    },
    effectiveDate: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#A83232', // Brand color for section titles
        marginTop: 24,
        marginBottom: 10,
    },
    subSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#444',
        marginTop: 14,
        marginBottom: 8,
        paddingLeft: 4,
    },
    text: {
        fontSize: 14,
        color: '#444',
        lineHeight: 22,
        marginBottom: 10,
    },
    bulletItem: {
        fontSize: 14,
        color: '#555',
        lineHeight: 22,
        marginBottom: 6,
        paddingLeft: 12,
    },
});

export default PrivacyPolicy;
