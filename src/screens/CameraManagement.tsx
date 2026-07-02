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

type CameraManagementRouteProp = RouteProp<RootStackParamList, 'CameraManagement'>;

const CameraManagement: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<CameraManagementRouteProp>();
    const { deviceId, deviceName } = route.params;

    const renderMenuItem = (label: string, icon: string, description: string, onPress: () => void) => (
        <TouchableOpacity style={styles.menuCard} onPress={onPress}>
            <View style={styles.iconContainer}>
                <Icon name={icon} size={30} color="#822020" />
            </View>
            <View style={styles.cardInfo}>
                <Text style={styles.cardLabel}>{label}</Text>
                <Text style={styles.cardDescription}>{description}</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#CED4DA" />
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
                        <Text style={styles.headerTitle}>Camera</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={styles.cardContainer}>
                        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
                            <Text style={styles.sectionTitle}>Manage Camera</Text>

                            {renderMenuItem(
                                'Add Camera',
                                'camera-plus-outline',
                                'Add new cameras to your recorder either automatically or manually.',
                                () => navigation.navigate('AddCameraOptions', { deviceId, deviceName })
                            )}

                            {renderMenuItem(
                                'Edit Camera',
                                'square-edit-outline',
                                'Modify settings, names, or connection details for existing cameras.',
                                () => navigation.navigate('EditCamera', { deviceId, deviceName })
                            )}
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </GradientBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F4F7',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'transparent',
        paddingHorizontal: 15,
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
        flex: 1,
    },
    cardContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: 10,
        paddingTop: 10,
    },
    sectionHeader: {
        backgroundColor: '#E9EEF2',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#D1D9E0',
    },
    sectionTitle: {
        fontSize: 14,
        color: '#6C757D',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginHorizontal: 20,
        marginVertical: 15,
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
        backgroundColor: '#E0E0E0',
    },
    menuCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 20,
        backgroundColor: '#FFF',
        marginHorizontal: 15,
        marginBottom: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    iconContainer: {
        width: 54,
        height: 54,
        borderRadius: 12,
        backgroundColor: '#FFF5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    cardInfo: {
        flex: 1,
    },
    cardLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 13,
        color: '#868E96',
        lineHeight: 18,
    },
});

export default CameraManagement;
