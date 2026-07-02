import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import Snackbar from 'react-native-snackbar';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import MyImage from '../assets/svg/Singup.svg';
import Feather from 'react-native-vector-icons/Feather';
import Icon from 'react-native-vector-icons/MaterialIcons';
import GradientBackground from '../Component/GradientBackground';
import { api } from '../utils/api';
import { notificationService } from '../services/NotificationService';

type SignUpNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;

const SignUp: React.FC = () => {
    const navigation = useNavigation<SignUpNavigationProp>();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        mobileNo: '',
        password: '',
        confirmPassword: '',
    });

    const validatePassword = (pass: string) => {
        const minLength = pass.length >= 8;
        const hasUpperCase = /[A-Z]/.test(pass);
        const hasLowerCase = /[a-z]/.test(pass);
        const hasNumber = /[0-9]/.test(pass);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);

        return {
            minLength,
            hasUpperCase,
            hasLowerCase,
            hasNumber,
            hasSpecial,
            isValid: minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecial
        };
    };

    const handleSignup = async () => {
        const username = formData.username.trim();
        const email = formData.email.trim();
        const mobileNo = formData.mobileNo.trim();
        const password = formData.password; // Don't trim password normally
        const confirmPassword = formData.confirmPassword;

        // Validation
        if (!username || !email || !mobileNo || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        // Validate password strength
        const strength = validatePassword(password);
        if (!strength.isValid) {
            Alert.alert(
                'Error',
                'Password is too weak. It must be at least 8 characters and include uppercase, lowercase, number, and special character.'
            );
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        // Mobile validation (simple example)
        if (mobileNo.length < 10) {
            Alert.alert('Error', 'Please enter a valid mobile number');
            return;
        }

        setLoading(true);

        try {
            const response = await api.signup({
                username,
                email,
                mobileNo,
                password,
            });

            Snackbar.show({
                text: response.message || 'Account created successfully!',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: '#020202ff',
                textColor: '#FFF',
            });
            // Register FCM token for push notifications
            try {
                await notificationService.registerToken();
            } catch (tokenErr) {
                console.warn('FCM token registration failed on signup:', tokenErr);
            }

            // Auto login: navigate to Home on success
            navigation.reset({
                index: 0,
                routes: [{
                    name: 'Home',
                    params: { isAuthenticated: true }
                }],
            });
        } catch (error: any) {
            Alert.alert('Signup Failed', error.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <GradientBackground>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Illustration / Header Image */}
                <View style={styles.imageContainer}>
                    <MyImage />
                </View>

                <Text style={styles.headerText}>Sign up</Text>

                <View style={styles.formContainer}>
                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                        <Icon name="email" size={20} color="#555" style={{ marginRight: 10 }} />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter Mail ID"
                            placeholderTextColor="#999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={formData.email}
                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                            editable={!loading}
                        />
                    </View>

                    {/* Mobile Number Input */}
                    <View style={styles.inputContainer}>
                        <Feather name="phone" size={20} color="#555" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Mobile No"
                            placeholderTextColor="#999"
                            keyboardType="phone-pad"
                            value={formData.mobileNo}
                            onChangeText={(text) => setFormData({ ...formData, mobileNo: text })}
                            editable={!loading}
                        />
                    </View>

                    {/* Username Input */}
                    <View style={styles.inputContainer}>
                        <Feather name="user" size={20} color="#555" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Username"
                            placeholderTextColor="#999"
                            value={formData.username}
                            onChangeText={(text) => setFormData({ ...formData, username: text })}
                            editable={!loading}
                        />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                        <Feather name="lock" size={20} color="#555" style={styles.inputIcon} />
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
                            <Feather
                                name={showPassword ? 'eye' : 'eye-off'}
                                size={17}
                                color="#999"
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Confirm Password Input */}
                    <View style={styles.inputContainer}>
                        <Feather name="lock" size={20} color="#555" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm Password"
                            placeholderTextColor="#999"
                            secureTextEntry={!showConfirmPassword}
                            value={formData.confirmPassword}
                            onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                            editable={!loading}
                        />
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                            <Feather
                                name={showConfirmPassword ? 'eye' : 'eye-off'}
                                size={17}
                                color="#999"
                            />
                        </TouchableOpacity>
                    </View>

                    {formData.password.length > 0 && (
                        <View style={{ marginBottom: 12, paddingHorizontal: 4 }}>
                            {!validatePassword(formData.password).isValid ? (
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

                    <View style={styles.policyContainer}>
                        <Text style={styles.policyText}>
                            By Signing up, you're agree to our{' '}
                            <Text style={styles.linkText}>Terms & Conditions</Text> and{' '}
                            <Text style={styles.linkText}>Privacy Policy</Text>
                        </Text>
                    </View>

                    {/* Sign Up Button */}
                    <TouchableOpacity
                        style={[styles.signupButton, loading && styles.signupButtonDisabled]}
                        onPress={handleSignup}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.signupButtonText}>Sign up</Text>
                        )}
                    </TouchableOpacity>

                    {/* Footer */}
                    <View style={styles.footerContainer}>
                        <Text style={styles.footerText}>Already have an Account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
                            <Text style={styles.linkText}>Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </GradientBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        // backgroundColor: '#ffffffff', // Removed for Gradient
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageContainer: {
        marginTop: 20,
        marginBottom: 30,
        alignItems: 'center',
    },
    headerText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a237e', // Dark Blue
        alignSelf: 'flex-start',
        marginBottom: 20,
    },
    formContainer: {
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        marginBottom: 10,
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
    policyContainer: {
        marginBottom: 20,
        marginTop: 10,
    },
    policyText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        lineHeight: 18,
    },
    signupButton: {
        backgroundColor: '#A83232', // Deep Red
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    signupButtonDisabled: {
        opacity: 0.6,
    },
    signupButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 18,
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    footerText: {
        color: '#666',
    },
    linkText: {
        color: '#1a237e', // Dark Blue
        fontWeight: 'bold',
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

export default SignUp;
