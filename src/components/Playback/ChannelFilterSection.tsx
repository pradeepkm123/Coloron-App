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
    channelCount,
    currentChannel,
    channelNames,
    onSelectChannel,
    filterType,
    onSetFilterType,
    onOpenFilterModal,
    recordingYellow
}) => {
    return (
        <View style={styles.filterSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.sectionTitle}>Channel Selection</Text>
                <TouchableOpacity><Icon name="camera-outline" size={20} color="#A83232" /></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {[...Array(channelCount)].map((_, i) => (
                    <TouchableOpacity
                        key={i}
                        style={[styles.filterChip, currentChannel === i && styles.activeFilterChip, { flexDirection: 'row', alignItems: 'center' }]}
                        onPress={() => onSelectChannel(i)}
                    >
                        <View style={[styles.channelDot, { backgroundColor: currentChannel === i ? '#FFF' : recordingYellow }]} />
                        <Text style={[styles.filterText, currentChannel === i && { color: '#FFF' }]}>
                            {channelNames[i] ? channelNames[i] : `CH ${i + 1}`}
                        </Text>
                    </TouchableOpacity>
                ))}
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
