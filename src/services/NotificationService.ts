import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import { NativeModules } from 'react-native';
import { authStorage } from '../utils/authStorage';
import { API_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';
import { alarmEmitter } from './AlarmService';
import { deviceStorage } from '../utils/deviceStorage';

const { TVTSdkModule } = NativeModules;

class NotificationService {
  private navigationRef: any = null;

  setNavigationRef(ref: any) {
    this.navigationRef = ref;
  }

  async init() {
    try {
      // Register Background Handler
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log('[NotificationService] Message handled in the background!', remoteMessage);
        // Backend handles database storage, mobile just shows notification if not already shown by OS
      });

      // Foreground Listener
      messaging().onMessage(async (remoteMessage) => {
        console.log('[NotificationService] Foreground Message received!', remoteMessage);
        const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'VMS Alert';
        const body = remoteMessage.notification?.body || remoteMessage.data?.body || '';
        const data = remoteMessage.data || {};

        this.showForegroundNotification({
          title,
          body,
          data,
        });

        // ── Save and Emit the Alarm in real-time ──
        try {
          const deviceId = data.deviceId || 'unknown';
          const channelId = data.channelId ? parseInt(data.channelId, 10) : 0;
          const deviceName = data.deviceName || 'NVR';
          const channelName = data.channelName || `CH ${channelId + 1}`;
          const eventType = data.type || 'MOTION';
          const timestamp = data.timestamp ? parseInt(data.timestamp, 10) : Date.now();
          
          const newAlarm = {
            id: `${timestamp}_${Math.random().toString(36).substr(2, 5)}`,
            displayTitle: title,
            displayBody: body,
            deviceId,
            channelId,
            deviceName,
            channelName,
            type: eventType,
            timestamp,
            read: false,
            imageUri: data.imageUri || data.snapshotPath || '',
          };

          const storageKey = await authStorage.getAlarmStorageKey();
          const stored = await AsyncStorage.getItem(storageKey);
          const history = stored ? JSON.parse(stored) : [];
          const newHistory = [newAlarm, ...history].slice(0, 200);
          await AsyncStorage.setItem(storageKey, JSON.stringify(newHistory));

          alarmEmitter.emit('new_alarm', newAlarm);
        } catch (err: any) {
          console.warn('[NotificationService] Failed to process incoming FCM alarm:', err.message);
        }
      });
    } catch (e: any) {
      console.warn('[NotificationService] Messaging listeners setup failed:', e.message);
    }

    // Handle Notification Taps
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS && detail.notification?.data) {
        if (detail.notification.android?.channelId === 'alarm-channel') {
          this.handleNotificationTap(detail.notification.data);
        }
      }
    });

    // Setup Notification Channel
    await notifee.createChannel({
      id: 'alarm-channel',
      name: 'VMS Alarm Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  async requestPermission() {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === (messaging as any).AuthorizationStatus.AUTHORIZED ||
        authStatus === (messaging as any).AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('[NotificationService] Authorization status:', authStatus);
        await this.registerToken();
      }
    } catch (e: any) {
      console.warn('[NotificationService] Permission request failed:', e.message);
    }
  }

  async showForegroundNotification({ title, body, image, data }: any) {
    await notifee.displayNotification({
      title,
      body,
      data,
      android: {
        channelId: 'alarm-channel',
        importance: AndroidImportance.HIGH,
        largeIcon: image, // Use snapshot if available
        pressAction: { id: 'default' },
      },
    });
  }

  async handleNotificationTap(data: any) {
    if (!data || !this.navigationRef) return;
    
    // Jump to Playback or LiveView based on event type
    if (data.type === 'OFFLINE') {
      this.navigationRef.navigate('DeviceList');
    } else {
      const alarmTime = data.timestamp ? parseInt(data.timestamp) : Date.now();
      const adjustedStartTime = alarmTime - 20000;
      const adjustedEndTime = alarmTime + 60000;
      const sdkChannel = parseInt(data.channelId || '0', 10);

      // Resolve deviceId from SN to database ID
      let resolvedDeviceId = data.deviceId;
      try {
        const devs = await deviceStorage.getDevices();
        const target = devs.find(d => 
          String(d.id) === String(data.deviceId) || 
          (d.deviceId && String(d.deviceId) === String(data.deviceId)) ||
          (d.sn && String(d.sn) === String(data.deviceId))
        );
        if (target) {
          resolvedDeviceId = String(target.id);
        }
      } catch (err) {
        console.warn('[NotificationService] Failed to resolve deviceId:', err);
      }

      console.log('[AI-PUSH] notification action clicked: playback (from tap)', {
        deviceId: resolvedDeviceId,
        deviceName: data.deviceName,
        channelId: sdkChannel,
        alarmTime: new Date(alarmTime).toISOString(),
        playbackStartTime: new Date(adjustedStartTime).toISOString(),
        playbackEndTime: new Date(adjustedEndTime).toISOString()
      });

      this.navigationRef.navigate('Playback', {
        deviceId: resolvedDeviceId,
        deviceName: data.deviceName,
        channelId: sdkChannel,
        channelName: data.channelName || `CH ${sdkChannel + 1}`,
        eventType: data.type || 'MOTION',
        alarmTime: new Date(alarmTime).toISOString(),
        playbackStartTime: new Date(adjustedStartTime).toISOString(),
        playbackEndTime: new Date(adjustedEndTime).toISOString(),
        // Keep original params for compatibility:
        initialChannelId: sdkChannel,
        startTime: adjustedStartTime,
        eventTime: alarmTime,
        endTime: adjustedEndTime,
        autoPlay: true,
      });
    }
  }

  async registerToken() {
    try {
      const token = await messaging().getToken();
      console.log('[NotificationService] FCM Token:', token);
      
      const user = await authStorage.getUser();
      const authToken = await authStorage.getToken();
      
      if (user && authToken) {
        // Register token with our backend
        const result = await api.registerFcmToken(token);
        console.log('[NotificationService] Token registration status:', result.message || 'success');
      }
    } catch (err) {
      console.warn('[NotificationService] FCM Token registration failed:', err);
    }
  }

  async deleteToken() {
    try {
      await messaging().deleteToken();
    } catch (e) {}
  }

  cleanup() {}
}

export const notificationService = new NotificationService();
