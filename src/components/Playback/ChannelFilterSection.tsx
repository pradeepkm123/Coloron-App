import React from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ChannelFilterSectionProps {
    channels?: any[];
    channelCount: number;
    currentChannel: number;
    channelNames: { [key: number]: string };
    onSelectChannel: (channelId: number) => void;
    filterType: string;
    onSetFilterType: (type: string) => void;
    onOpenFilterModal: () => void;
    recordingYellow: string;
}

const ChannelFilterSection: React.FC<ChannelFilterSectionProps> = ({
    channels,
    channelCount,
    currentChannel,
    channelNames,
    onSelectChannel,
    filterType,
    onSetFilterType,
    onOpenFilterModal,
    recordingYellow
}) => {
    // Render configured channels if available, otherwise generate sequential ones
    const listToRender = channels && channels.length > 0
        ? channels.filter((ch: any) => ch.isConfigured !== false)
        : [...Array(channelCount)].map((_, i) => ({ id: i, channelNo: i + 1, name: channelNames[i] || `CH ${i + 1}` }));

    return (
        <View style={styles.filterSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.sectionTitle}>Channel Selection</Text>
                <TouchableOpacity><Icon name="camera-outline" size={20} color="#A83232" /></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {listToRender.map((ch: any) => {
                    const isSelected = currentChannel === ch.id;
                    const chName = ch.name || ch.channelName || `CH ${ch.channelNo}`;
                    return (
                        <TouchableOpacity
                            key={ch.id}
                            style={[styles.filterChip, isSelected && styles.activeFilterChip, { flexDirection: 'row', alignItems: 'center' }]}
                            onPress={() => onSelectChannel(ch.id)}
                        >
                            <View style={[styles.channelDot, { backgroundColor: isSelected ? '#FFF' : recordingYellow }]} />
                            <Text style={[styles.filterText, isSelected && { color: '#FFF' }]}>
                                {chName}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    filterSection: { paddingHorizontal: 20, marginTop: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#272E5A' },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#EEE', marginRight: 10, backgroundColor: '#FFF' },
    activeFilterChip: { backgroundColor: '#A83232', borderColor: '#A83232' },
    channelDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    filterText: { fontSize: 13, color: '#444', fontWeight: '600' },
    filterChipCustom: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginRight: 10,
        backgroundColor: '#FFF',
        flexDirection: 'row',
        alignItems: 'center'
    },
    filterTextCustom: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
});

export default ChannelFilterSection;
