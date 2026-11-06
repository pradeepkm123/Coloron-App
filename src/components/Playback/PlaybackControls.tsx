import React from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface PlaybackControlsProps {
    isPlaying: boolean;
    onTogglePlay: () => void;
    onSnapshot: () => void;
    isRecording: boolean;
    onToggleRecord: () => void;
    playbackSpeed: number;
    onSpeedChange: () => void;
    onSpeedLongPress: () => void;
    onRewind: () => void;
    onGridPress: () => void;
    onDevicePress: () => void;
    onFullscreenPress?: () => void;
    gridType?: string;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
    isPlaying,
    onTogglePlay,
    onSnapshot,
    isRecording,
    onToggleRecord,
    playbackSpeed,
    onSpeedChange,
    onSpeedLongPress,
    onRewind,
    onGridPress,
    onDevicePress,
    onFullscreenPress,
    gridType = '1x1'
}) => {
    const isMultiGrid = gridType !== '1x1';
    return (
        <View style={styles.secondaryActionsContainer}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.secondaryActions}
            >
                <TouchableOpacity style={styles.actionBtnWrapper} onPress={onTogglePlay}>
                    <View style={styles.actionBtn}>
                        <Icon name={isPlaying ? "pause" : "play"} size={22} color="#A83232" />
                    </View>
                    <Text style={styles.actionLabel}>{isPlaying ? 'Pause' : 'Play'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtnWrapper} onPress={onSnapshot}>
                    <View style={styles.actionBtn}>
                        <Icon name="camera-outline" size={22} color="#A83232" />
                    </View>
                    <Text style={styles.actionLabel}>Snapshot</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtnWrapper} onPress={onToggleRecord}>
                    <View style={[styles.actionBtn, isRecording && { backgroundColor: '#A83232' }]}>
                        <Icon name={isRecording ? "stop" : "record"} size={22} color={isRecording ? "#FFF" : "#A83232"} />
                    </View>
                    <Text style={styles.actionLabel}>{isRecording ? "Stop" : "Record"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionBtnWrapper}
                    onPress={onSpeedChange}
                    onLongPress={onSpeedLongPress}
                >
                    <View style={[styles.actionBtn, playbackSpeed > 1 && { backgroundColor: '#A83232' }]}>
                        <Icon name="fast-forward" size={22} color={playbackSpeed > 1 ? "#FFF" : "#A83232"} />
                    </View>
                    <Text style={[styles.actionLabel, playbackSpeed > 1 && { color: '#A83232', fontWeight: 'bold' }]}>
                        {playbackSpeed > 1 ? `${playbackSpeed}x` : 'Forward'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtnWrapper} onPress={onRewind}>
                    <View style={[styles.actionBtn, playbackSpeed < 0 && { backgroundColor: '#A83232' }]}>
                        <Icon name="rewind" size={22} color={playbackSpeed < 0 ? "#FFF" : "#A83232"} />
                    </View>
                    <Text style={[styles.actionLabel, playbackSpeed < 0 && { color: '#A83232', fontWeight: 'bold' }]}>
                        {playbackSpeed < 0 ? `${Math.abs(playbackSpeed)}x` : 'Rewind'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtnWrapper} onPress={onGridPress}>
                    <View style={[styles.actionBtn, isMultiGrid && { backgroundColor: '#A83232' }]}>
                        <Icon name="view-grid-outline" size={22} color={isMultiGrid ? '#FFF' : '#A83232'} />
                    </View>
                    <Text style={[styles.actionLabel, isMultiGrid && { color: '#A83232', fontWeight: 'bold' }]}>
                        {isMultiGrid ? gridType : 'Grid'}
                    </Text>
                </TouchableOpacity>

                {onFullscreenPress && (
                    <TouchableOpacity style={styles.actionBtnWrapper} onPress={onFullscreenPress}>
                        <View style={styles.actionBtn}>
                            <Icon name="fullscreen" size={22} color="#A83232" />
                        </View>
                        <Text style={styles.actionLabel}>Landscape</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.actionBtnWrapper} onPress={onDevicePress}>
                    <View style={styles.actionBtn}>
                        <Icon name="server" size={22} color="#A83232" />
                    </View>
                    <Text style={styles.actionLabel}>Device</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    secondaryActionsContainer: { marginTop: 10, height: 80 },
    secondaryActions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 10 },
    actionBtnWrapper: { alignItems: 'center', width: 60 },
    actionBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#FFF7F7', justifyContent: 'center', alignItems: 'center', elevation: 0.5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, marginBottom: 4 },
    actionLabel: { fontSize: 9, color: '#A83232', fontWeight: 'bold', textAlign: 'center' },
});

export default PlaybackControls;
