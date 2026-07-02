import { Device } from './deviceStorage'; // Ensure we have typing

export interface NormalizedAiEvent {
    id: string;
    deviceId: string;
    userId: number;
    channelId: number;
    channelName: string;
    eventType: string;
    eventName: string;
    state: 'start' | 'stop' | 'pulse';
    eventTime: number;
    snapshotPath?: string;
    raw: any;
}

const mapTypeToName = (type: string): string => {
    const map: Record<string, string> = {
        MOTION: 'Motion Detected',
        INTRUSION: 'Intrusion Alert',
        LINE_CROSSING: 'Line Crossing',
        FACE_DETECTION: 'Face Detected',
        FACE_RECOGNITION: 'Face Recognized',
        LICENSE_PLATE: 'License Plate Captured',
        HUMAN_DETECTION: 'Human Detected',
        VEHICLE_DETECTION: 'Vehicle Detected',
        TAMPERING: 'Tampering Alert',
        SENSOR: 'Sensor Triggered',
        OFFLINE: 'Camera Offline',
        DISK: 'Disk Error',
        MANUAL: 'Manual Alarm',
        POS: 'POS Event',
        LOITERING: 'Loitering Alert',
        OBJECT_ABANDONED: 'Object Abandoned',
        OBJECT_REMOVED: 'Object Removed',
        CROWD_DETECTION: 'Crowd Detection'
    };
    return map[type] || (type || 'Unknown Event');
};

export const normalizeAiEvent = (rawEvent: any, currentUserId?: number | null, activeDevice?: Device | null): NormalizedAiEvent => {
    const defaultId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Provide fallback naming
    const type = rawEvent.type || 'UNKNOWN';
    let cName = rawEvent.channelName;
    if (!cName && rawEvent.channelId !== undefined && rawEvent.channelId !== -1) {
       cName = `CH ${rawEvent.channelId + 1}`;
    } else if (!cName) {
       cName = 'System';
    }

    return {
        id: rawEvent.id || defaultId,
        deviceId: rawEvent.deviceId || (activeDevice ? String(activeDevice.id) : 'unknown'),
        userId: rawEvent.userId !== undefined ? rawEvent.userId : (currentUserId || 0),
        channelId: rawEvent.channelId !== undefined ? rawEvent.channelId : -1,
        channelName: cName,
        eventType: type,
        eventName: mapTypeToName(type),
        state: rawEvent.state || 'pulse', // Most sdk events act as pulses
        eventTime: rawEvent.timestamp || Date.now(),
        snapshotPath: rawEvent.snapshotPath || '',
        raw: rawEvent
    };
};
