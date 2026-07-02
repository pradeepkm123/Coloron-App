import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { authStorage } from './authStorage';

const DEVICES_KEY_BASE = '@vms_devices';

export interface Channel {
    id: number;          // 0-based channel index
    name: string;        // e.g., "Camera 1"
    online: boolean;     // Channel online status
    status?: number;     // SDK status (0 = offline)
    enabled?: boolean;   // Channel enabled/disabled
    streamUrl?: string;  // RTSP/HTTP stream URL
    ip?: string;         // Camera IP address
    videoLoss?: boolean; // Video loss status
    channelNo?: number;  // 1-based channel number (for display)
    presets?: { id: number; name: string }[];
    ptz?: boolean;       // Dynamic PTZ support flag
}

export interface Device {
    id: string | number;
    name: string;
    /**
     * Device category string set by the user during Add Device:
     * 'NVR' | 'DVR' | 'XVR' | 'IPC'
     * Legacy values 'VMS', 'IPC' are also valid.
     */
    type: string;
    /**
     * Explicit device category selected by user (NVR / DVR / XVR / IPC).
     * Preferred over the `type` field for display and logic decisions.
     */
    deviceCategory?: 'NVR' | 'DVR' | 'XVR' | 'IPC';
    ip: string;
    port: string | number;
    status: 'Online' | 'Offline' | 'Connecting';
    favorite: boolean;

    // User Spec Fields
    deviceId?: string; // Serial Number (SN)
    username?: string; // Admin username
    password?: string; // Admin password
    channelCount?: number; // Total channels (e.g., 8)
    connectMode?: 'LAN' | 'P2P' | 'IP' | 'Domain';

    // Legacy / Expanded Fields
    sn?: string; // Duplicate of deviceId for compatibility
    model?: string;
    version?: string;
    streamType?: string;
    audioSupport?: boolean;
    thumbnail?: string; // Base64 or local URI of the last snapshot

    brand?: string;
    userEmail?: string;
    nvrUsername?: string;
    nvrPassword?: string;

    // NVR / DVR / XVR expansion
    isNVR?: boolean;        // true for NVR, DVR, XVR — any multi-channel recorder
    loginId?: number;
    channels?: Channel[];
    parentDeviceId?: string;
    channelId?: number;
    protocol?: 'TVT' | 'ONVIF';

    activeChannels?: number[];
    totalChannels?: number;

    // Hardware Details (from SDK)
    audioInputNum?: number;
    sensorInputNum?: number;
    sensorOutputNum?: number;
    deviceType?: number;
    videoInputNum?: number;
    rawData?: any; // To store the complete original response from the SDK
}

// Internal helper to get the storage key for the current user
const getStorageKey = async (identifier?: string): Promise<string> => {
    if (identifier) return `${DEVICES_KEY_BASE}_${identifier}`;
    const userKey = await authStorage.getUserIdentifier();
    return `${DEVICES_KEY_BASE}_${userKey}`;
};

