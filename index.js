import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import firebase from '@react-native-firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { enableScreens } from 'react-native-screens';

// Disable native screens to fix the "Cannot add new property 'scene'" crash
enableScreens(false);

// --- DEFENSIVE: Initialize Dummy Firebase if google-services.json is missing ---
if (!firebase.apps.length) {
  try {
    firebase.initializeApp({
      apiKey: 'dummy-key-to-prevent-crash',
      appId: 'dummy-id',
      projectId: 'dummy-project',
      messagingSenderId: '000000000000',
      databaseURL: 'https://dummy-db.firebaseio.com',
      storageBucket: 'dummy-storage.appspot.com',
      authDomain: 'dummy-auth.firebaseapp.com',
    });
    console.log('[Firebase] Initialized with dummy config (google-services.json missing)');
  } catch (error) {
    console.warn('[Firebase] Manual initialization failed:', error.message);
  }
}

// --- CRITICAL: Register Component ASAP ---
// Hardcoding 'ColorOn' to match MainActivity.kt and avoid any potential app.json import issues
// Registering as 'main' to match MainActivity.kt
AppRegistry.registerComponent('main', () => App);
// Keeping 'ColorOn' as a backup just in case
AppRegistry.registerComponent('ColorOn', () => App);

// --- FCM Background / Killed Handler ---
try {
  const firebaseMessaging = messaging();
  if (firebaseMessaging) {
    firebaseMessaging.setBackgroundMessageHandler(async remoteMessage => {
      console.log('[FCM] Background message:', remoteMessage);

      const data = remoteMessage?.data || {};
      const title = remoteMessage?.notification?.title || data?.title || 'ColorOn Alert';
      const body = remoteMessage?.notification?.body || data?.body || 'New AI event';

      // 1. Create channel first to ensure it exists (e.g. after a phone reboot)
      await notifee.createChannel({
        id: 'alarm-channel',
        name: 'VMS Alarm Notifications',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });

      // 2. Display the notification
      await notifee.displayNotification({
        title,
        body,
        data,
        android: {
          channelId: 'alarm-channel',
          pressAction: { id: 'default' },
          importance: AndroidImportance.HIGH,
          sound: 'default',
        },
      });

      // 3. Save to AsyncStorage so it appears in the alarm history list upon opening the app
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

        const stored = await AsyncStorage.getItem('VMS_ALARMS');
        const history = stored ? JSON.parse(stored) : [];
        const newHistory = [newAlarm, ...history].slice(0, 200);
        await AsyncStorage.setItem('VMS_ALARMS', JSON.stringify(newHistory));
      } catch (err) {
        console.warn('[FCM] Failed to save background notification to history:', err.message);
      }
    });
  }
} catch (error) {
  console.warn('[FCM] Firebase messaging is not initialized. Please ensure google-services.json is present in android/app/. Error:', error.message);
}
