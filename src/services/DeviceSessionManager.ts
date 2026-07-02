import NvrSdk from '../native/NvrSdk';
import { deviceStorage, Device } from '../utils/deviceStorage';
import { secureStore } from '../utils/secureStore';
import { tvtAlarmNotificationService } from './TvtAlarmNotificationService';
import NetInfo from "@react-native-community/netinfo";

interface ActiveSession {
  userId: number;
  lastActive: number;
  device: Device;
  alarmMonitorStarted: boolean;
}

class DeviceSessionManager {
  private sessions = new Map<string, ActiveSession>();
  private heartbeatInterval: any = null;
  private pendingSyncs = new Map<string, any>(); // Offline settings sync queue
  private loginPromises = new Map<string, Promise<number>>();
  private lastNetworkType: string | null = null;
  private netInfoSubscription: (() => void) | null = null;

  constructor() {
    this.startHeartbeat();
    this.setupNetworkListener();
  }

  /**
   * Load saved devices and their connectivity state
   */
  async loadSavedDevices(): Promise<Device[]> {
    console.log('[DeviceSession] Loading saved devices...');
    const devices = await deviceStorage.getDevices();
    console.log(`[DeviceSession] Loaded ${devices.length} saved device(s)`);
    return devices;
  }

  /**
   * Perform background login for selected/recent devices without blocking UI
   */
  async autoLoginRecentDevices(devices: Device[]) {
    // Auto-login up to 4 recent/active devices in background
    const recent = devices.slice(0, 4);
    for (const dev of recent) {
      const devId = String(dev.id);
      console.log(`[DeviceSession] Background silent login for device: ${dev.name} (${devId})`);
      this.ensureSession(devId).then((userId) => {
        if (userId >= 0) {
          console.log(`[DeviceSession] Silent auto-login succeeded for device: ${dev.name}, userId: ${userId}`);
          this.updateDeviceOnlineStatus(devId, 'Online', userId);
          // Auto start alarm monitoring on successful login
          this.startAlarmMonitor(devId).catch((err) => {
            console.warn(`[DeviceSession] Failed to start alarm monitor for ${devId}:`, err);
          });
        } else {
          this.updateDeviceOnlineStatus(devId, 'Offline', -1);
        }
      }).catch((e) => {
        console.warn(`[DeviceSession] Silent auto-login failed for device ${dev.name}:`, e.message);
        this.updateDeviceOnlineStatus(devId, 'Offline', -1);
      });
    }
  }

  /**
   * Get the active SDK userId for a device if session is active
   */
  getUserId(deviceId: string): number | null {
    const session = this.sessions.get(deviceId);
    if (session && session.userId >= 0) {
      console.log(`[DeviceSession] Reusing existing SDK session for device ${deviceId}, userId: ${session.userId}`);
      return session.userId;
    }
    return null;
  }

  /**
   * Ensure a valid SDK session exists, re-logging in if necessary
   */
  async ensureSession(deviceId: string): Promise<number> {
    const session = this.sessions.get(deviceId);
    const now = Date.now();

    // 1. Reuse existing session if it is fresh (within 30 seconds)
    if (session && session.userId >= 0 && (now - session.lastActive < 30000)) {
      session.lastActive = now;
      return session.userId;
    }

    // 2. Validate existing session if older than 30 seconds
    if (session && session.userId >= 0) {
      try {
        // Quick verification call
        await NvrSdk.getDeviceInfo(session.userId);
        session.lastActive = now;
        return session.userId;
      } catch (e) {
        console.log(`[DeviceSession] Session expired for device ${deviceId}, re-login`);
        this.sessions.delete(deviceId);
      }
    }

    // 3. Login or Re-login silently
    return await this.loginDevice(deviceId);
  }

