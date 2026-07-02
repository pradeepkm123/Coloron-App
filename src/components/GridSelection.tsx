import React, { useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    TouchableWithoutFeedback,
    Easing,
    PanResponder
} from 'react-native';
import { ThemedText } from './ThemedText';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Grid Types
export type GridType = '1x1' | '2x2' | '3x3' | '4x4' | '5x5' | '6x6' | '1+3' | '1+5' | '1+7' | '1+8' | '1+12' | '32';

interface GridSelectionProps {
    visible: boolean;
    onClose: () => void;
    onSelectGrid: (grid: GridType) => void;
    currentGrid: GridType;
    allowedGrids?: GridType[];
}

export const GridIcon = ({ type, selected, activeColor, inactiveColor, showLabel = true }: { type: GridType; selected: boolean; activeColor?: string; inactiveColor?: string; showLabel?: boolean }) => {
    const color = selected ? (activeColor || '#A83232') : (inactiveColor || '#8E8E93');
    const bg = selected ? (activeColor ? 'rgba(255,255,255,0.2)' : '#FFF2F2') : 'transparent';
    const borderColor = selected ? color : 'transparent';

    const renderLayout = () => {
        const cellStyle = [styles.cell, { borderColor: color, borderWidth: 1 }];
        switch (type) {
            case '1x1':
                return (
                    <View style={styles.gridWrap}>
                        <View style={styles.row}><View style={cellStyle} /></View>
                    </View>
                );
            case '2x2':
                return (
                    <View style={styles.gridWrap}>
                        <View style={styles.row}><View style={cellStyle} /><View style={cellStyle} /></View>
                        <View style={styles.row}><View style={cellStyle} /><View style={cellStyle} /></View>
                    </View>
                );
            case '3x3':
                return (
                    <View style={styles.gridWrap}>
                        <View style={styles.row}><View style={cellStyle} /><View style={cellStyle} /><View style={cellStyle} /></View>
                        <View style={styles.row}><View style={cellStyle} /><View style={cellStyle} /><View style={cellStyle} /></View>
                        <View style={styles.row}><View style={cellStyle} /><View style={cellStyle} /><View style={cellStyle} /></View>
                    </View>
                );
            case '4x4':
                return (
                    <View style={styles.gridWrap}>
                        {[...Array(4)].map((_, r) => (
                            <View key={r} style={styles.row}>
                                {[...Array(4)].map((_, c) => <View key={c} style={cellStyle} />)}
                            </View>
                        ))}
                    </View>
                );
            case '5x5':
                return (
                    <View style={styles.gridWrap}>
                        {[...Array(5)].map((_, r) => (
                            <View key={r} style={styles.row}>
                                {[...Array(5)].map((_, c) => <View key={c} style={cellStyle} />)}
                            </View>
                        ))}
                    </View>
                );
            case '6x6':
                return (
                    <View style={styles.gridWrap}>
                        {[...Array(6)].map((_, r) => (
                            <View key={r} style={styles.row}>
                                {[...Array(6)].map((_, c) => <View key={c} style={cellStyle} />)}
                            </View>
                        ))}
                    </View>
                );
            case '1+3':
                return (
                    <View style={styles.gridWrap}>
                        <View style={{ flex: 1, flexDirection: 'row' }}>
                            <View style={[cellStyle, { flex: 3 }]} />
                            <View style={{ flex: 1 }}>
                                <View style={cellStyle} />
                                <View style={cellStyle} />
                                <View style={cellStyle} />
                            </View>
                        </View>
                    </View>
                );
            case '1+5':
                return (
                    <View style={styles.gridWrap}>
                        <View style={{ flex: 2, flexDirection: 'row' }}>
                            <View style={[cellStyle, { flex: 2 }]} />
                            <View style={{ flex: 1 }}>
                                <View style={cellStyle} />
                                <View style={cellStyle} />
                            </View>
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row' }}>
                            <View style={cellStyle} /><View style={cellStyle} /><View style={cellStyle} />
                        </View>
                    </View>
                );
            case '1+8':
                return (
                    <View style={styles.gridWrap}>
                        <View style={{ flex: 3, flexDirection: 'row' }}>
                            <View style={[cellStyle, { flex: 3 }]} />
                            <View style={{ flex: 1 }}>
                                <View style={cellStyle} />
                                <View style={cellStyle} />
                                <View style={cellStyle} />
                            </View>
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row' }}>
                            <View style={cellStyle} /><View style={cellStyle} /><View style={cellStyle} /><View style={cellStyle} /><View style={cellStyle} />
                        </View>
                    </View>
                );
            case '1+7':
                return (
                    <View style={styles.gridWrap}>
                        <View style={{ flex: 3, flexDirection: 'row' }}>
                            <View style={[cellStyle, { flex: 3 }]} />
                            <View style={{ flex: 1 }}>
                                <View style={cellStyle} />
                                <View style={cellStyle} />
                                <View style={cellStyle} />
                            </View>
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row' }}>
                            <View style={cellStyle} /><View style={cellStyle} /><View style={cellStyle} /><View style={cellStyle} />
                        </View>
                    </View>
                );
            case '1+12':
                return (
                    <View style={styles.gridWrap}>
                        <View style={{ flex: 1, flexDirection: 'row' }}>
                            <View style={cellStyle} /><View style={cellStyle} /><View style={cellStyle} /><View style={cellStyle} />
                        </View>
                        <View style={{ flex: 2, flexDirection: 'row' }}>
                            <View style={{ flex: 1 }}>
                                <View style={cellStyle} />
                                <View style={cellStyle} />
                            </View>
                            <View style={[cellStyle, { flex: 2 }]} />
                            <View style={{ flex: 1 }}>
                                <View style={cellStyle} />
                                <View style={cellStyle} />
                            </View>
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row' }}>
                            <View style={cellStyle} /><View style={cellStyle} /><View style={cellStyle} /><View style={cellStyle} />
                        </View>
                    </View>
                );
            case '32':
                return (
                    <View style={styles.gridWrap}>
                        {[...Array(4)].map((_, r) => (
                            <View key={r} style={styles.row}>
                                {[...Array(8)].map((_, c) => <View key={c} style={cellStyle} />)}
                            </View>
                        ))}
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <View style={[styles.iconContainer, { backgroundColor: bg, borderColor, borderWidth: selected ? 1.5 : 0 }]}>
            {renderLayout()}
            {showLabel && <ThemedText style={[styles.iconLabel, { color }]}>{type}</ThemedText>}
        </View>
    );
};


const GridSelection: React.FC<GridSelectionProps> = ({ visible, onClose, onSelectGrid, currentGrid, allowedGrids }) => {
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const panY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            panY.setValue(0);
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
                easing: Easing.out(Easing.back(0.5)),
            }).start();
        }
    }, [visible]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) panY.setValue(gestureState.dy);
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 120 || gestureState.vy > 0.5) {
                    closeAction();
                } else {
                    Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
                }
            },
        })
    ).current;

    const closeAction = () => {
        Animated.timing(slideAnim, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.in(Easing.ease),
        }).start(onClose);
    };

    const handleSelect = (grid: GridType) => {
        onSelectGrid(grid);
        closeAction();
    };

    return (
        <Modal transparent visible={visible} onRequestClose={closeAction} animationType="none">
            <TouchableWithoutFeedback onPress={closeAction}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            style={[
                                styles.sheet,
                                { transform: [{ translateY: Animated.add(slideAnim, panY) }] }
                            ]}
                        >
                            <View style={styles.dragHandleContainer} {...panResponder.panHandlers}>
                                <View style={styles.dragHandle} />
                            </View>

                            <View style={styles.headerRow}>
                                <ThemedText variant="bold" style={styles.title}>Display Layout</ThemedText>
                                <TouchableOpacity onPress={closeAction}>
                                    <Icon name="close" size={24} color="#8E8E93" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.gridWrapper}>
                                {(allowedGrids || ['1x1', '2x2', '3x3', '4x4', '5x5', '6x6', '1+3', '1+5', '1+7', '1+8', '1+12', '32'] as GridType[]).map((type) => (
                                    <TouchableOpacity key={type} onPress={() => handleSelect(type)} style={styles.gridItem}>
                                        <GridIcon type={type} selected={currentGrid === type} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 20,
        paddingBottom: 40,
        maxHeight: SCREEN_HEIGHT * 0.7,
    },
    dragHandleContainer: {
        width: '100%',
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#E5E5EA',
        borderRadius: 3,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    title: {
        fontSize: 20,
        color: '#1A1A1A',
    },
    gridWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    gridItem: {
        width: '23%',
        marginBottom: 20,
        alignItems: 'center',
    },
    iconContainer: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 12,
        padding: 8,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconLabel: {
        fontSize: 10,
        marginTop: 5,
        fontWeight: '600',
    },
    gridWrap: {
        width: '100%',
        height: '80%',
    },
    cell: {
        flex: 1,
        margin: 0.5,
        backgroundColor: 'transparent',
    },
    row: {
        flex: 1,
        flexDirection: 'row',
    }
});

export default GridSelection;
