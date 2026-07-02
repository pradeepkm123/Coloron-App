import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    Linking,
    Platform,
    SafeAreaView,
    Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DeviceInfo from 'react-native-device-info';
import GradientBackground from '../Component/GradientBackground';

const About: React.FC = () => {
    const navigation = useNavigation<any>();
    const [deviceLabel, setDeviceLabel] = useState('');
    const [appVersion, setAppVersion] = useState('');

    useEffect(() => {
        const fetchInfo = async () => {
            const systemName = DeviceInfo.getSystemName();
            const systemVersion = DeviceInfo.getSystemVersion();
            const model = DeviceInfo.getModel();
            setDeviceLabel(`${systemName} ${systemVersion}-${model}`);

            const version = DeviceInfo.getVersion() || '1.0';
            const build = DeviceInfo.getBuildNumber() || '0';
            setAppVersion(`Current Version: ${version}.${build}`);
        };
        fetchInfo();
    }, []);

    const handleRateApp = () => {
        const packageName = DeviceInfo.getBundleId();
        const url = Platform.OS === 'android'
            ? `market://details?id=${packageName}`
            : `itms-apps://itunes.apple.com/app/id${packageName}`;

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                // Fallback to web
                Linking.openURL(`https://play.google.com/store/apps/details?id=${packageName}`);
            }
        });
    };

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
                        <Text style={styles.headerTitle}>About</Text>
                        <View style={{ width: 30 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        {/* Logo Section */}
                        <View style={styles.logoSection}>
                            <View style={styles.infoCard}>
                                <Image
                                    source={require('../assets/Images/coloron.png')}
                                    style={styles.logoImage}
                                    resizeMode="contain"
                                />
                                {/* <View style={styles.logoContainer}>
                                    <Text style={styles.logoTextMain}>SECURALIVE</Text>
                                    <Text style={styles.logoTextSub}> PRO</Text>
                                </View> */}
                                <Text style={styles.versionText}>{appVersion}</Text>
                            </View>
                        </View>

                        {/* modern Card List */}
                        <View style={styles.cardContainer}>
                            {/* Device Info */}
                            <View style={styles.cardItem}>
                                <View style={styles.iconBox}>
                                    <Icon name="cellphone" size={20} color="#666" />
                                </View>
                                <Text style={styles.cardText}>{deviceLabel}</Text>
                            </View>

                            <View style={styles.divider} />

                            {/* Rate App */}
                            <TouchableOpacity style={styles.cardItem} onPress={handleRateApp}>
                                <View style={styles.iconBox}>
                                    <Icon name="star-outline" size={20} color="#FF8C00" />
                                </View>
                                <Text style={styles.cardText}>Rate the app</Text>
                                <Icon name="chevron-right" size={20} color="#CCC" style={styles.chevron} />
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            {/* Privacy */}
                            <TouchableOpacity style={styles.cardItem} onPress={() => navigation.navigate('PrivacyPolicy')}>
                                <View style={styles.iconBox}>
                                    <Icon name="shield-check-outline" size={20} color="#4169E1" />
                                </View>
                                <Text style={styles.cardText}>Privacy Statement</Text>
                                <Icon name="chevron-right" size={20} color="#CCC" style={styles.chevron} />
                            </TouchableOpacity>
                        </View>
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
        paddingTop: 50, // Matches PushSetting header
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
        paddingBottom: 20,
    },
    logoSection: {
        alignItems: 'center',
        paddingVertical: 20,
        backgroundColor: 'transparent',
    },
    infoCard: {
        backgroundColor: '#FFF',
        width: '90%',
        alignItems: 'center',
        paddingVertical: 25,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    logoImage: {
        width: 140,
        height: 50,
        marginBottom: 12
    },
    logoContainer: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'center'
    },
    logoTextMain: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#A83232',
        letterSpacing: 0.5,
    },
    logoTextSub: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#A83232',
        letterSpacing: 0.5,
    },
    versionText: {
        color: '#888',
        fontSize: 13,
        fontWeight: '500'
    },
    cardContainer: {
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        borderRadius: 16,
        paddingVertical: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        marginTop: 20,
    },
    cardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 15,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F5F7FA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    cardText: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
        flex: 1,
    },
    chevron: {
        marginLeft: 10,
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginLeft: 66, // Align with text start
    }
});

export default About;
