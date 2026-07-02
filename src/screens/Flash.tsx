import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Dimensions, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Logo from '../assets/svg/Coloron_Logo.svg';
import { authStorage } from '../utils/authStorage';
import { api } from '../utils/api';

type FlashScreenNavigationProp = NativeStackNavigationProp<
    RootStackParamList,
    'Flash'
>;

const Ripple = ({ delay }: { delay: number }) => {
    const animValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const startAnimation = () => {
            Animated.loop(
                Animated.timing(animValue, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                })
            ).start();
        };

        const timeout = setTimeout(startAnimation, delay);
        return () => clearTimeout(timeout);
    }, [delay]);

    const scale = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 4], // Start from logo size and expand
    });

    const opacity = animValue.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.4, 0.2, 0],
    });

    return (
        <Animated.View
            style={[
                styles.circle,
                {
                    opacity,
                    transform: [{ scale }],
                },
            ]}
        />
    );
};

const Flash: React.FC = () => {
    const navigation = useNavigation<FlashScreenNavigationProp>();
    const { width } = Dimensions.get('window');

    useEffect(() => {
        const checkAuthAndNavigate = async () => {
            try {
                // Auto-detect and cache backend server IP address
                await api.detectBackendIp();

                const authenticated = await authStorage.isAuthenticated();

                // Show logo for 4 seconds, then navigate
                setTimeout(() => {
                    if (authenticated) {
                        navigation.replace('Home', { isAuthenticated: true });
                    } else {
                        navigation.replace('LandingPage');
                    }
                }, 4000);
            } catch (error) {
                console.error('Auth check error in Flash:', error);
                navigation.replace('LandingPage');
            }
        };

        checkAuthAndNavigate();
    }, [navigation]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#992828" />

            {/* Concentric Circles Background (Animated Waves) */}
            <View style={styles.circleContainer}>
                <Ripple delay={0} />
                <Ripple delay={750} />
                <Ripple delay={1500} />
                <Ripple delay={2250} />
            </View>

            {/* Central Badge */}
            <View style={styles.badge}>
                <Logo />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.versionText}>Version 2.0</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#992828', // Deep Red foundation
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    circleContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        width: 200, // Anchor size matching approximate start size
        height: 200,
    },
    circle: {
        position: 'absolute',
        width: 200, // Base size matching the badge roughly
        height: 200,
        borderRadius: 100, // Circle
        backgroundColor: '#ffffff',
    },
    badge: {
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 10, // Ensure logo is on top
    },
    logo: {
        width: '70%',
        height: '70%',
    },
    footer: {
        position: 'absolute',
        bottom: 50,
        zIndex: 10,
    },
    versionText: {
        color: '#ffffff',
        opacity: 0.7,
        fontSize: 14,
        fontWeight: '500',
    },
});

export default Flash;
