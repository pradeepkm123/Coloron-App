import React, { useRef, useEffect } from 'react';
import { findNodeHandle, StyleSheet, View, Text } from 'react-native';
import { CameraView, startPreview } from '../native/NvrSdk';

export interface CameraPlayerProps {
    channelId: number;
    style?: any;
}

const CameraPlayer: React.FC<CameraPlayerProps> = ({ channelId, style }) => {
    const ref = useRef(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            const viewId = findNodeHandle(ref.current);
            if (viewId) {
                console.log(`[CameraPlayer] Binding CH${channelId} to ViewId ${viewId}`);
                startPreview(channelId, viewId).catch(err => {
                    console.error(`[CameraPlayer] startPreview failed for CH${channelId}:`, err);
                });
            }
        }, 1000); // Increased delay to ensure surface is ready
        return () => clearTimeout(timer);
    }, [channelId]);

    return (
        <View style={[styles.container, style]}>
            <CameraView
                ref={ref}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.overlay}>
                <Text style={styles.text}>CH {channelId + 1}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#000',
        overflow: 'hidden',
    },
    overlay: {
        position: 'absolute',
        top: 5,
        left: 5,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    text: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    }
});

export default CameraPlayer;
