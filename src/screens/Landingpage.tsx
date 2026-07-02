import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/FontAwesome';
import GoogleIcon from '../assets/Images/gmail-icon.png';
import MyImage from '../assets/svg/Img-landing.svg';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { api } from '../utils/api';
import { GOOGLE_WEB_CLIENT_ID } from '../config/api';
import Snackbar from 'react-native-snackbar';

type LandingPagNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LandingPage'>;

const { width } = Dimensions.get('window');

const LandingPage: React.FC = () => {
    const navigation = useNavigation<LandingPagNavigationProp>();

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: GOOGLE_WEB_CLIENT_ID,
            offlineAccess: true,
        });
    }, []);

    const handleGoogleLogin = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const idToken = userInfo.idToken || (userInfo as any).data?.idToken;

            if (!idToken) {
                throw new Error('No ID Token received from Google. Check your Web Client ID.');
            }

            await api.googleLogin(idToken);

            Snackbar.show({
                text: 'Login successful!',
                duration: Snackbar.LENGTH_SHORT,
                backgroundColor: '#020202ff',
                textColor: '#FFF',
            });

            // Register FCM token if notification service exists
            try {
                const { notificationService } = require('../services/NotificationService');
                await notificationService.registerToken();
            } catch (e) {
                console.log('[LandingPage] Notification registration skipped or failed:', e);
            }

            navigation.reset({
                index: 0,
                routes: [{
                    name: 'Home',
                    params: { isAuthenticated: true }
                }],
            });
        } catch (error: any) {
            console.error('[Google Sign-in] Error:', error);
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                Snackbar.show({
                    text: 'Sign in cancelled',
                    duration: Snackbar.LENGTH_SHORT,
                });
            } else if (error.code === statusCodes.IN_PROGRESS) {
                Snackbar.show({
                    text: 'Sign in in progress',
                    duration: Snackbar.LENGTH_SHORT,
                });
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert('Play Services Error', 'Google Play Services is not available or outdated.');
            } else {
                Alert.alert('Google Sign-in Failed', error.message || 'An error occurred during Google Sign-in.');
            }
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Illustration Area */}
            <View style={styles.illustrationContainer}>
                <MyImage />
            </View>

            {/* Content Area */}
            <View style={styles.contentContainer}>
                <Text style={styles.title}>Welcome</Text>
                <Text style={styles.subtitle}>Manage your expenses</Text>
                <Text style={styles.mainText}>Seamlessly & Intuitively</Text>

                <View style={styles.buttonContainer}>
                    {/* Sign in with Google */}
                    <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
                        <Image
                            source={GoogleIcon}
                            style={{ width: 20, height: 20, resizeMode: 'contain', marginRight: 10 }}
                        />
                        <Text style={styles.googleButtonText}>Sign in with Google</Text>
                    </TouchableOpacity>

                    {/* Create an account */}
                    <TouchableOpacity
                        style={styles.createAccountButton}
                        onPress={() => navigation.navigate('SignUp')}
                    >
                        <Text style={styles.createAccountText}>Create an account</Text>
                    </TouchableOpacity>

                    {/* Footer Link */}
                    <View style={styles.signInContainer}>
                        <Text style={styles.signInLabel}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.signInLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#A83232', // Deep Red matching mockups
        padding: 20,
        justifyContent: 'space-between',
    },
    illustrationContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 20,
    },
    contentContainer: {
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        color: '#FFCDD2', // Light red/pink
        marginBottom: 5,
    },
    mainText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 40,
    },
    buttonContainer: {
        width: '100%',
    },
    googleButton: {
        backgroundColor: '#FFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 10,
        marginBottom: 15,
        elevation: 2,
    },
    btnIcon: {
        marginRight: 10,
    },
    googleButtonText: {
        color: '#333',
        fontWeight: 'bold',
        fontSize: 16,
    },
    createAccountButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 10,
        marginBottom: 20,
    },
    createAccountText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    signInContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    signInLabel: {
        color: '#FFCDD2',
        fontSize: 14,
    },
    signInLink: {
        color: '#FFD700', // Gold/Yellowish for visibility
        fontWeight: 'bold',
        fontSize: 14,
        textDecorationLine: 'none',
    },
});

export default LandingPage;
