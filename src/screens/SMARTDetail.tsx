import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../Component/GradientBackground';

type SMARTDetailRouteProp = RouteProp<RootStackParamList, 'SMARTDetail'>;

interface SMARTAttribute {
    id: string;
    hexId: string;
    attribution: string;
    value: string;
    worstValue: string;
    threshold: string;
    rawValue: string;
    status: string;
}

const SMARTDetail: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<SMARTDetailRouteProp>();
    const { diskName } = route.params;

    const attributes: SMARTAttribute[] = [
        {
            id: '1',
            hexId: '0x01',
            attribution: 'Read Error Rate',
            value: '100',
            worstValue: '100',
            threshold: '50',
            rawValue: '0',
            status: 'Normal'
        },
        {
            id: '2',
            hexId: '0x02',
            attribution: 'Throughput Performa...',
            value: '100',
            worstValue: '100',
            threshold: '50',
            rawValue: '0',
            status: 'Normal'
        },
        {
            id: '3',
            hexId: '0x03',
            attribution: 'Spin-Up Time',
            value: '100',
            worstValue: '100',
            threshold: '1',
            rawValue: '5326',
            status: 'Normal'
        }
    ];

    const renderAttributeItem = ({ item }: { item: SMARTAttribute }) => (
        <View style={styles.attrCard}>
            <View style={styles.attrIndex}>
                <Text style={styles.indexText}>{item.id}</Text>
            </View>
            <View style={styles.attrDetails}>
                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.hexId}</Text>
                        <Text style={styles.lab}>ID</Text>
                    </View>
                    <View style={styles.colLarge}>
                        <Text style={styles.val}>{item.attribution}</Text>
                        <Text style={styles.lab}>Attribution</Text>
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.value}</Text>
                        <Text style={styles.lab}>Value</Text>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.worstValue}</Text>
                        <Text style={styles.lab}>Worst Value</Text>
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.threshold}</Text>
                        <Text style={styles.lab}>Threshold</Text>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.val}>{item.rawValue}</Text>
                        <Text style={styles.lab}>Raw Value</Text>
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.colFull}>
                        <Text style={styles.val}>{item.status}</Text>
                        <Text style={styles.lab}>Status</Text>
                    </View>
                </View>
            </View>
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
                        <Text style={styles.headerTitle}>{diskName}</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    <FlatList
                        data={attributes}
                        renderItem={renderAttributeItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                    />
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
    listContent: {
        paddingVertical: 10,
    },
    attrCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        marginBottom: 10,
        paddingVertical: 15,
        paddingHorizontal: 10,
        marginHorizontal: 12,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    attrIndex: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#F0F0F0',
    },
    indexText: {
        fontSize: 32,
        color: '#852d2dff',
        fontWeight: 'bold',
        opacity: 0.2,
    },
    attrDetails: {
        flex: 1,
        paddingLeft: 15,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    col: {
        flex: 1,
    },
    colLarge: {
        flex: 2,
    },
    colFull: {
        flex: 1,
    },
    val: {
        fontSize: 15,
        color: '#333',
        fontWeight: '600',
    },
    lab: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    }
});

export default SMARTDetail;
