
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid, Linking } from 'react-native';

export interface LocalSettings {
    notificationGlobal: boolean;
    resolutionAdaption: boolean;
    loopRecording: boolean;
    splitSnap: boolean;
    screenRotationCorrection: boolean;
    osd: boolean;
    originalScaleDisplay: boolean;
    ptzReverseControl: boolean;
    ptzGesturePrompts: boolean;
    automaticConnection: boolean;
    landscapeMode: boolean;
    pushMessagePreTime: number;
    reservedDiskSpace: number;
    snapNum: number;
    launchMode: 'LAST_PREVIEW' | 'DEVICE_LIST' | 'LIVE_VIEW';
    domain: string;
}

const DEFAULT_SETTINGS: LocalSettings = {
    notificationGlobal: true,
    resolutionAdaption: true,
    loopRecording: true,
    splitSnap: false,
    screenRotationCorrection: false,
    osd: true,
    originalScaleDisplay: false,
    ptzReverseControl: false,
    ptzGesturePrompts: true,
    automaticConnection: true,
    landscapeMode: false,
    pushMessagePreTime: 10,
    reservedDiskSpace: 50,
    snapNum: 1,
    launchMode: 'LAST_PREVIEW',
    domain: 'Asia Pacific/autonatap.com',
};

const STORAGE_KEY = '@vms_local_settings';

export const localSettings = {
    async getSettings(): Promise<LocalSettings> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            if (data) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
            }
            return DEFAULT_SETTINGS;
        } catch (e) {
            console.error('Failed to load local settings', e);
            return DEFAULT_SETTINGS;
        }
    },

    async saveSettings(settings: Partial<LocalSettings>): Promise<void> {
        try {
            const current = await this.getSettings();
            const updated = { ...current, ...settings };
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to save local settings', e);
        }
    },

    async openSystemNotificationSettings() {
        if (Platform.OS === 'android') {
            // Android 8.0+ (API 26+)
            if (Platform.Version >= 26) {
                Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
                    { key: 'android.provider.extra.APP_PACKAGE', value: 'com.vms' }
                ]).catch(() => Linking.openSettings());
            } else {
                Linking.openSettings();
            }
        } else {
            Linking.openSettings();
        }
    },

    async checkDiskSpace(requiredMB: number): Promise<boolean> {
        // Mocking disk space check for now as it requires native module / third party lib
        // In a real app, use react-native-fs or similar.
        // Assuming there is always enough space for now.
        return true;
    }
};
