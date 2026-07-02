import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    Modal,
    FlatList,
    Platform,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { isSameDay } from '../../utils/liveViewUtils';

interface CalendarModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectDate: (date: Date) => void;
    recordedDays: string[]; // ["2026-03-01", "2026-03-05"]
    initialDate: Date;
    isFullscreen?: boolean;
    theme: {
        primary: string;
        recordingYellow: string;
    };
    onMonthChange?: (date: Date) => void;
}

const PICKER_ITEM_HEIGHT = 45;
const HOURS_DATA = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const MINUTES_DATA = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const AMPM_DATA = ['AM', 'PM'];

const CalendarModal: React.FC<CalendarModalProps> = ({
    visible,
    onClose,
    onSelectDate,
    recordedDays,
    initialDate,
    isFullscreen,
    theme,
    onMonthChange
}) => {
    const [calendarMonth, setCalendarMonth] = useState(new Date(initialDate));
    const [calendarSelectedDate, setCalendarSelectedDate] = useState(new Date(initialDate));
    const [selectedTime, setSelectedTime] = useState({
        hour: initialDate.getHours() % 12 || 12,
        minute: initialDate.getMinutes()
    });
    const [isAm, setIsAm] = useState(initialDate.getHours() < 12);

    const hourScrollRef = useRef<FlatList>(null);
    const minScrollRef = useRef<FlatList>(null);
    const ampmScrollRef = useRef<FlatList>(null);

    const handleChangeMonth = (offset: number) => {
        const newMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
        setCalendarMonth(newMonth);
        onMonthChange?.(newMonth);
    };

    useEffect(() => {
        if (visible) {
            setCalendarSelectedDate(new Date(initialDate));
            setCalendarMonth(new Date(initialDate));
            const h = initialDate.getHours();
            setSelectedTime({
                hour: h % 12 || 12,
                minute: initialDate.getMinutes()
            });
            setIsAm(h < 12);

            // Scroll to initial time
            setTimeout(() => {
                const hourIdx = (h % 12 || 12) - 1;
                const minIdx = initialDate.getMinutes();
                const ampmIdx = h < 12 ? 0 : 1;

                hourScrollRef.current?.scrollToOffset({ offset: hourIdx * PICKER_ITEM_HEIGHT, animated: false });
                minScrollRef.current?.scrollToOffset({ offset: minIdx * PICKER_ITEM_HEIGHT, animated: false });
                ampmScrollRef.current?.scrollToOffset({ offset: ampmIdx * PICKER_ITEM_HEIGHT, animated: false });
            }, 100);
        }
    }, [visible, initialDate]);


    const handleOk = () => {
        const finalDate = new Date(calendarSelectedDate);
        let hour = selectedTime.hour % 12;
        if (!isAm) hour += 12;
        finalDate.setHours(hour, selectedTime.minute, 0);
        onSelectDate(finalDate);
    };

    const renderLandscape = () => (
        <View style={styles.landscapeOverlay}>
            <View style={styles.landscapeModal}>
                <View style={styles.landscapeHeader}>
                    <Text style={styles.landscapeTitle}>Select Date</Text>
                    <TouchableOpacity onPress={onClose} style={styles.landscapeCloseBtn}>
                        <Icon name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.landscapeContent}>
                    {/* Simplified for landscape if needed, but usually we just want the calendar */}
                    <View style={{ flex: 1, padding: 10 }}>
                        <View style={styles.calMonthRow}>
                            <Text style={styles.calMonthTextLarge}>
                                {calendarMonth.toLocaleString('default', { month: 'long' })} {calendarMonth.getFullYear()}
                            </Text>
                            <View style={{ flexDirection: 'row' }}>
                                <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                                    <Icon name="menu-up" size={28} color="#999" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                                    <Icon name="menu-down" size={28} color="#999" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.weekRow}>
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                                <Text key={d} style={styles.weekText}>{d}</Text>
                            ))}
                        </View>

                        <View style={styles.daysGrid}>
                            {(() => {
                                const days = [];
                                const year = calendarMonth.getFullYear();
                                const month = calendarMonth.getMonth();
                                const firstDayOfMonth = new Date(year, month, 1).getDay();
                                const daysInMonth = new Date(year, month + 1, 0).getDate();
                                const daysInPrevMonth = new Date(year, month, 0).getDate();

                                for (let i = firstDayOfMonth - 1; i >= 0; i--) {
                                    days.push(
                                        <View key={`prev-${i}`} style={styles.dayBox}>
                                            <Text style={[styles.dayText, { color: '#BDC3D1' }]}>{daysInPrevMonth - i}</Text>
                                        </View>
                                    );
                                }

                                for (let d = 1; d <= daysInMonth; d++) {
                                    const isoStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                    const hasFootage = recordedDays.includes(isoStr);
                                    const isSelected = isSameDay(new Date(year, month, d), calendarSelectedDate);
                                    days.push(
                                        <TouchableOpacity
                                            key={`curr-${d}`}
                                            style={styles.dayBox}
                                            onPress={() => setCalendarSelectedDate(new Date(year, month, d))}
                                        >
                                            <View style={[styles.dayCircle, isSelected && styles.selectedDayCircle]}>
                                                <Text style={[styles.dayText, isSelected && styles.selectedDayText, hasFootage && !isSelected && { color: theme.recordingYellow, fontWeight: 'bold' }]}>
                                                    {d}
                                                </Text>
                                            </View>
                                            {hasFootage && <View style={[styles.footageDot, isSelected && { backgroundColor: '#FFF' }]} />}
                                        </TouchableOpacity>
                                    );
                                }

                                for (let i = 1; days.length < 42; i++) {
                                    days.push(
                                        <View key={`next-${i}`} style={styles.dayBox}>
                                            <Text style={[styles.dayText, { color: '#BDC3D1' }]}>{i}</Text>
                                        </View>
                                    );
                                }
                                return days;
                            })()}
                        </View>
                    </View>

                    <View style={styles.landscapeRight}>
                        <View style={styles.landscapeActions}>
                            <TouchableOpacity style={{ marginBottom: 20 }} onPress={onClose}>
                                <Text style={{ color: '#FFF', fontSize: 16 }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleOk}>
                                <Text style={{ color: '#00EAFF', fontWeight: 'bold', fontSize: 16 }}>OK</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderPortrait = () => (
        <View style={styles.modalOverlay}>
            <View style={styles.calendarContainer}>
                <View style={styles.calendarWhiteContent}>
                    <View style={styles.calPersistentHeader}>
                        <Text style={styles.calPersistentText}>
                            {calendarSelectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </Text>
                        <Icon name="chevron-down" size={24} color="#333" />
                    </View>

                    <View style={{ padding: 20 }}>
                        <View style={styles.calMonthRow}>
                            <Text style={styles.calMonthTextLarge}>
                                {calendarMonth.toLocaleString('default', { month: 'long' })} {calendarMonth.getFullYear()}
                            </Text>
                            <View style={{ flexDirection: 'row' }}>
                                <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                                    <Icon name="menu-up" size={28} color="#999" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                                    <Icon name="menu-down" size={28} color="#999" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.weekRow}>
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                                <Text key={d} style={styles.weekText}>{d}</Text>
                            ))}
                        </View>

                        <View style={styles.daysGrid}>
                            {(() => {
                                const days = [];
                                const year = calendarMonth.getFullYear();
                                const month = calendarMonth.getMonth();
                                const firstDayOfMonth = new Date(year, month, 1).getDay();
                                const daysInMonth = new Date(year, month + 1, 0).getDate();
                                const daysInPrevMonth = new Date(year, month, 0).getDate();

                                for (let i = firstDayOfMonth - 1; i >= 0; i--) {
                                    days.push(
                                        <View key={`prev-${i}`} style={styles.dayBox}>
                                            <Text style={[styles.dayText, { color: '#BDC3D1' }]}>{daysInPrevMonth - i}</Text>
                                        </View>
                                    );
                                }

                                for (let d = 1; d <= daysInMonth; d++) {
                                    const isoStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                    const hasFootage = recordedDays.includes(isoStr);
                                    const isSelected = isSameDay(new Date(year, month, d), calendarSelectedDate);
                                    days.push(
                                        <TouchableOpacity
                                            key={`curr-${d}`}
                                            style={styles.dayBox}
                                            onPress={() => setCalendarSelectedDate(new Date(year, month, d))}
                                        >
                                            <View style={[styles.dayCircle, isSelected && styles.selectedDayCircle]}>
                                                <Text style={[styles.dayText, isSelected && styles.selectedDayText, hasFootage && !isSelected && { color: theme.recordingYellow, fontWeight: 'bold' }]}>
                                                    {d}
                                                </Text>
                                            </View>
                                            {hasFootage && <View style={[styles.footageDot, isSelected && { backgroundColor: '#FFF' }]} />}
                                        </TouchableOpacity>
                                    );
                                }

                                const totalSlots = 42;
                                while (days.length < totalSlots) {
                                    const i = days.length - (daysInMonth + firstDayOfMonth) + 1;
                                    days.push(
                                        <View key={`next-${i}`} style={styles.dayBox}>
                                            <Text style={[styles.dayText, { color: '#BDC3D1' }]}>{i}</Text>
                                        </View>
                                    );
                                }
                                return days;
                            })()}
                        </View>

                        <Text style={styles.chooseTimeLabel}>Choose time</Text>

                        <View style={[styles.timePickerContainer, { height: PICKER_ITEM_HEIGHT * 5 }]}>
                            <View style={styles.timeColumn}>
                                <FlatList
                                    ref={hourScrollRef}
                                    data={[null, null, ...HOURS_DATA, null, null]}
                                    keyExtractor={(_, i) => `h-${i}`}
                                    showsVerticalScrollIndicator={false}
                                    snapToInterval={PICKER_ITEM_HEIGHT}
                                    decelerationRate="fast"
                                    onMomentumScrollEnd={(e) => {
                                        const index = Math.round(e.nativeEvent.contentOffset.y / PICKER_ITEM_HEIGHT);
                                        setSelectedTime(t => ({ ...t, hour: index + 1 }));
                                    }}
                                    getItemLayout={(_, index) => ({ length: PICKER_ITEM_HEIGHT, offset: PICKER_ITEM_HEIGHT * index, index })}
                                    renderItem={({ item }) => (
                                        <View style={{ height: PICKER_ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                                            {item ? <Text style={String(selectedTime.hour % 12 || 12).padStart(2, '0') === item ? styles.timeDigitLarge : styles.timeDigitSmall}>{item}</Text> : null}
                                        </View>
                                    )}
                                />
                            </View>
                            <View style={styles.timeColumn}>
                                <FlatList
                                    ref={minScrollRef}
                                    data={[null, null, ...MINUTES_DATA, null, null]}
                                    keyExtractor={(_, i) => `m-${i}`}
                                    showsVerticalScrollIndicator={false}
                                    snapToInterval={PICKER_ITEM_HEIGHT}
                                    decelerationRate="fast"
                                    onMomentumScrollEnd={(e) => {
                                        const index = Math.round(e.nativeEvent.contentOffset.y / PICKER_ITEM_HEIGHT);
                                        setSelectedTime(t => ({ ...t, minute: index }));
                                    }}
                                    getItemLayout={(_, index) => ({ length: PICKER_ITEM_HEIGHT, offset: PICKER_ITEM_HEIGHT * index, index })}
                                    renderItem={({ item }) => (
                                        <View style={{ height: PICKER_ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                                            {item ? <Text style={String(selectedTime.minute).padStart(2, '0') === item ? styles.timeDigitLarge : styles.timeDigitSmall}>{item}</Text> : null}
                                        </View>
                                    )}
                                />
                            </View>
                            <View style={styles.timeColumn}>
                                <FlatList
                                    ref={ampmScrollRef}
                                    data={[null, null, ...AMPM_DATA, null, null]}
                                    keyExtractor={(_, i) => `ap-${i}`}
                                    showsVerticalScrollIndicator={false}
                                    snapToInterval={PICKER_ITEM_HEIGHT}
                                    decelerationRate="fast"
                                    onMomentumScrollEnd={(e) => {
                                        const index = Math.round(e.nativeEvent.contentOffset.y / PICKER_ITEM_HEIGHT);
                                        setIsAm(index === 0);
                                    }}
                                    getItemLayout={(_, index) => ({ length: PICKER_ITEM_HEIGHT, offset: PICKER_ITEM_HEIGHT * index, index })}
                                    renderItem={({ item }) => (
                                        <View style={{ height: PICKER_ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                                            {item ? <Text style={(isAm ? 'AM' : 'PM') === item ? styles.timeDigitLarge : styles.timeDigitSmall}>{item}</Text> : null}
                                        </View>
                                    )}
                                />
                            </View>
                            <View style={styles.pickerSelectorLines} pointerEvents="none" />
                        </View>

                        <View style={styles.calActions}>
                            <TouchableOpacity onPress={onClose}><Text style={styles.calCancelText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.calOkBtn} onPress={handleOk}>
                                <Text style={styles.calOkText}>OK</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
            onRequestClose={onClose}
        >
            {isFullscreen ? renderLandscape() : renderPortrait()}
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    calendarContainer: { width: '95%', backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', elevation: 10 },
    calendarWhiteContent: { backgroundColor: '#FFF' },
    calPersistentHeader: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    calPersistentText: { color: '#333', fontSize: 18, fontWeight: '500' },
    calMonthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    calMonthTextLarge: { fontSize: 20, color: '#333', fontWeight: 'bold' },
    weekRow: { flexDirection: 'row', marginBottom: 15 },
    weekText: { flex: 1, textAlign: 'center', color: '#666', fontSize: 14, fontWeight: '600' },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayBox: { width: `${100 / 7}%`, height: 45, justifyContent: 'center', alignItems: 'center' },
    dayCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    selectedDayCircle: { backgroundColor: '#A83232' },
    dayText: { fontSize: 14, color: '#333', fontWeight: '500' },
    selectedDayText: { color: '#FFF', fontWeight: 'bold' },
    footageDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#4AC23B', position: 'absolute', bottom: 4 },
    chooseTimeLabel: { color: '#333', fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
    timePickerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'relative' },
    timeColumn: { flex: 1, height: '100%' },
    timeDigitSmall: { fontSize: 18, color: '#BDC3D1', fontWeight: '500' },
    timeDigitLarge: { fontSize: 32, color: '#333', fontWeight: 'bold' },
    pickerSelectorLines: { position: 'absolute', top: PICKER_ITEM_HEIGHT * 2, left: 0, right: 0, height: PICKER_ITEM_HEIGHT, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0F0F0' },
    calActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 25, paddingBottom: 10, paddingRight: 20 },
    calCancelText: { color: '#999', fontSize: 16, marginRight: 25 },
    calOkBtn: { backgroundColor: '#A83232', paddingHorizontal: 25, paddingVertical: 10, borderRadius: 12 },
    calOkText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

    landscapeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    landscapeModal: { width: '80%', height: '85%', backgroundColor: '#202025', borderRadius: 15, overflow: 'hidden' },
    landscapeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    landscapeTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    landscapeCloseBtn: { padding: 5 },
    landscapeContent: { flex: 1, flexDirection: 'row', backgroundColor: '#FFF' },
    landscapeRight: { width: 120, backgroundColor: '#15151A', padding: 15, justifyContent: 'flex-end' },
    landscapeActions: { flexDirection: 'column', alignItems: 'center' },
});

export default CalendarModal;
