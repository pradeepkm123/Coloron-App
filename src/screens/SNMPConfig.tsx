import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    TextInput,
    Switch,
    ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';

type SNMPConfigRouteProp = RouteProp<RootStackParamList, 'SNMPConfig'>;

const SNMPConfig: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<SNMPConfigRouteProp>();

    const [enableSNMPv1, setEnableSNMPv1] = useState(false);
    const [enableSNMPv2, setEnableSNMPv2] = useState(false);
    const [snmpPort, setSnmpPort] = useState('161');
    const [readCommunity, setReadCommunity] = useState('public');
    const [writeCommunity, setWriteCommunity] = useState('private');
    const [trapAddress, setTrapAddress] = useState('0.0.0.0');
    const [trapPort, setTrapPort] = useState('162');

    const handleSave = () => {
        // Implement save logic
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Icon name="chevron-left" size={32} color="#852d2dff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>SNMP</Text>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Icon name="content-save-outline" size={28} color="#852d2dff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Basic Settings</Text>
                            </View>

                            <View style={styles.card}>
                                <View style={styles.row}>
                                    <Text style={styles.rowLabel}>Enable SNMPv1</Text>
                                    <Switch
                                        value={enableSNMPv1}
                                        onValueChange={setEnableSNMPv1}
                                        trackColor={{ false: "#DDD", true: "#852d2dff" }}
                                        thumbColor={enableSNMPv1 ? "#FFF" : "#F4F3F4"}
                                    />
                                </View>

                                <View style={styles.row}>
                                    <Text style={styles.rowLabel}>Enable SNMPv2</Text>
                                    <Switch
                                        value={enableSNMPv2}
                                        onValueChange={setEnableSNMPv2}
                                        trackColor={{ false: "#DDD", true: "#852d2dff" }}
                                        thumbColor={enableSNMPv2 ? "#FFF" : "#F4F3F4"}
                                    />
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>SNMP Port</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={snmpPort}
                                        onChangeText={setSnmpPort}
                                        placeholder="161"
                                        placeholderTextColor="#999"
                                        keyboardType="numeric"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Read Community</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={readCommunity}
                                        onChangeText={setReadCommunity}
                                        placeholder="public"
                                        placeholderTextColor="#999"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Write Community</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={writeCommunity}
                                        onChangeText={setWriteCommunity}
                                        placeholder="private"
                                        placeholderTextColor="#999"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Trap Address</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={trapAddress}
                                        onChangeText={setTrapAddress}
                                        placeholder="0.0.0.0"
                                        placeholderTextColor="#999"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Trap Port</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={trapPort}
                                        onChangeText={setTrapPort}
                                        placeholder="162"
                                        placeholderTextColor="#999"
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    <TouchableOpacity style={styles.applyBtn} onPress={handleSave}>
                        <Text style={styles.applyText}>Apply</Text>
                    </TouchableOpacity>
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
    saveBtn: {
        padding: 5,
    },
    content: {
        flex: 1,
    },
    section: {
        marginTop: 10,
    },
    sectionHeader: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#fde8e8ff',
    },
    sectionTitle: {
        fontSize: 14,
        color: '#852d2dff',
        fontWeight: 'bold',
    },
    card: {
        backgroundColor: '#FFF',
        padding: 15,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    rowLabel: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    inputGroup: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 12,
        color: '#999',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        height: 44,
        borderWidth: 1,
        borderColor: '#EEE',
        borderRadius: 8,
        paddingHorizontal: 15,
        color: '#333',
        fontSize: 15,
        backgroundColor: '#F9F9F9',
    },
    divider: {
        height: 1,
        backgroundColor: '#EEE',
        marginVertical: 20,
    },
    applyBtn: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        backgroundColor: '#912727ff',
        paddingHorizontal: 40,
        paddingVertical: 12,
        borderRadius: 8,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    applyText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});

export default SNMPConfig;
