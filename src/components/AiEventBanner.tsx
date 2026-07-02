import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, LayoutAnimation } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useEventStore } from '../store/useEventStore';
import { NormalizedAiEvent } from '../utils/eventMapper';

interface Props {
  onPressEvent?: (event: NormalizedAiEvent) => void;
}

export default function AiEventBanner({ onPressEvent }: Props) {
  const events = useEventStore(state => state.events);
  const [currentEvent, setCurrentEvent] = useState<NormalizedAiEvent | null>(null);
  const slideAnim = useRef(new Animated.Value(-100)).current; // Start hidden above
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (events.length > 0) {
      const latest = events[0];
      
      // If a new event comes in while another is displaying, 
      // replace it but reset the timer.
      setCurrentEvent(latest);
      
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();

      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }

      hideTimeoutRef.current = setTimeout(() => {
        closeBanner();
      }, 4000); // Hide after 4 seconds
    }
  }, [events]);

  const closeBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCurrentEvent(null);
    });
  };

  const getIconForType = (type: string) => {
    if (type.includes('FACE')) return 'face-recognition';
    if (type.includes('VEHICLE')) return 'car';
    if (type.includes('HUMAN')) return 'human-greeting';
    if (type.includes('LINE')) return 'vector-line';
    return 'motion-sensor';
  };

  if (!currentEvent) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity 
         style={styles.banner} 
         activeOpacity={0.8}
         onPress={() => {
             closeBanner();
             onPressEvent?.(currentEvent);
         }}
      >
        <View style={styles.iconContainer}>
          <Icon name={getIconForType(currentEvent.eventType)} size={24} color="#FFF" />
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{currentEvent.eventName}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
             {currentEvent.channelName} • {new Date(currentEvent.eventTime).toLocaleTimeString()}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={closeBanner}>
            <Icon name="close" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50, // Below status bar generally
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  banner: {
    backgroundColor: '#323232',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A83232', // primary accent
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#AAA',
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  }
});
