import React, { useState } from 'react';
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

type SMARTInfoRouteProp = RouteProp<RootStackParamList, 'SMARTInfo'>;

const SMARTInfo: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<SMARTInfoRouteProp>();
    const { deviceId, deviceName } = route.params;

    const [selectedDisk, setSelectedDisk] = useState('Disk1');

    const renderInfoRow = (label: string, value: string, isNav?: boolean, onPress?: () => void) => (
        <TouchableOpacity
            style={styles.infoRow}
            disabled={!isNav}
            onPress={onPress}
        >
            <Text style={styles.infoLabel}>{label}</Text>
            <View style={styles.infoRight}>
                <Text style={styles.infoValue}>{value}</Text>
                {isNav && <Icon name="chevron-right" size={20} color="#999" />}
            </View>
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
                        <Text style={styles.headerTitle}>S.M.A.R.T. Information</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    <ScrollView style={styles.content}>
                        <View style={styles.diskSelector}>
                            <Text style={styles.selectorLabel}>Disk</Text>
                            <TouchableOpacity style={styles.dropdown}>
                                <Text style={styles.dropdownText}>{selectedDisk}</Text>
                                <Icon name="menu-down" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.infoBox}>
                            {renderInfoRow('Disk Serial No.', '58GBK0CYFB3G')}
                            {renderInfoRow('Disk Model', 'TOSHIBA HDWT140')}
                            {renderInfoRow('Temperature', '36')}
                            {renderInfoRow('Power-on Time (day)', '2511')}
                            {renderInfoRow('S.M.A.R.T. Status', 'Normal')}
                            {renderInfoRow('S.M.A.R.T. Information', '', true, () =>
                                navigation.navigate('SMARTDetail', { deviceId, deviceName, diskName: selectedDisk })
                            )}
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
    },
    diskSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    selectorLabel: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#CCC',
        borderRadius: 4,
        paddingHorizontal: 10,
        height: 36,
        minWidth: 120,
        justifyContent: 'space-between',
    },
    dropdownText: {
        fontSize: 15,
        color: '#333',
    },
    infoBox: {
        backgroundColor: '#FFF',
        marginTop: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F8F8F8',
    },
    infoLabel: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    infoRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoValue: {
        fontSize: 15,
        color: '#666',
        textAlign: 'right',
    }
});

export default SMARTInfo;