  /**
   * Perform login for device and cache session
   */
  async loginDevice(deviceId: string): Promise<number> {
    const existing = this.loginPromises.get(deviceId);
    if (existing) {
      console.log(`[DeviceSession] Reusing active login promise for device ${deviceId}`);
      return existing;
    }

    const promise = (async () => {
      try {
        const devices = await deviceStorage.getDevices();
        // Handle NVR channel ID format (e.g. parentId_chX)
        const baseId = deviceId.includes('_ch') ? deviceId.split('_ch')[0] : deviceId;
        const device = devices.find(d => String(d.id) === String(baseId));

        if (!device) {
          throw new Error(`Device profile not found for id: ${deviceId}`);
        }

        // Fetch password securely
        let securePassword = await secureStore.getPassword(baseId) || device.nvrPassword || device.password || '123456';
        if (securePassword === '*****') {
          securePassword = '123456';
        }
        const username = device.nvrUsername || device.username || 'admin';
        const isP2P = device.connectMode === 'P2P' || device.type === 'Serial Number' || !device.ip;

        // NetInfo to detect connectivity details
        const netInfo = await NetInfo.fetch();
        const isWifi = netInfo.type === 'wifi';

        // Setup login parameters
        const loginParams = {
          host: isP2P ? 'c2020.autonat.com' : device.ip,
          port: isP2P ? 7968 : Number(device.port || (device.protocol === 'ONVIF' ? 80 : 6036)),
          username,
          password: securePassword,
          loginType: isP2P ? 2 : (device.protocol === 'ONVIF' ? 3 : 0),
          sn: device.deviceId || device.sn || '',
          isWifi,
        };

        console.log(`[DeviceSession] Attempting SDK Login for: ${device.name} (IP: ${loginParams.host}, Port: ${loginParams.port})`);
        
        // Ensure SDK is initialized
        try {
          await NvrSdk.init();
        } catch (e) {}

        const loginRes = await NvrSdk.login(loginParams);

        if (loginRes && loginRes.userId >= 0) {
          console.log(`[DeviceSession] Login success for device ${device.name}, userId: ${loginRes.userId}`);
          
          // Cache the session
          this.sessions.set(deviceId, {
            userId: loginRes.userId,
            lastActive: Date.now(),
            device,
            alarmMonitorStarted: false
          });

          this.updateDeviceOnlineStatus(deviceId, 'Online', loginRes.userId);

          // Auto start alarm monitoring on successful login to ensure notifications are armed
          this.startAlarmMonitor(deviceId).catch((err) => {
            console.warn(`[DeviceSession] Failed to start alarm monitor automatically for ${deviceId}:`, err);
          });

          // Execute queued settings syncs if any
          this.flushPendingSyncs(deviceId, loginRes.userId);

          return loginRes.userId;
        } else {
          throw new Error("SDK login call returned invalid userId");
        }
      } catch (err: any) {
        console.warn(`[DeviceSession] Login failed for device ${deviceId}:`, err.message);
        this.updateDeviceOnlineStatus(deviceId, 'Offline', -1);
        return -1;
      }
    })();

    this.loginPromises.set(deviceId, promise);
    promise.finally(() => {
      this.loginPromises.delete(deviceId);
    });

    return promise;
  }

  /**
   * Explicitly reconnect device
   */
  async reconnectDevice(deviceId: string): Promise<number> {
    console.log(`[DeviceSession] Reconnecting device: ${deviceId}`);
    this.logoutDevice(deviceId);
    return await this.ensureSession(deviceId);
  }

  /**
   * Logout device and clear session
   */
  async logoutDevice(deviceId: string) {
    const session = this.sessions.get(deviceId);
    if (session) {
      console.log(`[DeviceSession] Logging out device ${deviceId}, userId: ${session.userId}`);
      try {
        if (session.alarmMonitorStarted) {
          await tvtAlarmNotificationService.stopMonitoringForDevice(deviceId);
        }
        await NvrSdk.logout(session.userId);
      } catch (e) {
        console.warn(`[DeviceSession] Logout error:`, e);
      }
      this.sessions.delete(deviceId);
      this.updateDeviceOnlineStatus(deviceId, 'Offline', -1);
    }
  }

  /**
   * Fetch device channels through persistent session
   */
  async getChannels(deviceId: string): Promise<any[]> {
    const userId = await this.ensureSession(deviceId);
    if (userId < 0) return [];
    try {
      const channels = await NvrSdk.getChannels(userId);
      return channels || [];
    } catch (e) {
      console.warn(`[DeviceSession] getChannels failed for device ${deviceId}:`, e);
      return [];
    }
  }

