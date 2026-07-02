import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface GradientBackgroundProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

const GradientBackground: React.FC<GradientBackgroundProps> = ({ children, style }) => {
    return (
        <LinearGradient
            colors={['#FFEAEA', '#FFFFFF', '#FFFFFF']}
            locations={[0, 0.3, 1]}
            style={[styles.container, style]}
        >
            {children}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default GradientBackground;
