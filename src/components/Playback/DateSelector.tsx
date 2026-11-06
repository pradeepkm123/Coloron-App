import React, { useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { isSameDay } from '../../utils/liveViewUtils';

interface DateSelectorProps {
    currentDate: Date;
    dateRange: Date[];
    onSelectDate: (date: Date) => void;
    onOpenCalendar: () => void;
    onRefresh: () => void;
    formatShortTime: (d: Date) => string;
    getRelativeDateLabel: (date: Date) => string;
    recordedDays?: string[]; // ["2026-03-01", "2026-03-05"]
    theme?: { recordingYellow: string };
}

const ITEM_WIDTH = 60; // 45 width + 15 marginRight

const DateSelector: React.FC<DateSelectorProps> = ({
    currentDate,
    dateRange,
    onSelectDate,
    onOpenCalendar,
    onRefresh,
    formatShortTime,
    getRelativeDateLabel,
    recordedDays = [],
    theme
}) => {
    const flatListRef = useRef<FlatList>(null);

    // Auto-center selected date when selection or date range updates
    useEffect(() => {
        if (!dateRange || dateRange.length === 0) return;
        const selectedIndex = dateRange.findIndex(d => isSameDay(d, currentDate));
        if (selectedIndex >= 0 && flatListRef.current) {
            flatListRef.current.scrollToIndex({
                index: selectedIndex,
                animated: true,
                viewPosition: 0.5,
            });
        }
    }, [currentDate.toDateString(), dateRange.length]);

    const renderDateItem = (date: Date) => {
        const isSelected = isSameDay(date, currentDate);
        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = date.getDate();
        
        // Check if this date (as YYYY-MM-DD string) exists in recordedDays
        const isoStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const hasFootage = recordedDays.includes(isoStr);

        return (
            <TouchableOpacity
                style={[styles.datePickerItem, isSelected && styles.selectedDatePickerItem]}
                onPress={() => onSelectDate(date)}
            >
                <Text style={[styles.datePickerDay, isSelected && { color: '#FFF' }]}>{dayLabel}</Text>
                <Text style={[styles.datePickerNum, isSelected && { color: '#FFF' }]}>{dayNum}</Text>
                {isSelected ? (
                    <View style={styles.dateDot} />
                ) : (
                    hasFootage && <View style={[styles.dateDot, { backgroundColor: theme?.recordingYellow || '#FEB442' }]} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.dateSelectorContainer}>
            <View style={styles.dateTextRow}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.primaryDateText}>
                                {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                <Text style={{ color: '#999', fontSize: 13, fontWeight: '400' }}>  {formatShortTime(currentDate)}</Text>
                            </Text>
                            <TouchableOpacity onPress={onOpenCalendar}><Icon name="calendar-month" size={20} color="#666" style={{ marginLeft: 8 }} /></TouchableOpacity>
                        </View>
                        <Text style={styles.todayText}>{getRelativeDateLabel(currentDate)}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.refreshBtn}
                        onPress={onRefresh}
                    >
                        <View style={styles.refreshIconCircle}>
                            <Icon name="refresh" size={24} color="#A83232" />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                horizontal
                data={dateRange}
                renderItem={({ item }) => renderDateItem(item)}
                keyExtractor={(item) => `${item.getFullYear()}-${item.getMonth() + 1}-${item.getDate()}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                getItemLayout={(_, index) => ({
                    length: ITEM_WIDTH,
                    offset: ITEM_WIDTH * index,
                    index,
                })}
                onScrollToIndexFailed={(info) => {
                    setTimeout(() => {
                        flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                    }, 100);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    dateSelectorContainer: { paddingBottom: 16 },
    dateTextRow: { paddingHorizontal: 20, marginBottom: 15 },
    refreshBtn: { padding: 5 },
    refreshIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF7F7',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 0.5,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
    },
    primaryDateText: { fontSize: 16, color: '#333', fontWeight: '500' },
    todayText: { fontSize: 22, fontWeight: '700', color: '#333', marginTop: 4 },
    datePickerItem: { width: 45, height: 60, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    selectedDatePickerItem: { backgroundColor: '#A83232', borderRadius: 12 },
    datePickerDay: { fontSize: 12, color: '#999' },
    datePickerNum: { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 4 },
    dateDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF', marginTop: 4 },
});

export default DateSelector;