  /**
   * Start live video preview using persistent session
   */
  async startLive(deviceId: string, channelId: number, streamType: 0 | 1): Promise<string> {
    const userId = await this.ensureSession(deviceId);
    if (userId < 0) {
      console.warn(`[LiveView] Failed to start live for ${deviceId} - no active session`);
      return '-1';
    }
    console.log(`[LiveView] Starting live using persistent session for CH ${channelId} (stream: ${streamType})`);
    return await NvrSdk.startLive(userId, channelId, streamType);
  }

  /**
   * Start playback video using persistent session
   */
  async startPlayback(deviceId: string, channelId: number, startTime: string, endTime: string, streamType: number = 1): Promise<any> {
    const userId = await this.ensureSession(deviceId);
    if (userId < 0) {
      throw new Error(`[Playback] Failed to start playback - no active session`);
    }
    console.log(`[Playback] Searching recordings using persistent session for CH ${channelId}`);
    try {
      return await NvrSdk.startPlayback(userId, channelId, startTime, endTime, streamType);
    } catch (err: any) {
      console.warn(`[Playback] Playback start failed:`, err.message);
      // Auto-retry once on expiry
      console.log(`[Playback] Auto login again due to failed session...`);
      const newUserId = await this.reconnectDevice(deviceId);
      if (newUserId >= 0) {
        return await NvrSdk.startPlayback(newUserId, channelId, startTime, endTime, streamType);
      }
      throw err;
    }
  }

  /**
   * Stop video stream preview
   */
  async stopLive(handle: string): Promise<void> {
    try {
      await NvrSdk.stopLive(handle);
    } catch (e) {
      console.warn(`[LiveView] stopLive failed:`, e);
    }
  }

  /**
   * Start alarm monitoring for device
   */
  async startAlarmMonitor(deviceId: string): Promise<boolean> {
    const session = this.sessions.get(deviceId);
    if (session && session.alarmMonitorStarted) {
      return true;
    }

    const userId = await this.ensureSession(deviceId);
    if (userId < 0) return false;

    const freshSession = this.sessions.get(deviceId);
    if (freshSession && !freshSession.alarmMonitorStarted) {
      console.log(`[Alarm] Monitor started for device: ${deviceId}`);
      try {
        const devProfile = freshSession.device;
        await tvtAlarmNotificationService.startMonitoringForDevice({
          ...devProfile,
          userId,
          loginId: userId,
          // Ensure channelCount is always available so the service can build a
          // fallback channel-id list when device.channels is empty (e.g. first login)
          channelCount: devProfile.channelCount || (devProfile.channels?.length) || 16,
        });
        freshSession.alarmMonitorStarted = true;
        return true;
      } catch (err) {
        console.warn(`[Alarm] Start alarm monitor failed:`, err);
        return false;
      }
    }
    return true;
  }

  /**
   * Queue setting updates if backend is offline, and sync via SDK
   */
  async updatePushSettingsWithQueue(deviceId: string, settingsPayload: any, updateBackendApi: () => Promise<any>): Promise<boolean> {
    console.log(`[DeviceSession] Updating settings for ${deviceId}`);
    let sdkSuccess = false;

    try {
      const userId = await this.ensureSession(deviceId);
      if (userId >= 0) {
        // Enumerate and enable alarms on SDK side for all channels
        const channels = settingsPayload.channels || [];
        for (const ch of channels) {
          const chId = typeof ch.channelId === 'number' ? ch.channelId : Number(ch.id);
          await NvrSdk.enableAlarms(userId, chId);
        }
        
        // Sync smart alarms via TvtAlarmNotificationService
        await tvtAlarmNotificationService.applyPushSettingsForDevice(deviceId, settingsPayload);

        sdkSuccess = true;
        console.log(`[DeviceSession] Enabled alarms on SDK side for all channels and updated smart subscriptions`);
      }
    } catch (e: any) {
      console.warn(`[DeviceSession] SDK alarms enable/sync failed:`, e.message);
    }

    try {
      await updateBackendApi();
      console.log(`[DeviceSession] Backend settings sync succeeded`);
      return true;
    } catch (err: any) {
      console.warn(`[DeviceSession] Backend settings sync failed (Network request failed). Queueing for retry.`);
      
      // Queue backend sync for retry
      this.pendingSyncs.set(deviceId, { settingsPayload, updateBackendApi });

      // Mark success only if the SDK-side alarm enable succeeded
      return sdkSuccess;
    }
  }

