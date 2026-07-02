import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';

type NetworkMainRouteProp = RouteProp<RootStackParamList, 'NetworkMain'>;

const NetworkMain: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<NetworkMainRouteProp>();
    const { deviceId, deviceName } = route.params;

    const renderSectionHeader = (title: string) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderTitle}>{title}</Text>
        </View>
    );

    const renderMenuItem = (label: string, onPress: () => void) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <Text style={styles.menuItemLabel}>{label}</Text>
            <Icon name="chevron-right" size={24} color="#CCC" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Icon name="chevron-left" size={32} color="#852d2dff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Network</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    <ScrollView style={styles.content}>
                        {renderSectionHeader('Network')}
                        {renderMenuItem('TCP/IP', () => navigation.navigate('TCPIPConfig', { deviceId, deviceName }))}
                        <View style={styles.divider} />
                        {renderMenuItem('PPPoE', () => navigation.navigate('PPPoEConfig', { deviceId, deviceName }))}
                        <View style={styles.divider} />
                        {renderMenuItem('E-mail', () => navigation.navigate('EmailConfig', { deviceId, deviceName }))}
                        <View style={styles.divider} />
                        {renderMenuItem('SNMP', () => navigation.navigate('SNMPConfig', { deviceId, deviceName }))}
                        <View style={styles.divider} />
                        {renderMenuItem('NAT', () => navigation.navigate('NATConfig', { deviceId, deviceName }))}
                        <View style={styles.divider} />
                        {renderMenuItem('UPnP', () => navigation.navigate('UPnPConfig', { deviceId, deviceName }))}

                        {renderSectionHeader('Stream Settings')}
                        {renderMenuItem('Sub Stream Settings', () => navigation.navigate('SubStreamSettings', { deviceId, deviceName }))}

                        {renderSectionHeader('Network Status')}
                        {renderMenuItem('View Network Status', () => navigation.navigate('ViewNetworkStatus', { deviceId, deviceName }))}

                        <View style={{ height: 20 }} />
                    </ScrollView>
                </SafeAreaView>
            </GradientBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f2f5f7ff',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#852d2dff',
    },
    backBtn: {
        padding: 5,
    },
    content: {
        flex: 1,
    },
    sectionHeader: {
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: '#efe7e7ff',
        marginTop: 5,
    },
    sectionHeaderTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 16,
        backgroundColor: '#FFF',
    },
    menuItemLabel: {
        fontSize: 16,
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginLeft: 15,
    }
});

export default NetworkMain;
