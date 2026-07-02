import { NativeEventEmitter, NativeModules, AppState, Platform, PermissionsAndroid } from 'react-native';
import notifee, { AndroidImportance, EventType, AndroidStyle } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deviceStorage } from '../utils/deviceStorage';
import { authStorage } from '../utils/authStorage';
import { alarmEmitter } from './AlarmService';
import { API_URL } from '../config/api';

const { TvtAlarmModule, TvtAlarmDatabaseModule } = NativeModules;

if (!TvtAlarmModule) {
  console.warn('[TvtAlarmNotificationService] TvtAlarmModule is not available in NativeModules.');
}

const tvtAlarmEmitter = TvtAlarmModule ? new NativeEventEmitter(TvtAlarmModule) : null;
const ALARM_STORAGE_KEY = 'VMS_ALARMS';

/**
 * Maps native SDK event type strings → PushConfig/DevicePushSetting eventSettings keys.
 */
const TYPE_MAPPING: Record<string, string> = {
  'HUMAN_DETECTION':   'human',
  'VEHICLE_DETECTION': 'vehicle',
  'FACE_DETECTION':    'faceDet',
  'FACE_RECOGNITION':  'faceRec',
  'MOTION':            'enabled',
  'SENSOR':            'sensor',
  'AUDIO_ABNORMAL':    'sensor',
  'LINE_CROSSING':     'line',
  'INTRUSION':         'intrusion',
  'LOITERING':         'loitering',
  'TAMPERING':         'tamper',
  'OFFLINE':           'offline',
};

/**
 * Maps PushConfig/DevicePushSetting eventSettings key → SDK alarmType string for subscription.
 */
const SETTINGS_KEY_TO_SDK_TYPE: Record<string, string | null> = {
  'faceDet':   'FACE_DETECTION',
  'faceRec':   'FACE_RECOGNITION',
  'face_det':  'FACE_DETECTION',
  'face_rec':  'FACE_RECOGNITION',
  'intrusion': 'INTRUSION',
  'line':      'INTRUSION',
  'loitering': 'INTRUSION',
  'human':     null,
  'vehicle':   null,
  'motion':    null,
  'enabled':   null,
  'sensor':    null,
  'tamper':    null,
  'tampering': null,
};

class TvtAlarmNotificationService {
  private isListening = false;
  private subscription: any = null;
  private navigationRef: any = null;

  setNavigationRef(ref: any) {
    this.navigationRef = ref;
  }

