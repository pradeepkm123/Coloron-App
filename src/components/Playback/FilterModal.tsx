import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    Modal,
    ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (types: string[]) => void;
    recordingStyles: { [key: string]: { color: string, icon: string } };
    selectedTypes: string[];
    isFullscreen?: boolean;
}

const DISPLAYED_TYPES = [
    'AI Event-Face',
    'AI Event-License Plate',
    'AI Event-Line Crossing',
    'AI Event-Intrusion',
    'Other AI Events',
    'Manual',
    'Sensor',
    'Motion',
    'POS'
];

const FilterModal: React.FC<FilterModalProps> = ({
    visible,
    onClose,
    onApply,
    recordingStyles,
    selectedTypes,
    isFullscreen
}) => {
    const [localTypes, setLocalTypes] = useState<string[]>(selectedTypes);

    useEffect(() => {
        if (visible) {
            setLocalTypes(selectedTypes);
        }
    }, [visible, selectedTypes]);

    const isAllSelected = DISPLAYED_TYPES.every(type => localTypes.includes(type));

    const handleToggleType = (type: string) => {
        setLocalTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const handleToggleAll = () => {
        if (isAllSelected) {
            // Deselect all DISPLAYED_TYPES, but preserve other non-displayed types (like Schedule, Unknown)
            setLocalTypes(prev => prev.filter(t => !DISPLAYED_TYPES.includes(t)));
        } else {
            // Select all DISPLAYED_TYPES, and preserve other non-displayed types
            setLocalTypes(prev => {
                const nonDisplay = prev.filter(t => !DISPLAYED_TYPES.includes(t));
                return [...nonDisplay, ...DISPLAYED_TYPES];
            });
        }
    };

    const handleOk = () => {
        onApply(localTypes);
    };

    const renderLandscape = () => (
        <View style={styles.landscapeOverlay}>
            <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
            <View style={styles.landscapeContent}>
                <View style={{ flex: 1, padding: 20, paddingBottom: 0 }}>
                    <View style={styles.landscapeHeader}>
                        <Text style={styles.landscapeTitle}>Recording Type</Text>
                        <TouchableOpacity onPress={handleToggleAll}>
                            <Icon
                                name={isAllSelected ? "radiobox-marked" : "radiobox-blank"}
                                size={28}
                                color="#00EAFF"
                            />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                        {DISPLAYED_TYPES.map((type) => {
                            const style = recordingStyles[type] || { color: '#9CA3AF' };
                            return (
                                <TouchableOpacity
                                    key={type}
                                    style={styles.landscapeItem}
                                    onPress={() => handleToggleType(type)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={[styles.landscapeColorSquare, { backgroundColor: style.color }]} />
                                        <Text style={styles.landscapeItemText}>{type}</Text>
                                    </View>
                                    <Icon
                                        name={localTypes.includes(type) ? "radiobox-marked" : "radiobox-blank"}
                                        size={26}
                                        color="#00EAFF"
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                <View style={styles.landscapeFooter}>
                    <TouchableOpacity style={styles.landscapeBtn} onPress={onClose}>
                        <Text style={styles.btnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.landscapeBtn} onPress={handleOk}>
                        <Text style={styles.btnText}>OK</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderPortrait = () => (
        <View style={styles.portraitOverlay}>
            <View style={styles.portraitContent}>
                <View style={styles.portraitHeader}>
                    <Text style={styles.portraitTitle}>Recording Type</Text>
                    <TouchableOpacity onPress={handleToggleAll}>
                        <Icon
                            name={isAllSelected ? "radiobox-marked" : "radiobox-blank"}
                            size={28}
                            color="#00EAFF"
                        />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.portraitList} showsVerticalScrollIndicator={false}>
                    {DISPLAYED_TYPES.map((type) => {
                        const style = recordingStyles[type] || { color: '#9CA3AF' };
                        return (
                            <TouchableOpacity
                                key={type}
                                style={styles.portraitItem}
                                onPress={() => handleToggleType(type)}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={[styles.portraitColorSquare, { backgroundColor: style.color }]} />
                                    <Text style={styles.portraitItemText}>{type}</Text>
                                </View>
                                <Icon
                                    name={localTypes.includes(type) ? "radiobox-marked" : "radiobox-blank"}
                                    size={28}
                                    color="#00EAFF"
                                />
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View style={styles.portraitFooter}>
                    <TouchableOpacity style={styles.portraitCancelBtn} onPress={onClose}>
                        <Text style={styles.portraitCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.portraitOkBtn} onPress={handleOk}>
                        <Text style={styles.portraitOkText}>OK</Text>
                    </TouchableOpacity>
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
    portraitOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    portraitContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 8, overflow: 'hidden' },
    portraitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF' },
    portraitTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    portraitList: { maxHeight: 500 },
    portraitItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
    portraitColorSquare: { width: 16, height: 16, marginRight: 15, borderRadius: 3 },
    portraitItemText: { fontSize: 15, color: '#333', fontWeight: '500' },
    portraitFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#EEE' },
    portraitCancelBtn: { flex: 1, padding: 18, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#EEE' },
    portraitOkBtn: { flex: 1, padding: 18, alignItems: 'center' },
    portraitCancelText: { color: '#666', fontSize: 16 },
    portraitOkText: { color: '#000', fontSize: 16, fontWeight: 'bold' },

    landscapeOverlay: { flex: 1, flexDirection: 'row' },
    landscapeContent: { width: 350, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'space-between' },
    landscapeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)', paddingBottom: 15 },
    landscapeTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
    landscapeItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    landscapeColorSquare: { width: 16, height: 16, marginRight: 15, borderRadius: 3 },
    landscapeItemText: { color: '#FFF', fontSize: 16, fontWeight: '500' },
    landscapeFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: 'rgba(0,0,0,0.3)' },
    landscapeBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, borderRadius: 8, marginHorizontal: 5, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});

export default FilterModal;
