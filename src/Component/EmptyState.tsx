import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import EmptyLogin from '../assets/svg/Empty_Login.svg';

interface EmptyStateProps {
    onLoginPress?: () => void;
    onSignUpPress?: () => void;
    onDemoPress?: () => void;
    onNotificationPress?: () => void;
    onAddDevicePress?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    onLoginPress,
    onSignUpPress,
    onDemoPress,
    onNotificationPress,
    onAddDevicePress
}) => {
    return (
        <View style={styles.container}>
            {/* Header Icons */}
            <View style={styles.headerIcons}>
                <TouchableOpacity style={styles.iconButton} onPress={onAddDevicePress}>
                    <Icon name="plus" size={24} color="#A83232" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={onNotificationPress}>
                    <Icon name="bell-outline" size={24} color="#A83232" />
                </TouchableOpacity>
            </View>

            {/* Illustration */}
            <View style={styles.illustrationContainer}>
                <EmptyLogin />
            </View>

            {/* Message */}
            <Text style={styles.message}>Log in to get more Services</Text>

            {/* Login/Register Button */}
            <TouchableOpacity
                style={styles.loginButton}
                onPress={onLoginPress}
                activeOpacity={0.8}
            >
                <Text style={styles.loginButtonText}>Login/Register</Text>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Create a new Account | </Text>
                <TouchableOpacity onPress={onSignUpPress}>
                    <Text style={styles.signUpLink}>Sign up</Text>
                </TouchableOpacity>
            </View>

            {/* Demo Link */}
            {/* <TouchableOpacity onPress={onDemoPress} style={styles.demoContainer}>
                <Icon name="eye-outline" size={16} color="#A83232" style={styles.demoIcon} />
                <Text style={styles.demoLink}>View Demo Home Page</Text>
            </TouchableOpacity> */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingBottom: 120, // Space for bottom bar
        position: 'relative',
    },
    headerIcons: {
        position: 'absolute',
        top: 20,
        right: 20,
        flexDirection: 'row',
        zIndex: 10,
    },
    iconButton: {
        marginLeft: 15,
        top: -30,
    },
    illustrationContainer: {
        width: '100%',
        height: 280,
        marginBottom: 40,
        marginTop: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    illustration: {
        width: '100%',
        height: '100%',
    },
    message: {
        fontSize: 14,
        color: '#4f4f4fff',
        marginBottom: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
    loginButton: {
        backgroundColor: '#A83232',
        borderRadius: 30,
        paddingVertical: 16,
        paddingHorizontal: 60,
        width: '85%',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#A83232',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    loginButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',


    },
    signUpContainer: {
        flexDirection: 'row',
        marginTop: 14,
        alignItems: 'center',
    },
    signUpText: {
        fontSize: 14,
        color: '#999',
    },
    signUpLink: {
        fontSize: 14,
        color: '#A83232',
        fontWeight: '600',
    },
    demoContainer: {
        flexDirection: 'row',
        marginTop: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    demoIcon: {
        marginRight: 6,
    },
    demoLink: {
        fontSize: 13,
        color: '#A83232',
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
});

export default EmptyState;