  async init() {
    try {
      // 1. Request POST_NOTIFICATIONS permission (Android 13+)
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'VMS requires notification permissions to alert you of real-time events.',
            buttonPositive: 'Allow',
          }
        );
        console.log('[TvtAlarmNotificationService] POST_NOTIFICATIONS granted:', granted);
      }

      // 2. Create Notifee high-importance channel
      await notifee.createChannel({
        id: 'vms_alarms',
        name: 'VMS AI Alarms',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });

      // 3. Register TVT_AI_EVENT listener
      if (tvtAlarmEmitter && !this.isListening) {
        this.subscription = tvtAlarmEmitter.addListener('TVT_AI_EVENT', (event) => {
          console.log('[AI-PUSH] TVT_AI_EVENT received:', JSON.stringify(event));
          this.handleTvtAiEvent(event);
        });
        this.isListening = true;
        console.log('[TvtAlarmNotificationService] ✅ TVT_AI_EVENT listener registered');
      }

      // 4. Notifee foreground tap handler
      notifee.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.PRESS && detail.notification?.data) {
          if (detail.notification.android?.channelId === 'vms_alarms') {
            this.handleNotificationTap(detail.notification.data);
          }
        }
      });
    } catch (e: any) {
      console.warn('[TvtAlarmNotificationService] Init failed:', e.message);
    }
  }

  async ensureAndGetPushSettings(deviceIdStr: string): Promise<any> {
    try {
      // 1. Try local cache first
      let savedSettings: any = null;
      const cached = await AsyncStorage.getItem(`@push_settings_${deviceIdStr}`);
      if (cached) {
        savedSettings = JSON.parse(cached);
      }

      // 2. Fetch from backend User Account settings to ensure complete sync
      const token = await authStorage.getToken();
      if (token) {
        try {
          const encodedId = encodeURIComponent(deviceIdStr);
          console.log(`[TvtAlarmNotificationService] Syncing push settings from User Account for device: ${deviceIdStr}`);
          const response = await fetch(`${API_URL}/devices/${encodedId}/settings`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const result = await response.json();
          if (result.success && result.settings && result.settings.channels) {
            savedSettings = result.settings;
            // Cache legacy format
            await AsyncStorage.setItem(`@push_settings_${deviceIdStr}`, JSON.stringify(savedSettings));

            // Also convert and cache flat format for screens like PushConfig
            const flatSettings: any = {};
            flatSettings['GLOBAL_PUSH'] = savedSettings.enabled !== false;
            if (savedSettings.global) {
              flatSettings['USER_SUBSCRIPTION'] = savedSettings.global.messageSubscription !== false;
            }
            if (savedSettings.system) {
              flatSettings['OFFLINE'] = savedSettings.system.offline !== false;
              flatSettings['ILLEGAL_ACCESS'] = savedSettings.system.access !== false;
            }

            // Group channels by event types
            const eventSettings: any = {
              HUMAN_DETECTION: [], VEHICLE_DETECTION: [], FACE_DETECTION: [], FACE_RECOGNITION: [],
              INTRUSION: [], LINE_CROSSING: [], LOITERING: [], CROWD_DETECTION: [],
              TAMPERING: [], MOTION: [], SENSOR: [],
            };
            (savedSettings.channels || []).forEach((ch: any) => {
              const chId = typeof ch.channelId === 'number' ? ch.channelId : parseInt(ch.channelId, 10);
              const oneBasedId = chId + 1;
              if (ch.human) eventSettings.HUMAN_DETECTION.push(oneBasedId);
              if (ch.vehicle) eventSettings.VEHICLE_DETECTION.push(oneBasedId);
              if (ch.faceDet || ch.face_det) eventSettings.FACE_DETECTION.push(oneBasedId);
              if (ch.faceRec || ch.face_rec) eventSettings.FACE_RECOGNITION.push(oneBasedId);
              if (ch.intrusion) eventSettings.INTRUSION.push(oneBasedId);
              if (ch.line) eventSettings.LINE_CROSSING.push(oneBasedId);
              if (ch.loitering) eventSettings.LOITERING.push(oneBasedId);
              if (ch.crowd) eventSettings.CROWD_DETECTION.push(oneBasedId);
              if (ch.tamper || ch.tampering) eventSettings.TAMPERING.push(oneBasedId);
              if (ch.motion) eventSettings.MOTION.push(oneBasedId);
              if (ch.sensor) eventSettings.SENSOR.push(oneBasedId);
            });

            Object.keys(eventSettings).forEach(key => {
              flatSettings[key] = eventSettings[key];
            });

            await AsyncStorage.setItem(`push_settings_${deviceIdStr}`, JSON.stringify(flatSettings));
            console.log(`[TvtAlarmNotificationService] Successfully synced settings from User Account for: ${deviceIdStr}`);
          }
        } catch (netErr: any) {
          console.warn('[TvtAlarmNotificationService] Backend sync failed, using cached settings:', netErr.message);
        }
      }
      return savedSettings;
    } catch (e: any) {
      console.warn('[TvtAlarmNotificationService] ensureAndGetPushSettings error:', e.message);
      return null;
    }
  }

  /**
   * Called when a device session starts. Registers device in native module
   * and applies any saved push settings.
   */
  async startMonitoringForDevice(device: any) {
    if (!TvtAlarmModule) return;
    try {
      const loginHandle = device.loginId !== undefined ? device.loginId : (device.userId || 0);
      const userId = device.userId || loginHandle;

      if (loginHandle < 0) {
        console.log(`[TvtAlarmNotificationService] Device ${device.name} not logged in — skipping.`);
        return;
      }

      const deviceIdStr = device.deviceId || String(device.id);
      console.log(`[TvtAlarmNotificationService] Starting monitoring: ${device.name} (${deviceIdStr})`);

      // ── Resolve channels ────────────────────────────────────────────────────
      // device.channels may be empty on first login (before getChannels has run).
      // Fall back to fetching live from the NVR SDK so every channel is covered.
      let channels: any[] = device.channels || [];
      if (channels.length === 0) {
        try {
          const NvrSdk = require('../native/NvrSdk').default;
          const liveChannels = await NvrSdk.getChannels(userId);
          if (Array.isArray(liveChannels) && liveChannels.length > 0) {
            channels = liveChannels;
            console.log(`[TvtAlarmNotificationService] Fetched ${channels.length} live channels for ${deviceIdStr}`);
          }
        } catch (chErr: any) {
          console.warn(`[TvtAlarmNotificationService] getChannels fallback failed:`, chErr.message);
        }
      }

      // Derive the numeric channel-id list; if still empty generate 0-based list
      // from the device's declared channelCount (default 16 for NVR).
      let channelIds: number[] = channels.map((c: any) =>
        typeof c.id === 'number' ? c.id : Number(c.id ?? c.channelId ?? 0)
      );
      if (channelIds.length === 0) {
        const count = device.channelCount || 16;
        channelIds = Array.from({ length: count }, (_, i) => i);
        console.log(`[TvtAlarmNotificationService] No channels available — assuming ${count}-ch NVR (ids 0–${count - 1})`);
      }

      await TvtAlarmModule.startAlarmService(
        deviceIdStr,
        device.name || device.deviceName || 'NVR',
        loginHandle,
        userId,
        device.type || (device.isNVR ? 'NVR' : 'IPC'),
        channelIds.length,
        JSON.stringify(channels)
      );

      // Load saved push settings from backend/local cache scope
      let savedSettings: any = null;
      try {
        savedSettings = await this.ensureAndGetPushSettings(deviceIdStr);
      } catch (err) {
        console.warn('[TvtAlarmNotificationService] Failed to load push settings cache:', err);
      }

      if (savedSettings) {
        await this.applyPushSettingsForDevice(deviceIdStr, savedSettings);
      } else {
        // No saved settings yet (brand-new device) — subscribe ALL smart event
        // types for every channel so the user receives notifications immediately.
        console.log(`[TvtAlarmNotificationService] No saved settings — subscribing all smart types for all ${channelIds.length} channels`);
        const smartTypes = [
          'FACE_DETECTION', 'FACE_RECOGNITION', 'INTRUSION',
          'LINE_CROSSING', 'LOITERING', 'CROWD_DETECTION',
          'VSD' // covers human + vehicle metadata
        ];
        const channelIdsJson = JSON.stringify(channelIds);
        for (const t of smartTypes) {
          await TvtAlarmModule.subscribeAlarm(deviceIdStr, t, channelIdsJson)
            .catch((e: any) => console.warn(`[TvtAlarmNotificationService] subscribeAlarm ${t} failed:`, e.message));
        }
      }
    } catch (e: any) {
      console.warn(`[TvtAlarmNotificationService] Error starting monitoring for ${device?.name}:`, e.message);
    }
  }

  async stopMonitoringForDevice(deviceId: string) {
    if (!TvtAlarmModule) return;
    try {
      await TvtAlarmModule.stopAlarmService(deviceId);
      console.log(`[TvtAlarmNotificationService] Stopped monitoring for ${deviceId}`);
    } catch (e: any) {
      console.warn(`[TvtAlarmNotificationService] Error stopping monitoring for ${deviceId}:`, e.message);
    }
  }

  /**
   * applyPushSettingsForDevice — called after saving PushConfig settings.
   * Groups channels by which smart alarm types need subscribe/unsubscribe.
   * Motion/Sensor/Human/Vehicle are always-on via SetupAlarmChan — no subscription needed.
   */
  async applyPushSettingsForDevice(deviceId: string, settings: any) {
    if (!TvtAlarmModule) return;
    try {
      console.log(`[TvtAlarmNotificationService] Applying push settings for device: ${deviceId}`);

      // Check global push master switch
      const isGlobalEnabled =
        settings?.global?.enablePush !== false &&
        settings?.global?.messageSubscription !== false &&
        settings?.enabled !== false;

      const channels: any[] = settings?.channels || [];

      // Build per-SDK-type active channel lists
      const subscribeMap: Record<string, number[]> = {};
      const unsubscribeMap: Record<string, number[]> = {};

      // Get all device channel IDs for inverse calculation
      const allDevices = await deviceStorage.getDevices();
      const dev = allDevices.find(
        d => String(d.id) === deviceId || String((d as any).deviceId) === deviceId
      );
      const allChannelIds: number[] = (dev?.channels || []).map((c: any) => Number(c.id));

      if (isGlobalEnabled) {
        channels.forEach((ch: any) => {
          const chId: number = ch.channelId !== undefined ? Number(ch.channelId) : Number(ch.id);

          const checkType = (key: string, field1: string, field2?: string) => {
            if (!subscribeMap[key]) subscribeMap[key] = [];
            if (!unsubscribeMap[key]) unsubscribeMap[key] = [];
            if (ch[field1] === true || (field2 && ch[field2] === true)) subscribeMap[key].push(chId);
            else unsubscribeMap[key].push(chId);
          };

          checkType('FACE_DETECTION', 'face_det', 'faceDet');
          checkType('FACE_RECOGNITION', 'face_rec', 'faceRec');
          checkType('INTRUSION', 'intrusion');
          checkType('LINE_CROSSING', 'line', 'line_crossing');
          checkType('LOITERING', 'loitering');
          checkType('CROWD_DETECTION', 'crowd', 'crowd_detection');
          checkType('TAMPERING', 'tamper', 'tampering');

          // Merge human and vehicle into VSD (both map to native type code 26)
          if (!subscribeMap['VSD']) subscribeMap['VSD'] = [];
          if (!unsubscribeMap['VSD']) unsubscribeMap['VSD'] = [];
          if (ch.human === true || ch.vehicle === true) {
            subscribeMap['VSD'].push(chId);
          } else {
            unsubscribeMap['VSD'].push(chId);
          }
        });
      } else {
        // Global off — unsubscribe everything
        const smartTypes = [
          'FACE_DETECTION', 'FACE_RECOGNITION', 'INTRUSION',
          'LINE_CROSSING', 'LOITERING', 'CROWD_DETECTION',
          'VSD', 'TAMPERING'
        ];
        smartTypes.forEach(sdkType => {
          unsubscribeMap[sdkType] = [...allChannelIds];
        });
      }

      // Execute subscriptions
      for (const [sdkType, channelIds] of Object.entries(subscribeMap)) {
        if (channelIds.length > 0) {
          console.log(`[TvtAlarmNotificationService] ➕ Subscribe ${sdkType} ch=[${channelIds}]`);
          await TvtAlarmModule.subscribeAlarm(deviceId, sdkType, JSON.stringify(channelIds))
            .catch((e: any) => console.warn(`[AI-PUSH] subscribeAlarm ${sdkType} err:`, e.message));
        }
      }

      // Execute unsubscriptions (only for channels NOT being subscribed)
      for (const [sdkType, channelIds] of Object.entries(unsubscribeMap)) {
        const alreadySubscribed = subscribeMap[sdkType] || [];
        const toUnsub = channelIds.filter(id => !alreadySubscribed.includes(id));
        if (toUnsub.length > 0) {
          console.log(`[TvtAlarmNotificationService] ➖ Unsubscribe ${sdkType} ch=[${toUnsub}]`);
          await TvtAlarmModule.unsubscribeAlarm(deviceId, sdkType, JSON.stringify(toUnsub))
            .catch((e: any) => console.warn(`[AI-PUSH] unsubscribeAlarm ${sdkType} err:`, e.message));
        }
      }

      console.log(`[TvtAlarmNotificationService] ✅ Push settings applied for ${deviceId}`);
    } catch (e: any) {
      console.warn(`[TvtAlarmNotificationService] Error applying settings for ${deviceId}:`, e.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Incoming alarm event handler (from TVT_AI_EVENT native emission)
  // ─────────────────────────────────────────────────────────────────────────
  private async handleTvtAiEvent(event: any) {
    // Log Raw SDK Alarm
    console.log('[AI-PUSH] 📥 Raw SDK Alarm Event Received:', JSON.stringify(event));

    let { deviceId, channelId, type, title, body, timestamp, deviceName, channelName, detailText, imageUri } = event;
    
    // Normalize Event Object
    type = (type || 'MOTION').toUpperCase();
    const eventTime = timestamp ? Number(timestamp) : Date.now();

    const isDeviceLevel = [
      'DISK_FULL',
      'DISK_IO_ERROR',
      'NO_DISK',
      'PULL_OUT_DISK',
      'IP_CONFLICT',
      'NETWORK_DISCONNECTION',
      'ILLEGAL_ACCESS'
    ].includes(type);

    if (isDeviceLevel) {
      channelId = 0;
      channelName = "Device Exception";
    }

    const normalizedEvent = {
      deviceId,
      deviceName: deviceName || 'NVR',
      channelId: Number(channelId),
      channelName: channelName || `CH ${Number(channelId) + 1}`,
      eventType: type,
      alarmTime: new Date(eventTime).toISOString()
    };
    console.log('[AI-PUSH] ⚙️ Normalized Event Object:', JSON.stringify(normalizedEvent));

    // 1. Filter: device exists
    const allDevices = await deviceStorage.getDevices();
    let dev = allDevices.find(
      d => String(d.id) === String(deviceId).trim() || String((d as any).deviceId) === String(deviceId).trim()
    );

    if (!dev) {
      console.log(`[AI-PUSH] 🔇 Ignored reason: Device ${deviceId} does not exist in local saved devices list.`);
      return;
    }
    
    // Set resolved metadata
    deviceId = dev.deviceId || String(dev.id);
    deviceName = dev.name || dev.deviceName || 'NVR';

    // 2. Filter: channel is active (if it is a channel-level event)
    if (!isDeviceLevel) {
      let isChannelActive = false;
      if (dev.activeChannels && dev.activeChannels.includes(Number(channelId) + 1)) {
        isChannelActive = true;
      } else if ((dev.channels || []).some((c: any) => Number(c.id) === Number(channelId))) {
        isChannelActive = true;
      } else {
        const chCount = dev.channelCount || (dev.channels ? dev.channels.length : 16);
        if (Number(channelId) >= 0 && Number(channelId) < chCount) {
          isChannelActive = true;
        }
      }

      if (!isChannelActive) {
        console.log(`[AI-PUSH] 🔇 Ignored reason: Channel ${channelId} is not active on device ${deviceId} (${deviceName}).`);
        return;
      }

      if (dev.channels) {
        const ch = dev.channels.find((c: any) => Number(c.id) === Number(channelId));
        if (ch) {
          channelName = ch.name || `CH ${Number(channelId) + 1}`;
        }
      }
      if (!channelName) {
        channelName = `CH ${Number(channelId) + 1}`;
      }
    }

    // ── Filter check against saved push settings ──
    let settings: any = null;
    try {
      settings = await this.ensureAndGetPushSettings(deviceId);
    } catch (err) {
      console.warn('[TvtAlarmNotificationService] Settings fetch error:', err);
    }

    // 3. Filter: event push is ON globally
    // When settings is null (brand-new device with no saved config), treat
    // everything as enabled so the user receives notifications immediately.
    if (settings === null) {
      console.log(`[AI-PUSH] ✅ No saved settings for ${deviceId} — allowing all events (new device default).`);
    } else {
      const globalEnabled =
        settings?.global?.enablePush !== false &&
        settings?.global?.messageSubscription !== false;
      if (!globalEnabled) {
        console.log(`[AI-PUSH] 🔇 Ignored reason: Push settings are OFF globally for device ${deviceId}.`);
        return;
      }
    }

    // 4. Filter: event type enabled
    let isTypeEnabled = false;

    if (settings === null) {
      // Brand-new device: no saved settings → allow all events through
      isTypeEnabled = true;
    } else if (isDeviceLevel) {
      if (type === 'ILLEGAL_ACCESS') {
        isTypeEnabled = settings?.global?.illegalAccess !== false && settings?.system?.access !== false;
      } else if (type === 'DISK_FULL') {
        isTypeEnabled = settings?.global?.diskFull !== false && settings?.system?.diskFull !== false;
      } else if (type === 'DISK_IO_ERROR') {
        isTypeEnabled = settings?.global?.diskError !== false && settings?.system?.rwError !== false;
      } else if (type === 'NO_DISK') {
        isTypeEnabled = settings?.global?.noDisk !== false && settings?.system?.noDisk !== false;
      } else if (type === 'PULL_OUT_DISK') {
        isTypeEnabled = settings?.global?.pullOutDisk !== false && settings?.system?.pullOutDisk !== false;
      } else if (type === 'IP_CONFLICT') {
        isTypeEnabled = settings?.global?.ipConflict !== false && settings?.system?.ipConflict !== false;
      } else if (type === 'NETWORK_DISCONNECTION') {
        isTypeEnabled = settings?.global?.networkDisconnection !== false && settings?.system?.networkDisconnection !== false;
      } else {
        isTypeEnabled = true;
      }
      if (!isTypeEnabled) {
        console.log(`[AI-PUSH] 🔇 Ignored reason: Exception type ${type} is disabled for ${deviceId}.`);
        return;
      }
    } else if (type === 'IPC_OFFLINE' || type === 'OFFLINE' || type === 'VIDEO_LOSS') {
      isTypeEnabled = settings?.global?.cameraOffline !== false && settings?.system?.offline !== false;
      if (!isTypeEnabled) {
        console.log(`[AI-PUSH] 🔇 Ignored reason: Offline status type ${type} is disabled for ${deviceId}.`);
        return;
      }
    } else {
      // Channel level AI/Motion/Sensor alarm
      const channelConfig = (settings?.channels || []).find(
        (ch: any) => {
          const chId = ch.channelId !== undefined ? Number(ch.channelId) : (ch.id !== undefined ? Number(ch.id) : -1);
          return chId === Number(channelId);
        }
      );

      if (!channelConfig) {
        // Fallback check against flat legacy settings
        try {
          const newCached = await AsyncStorage.getItem(`push_settings_${deviceId}`);
          if (newCached) {
            const newSettings = JSON.parse(newCached);
            // newSettings is flat: { HUMAN_DETECTION: [1, 2, 3], ... }
            const enabledChannels = newSettings[type];
            if (Array.isArray(enabledChannels)) {
              isTypeEnabled = enabledChannels.includes(Number(channelId) + 1);
            } else {
              isTypeEnabled = true; // Default to true if not explicitly restricted
            }
          } else {
            isTypeEnabled = true; // Default to true if no cached settings exist
          }
        } catch (err) {
          console.warn('[AI-PUSH] Flat settings check error:', err);
          isTypeEnabled = true;
        }
      } else {
        const typeKeyMap: Record<string, string[]> = {
          MOTION: ['enabled', 'motion'],
          HUMAN_DETECTION: ['human'],
          VEHICLE_DETECTION: ['vehicle'],
          FACE_DETECTION: ['faceDet', 'face_det'],
          FACE_RECOGNITION: ['faceRec', 'face_rec'],
          LINE_CROSSING: ['line', 'line_crossing'],
          INTRUSION: ['intrusion'],
          LOITERING: ['loitering'],
          CROWD_DETECTION: ['crowd', 'crowd_detection'],
          TAMPERING: ['tamper', 'tampering'],
          SENSOR: ['sensor']
        };

        const keys = typeKeyMap[type] || [type.toLowerCase()];
        // Default to enabled (true) if setting key is undefined/null; only disable if explicitly false
        isTypeEnabled = keys.some(k => channelConfig[k] !== false);
      }

      if (!isTypeEnabled) {
        console.log(`[AI-PUSH] 🔇 Ignored reason: Event type ${type} is disabled for channel ${channelId} on device ${deviceId}.`);
        return;
      }
    }

    // Format Title & Body like SuperLive Plus
    const eventTypeUpper = type.toUpperCase();
    if (eventTypeUpper === 'MOTION') {
      title = 'Motion Alarm';
    } else if (
      eventTypeUpper === 'OFFLINE' || 
      eventTypeUpper === 'CAMERA_OFFLINE' || 
      eventTypeUpper === 'VIDEO_LOSS' || 
      eventTypeUpper === 'IPC_OFFLINE'
    ) {
      title = 'IPC Offline';
    } else if (eventTypeUpper === 'SENSOR') {
      title = 'Sensor Alarm';
    } else if (eventTypeUpper === 'TAMPERING') {
      title = 'Tampering Alarm';
    } else {
      title = eventTypeUpper
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c: string) => c.toUpperCase()) + ' Alert';
    }

    body = `${deviceName}-${channelName}`;

    // ── Show notification via Notifee IMMEDIATELY (non-blocking) ────────────
    console.log(`[AI-PUSH] 🔔 Notification Displayed: Title="${title}" Body="${body}"`);
    notifee.displayNotification({
      title,
      body,
      data: {
        deviceId,
        channelId: String(channelId),
        deviceName,
        type,
        timestamp: String(eventTime),
        imageUri: imageUri || '',
      },
      android: {
        channelId: 'vms_alarms',
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'default' },
        style: imageUri ? {
          type: AndroidStyle.BIGPICTURE,
          picture: imageUri,
        } : undefined,
      },
    }).catch(err => console.warn('[AI-PUSH] Notifee display failed:', err));

    // ── Save to local alarm history (asynchronously) ────────────────────────
    (async () => {
      try {
        const storageKey = await authStorage.getAlarmStorageKey();
        const stored = await AsyncStorage.getItem(storageKey);
        const history = stored ? JSON.parse(stored) : [];
        const newAlarm = {
          id: `${eventTime}_${Math.random().toString(36).substr(2, 5)}`,
          displayTitle: title,
          displayBody: body,
          deviceId,
          channelId,
          deviceName,
          channelName,
          type,
          timestamp: eventTime,
          read: false,
          detailText: detailText || '',
          imageUri: imageUri || '',
          plate: event.plate || '',
        };
        const newHistory = [newAlarm, ...history].slice(0, 200);
        await AsyncStorage.setItem(storageKey, JSON.stringify(newHistory));

        // ── Save to SQLite database table AI_EVENTS ───────────
        if (TvtAlarmDatabaseModule && TvtAlarmDatabaseModule.saveEvent) {
          try {
            let parsedName = '';
            let parsedConfidence = 0;
            if (newAlarm.type === 'FACE_RECOGNITION') {
              const nameMatch = newAlarm.detailText.match(/Matched:\s*([^(]+)/);
              if (nameMatch) {
                parsedName = nameMatch[1].trim();
              }
              const confMatch = newAlarm.detailText.match(/\((\d+)%\s*match\)/);
              if (confMatch) {
                parsedConfidence = parseInt(confMatch[1], 10);
              }
            }

            let enrichedRole = '';
            if (newAlarm.type === 'FACE_RECOGNITION' && parsedName) {
              const { personStorage } = require('../utils/personStorage');
              const persons = await personStorage.getPersons();
              const matched = persons.find((p: any) => p.name.toUpperCase() === parsedName.toUpperCase());
              if (matched) {
                enrichedRole = matched.role;
              }
            } else if (newAlarm.type === 'VEHICLE_DETECTION' && newAlarm.plate) {
              const { anprStorage } = require('../utils/anprStorage');
              const plates = await anprStorage.getPlates();
              const matched = plates.find((p: any) => p.plateNumber.toUpperCase() === newAlarm.plate.toUpperCase());
              if (matched) {
                enrichedRole = matched.group;
                parsedName = matched.ownerName; // For vehicle detection, map ownerName as "name"
              }
            }

            await TvtAlarmDatabaseModule.saveEvent({
              id: newAlarm.id,
              type: newAlarm.type,
              name: parsedName,
              plate: newAlarm.plate,
              channel: newAlarm.channelId,
              deviceSn: newAlarm.deviceId,
              eventTime: newAlarm.timestamp,
              snapshotPath: newAlarm.imageUri,
              confidence: parsedConfidence,
              role: enrichedRole,
              status: 'unread'
            });
            console.log('[AI-PUSH] Event saved to SQLite successfully.');
          } catch (dbErr: any) {
            console.error('[AI-PUSH] SQLite save event error:', dbErr.message);
          }
        }

        // ── Emit for active UI listeners ───────────
        alarmEmitter.emit('new_alarm', newAlarm);
      } catch (err: any) {
        console.warn('[AI-PUSH] Local alarm history save failed:', err.message);
      }
    })();

    // ── Send to Backend Notification Server (asynchronously) ─────────────────
    (async () => {
      try {
        const token = await authStorage.getToken();
        if (token) {
          await fetch(`${API_URL}/events`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              deviceId,
              channelId: String(channelId),
              type,
              timestamp: new Date(eventTime).toISOString(),
              snapshotUrl: imageUri || '',
              deviceName,
              channelName,
              features: { detailText: detailText || '' }
            }),
          });
        }
      } catch (e: any) {
        console.warn('[AI-PUSH] Backend sync failed:', e.message);
      }
    })();
  }

  /** camelCase converter: face_det → faceDet */
  private camelize(s: string): string {
    return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }

  async handleNotificationTap(data: any) {
    if (!data || !this.navigationRef) return;
    try {
      const alarmTime = data.timestamp ? Number(data.timestamp) : (data.eventTime ? new Date(data.eventTime).getTime() : Date.now());
      const eventType = data.type || data.eventType || 'MOTION';
      const adjustedStartTime = alarmTime - 20000; // 20 seconds before
      const adjustedEndTime = alarmTime + 60000;   // 60 seconds after

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
        console.warn('[TvtAlarmNotificationService] Failed to resolve deviceId:', err);
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
        eventType: eventType,
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
    } catch (e: any) {
      console.warn('[TvtAlarmNotificationService] Navigation on tap failed:', e.message);
    }
  }

  cleanup() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.isListening = false;
  }
}

export const tvtAlarmNotificationService = new TvtAlarmNotificationService();
