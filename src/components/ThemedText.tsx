import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

interface ThemedTextProps extends TextProps {
    // You can add custom variants here, e.g., 'header', 'body', 'caption'
    variant?: 'regular' | 'medium' | 'bold' | 'semiBold';
}

export const ThemedText: React.FC<ThemedTextProps> = ({
    style,
    variant = 'regular',
    ...props
}) => {
    const getFontFamily = () => {
        switch (variant) {
            case 'bold':
                return 'Outfit-Bold';
            case 'semiBold':
                return 'Outfit-SemiBold';
            case 'medium':
                return 'Outfit-Medium';
            case 'regular':
            default:
                return 'Outfit-Regular';
        }
    };

    return (
        <Text
            style={[
                { fontFamily: getFontFamily() },
                style,
            ]}
            {...props}
        />
    );
};
