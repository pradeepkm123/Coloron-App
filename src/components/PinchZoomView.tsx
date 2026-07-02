import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';

export interface PinchZoomRef {
  toggleZoom: () => void;
}

interface ZoomableVideoProps {
  children: React.ReactNode;
  enabled?: boolean;
}

const PinchZoomView = React.forwardRef<PinchZoomRef, ZoomableVideoProps>(({ children, enabled = false }, ref) => {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Expose toggleZoom for external control if needed
  React.useImperativeHandle(ref, () => ({
    toggleZoom: () => {
      if (!enabled) return;
      if (scale.value > 1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(2);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 2;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    }
  }));

  // Reset when disabled (e.g. switching out of 1x1 grid)
  React.useEffect(() => {
    if (!enabled && scale.value > 1) {
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [enabled, scale, translateX, translateY, savedScale, savedTranslateX, savedTranslateY]);

  // 🔍 Pinch Gesture (Zoom)
  const pinchGesture = Gesture.Pinch()
    .enabled(enabled)
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 4)); // Limit 1x to 4x
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  // 👉 Pan Gesture (Move)
  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // 💡 Double Tap Zoom (Pro Feature)
  const doubleTap = Gesture.Tap()
    .enabled(enabled)
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(2);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 2;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  // 🔄 Combine Gestures
  const composed = Gesture.Simultaneous(pinchGesture, panGesture, doubleTap);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default PinchZoomView;
