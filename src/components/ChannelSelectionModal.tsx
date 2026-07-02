import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ChannelSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    channels: Array<{ id: number; name: string; selected: boolean }>;
    onSave: (selectedIds: number[]) => void;
}

const ChannelSelectionModal: React.FC<ChannelSelectionModalProps> = ({
    visible,
    onClose,
    title,
    channels,
    onSave,
}) => {
    const [tempChannels, setTempChannels] = useState(channels);

    React.useEffect(() => {
        setTempChannels(channels);
    }, [channels, visible]);

    const toggleChannel = (id: number) => {
        setTempChannels(prev =>
            prev.map(ch => (ch.id === id ? { ...ch, selected: !ch.selected } : ch))
        );
    };

    const toggleAll = (select: boolean) => {
        setTempChannels(prev => prev.map(ch => ({ ...ch, selected: select })));
    };

    const handleSave = () => {
        const selectedIds = tempChannels.filter(ch => ch.selected).map(ch => ch.id);
        onSave(selectedIds);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <SafeAreaView style={styles.sheet}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.title}>{title}</Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={styles.saveBtn}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.bulkRow}>
                        <TouchableOpacity style={styles.bulkBtn} onPress={() => toggleAll(true)}>
                            <Text style={styles.bulkText}>Select All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.bulkBtn} onPress={() => toggleAll(false)}>
                            <Text style={styles.bulkText}>Clear All</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={tempChannels}
                        keyExtractor={(item, index) => `${item.id}-${index}`}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.row}
                                onPress={() => toggleChannel(item.id)}
                            >
                                <Text style={styles.channelName}>{item.name}</Text>
                                <Icon
                                    name={item.selected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                                    size={24}
                                    color={item.selected ? '#A83232' : '#CCC'}
                                />
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.list}
                    />
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    title: { fontSize: 18, fontWeight: '700', color: '#333' },
    saveBtn: { fontSize: 16, fontWeight: '700', color: '#A83232' },
    bulkRow: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#F9F9F9',
        justifyContent: 'space-around',
    },
    bulkBtn: { padding: 8 },
    bulkText: { color: '#666', fontWeight: '600' },
    list: { paddingBottom: 20 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    channelName: { fontSize: 16, color: '#444' },
});

export default ChannelSelectionModal;
