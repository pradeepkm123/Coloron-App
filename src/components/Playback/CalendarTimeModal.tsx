import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Dimensions,
    Platform,
    FlatList
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

interface CalendarTimeModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (timestamp: string) => void;
    recordedDays: string[]; // ['2026-03-25', '2026-03-26']
    initialDate?: Date;
    onMonthChange?: (date: Date) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CalendarTimeModal: React.FC<CalendarTimeModalProps> = ({ 
    visible, 
    onClose, 
    onSelect, 
    recordedDays,
    initialDate = new Date(),
    onMonthChange
}) => {
    const [selectedDate, setSelectedDate] = useState(initialDate.toISOString().split('T')[0]);
    const [hour, setHour] = useState(initialDate.getHours() % 12 || 12);
    const [minute, setMinute] = useState(initialDate.getMinutes());
    const [ampm, setAmpm] = useState(initialDate.getHours() >= 12 ? 'PM' : 'AM');

    const handleOk = () => {
        // Convert to 24-hour format
        let h24 = ampm === 'PM' ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
        const timeStr = `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
        const fullTimestamp = `${selectedDate} ${timeStr}`;
        onSelect(fullTimestamp);
        onClose();
    };

    const hourListRef = useRef<FlatList>(null);
    const minuteListRef = useRef<FlatList>(null);
    const ampmListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (visible) {
            setTimeout(() => {
                hourListRef.current?.scrollToIndex({ index: hour - 1, animated: false });
                minuteListRef.current?.scrollToIndex({ index: minute, animated: false });
                ampmListRef.current?.scrollToIndex({ index: ampm === 'AM' ? 0 : 1, animated: false });
            }, 100);
        }
    }, [visible]);

    const markedDates = {
        ...recordedDays.reduce((acc: any, date) => {
            acc[date] = { marked: true, dotColor: '#4AC23B' };
            return acc;
        }, {}),
        [selectedDate]: { 
            selected: true, 
            selectedColor: '#A83232',
            marked: recordedDays.includes(selectedDate),
            dotColor: '#4AC23B'
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Select Date & Time</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <Calendar
                        current={selectedDate}
                        onDayPress={(day: any) => setSelectedDate(day.dateString)}
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
                        }}
                    />

                    <View style={styles.divider} />

                    {/* Simple Wheel-style Time Component */}
                    <View style={styles.timeSection}>
                        <View style={styles.pickerContainer}>
                            {/* Hour Column */}
                            <View style={styles.pickerCol}>
                                <FlatList
                                    ref={hourListRef}
                                    data={[null, null, ...Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')), null, null]}
                                    keyExtractor={(_, i) => `h-${i}`}
                                    showsVerticalScrollIndicator={false}
                                    snapToInterval={40}
                                    decelerationRate="fast"
                                    getItemLayout={(_, index) => ({ length: 40, offset: 40 * index, index })}
                                    onMomentumScrollEnd={(e) => {
                                        const index = Math.round(e.nativeEvent.contentOffset.y / 40);
                                        setHour(index + 1);
                                    }}
                                    renderItem={({ item }) => (
                                        <View style={styles.pickerItem}>
                                            <Text style={[styles.pickerText, item === String(hour).padStart(2, '0') && styles.pickerTextActive]}>{item}</Text>
                                        </View>
                                    )}
                                />
                            </View>

                            <Text style={styles.pickerSeparator}>:</Text>

                            {/* Minute Column */}
                            <View style={styles.pickerCol}>
                                <FlatList
                                    ref={minuteListRef}
                                    data={[null, null, ...Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')), null, null]}
                                    keyExtractor={(_, i) => `m-${i}`}
                                    showsVerticalScrollIndicator={false}
                                    snapToInterval={40}
                                    decelerationRate="fast"
                                    getItemLayout={(_, index) => ({ length: 40, offset: 40 * index, index })}
                                    onMomentumScrollEnd={(e) => {
                                        const index = Math.round(e.nativeEvent.contentOffset.y / 40);
                                        setMinute(index);
                                    }}
                                    renderItem={({ item }) => (
                                        <View style={styles.pickerItem}>
                                            <Text style={[styles.pickerText, item === String(minute).padStart(2, '0') && styles.pickerTextActive]}>{item}</Text>
                                        </View>
                                    )}
                                />
                            </View>

                            {/* AM/PM Column */}
                            <View style={styles.pickerCol}>
                                <FlatList
                                    ref={ampmListRef}
                                    data={[null, null, 'AM', 'PM', null, null]}
                                    keyExtractor={(_, i) => `ap-${i}`}
                                    showsVerticalScrollIndicator={false}
                                    snapToInterval={40}
                                    decelerationRate="fast"
                                    getItemLayout={(_, index) => ({ length: 40, offset: 40 * index, index })}
                                    onMomentumScrollEnd={(e) => {
                                        const index = Math.round(e.nativeEvent.contentOffset.y / 40);
                                        setAmpm(index === 0 ? 'AM' : 'PM');
                                    }}
                                    renderItem={({ item }) => (
                                        <View style={styles.pickerItem}>
                                            <Text style={[styles.pickerText, item === ampm && styles.pickerTextActive]}>{item}</Text>
                                        </View>
                                    )}
                                />
                            </View>

                            {/* Center Selection Lines */}
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
    header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#333' },
    divider: { height: 1, backgroundColor: '#EEE', marginVertical: 10 },
    timeSection: { paddingVertical: 20, alignItems: 'center', backgroundColor: '#F9F9F9' },
    pickerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 200, position: 'relative', width: '100%' },
    pickerCol: { width: 70, height: 200 },
    pickerItem: { height: 40, justifyContent: 'center', alignItems: 'center' },
    pickerText: { fontSize: 20, color: '#CCC', fontWeight: '500' },
    pickerTextActive: { fontSize: 28, color: '#333', fontWeight: '800' },
    pickerSeparator: { fontSize: 24, fontWeight: '800', color: '#333', marginHorizontal: 5 },
    selectionIndicator: { position: 'absolute', top: 80, left: '10%', right: '10%', height: 40, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EEE' },
    footer: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#EEE' },
    cancelBtn: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center' },
    cancelBtnText: { fontSize: 16, fontWeight: '700', color: '#999' },
    okBtn: { flex: 1, height: 50, borderRadius: 25, overflow: 'hidden' },
    gradientBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    okBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' }
});

export default CalendarTimeModal;
