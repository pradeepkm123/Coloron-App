import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    Alert
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';

type RemoteFunctionPanelRouteProp = RouteProp<RootStackParamList, 'RemoteFunctionPanel'>;

const RemoteFunctionPanel: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<RemoteFunctionPanelRouteProp>();
    const { deviceName } = route.params;

    const renderMenuItem = (icon: string, label: string, onPress: () => void) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={styles.menuLeft}>
                <View style={styles.iconContainer}>
                    <Icon name={icon} size={24} color="#A83232" />
                </View>
                <Text style={styles.menuLabel}>{label}</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#ccc" />
        </TouchableOpacity>
    );

    const handleFeature = (feature: string) => {
        if (feature === 'Camera') {
            navigation.navigate('CameraManagement', { deviceId: route.params.deviceId, deviceName: route.params.deviceName });
        } else if (feature === 'Record') {
            navigation.navigate('RecordMain', { deviceId: route.params.deviceId, deviceName: route.params.deviceName });
        } else if (feature === 'System') {
            navigation.navigate('SystemMain', { deviceId: route.params.deviceId, deviceName: route.params.deviceName });
        } else if (feature === 'Alarm') {
            navigation.navigate('AlarmMain', { deviceId: route.params.deviceId, deviceName: route.params.deviceName });
        } else if (feature === 'Disk') {
            navigation.navigate('DiskMain', { deviceId: route.params.deviceId, deviceName: route.params.deviceName });
        } else if (feature === 'Network') {
            navigation.navigate('NetworkMain', { deviceId: route.params.deviceId, deviceName: route.params.deviceName });
        } else {
            Alert.alert(feature, `Configuration for ${deviceName} - ${feature} coming soon.`);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#A83232" translucent />
            <GradientBackground>
                <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="chevron-left" size={28} color="#852d2dff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Function Panel</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={styles.deviceInfoContainer}>
                            <Icon name="server-network" size={40} color="#9b4040ff" style={{ marginBottom: 10, opacity: 0.9 }} />
                            <Text style={styles.deviceTitle}>{deviceName}</Text>
                            <Text style={styles.deviceSubtitle}>Remote Configuration</Text>
                        </View>

                        <View style={styles.menuCard}>
                            {renderMenuItem('cctv', 'Camera', () => handleFeature('Camera'))}
                            <View style={styles.divider} />
                            {renderMenuItem('record-circle-outline', 'Record', () => handleFeature('Record'))}
                            <View style={styles.divider} />
                            {renderMenuItem('cog-outline', 'System', () => handleFeature('System'))}
                            <View style={styles.divider} />
                            {renderMenuItem('bell-ring-outline', 'Alarm', () => handleFeature('Alarm'))}
                            <View style={styles.divider} />
                            {renderMenuItem('harddisk', 'Disk', () => handleFeature('Disk'))}
                            <View style={styles.divider} />
                            {renderMenuItem('ip-network-outline', 'Network', () => handleFeature('Network'))}
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
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        elevation: 0,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#852d2dff',
    },
    backButton: {
        padding: 5,
    },
    content: {
        padding: 20,
    },
    deviceInfoContainer: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 20,
    },
    deviceTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#852d2dff',
        marginTop: 10,
    },
    deviceSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 5,
    },
    menuCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        paddingVertical: 10,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        marginBottom: 30, // Bottom spacing
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#FFF0F0', // Light pink background
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuLabel: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600', // Bold/Semi-bold
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginLeft: 84, // Indent to align with text (48 + 16 + 20)
    },
});

export default RemoteFunctionPanel;
