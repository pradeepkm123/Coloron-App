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

type StorageGroupConfigRouteProp = RouteProp<RootStackParamList, 'StorageGroupConfig'>;

const StorageGroupConfig: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<StorageGroupConfigRouteProp>();
    const { groupName } = route.params;

    const disks = ['Disk1', 'Disk2'];
    const cameras = [
        'DATA ENTRY', 'RECEPTION', 'IPCamera', 'FirstFloorBay 1', 'Reception1',
        'MainEntrance', 'Back Entrance', 'IPCamera', 'SECURA', 'IPCamera',
        'Face', 'Firstfloor Ent'
    ];

    const renderHeader = (title: string, onAdd: () => void) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <TouchableOpacity onPress={onAdd} style={styles.addBtn}>
                <Icon name="plus" size={20} color="#FFF" />
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
                        <Text style={styles.headerTitle}>{groupName}</Text>
                        <TouchableOpacity style={styles.saveBtn}>
                            <Icon name="content-save-outline" size={26} color="#852d2dff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        <View style={styles.sectionBox}>
                            {renderHeader('Disk(Capacity:7.2TB)', () => { })}
                            <View style={styles.itemList}>
                                {disks.map((disk, index) => (
                                    <View key={index} style={[styles.listItem, index === disks.length - 1 && { borderBottomWidth: 0 }]}>
                                        <View style={styles.itemLeft}>
                                            <Icon name="harddisk" size={20} color="#852d2dff" style={{ marginRight: 12 }} />
                                            <Text style={styles.itemText}>{disk}</Text>
                                        </View>
                                        <Icon name="dots-vertical" size={20} color="#CCC" />
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={styles.sectionBox}>
                            {renderHeader('Camera', () => { })}
                            <View style={styles.itemList}>
                                {cameras.map((cam, index) => (
                                    <View key={index} style={[styles.listItem, index === cameras.length - 1 && { borderBottomWidth: 0 }]}>
                                        <View style={styles.itemLeft}>
                                            <Icon name="cctv" size={20} color="#852d2dff" style={{ marginRight: 12 }} />
                                            <Text style={styles.itemText}>{cam}</Text>
                                        </View>
                                        <Icon name="dots-vertical" size={20} color="#CCC" />
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={{ height: 30 }} />
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
        paddingHorizontal: 15,
    },
    sectionBox: {
        backgroundColor: '#FFF',
        borderRadius: 15,
        marginTop: 15,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: '#FCFCFC',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    sectionTitle: {
        fontSize: 16,
        color: '#333',
        fontWeight: 'bold',
    },
    addBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#852d2dff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemList: {
        paddingHorizontal: 5,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F8F8F8',
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemText: {
        fontSize: 15,
        color: '#444',
        fontWeight: '500',
    }
});

export default StorageGroupConfig;
