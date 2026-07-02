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

type EmailConfigRouteProp = RouteProp<RootStackParamList, 'EmailConfig'>;

const EmailConfig: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<EmailConfigRouteProp>();

    const [senderName, setSenderName] = useState('');
    const [emailAddress, setEmailAddress] = useState('');
    const [smtpServer, setSmtpServer] = useState('');
    const [smtpPort, setSmtpPort] = useState('465');
    const [security, setSecurity] = useState('SSL');
    const [attachingImage, setAttachingImage] = useState('No');
    const [anonymousLogin, setAnonymousLogin] = useState(false);
    const [username, setUsername] = useState('Username');
    const [modifyPassword, setModifyPassword] = useState(false);
    const [password, setPassword] = useState('');

    const renderInput = (label: string, value: string, onChange: (val: string) => void, placeholder = '', editable = true) => (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
                style={[styles.input, !editable && styles.inputDisabled]}
                value={value}
                onChangeText={onChange}
                editable={editable}
                placeholder={placeholder}
                placeholderTextColor="#999"
            />
        </View>
    );

    const renderDropdown = (label: string, value: string) => (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TouchableOpacity style={styles.dropdown}>
                <Text style={styles.dropdownText}>{value}</Text>
                <Icon name="menu-down" size={24} color="#333" />
            </TouchableOpacity>
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
                        <Text style={styles.headerTitle}>E-mail</Text>
                        <TouchableOpacity style={styles.saveBtn}>
                            <Icon name="content-save-outline" size={28} color="#852d2dff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>E-mail Settings</Text>
                            </View>

                            <View style={styles.card}>
                                {renderInput('Sender Name', senderName, setSenderName)}
                                {renderInput('Email Address', emailAddress, setEmailAddress)}
                                {renderInput('SMTP Server', smtpServer, setSmtpServer)}

                                <View style={styles.row}>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        {renderInput('SMTP Port', smtpPort, setSmtpPort)}
                                    </View>
                                    <TouchableOpacity style={styles.defaultBtn}>
                                        <Text style={styles.defaultBtnText}>Default</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.divider} />

                                {renderDropdown('Security', security)}
                                {renderDropdown('Attaching Image', attachingImage)}

                                <View style={styles.switchRow}>
                                    <Text style={styles.rowLabel}>Anonymous Login</Text>
                                    <Switch
                                        value={anonymousLogin}
                                        onValueChange={setAnonymousLogin}
                                        trackColor={{ false: "#DDD", true: "#852d2dff" }}
                                        thumbColor={anonymousLogin ? "#FFF" : "#F4F3F4"}
                                    />
                                </View>

                                {renderDropdown('Username', username)}

                                <View style={styles.switchRow}>
                                    <Text style={styles.rowLabel}>Modify Password</Text>
                                    <Switch
                                        value={modifyPassword}
                                        onValueChange={setModifyPassword}
                                        trackColor={{ false: "#DDD", true: "#852d2dff" }}
                                        thumbColor={modifyPassword ? "#FFF" : "#F4F3F4"}
                                    />
                                </View>

                                {renderInput('Password', password, setPassword, '*************', modifyPassword)}
                            </View>
                        </View>

                        <View style={styles.footerActions}>
                            <TouchableOpacity style={styles.actionBtn}>
                                <Text style={styles.actionBtnText}>Edit Recipient</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn}>
                                <Text style={styles.actionBtnText}>Test</Text>
                            </TouchableOpacity>
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
        alignItems: 'flex-end',
    },
    switchRow: {
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
    inputDisabled: {
        backgroundColor: '#F5F5F5',
        color: '#BBB',
    },
    dropdown: {
        height: 44,
        borderWidth: 1,
        borderColor: '#EEE',
        borderRadius: 8,
        paddingHorizontal: 15,
        backgroundColor: '#F9F9F9',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownText: {
        fontSize: 15,
        color: '#333',
    },
    defaultBtn: {
        backgroundColor: '#852d2dff',
        paddingHorizontal: 15,
        height: 44,
        borderRadius: 8,
        justifyContent: 'center',
        marginBottom: 15,
    },
    defaultBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: '#EEE',
        marginVertical: 15,
    },
    footerActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 20,
        marginBottom: 20,
    },
    actionBtn: {
        backgroundColor: '#7d1a1aff',
        paddingHorizontal: 25,
        paddingVertical: 10,
        borderRadius: 8,
        minWidth: 140,
        alignItems: 'center',
    },
    actionBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
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
    },
    applyText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});

export default EmailConfig;
