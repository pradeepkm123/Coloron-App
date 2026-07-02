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
import Feather from 'react-native-vector-icons/Feather';
import Icon from 'react-native-vector-icons/MaterialIcons';
import GradientBackground from '../Component/GradientBackground';
import { api } from '../utils/api';
import MyImage from '../assets/svg/Login.svg'; // Reuse login illustration or similar

type ForgotPasswordNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

const ForgotPassword: React.FC = () => {
    const navigation = useNavigation<ForgotPasswordNavigationProp>();
    const [step, setStep] = useState(1); // 1: Identifier, 2: OTP, 3: Reset
    const [loading, setLoading] = useState(false);
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSendOTP = async () => {
        if (!identifier) {
            Alert.alert('Error', 'Please enter your email or mobile number');
            return;
        }
        setLoading(true);
        try {
            const res = await api.forgotPassword(identifier);
            Snackbar.show({
                text: res.message,
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: '#020202ff',
            });
            setStep(2);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!otp || otp.length < 6) {
            Alert.alert('Error', 'Please enter a valid 6-digit OTP');
            return;
        }
        setLoading(true);
        try {
            const res = await api.verifyOTP(identifier, otp);
            Snackbar.show({
                text: res.message,
                duration: Snackbar.LENGTH_SHORT,
                backgroundColor: '#020202ff',
            });
            setStep(3);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'OTP verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            const res = await api.resetPassword(identifier, otp, newPassword);
            Alert.alert('Success', res.message, [
                { text: 'Login Now', onPress: () => navigation.navigate('Login') }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <GradientBackground>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.imageContainer}>
                    <MyImage width={150} height={150} />
                </View>

                <Text style={styles.headerText}>
                    {step === 1 ? 'Forgot Password' : step === 2 ? 'Verify OTP' : 'Reset Password'}
                </Text>
                <Text style={styles.subText}>
                    {step === 1 ? 'Enter your registered email or mobile number to receive an OTP.' :
                        step === 2 ? `Enter the 6-digit code sent to ${identifier}` :
                            'Create a strong new password for your account.'}
                </Text>

                <View style={styles.formContainer}>
                    {step === 1 && (
                        <View style={styles.inputContainer}>
                            <Feather name="user" size={20} color="#555" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email or Mobile No"
                                placeholderTextColor="#999"
                                value={identifier}
                                onChangeText={setIdentifier}
                                autoCapitalize="none"
                                editable={!loading}
                            />
                        </View>
                    )}

                    {step === 2 && (
                        <View style={styles.inputContainer}>
                            <Feather name="shield" size={20} color="#555" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter 6-digit OTP"
                                placeholderTextColor="#999"
                                keyboardType="number-pad"
                                maxLength={6}
                                value={otp}
                                onChangeText={setOtp}
                                editable={!loading}
                            />
                        </View>
                    )}

                    {step === 3 && (
                        <>
                            <View style={styles.inputContainer}>
                                <Feather name="lock" size={20} color="#555" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="New Password"
                                    placeholderTextColor="#999"
                                    secureTextEntry={!showPassword}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    editable={!loading}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Feather name={showPassword ? 'eye' : 'eye-off'} size={17} color="#999" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.inputContainer}>
                                <Feather name="lock" size={20} color="#555" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm Password"
                                    placeholderTextColor="#999"
                                    secureTextEntry={!showPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    editable={!loading}
                                />
                            </View>
                        </>
                    )}

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={step === 1 ? handleSendOTP : step === 2 ? handleVerifyOTP : handleResetPassword}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.buttonText}>
                                {step === 1 ? 'Send OTP' : step === 2 ? 'Verify & Continue' : 'Update Password'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {step > 1 && (
                        <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.footerLink} onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.linkText}>Back to Login</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </GradientBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageContainer: {
        marginBottom: 20,
    },
    headerText: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#1a237e',
        marginBottom: 10,
    },
    subText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    formContainer: {
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        marginBottom: 20,
        paddingVertical: 10,
    },
    inputIcon: {
        marginRight: 12,
        width: 25,
        textAlign: 'center',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    button: {
        backgroundColor: '#A83232',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
        elevation: 3,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 17,
    },
    backButton: {
        marginTop: 15,
        alignItems: 'center',
    },
    backButtonText: {
        color: '#666',
        fontSize: 15,
    },
    footerLink: {
        marginTop: 30,
        alignItems: 'center',
    },
    linkText: {
        color: '#1a237e',
        fontWeight: 'bold',
        fontSize: 15,
    },
});

export default ForgotPassword;
