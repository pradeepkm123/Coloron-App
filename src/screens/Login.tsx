import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import Snackbar from 'react-native-snackbar';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/FontAwesome';
import GoogleIcon from '../assets/Images/gmail-icon.png';
import MyImage from '../assets/svg/Login.svg';
import Feather from 'react-native-vector-icons/Feather';
import GradientBackground from '../Component/GradientBackground';
import { api } from '../utils/api';
import { notificationService } from '../services/NotificationService';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID } from '../config/api';

import React, { useState, useEffect } from 'react';

type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const Login: React.FC = () => {
    const navigation = useNavigation<LoginNavigationProp>();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        identifier: '',
        password: '',
    });

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: GOOGLE_WEB_CLIENT_ID,
            offlineAccess: true,
        });
    }, []);

    const handleGoogleLogin = async () => {
        setLoading(true);
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

            // Register FCM token
            await notificationService.registerToken();

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
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        const identifier = formData.identifier.trim();
        const password = formData.password;

        // Validation
        if (!identifier || !password) {
            Alert.alert('Error', 'Please enter your email/mobile and password');
            return;
        }

        setLoading(true);

        try {
            const response = await api.login({
                identifier,
                password,
            });

            Snackbar.show({
                text: 'Login successful!',
                duration: Snackbar.LENGTH_SHORT,
                backgroundColor: '#020202ff',
                textColor: '#FFF',
            });
            // Register FCM token for push notifications
            await notificationService.registerToken();

            // Navigate to Home on success with authenticated state
            navigation.reset({
                index: 0,
                routes: [{
                    name: 'Home',
                    params: { isAuthenticated: true }
                }],
            });
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <GradientBackground>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Illustration / Header Image Placeholder */}
                <View style={styles.imageContainer}>
                    <MyImage />
                </View>

                <Text style={styles.headerText}>Login</Text>

                <View style={styles.formContainer}>
                    {/* Identifier Input */}
                    <View style={styles.inputContainer}>
                        <Icon name="user" size={20} color="#555" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Mobile No (or) Email"
                            placeholderTextColor="#999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={formData.identifier}
                            onChangeText={(text) => setFormData({ ...formData, identifier: text })}
                            editable={!loading}
                        />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                        <Icon name="lock" size={20} color="#555" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#999"
                            secureTextEntry={!showPassword}
                            value={formData.password}
                            onChangeText={(text) => setFormData({ ...formData, password: text })}
                            editable={!loading}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Icon name={showPassword ? "eye" : "eye-slash"} size={17} color="#999" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.forgotPasswordContainer}
                        onPress={() => navigation.navigate('ForgotPassword')}
                    >
                        <Text style={styles.linkText}>Forgot password?</Text>
                    </TouchableOpacity>

                    {/* Login Button */}
                    <TouchableOpacity
                        style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.loginButtonText}>Login</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.orContainer}>
                        <View style={styles.divider} />
                        <Text style={styles.orText}>or</Text>
                        <View style={styles.divider} />
                    </View>

                    {/* Login with Google */}
                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleGoogleLogin}
                        disabled={loading}
                    >
                        <Image
                            source={GoogleIcon}
                            style={styles.googleIcon}
                        />
                        <Text style={styles.googleButtonText}>Login with Google</Text>
                    </TouchableOpacity>

                    {/* Create Account Link */}
                    <View style={styles.footerContainer}>
                        <Text style={styles.footerText}>Create a new Account ! </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('SignUp')} disabled={loading}>
                            <Text style={styles.linkText}>Sign up</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Skip Link */}
                    <TouchableOpacity style={styles.skipContainer} onPress={() => navigation.reset({
                        index: 0,
                        routes: [{
                            name: 'Home',
                            params: { isAuthenticated: false }
                        }],
                    })}>
                        <Text style={styles.skipText}>Skip Now <Feather name="arrow-right" size={14} /></Text>
                    </TouchableOpacity>

                </View>
            </ScrollView>
        </GradientBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        // backgroundColor: '#fff', // Removed for Gradient
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageContainer: {
        marginBottom: 30,
        alignItems: 'center',
        marginTop: 40,
    },
    headerText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a237e',
        alignSelf: 'flex-start',
        marginBottom: 30,
    },
    formContainer: {
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        marginBottom: 15,
        paddingVertical: 10,
    },
    inputIcon: {
        marginRight: 10,
        width: 25,
        textAlign: 'center',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    forgotPasswordContainer: {
        alignItems: 'flex-end',
        marginBottom: 30,
    },
    loginButton: {
        backgroundColor: '#A83232', // Deep Red
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
        elevation: 3,
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 18,
    },
    orContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#eee',
    },
    orText: {
        marginHorizontal: 10,
        color: '#999',
    },
    googleButton: {
        backgroundColor: '#f1f1f1ff',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        flexDirection: 'row',
    },
    googleIcon: {
        width: 20,
        height: 20,
        resizeMode: 'contain',
        marginRight: 10,
    },
    googleButtonText: {
        color: '#555',
        fontSize: 16,
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    footerText: {
        color: '#666',
        fontSize: 12,
    },
    linkText: {
        color: '#1a237e', // Dark Blue
        fontWeight: 'bold',
        fontSize: 13, // Slightly larger for tap targets
    },
    skipContainer: {
        alignItems: 'center',
        marginTop: 10,
    },
    skipText: {
        color: '#1a237e',
        fontWeight: 'bold',
        fontSize: 13,
    },
});

export default Login;
