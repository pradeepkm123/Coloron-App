import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';

type RecordMainRouteProp = RouteProp<RootStackParamList, 'RecordMain'>;

const RecordMain: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<RecordMainRouteProp>();
    const { deviceId, deviceName } = route.params || {};


    const renderSectionHeader = (title: string) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderTitle}>{title}</Text>
        </View>
    );

    const renderMenuItem = (label: string, onPress: () => void) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <Text style={styles.menuLabel}>{label}</Text>
            <Icon name="chevron-right" size={20} color="#ccc" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <GradientBackground>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="chevron-left" size={32} color="#852d2dff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Record</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView style={styles.content}>
                        {renderSectionHeader('Mode Settings')}
                        {renderMenuItem('Mode Settings', () => navigation.navigate('ModeSettings', { deviceId, deviceName }))}
                        <View style={styles.divider} />
                        {renderMenuItem('Advanced', () => navigation.navigate('AdvancedRecordSettings', { deviceId, deviceName }))}

                        {renderSectionHeader('Encode Parameters')}
                        {renderMenuItem('Event Recording Settings', () => navigation.navigate('EventRecordingSettings', { deviceId, deviceName }))}
                        <View style={styles.divider} />
                        {renderMenuItem('Schedule Recording Settings', () => navigation.navigate('ScheduleRecordingSettings', { deviceId, deviceName }))}

                        {renderSectionHeader('Record Status')}
                        {renderMenuItem('View Record Status', () => navigation.navigate('ViewRecordStatus', { deviceId, deviceName }))}
                    </ScrollView>
                </SafeAreaView>
            </GradientBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f2e9e9ff',
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
        backgroundColor: 'transparent',
    },
    headerTitle: {
        color: '#852d2dff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 5,
    },
    content: {
        flex: 1,
    },
    sectionHeader: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#f2e9e9ff',
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
        paddingVertical: 15,
        paddingHorizontal: 15,
        backgroundColor: '#FFF',
    },
    menuLabel: {
        fontSize: 16,
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#EEE',
    },
});

export default RecordMain;