  private flushPendingSyncs(deviceId: string, userId: number) {
    const pending = this.pendingSyncs.get(deviceId);
    if (pending) {
      console.log(`[DeviceSession] Retrying pending settings sync for device ${deviceId}`);
      pending.updateBackendApi().then(() => {
        console.log(`[DeviceSession] Flushed pending settings for ${deviceId}`);
        this.pendingSyncs.delete(deviceId);
      }).catch((e: any) => {
        console.warn(`[DeviceSession] Retrying pending settings sync failed again:`, e.message);
      });
    }
  }

  /**
   * Heartbeat to keep session alive with lightweight checks
   */
  private startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(async () => {
      const now = Date.now();
      for (const [deviceId, session] of this.sessions.entries()) {
        if (session.userId >= 0) {
          // If inactive for > 60s, do a lightweight keepalive check
          if (now - session.lastActive > 60000) {
            try {
              // Lightweight SDK check
              await NvrSdk.getDeviceInfo(session.userId);
              session.lastActive = now;
            } catch (err) {
              console.log(`[DeviceSession] Heartbeat keepalive failed for ${deviceId}. Auto-relogin...`);
              this.loginDevice(deviceId).catch(() => {});
            }
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private async updateDeviceOnlineStatus(deviceId: string, status: 'Online' | 'Offline', loginId?: number) {
    try {
      const devices = await deviceStorage.getDevices();
      const baseId = deviceId.includes('_ch') ? deviceId.split('_ch')[0] : deviceId;
      const device = devices.find(d => String(d.id) === String(baseId));
      if (device) {
        let changed = false;
        if (device.status !== status) {
          device.status = status;
          changed = true;
        }

        const targetLoginId = (loginId !== undefined && loginId >= 0) ? loginId : undefined;
        if (device.loginId !== targetLoginId) {
          device.loginId = targetLoginId;
          changed = true;
        }

        if (changed) {
          await deviceStorage.updateDevice(device);
          console.log(`[DeviceSession] Device ${device.name} online/offline status/loginId updated. Status: ${status}, loginId: ${targetLoginId}`);
        }
      }
    } catch (e) {}
  }

  private setupNetworkListener() {
    NetInfo.fetch().then(state => {
      this.lastNetworkType = state.type;
    });

    this.netInfoSubscription = NetInfo.addEventListener(state => {
      const currentType = state.type;
      if (this.lastNetworkType !== null && this.lastNetworkType !== currentType) {
        console.log(`[DeviceSession] Network connection changed from ${this.lastNetworkType} to ${currentType}. Invalidating active sessions.`);
        this.handleNetworkChange(this.lastNetworkType, currentType);
      }
      this.lastNetworkType = currentType;
    });
  }

  private handleNetworkChange(oldType: string, newType: string) {
    const activeSessionsInfo = Array.from(this.sessions.entries()).map(([id, session]) => ({
      id,
      hadAlarmMonitor: session.alarmMonitorStarted
    }));

    // Invalidate/logout all sessions
    for (const { id } of activeSessionsInfo) {
      this.logoutDevice(id).catch((err) => {
        console.warn(`[DeviceSession] Logout failed for ${id} during network switch:`, err.message);
      });
    }

    // Automatically re-login and re-register alarm monitors on the new network interface
    for (const { id, hadAlarmMonitor } of activeSessionsInfo) {
      if (hadAlarmMonitor) {
        console.log(`[DeviceSession] Re-triggering alarm monitor for device ${id} on new network ${newType}`);
        this.startAlarmMonitor(id).catch((err) => {
          console.warn(`[DeviceSession] Failed to auto-restart alarm monitor for ${id} on network switch:`, err);
        });
      }
    }
  }

  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.netInfoSubscription) {
      this.netInfoSubscription();
      this.netInfoSubscription = null;
    }
    for (const deviceId of this.sessions.keys()) {
      this.logoutDevice(deviceId).catch(() => {});
    }
  }
}

export const deviceSessionManager = new DeviceSessionManager();
export default deviceSessionManager;
