import { create } from 'zustand';
import { NormalizedAiEvent } from '../utils/eventMapper';

// Keep max 50 events in memory to prevent memory leaks
const MAX_EVENTS = 50;

interface EventStoreState {
  events: NormalizedAiEvent[];
  addEvent: (event: NormalizedAiEvent) => void;
  setEvents: (events: NormalizedAiEvent[]) => void;
  clearEvents: () => void;
  removeEvent: (id: string) => void;
  getEventsByChannel: (channelId: number) => NormalizedAiEvent[];
}

export const useEventStore = create<EventStoreState>((set, get) => ({
  events: [],
  
  addEvent: (event) => set((state) => {
    // Prevent exactly identical events within a 1-second window per channel to debounce duplicates
    const isDuplicate = state.events.some(
       e => e.channelId === event.channelId && e.eventType === event.eventType && Math.abs(e.eventTime - event.eventTime) < 1000
    );

    if (isDuplicate) return state;

    const newEvents = [event, ...state.events];
    if (newEvents.length > MAX_EVENTS) {
      newEvents.length = MAX_EVENTS;
    }
    return { events: newEvents };
  }),

  setEvents: (events) => set({ events: events.slice(0, MAX_EVENTS) }),

  clearEvents: () => set({ events: [] }),
  
  removeEvent: (id) => set((state) => ({
    events: state.events.filter(e => e.id !== id)
  })),

  getEventsByChannel: (channelId) => {
    return get().events.filter(e => e.channelId === channelId);
  }
}));
