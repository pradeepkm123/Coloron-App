import React from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface PlaybackHeaderProps {
    deviceName: string;
    onBack: () => void;
}

const PlaybackHeader: React.FC<PlaybackHeaderProps> = ({
    deviceName,
    onBack
}) => {
    return (
        <View style={styles.header}>
            <TouchableOpacity style={styles.backFab} onPress={onBack}>
                <Icon name="chevron-left" size={32} color="#A83232" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{deviceName || 'Home NVR'}</Text>
            <View style={{ width: 44 }} />
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        height: 110,
    },
    headerTitle: { fontSize: 18, fontWeight: '500', color: '#333' },
    backFab: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', elevation: 2, justifyContent: 'center', alignItems: 'center' },
    headerIcon: { marginLeft: 16 },
});

export default PlaybackHeader;
