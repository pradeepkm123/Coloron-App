import React from 'react';
import {
    View,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GridSelection, { GridType } from '../GridSelection';

interface GridModalProps {
    visible: boolean;
    onClose: () => void;
    isFullscreen?: boolean;
    gridType: GridType;
    onSelectGrid: (type: GridType) => void;
    allowedGrids?: GridType[];
}

const GridModal: React.FC<GridModalProps> = ({
    visible,
    onClose,
    isFullscreen,
    gridType,
    onSelectGrid,
    allowedGrids
}) => {
    const fsGrids = allowedGrids || (['1x1', '2x2', '3x3', '4x4', '5x5', '6x6'] as GridType[]);
    
    if (isFullscreen) {
        return (
            <Modal
                visible={visible}
                transparent={true}
                animationType="fade"
                supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
                onRequestClose={onClose}
            >
                <View style={styles.fsOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
                    <View style={styles.fsSidePanel}>
                        <View style={styles.fsIconContainer}>
                            {fsGrids.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    onPress={() => {
                                        onSelectGrid(type);
                                        onClose();
                                    }}
                                    style={[
                                        styles.fsIconBtn,
                                        gridType === type && styles.fsIconBtnActive
                                    ]}
                                >
                                    <Icon
                                        name={
                                            type === '1x1' ? 'checkbox-blank-outline' :
                                                type === '2x2' ? 'view-grid-outline' :
                                                    type === '3x3' ? 'grid' : 'view-comfy'
                                        }
                                        size={40}
                                        color="#FFF"
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <GridSelection
            visible={visible}
            onClose={onClose}
            currentGrid={gridType}
            onSelectGrid={onSelectGrid}
            allowedGrids={allowedGrids}
        />
    );
};

const styles = StyleSheet.create({
    fsOverlay: {
        flex: 1,
        flexDirection: 'row'
    },
    fsSidePanel: {
        width: 100,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40
    },
    fsIconContainer: {
        justifyContent: 'space-around',
        flex: 1,
        maxHeight: 400
    },
    fsIconBtn: {
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        backgroundColor: 'transparent'
    },
    fsIconBtnActive: {
        backgroundColor: 'rgba(255,255,255,0.2)'
    }
});

export default GridModal;