export const deviceStorage = {
    // Store all devices for a specific user
    saveDevices: async (devices: Device[], userEmail?: string): Promise<void> => {
        try {
            const key = await getStorageKey(userEmail);
            await AsyncStorage.setItem(key, JSON.stringify(devices));
        } catch (error) {
            console.error('Error saving devices:', error);
            throw error;
        }
    },

    // Get all devices, automatically scoped to current user
    getDevices: async (userEmail?: string): Promise<Device[]> => {
        try {
            const key = await getStorageKey(userEmail);
            const devicesData = await AsyncStorage.getItem(key);
            const allDevices: Device[] = devicesData ? JSON.parse(devicesData) : [];
            
            // Deduplicate devices by ID to prevent duplicate key warnings/errors in UI lists
            const seen = new Set<string | number>();
            const uniqueDevices: Device[] = [];
            
            for (const dev of allDevices) {
                if (dev.id && !seen.has(dev.id)) {
                    seen.add(dev.id);
                    uniqueDevices.push(dev);
                }
            }
            
            // If duplicates were found, heal/clean up storage in background
            if (uniqueDevices.length < allDevices.length) {
                console.log(`[deviceStorage] Deduplicated stored devices list. Healed database from ${allDevices.length} to ${uniqueDevices.length} items.`);
                AsyncStorage.setItem(key, JSON.stringify(uniqueDevices)).catch(() => {});
            }
            
            return uniqueDevices;
        } catch (error) {
            console.error('Error getting devices:', error);
            return [];
        }
    },

    // Add a single device to the current user's list
    addDevice: async (device: Device): Promise<void> => {
        try {
            const identifier = await authStorage.getUserIdentifier();

            // Ensure the device is tagged with this user
            device.userEmail = identifier;

            const devices = await deviceStorage.getDevices(identifier);

            // Allow multiple devices unless strictly identical (Same IP+Port OR Same SN without IP)
            const exists = devices.some(d => {
                const sameSN = (device.sn && d.sn && device.sn === d.sn) ||
                    (device.deviceId && d.deviceId && device.deviceId === d.deviceId);
                const sameIP = device.ip && d.ip && String(d.ip) === String(device.ip) && String(d.port) === String(device.port);

                if (sameSN && sameIP) return true;
                if (sameSN && !device.ip && !d.ip) return true; // Pure P2P duplicate
                if (sameIP) return true; // Same IP+Port is always a duplicate

                return false;
            });

            if (!exists) {
                if (!device.id) {
                    device.id = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                }

                devices.push(device);
                await deviceStorage.saveDevices(devices, identifier);
                console.log(`[deviceStorage] Added new device for ${identifier}: ${device.name}`);

                // 🔥 AUTO ENABLE AI NOTIFICATIONS
                deviceStorage.autoSubscribeAI(device).catch(e =>
                    console.log("[deviceStorage] Auto-AI enable failed:", e.message)
                );
            } else {
                console.warn(`[deviceStorage] Device already exists for this user.`);
            }
        } catch (error) {
            console.error('Error adding device:', error);
            throw error;
        }
    },

    // Auto-enable all AI alerts for a new device
    autoSubscribeAI: async (device: Device): Promise<void> => {
        try {
            const deviceId = String(device.deviceId || device.sn || device.id);
            if (!deviceId) return;

            console.log(`[deviceStorage] 🚀 Auto-enabling AI for device: ${deviceId}`);

            const channels = [];
            if (device.channels && device.channels.length > 0) {
                for (const ch of device.channels) {
                    channels.push({
                        id: ch.id,
                        name: ch.name || `CH ${ch.id + 1}`,
                        human: true,
                        vehicle: true,
                        faceDet: true,
                        faceRec: true,
                        intrusion: true,
                        line: true,
                        loitering: true,
                        crowd: true,
                        tamper: true,
                        motion: true,
                    });
                }
            } else {
                let chCount = device.channelCount || device.videoInputNum || (device.isNVR ? 16 : 1);
                if (chCount > 64) chCount = 64;
                for (let i = 0; i < chCount; i++) {
                    channels.push({
                        id: i,
                        name: `CH ${i + 1}`,
                        human: true,
                        vehicle: true,
                        faceDet: true,
                        faceRec: true,
                        intrusion: true,
                        line: true,
                        loitering: true,
                        crowd: true,
                        tamper: true,
                        motion: true,
                    });
                }
            }

            const payload = {
                global: {
                    enablePush: true,
                    messageSubscription: true,
                    cameraOffline: true,
                    diskError: true,
                    diskFull: true,
                    noDisk: true,
                    pullOutDisk: true,
                    illegalAccess: true,
                    ipConflict: true,
                    networkDisconnection: true,
                },
                channels: channels,
                sensors: []
            };

            // Build user-defined structured format
            const userChannels: Record<string, string[]> = {};
            channels.forEach((ch: any) => {
                const chNo = String(Number(ch.id) + 1);
                userChannels[chNo] = [
                    "MOTION", "HUMAN_DETECTION", "VEHICLE_DETECTION",
                    "FACE_DETECTION", "FACE_RECOGNITION", "INTRUSION",
                    "LINE_CROSSING", "LOITERING", "CROWD_DETECTION", "TAMPERING"
                ];
            });
            const userPushSettings = {
                deviceId: deviceId,
                channels: userChannels
            };

            await AsyncStorage.setItem(`push_settings_${deviceId}`, JSON.stringify(userPushSettings));
            await AsyncStorage.setItem(`@push_settings_${deviceId}`, JSON.stringify(payload));

            await api.updateDeviceSettings(deviceId, payload);
            const user = await authStorage.getUser();
            await deviceStorage.savePushSettings(deviceId, payload, user?._id);

            console.log(`[deviceStorage] ✅ AI Auto-Enable SUCCESS for ${deviceId}`);
        } catch (err: any) {
            console.log(`[deviceStorage] ❌ Auto-AI Enable ERR: ${err.message}`);
        }
    },

    // Remove a device from current user's list
    removeDevice: async (id: string | number): Promise<void> => {
        try {
            const identifier = await authStorage.getUserIdentifier();
            const devices = await deviceStorage.getDevices(identifier);
            const filteredDevices = devices.filter(d => d.id !== id);
            await deviceStorage.saveDevices(filteredDevices, identifier);
        } catch (error) {
            console.error('Error removing device:', error);
            throw error;
        }
    },

    // Toggle favorite status for current user's device
    toggleFavorite: async (id: string | number): Promise<void> => {
        try {
            const identifier = await authStorage.getUserIdentifier();
            const devices = await deviceStorage.getDevices(identifier);
            const updatedDevices = devices.map(d =>
                d.id === id ? { ...d, favorite: !d.favorite } : d
            );
            await deviceStorage.saveDevices(updatedDevices, identifier);
        } catch (error) {
            console.error('Error toggling favorite:', error);
            throw error;
        }
    },

    // Update device in current user's list
    updateDevice: async (updatedDevice: Device): Promise<void> => {
        try {
            const identifier = await authStorage.getUserIdentifier();
            const devices = await deviceStorage.getDevices(identifier);
            const updatedDevices = devices.map(d =>
                d.id === updatedDevice.id ? updatedDevice : d
            );
            await deviceStorage.saveDevices(updatedDevices, identifier);

            api.saveDeviceToCloud(updatedDevice).catch(e => console.log("Cloud sync silent fail", e));
        } catch (error) {
            console.error('Error updating device:', error);
            throw error;
        }
    },

    filterConnectedChannels: (channels: Channel[]): Channel[] => {
        return channels.filter(ch => {
            if (ch.enabled === false) return false;
            const hasCustomName = ch.name &&
                ch.name.trim() !== "" &&
                !(/^(CH\d+|Camera \d+|Channel \d+)$/i.test(ch.name));

            return (
                ch.online ||
                hasCustomName ||
                (ch.enabled === true) ||
                (ch.streamUrl && ch.streamUrl !== "") ||
                (ch.ip && ch.ip !== "") ||
                (ch.videoLoss === false)
            );
        });
    },

    expandNVRDevices: (devices: Device[]): Device[] => {
        const expanded: Device[] = [];
        devices.forEach(device => {
            // Expand any multi-channel recorder (NVR, DVR, XVR) into individual channel entries
            const isMultiChannel = device.isNVR ||
                ['NVR', 'DVR', 'XVR'].includes(device.deviceCategory || '') ||
                ['NVR', 'DVR', 'XVR', 'VMS'].includes(device.type || '');

            if (isMultiChannel && device.channels && device.channels.length > 0) {
                const connectedChannels = deviceStorage.filterConnectedChannels(device.channels);
                connectedChannels.forEach(channel => {
                    expanded.push({
                        ...device,
                        id: `${device.id}_ch${channel.id}`,
                        name: channel.name,
                        status: device.status === 'Offline' ? 'Offline' : (channel.online ? 'Online' : 'Offline'),
                        parentDeviceId: String(device.id),
                        channelId: channel.id,
                        isNVR: false,
                        channels: undefined,
                    });
                });
            } else {
                expanded.push(device);
            }
        });
        return expanded;
    },

    getDevicesWithChannels: async (userEmail?: string): Promise<Device[]> => {
        const devices = await deviceStorage.getDevices(userEmail);
        return deviceStorage.expandNVRDevices(devices);
    },

    savePushSettings: async (deviceId: string, settings: any, userId?: string): Promise<void> => {
        try {
            const currentUserId = userId || (await authStorage.getUserIdentifier());
            const key = `@push_settings_${currentUserId}_${deviceId}`;
            await AsyncStorage.setItem(key, JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving push settings:', error);
        }
    },

    getPushSettings: async (deviceId: string, userId?: string): Promise<any | null> => {
        try {
            const currentUserId = userId || (await authStorage.getUserIdentifier());
            const key = `@push_settings_${currentUserId}_${deviceId}`;
            const data = await AsyncStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting push settings:', error);
            return null;
        }
    },

    savePresets: async (deviceId: string | number, channelId: number, presets: { id: number; name: string }[]): Promise<void> => {
        try {
            const devIdStr = String(deviceId);
            const baseId = devIdStr.includes('_ch') ? devIdStr.split('_ch')[0] : devIdStr;

            // 1. Save to user-scoped AsyncStorage key as a backup
            const userKey = await authStorage.getUserIdentifier();
            const backupKey = `@presets_${userKey}_${baseId}_${channelId}`;
            await AsyncStorage.setItem(backupKey, JSON.stringify(presets));

            // 2. Save in the device object
            const devices = await deviceStorage.getDevices();
            const deviceIdx = devices.findIndex(d => String(d.id) === String(baseId));
            if (deviceIdx === -1) return;

            const updatedDevice = { ...devices[deviceIdx] };
            if (!updatedDevice.channels) {
                const chCount = updatedDevice.channelCount || 16;
                updatedDevice.channels = Array.from({ length: chCount }).map((_, i) => ({
                    id: i,
                    name: `CH ${i + 1}`,
                    online: true,
                }));
            }
            updatedDevice.channels = updatedDevice.channels.map(ch =>
                ch.id === channelId ? { ...ch, presets } : ch
            );

            await deviceStorage.updateDevice(updatedDevice);
        } catch (error) {
            console.error('Error saving presets to storage:', error);
        }
    },

    getPresets: async (deviceId: string | number, channelId: number): Promise<{ id: number; name: string }[]> => {
        try {
            const devIdStr = String(deviceId);
            const baseId = devIdStr.includes('_ch') ? devIdStr.split('_ch')[0] : devIdStr;

            // 1. Try backup key first
            const userKey = await authStorage.getUserIdentifier();
            const backupKey = `@presets_${userKey}_${baseId}_${channelId}`;
            const localData = await AsyncStorage.getItem(backupKey);
            if (localData) {
                return JSON.parse(localData);
            }

            // 2. Fallback to device channels array
            const devices = await deviceStorage.getDevices();
            const device = devices.find(d => String(d.id) === String(baseId));
            if (device && device.channels) {
                const channel = device.channels.find(ch => ch.id === channelId);
                if (channel && channel.presets) {
                    return channel.presets;
                }
            }
            return [];
        } catch (error) {
            console.error('Error getting presets from storage:', error);
            return [];
        }
    }
};
