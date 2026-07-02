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

type EthernetPortDetailsRouteProp = RouteProp<RootStackParamList, 'EthernetPortDetails'>;

const EthernetPortDetails: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<EthernetPortDetailsRouteProp>();
    const { portName } = route.params;

    const renderRow = (label: string, value: string) => (
        <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
        </View>
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
                        <Text style={styles.headerTitle}>{portName || 'Ethernet Port Details'}</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView style={styles.content}>
                        <View style={styles.card}>
                            {renderRow('IPv4 Address', '192.168.1.4')}
                            <View style={styles.divider} />
                            {renderRow('IPv4 Subnet Mask', '255.255.255.0')}
                            <View style={styles.divider} />
                            {renderRow('IPv4 Gateway', '192.168.1.1')}
                            <View style={styles.divider} />
                            {renderRow('IPv4 DHCP Status', 'Succeed')}
                            <View style={styles.divider} />
                            {renderRow('MAC Address', '28:2C:02:62:71:F6')}
                            <View style={styles.divider} />
                            {renderRow('Preferred DNS', '8.8.8.8')}
                            <View style={styles.divider} />
                            {renderRow('Alternate DNS', '')}
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
        fontSize: 18,
        fontWeight: 'bold',
        color: '#852d2dff',
    },
    backBtn: {
        padding: 5,
    },
    content: {
        flex: 1,
        marginTop: 5,
    },
    card: {
        backgroundColor: '#FFF',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 16,
    },
    label: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    value: {
        fontSize: 16,
        color: '#666',
        textAlign: 'right',
        flex: 1.5,
    },
    divider: {
        height: 1,
        backgroundColor: '#F7F7F7',
        marginLeft: 15,
    }
});

export default EthernetPortDetails;
