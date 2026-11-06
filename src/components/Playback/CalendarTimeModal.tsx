import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Dimensions,
    FlatList,
    NativeSyntheticEvent,
    NativeScrollEvent
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

interface CalendarTimeModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (timestamp: string) => void;
    recordedDays: string[]; // ['2026-07-12', '2026-07-20']
    initialDate?: Date;
    onMonthChange?: (date: Date) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatLocalDateString = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const HOURS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const AMPM = ['AM', 'PM'];

const ITEM_HEIGHT = 40;

const CalendarTimeModal: React.FC<CalendarTimeModalProps> = ({ 
    visible, 
    onClose, 
    onSelect, 
    recordedDays = [],
    initialDate = new Date(),
    onMonthChange
}) => {
    const [selectedDate, setSelectedDate] = useState(() => formatLocalDateString(initialDate));
    const [hour, setHour] = useState(() => initialDate.getHours() % 12 || 12);
    const [minute, setMinute] = useState(() => initialDate.getMinutes());
    const [ampm, setAmpm] = useState<'AM' | 'PM'>(() => initialDate.getHours() >= 12 ? 'PM' : 'AM');

    const hourListRef = useRef<FlatList>(null);
    const minuteListRef = useRef<FlatList>(null);
    const ampmListRef = useRef<FlatList>(null);

    // Sync state and scroll positions whenever modal opens or initialDate changes
    useEffect(() => {
        if (visible) {
            const dateStr = formatLocalDateString(initialDate);
            setSelectedDate(dateStr);

            const h12 = initialDate.getHours() % 12 || 12;
            const min = initialDate.getMinutes();
            const ap = initialDate.getHours() >= 12 ? 'PM' : 'AM';

            setHour(h12);
            setMinute(min);
            setAmpm(ap);

            const timer = setTimeout(() => {
                try {
                    hourListRef.current?.scrollToIndex({ index: Math.max(0, h12 - 1), animated: false });
                    minuteListRef.current?.scrollToIndex({ index: Math.max(0, min), animated: false });
                    ampmListRef.current?.scrollToIndex({ index: ap === 'AM' ? 0 : 1, animated: false });
                } catch (e) {
                    console.warn('[CalendarTimeModal] Scroll to index error:', e);
                }
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [visible, initialDate]);

    const handleHourScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offset = e.nativeEvent.contentOffset.y;
        const index = Math.max(0, Math.min(11, Math.round(offset / ITEM_HEIGHT)));
        setHour(index + 1);
    };

    const handleMinuteScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offset = e.nativeEvent.contentOffset.y;
        const index = Math.max(0, Math.min(59, Math.round(offset / ITEM_HEIGHT)));
        setMinute(index);
    };

    const handleAmpmScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offset = e.nativeEvent.contentOffset.y;
        const index = Math.max(0, Math.min(1, Math.round(offset / ITEM_HEIGHT)));
        setAmpm(index === 0 ? 'AM' : 'PM');
    };

    const handleOk = () => {
        let h24 = ampm === 'PM' ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
        const timeStr = `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
        const fullTimestamp = `${selectedDate} ${timeStr}`;
        console.log(`[CalendarTimeModal] Selected Date & Time: ${fullTimestamp}`);
        onSelect(fullTimestamp);
        onClose();
    };

    const markedDates = useMemo(() => {
        const marks: any = {};
        recordedDays.forEach((d) => {
            marks[d] = { marked: true, dotColor: '#4AC23B' };
        });
        marks[selectedDate] = {
            selected: true,
            selectedColor: '#A83232',
            marked: recordedDays.includes(selectedDate),
            dotColor: '#4AC23B'
        };
        return marks;
    }, [recordedDays, selectedDate]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Select Date & Time</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Icon name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <Calendar
                        current={selectedDate}
                        onDayPress={(day: any) => {
                            console.log(`[CalendarTimeModal] Day pressed: ${day.dateString}`);
                            setSelectedDate(day.dateString);
                        }}
                        onMonthChange={(month: any) => {
                            if (onMonthChange) {
                                onMonthChange(new Date(month.year, month.month - 1, 1));
                            }
                        }}
                        markedDates={markedDates}
                        theme={{
                            todayTextColor: '#A83232',
                            arrowColor: '#A83232',
                            selectedDayBackgroundColor: '#A83232',
                            textDayFontWeight: '600',
                            textMonthFontWeight: '800',
                            textDayHeaderFontWeight: '700',
                        }}
                    />

                    <View style={styles.divider} />

                    {/* Wheel-style Time Component */}
                    <View style={styles.timeSection}>
                        <View style={styles.pickerContainer}>
                            {/* Hour Column */}
                            <View style={styles.pickerCol}>
                                <FlatList
                                    ref={hourListRef}
                                    data={HOURS}
                                    keyExtractor={(item) => `h-${item}`}
                                    showsVerticalScrollIndicator={false}
                                    snapToInterval={ITEM_HEIGHT}
                                    decelerationRate="fast"
                                    contentContainerStyle={{ paddingVertical: 80 }}
                                    getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                                    onMomentumScrollEnd={handleHourScrollEnd}
                                    onScrollEndDrag={handleHourScrollEnd}
                                    renderItem={({ item }) => (
                                        <View style={styles.pickerItem}>
                                            <Text style={[styles.pickerText, item === String(hour).padStart(2, '0') && styles.pickerTextActive]}>
                                                {item}
                                            </Text>
                                        </View>
                                    )}
                                />
                            </View>

                            <Text style={styles.pickerSeparator}>:</Text>

                            {/* Minute Column */}
                            <View style={styles.pickerCol}>
                                <FlatList
                                    ref={minuteListRef}
                                    data={MINUTES}
                                    keyExtractor={(item) => `m-${item}`}
                                    showsVerticalScrollIndicator={false}
                                    snapToInterval={ITEM_HEIGHT}
                                    decelerationRate="fast"
                                    contentContainerStyle={{ paddingVertical: 80 }}
                                    getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                                    onMomentumScrollEnd={handleMinuteScrollEnd}
                                    onScrollEndDrag={handleMinuteScrollEnd}
                                    renderItem={({ item }) => (
                                        <View style={styles.pickerItem}>
                                            <Text style={[styles.pickerText, item === String(minute).padStart(2, '0') && styles.pickerTextActive]}>
                                                {item}
                                            </Text>
                                        </View>
                                    )}
                                />
                            </View>

                            {/* AM/PM Column */}
                            <View style={styles.pickerCol}>
                                <FlatList
                                    ref={ampmListRef}
                                    data={AMPM}
                                    keyExtractor={(item) => `ap-${item}`}
                                    showsVerticalScrollIndicator={false}
                                    snapToInterval={ITEM_HEIGHT}
                                    decelerationRate="fast"
                                    contentContainerStyle={{ paddingVertical: 80 }}
                                    getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                                    onMomentumScrollEnd={handleAmpmScrollEnd}
                                    onScrollEndDrag={handleAmpmScrollEnd}
                                    renderItem={({ item }) => (
                                        <View style={styles.pickerItem}>
                                            <Text style={[styles.pickerText, item === ampm && styles.pickerTextActive]}>
                                                {item}
                                            </Text>
                                        </View>
                                    )}
                                />
                            </View>

                            {/* Center Selection Indicator */}
                            <View style={styles.selectionIndicator} pointerEvents="none" />
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.okBtn} onPress={handleOk}>
                            <LinearGradient 
                                colors={['#A83232', '#8B1A1A']} 
                                style={styles.gradientBtn}
                            >
                                <Text style={styles.okBtnText}>OK</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { width: SCREEN_WIDTH * 0.9, backgroundColor: '#FFF', borderRadius: 24, overflow: 'hidden' },
    header: { padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#333' },
    closeBtn: { padding: 4 },
    divider: { height: 1, backgroundColor: '#EEE', marginVertical: 4 },
    timeSection: { paddingVertical: 10, alignItems: 'center', backgroundColor: '#F9F9F9' },
    pickerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 200, position: 'relative', width: '100%' },
    pickerCol: { width: 70, height: 200 },
    pickerItem: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
    pickerText: { fontSize: 18, color: '#BBB', fontWeight: '500' },
    pickerTextActive: { fontSize: 26, color: '#111', fontWeight: '800' },
    pickerSeparator: { fontSize: 24, fontWeight: '800', color: '#333', marginHorizontal: 6 },
    selectionIndicator: { position: 'absolute', top: 80, left: '10%', right: '10%', height: ITEM_HEIGHT, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#DDD' },
    footer: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#EEE', gap: 12 },
    cancelBtn: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 24, backgroundColor: '#F2F2F2' },
    cancelBtnText: { fontSize: 16, fontWeight: '700', color: '#666' },
    okBtn: { flex: 1, height: 48, borderRadius: 24, overflow: 'hidden' },
    gradientBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    okBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' }
});

export default CalendarTimeModal;
