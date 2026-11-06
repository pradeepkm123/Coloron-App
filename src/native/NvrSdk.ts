import { NativeModules, requireNativeComponent, findNodeHandle } from 'react-native';

const { TVTSdkModule, DeviceSDK, NvrSdk: NvrSdkModule } = NativeModules;
export const CameraView = requireNativeComponent('CameraView');

// --- Types ---

export interface LoginParams {
  host: string;
  port: number;
  username: string;
  password: string;
  loginType?: number;
  sn?: string;
  isWifi?: boolean;
  protocol?: string;
}

export interface LoginResult {
  userId: number;
  channelCount: number;
  deviceInfo?: {
    deviceName?: string;
    serialNumber?: string;
    model?: string;
    version?: string;
    deviceType?: number;
    videoInputNum?: number;
    audioInputNum?: number;
    sensorInputNum?: number;
    sensorOutputNum?: number;
  };
}

export interface DeviceInfo {
  deviceName: string;
  serialNumber: string;
  model: string;
  version: string;
  channelCount: number;
  deviceType?: number;
}

// --- Exported Functions ---

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      console.warn(`[NvrSdk] Attempt ${i + 1} failed, retrying in ${delay}ms...`);
      if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
};

export const login = async (params: LoginParams): Promise<LoginResult> => {
  try {
    if (params.loginType === 2 && params.sn) {
      console.log(`[NvrSdk] SN Mode Override: Using DeviceSDK.loginBySN for ${params.sn}`);
      const isWifi = params.isWifi ?? false;
      const loginRes = await withRetry(() =>
        DeviceSDK.loginBySN(params.sn!, params.username, params.password, 2, isWifi)
      );

      if (loginRes && loginRes.userId >= 0) {
        console.log(`[NvrSdk] SN Login SUCCESS! userId: ${loginRes.userId}, channels: ${loginRes.channelCount}`);
        return {
          userId: loginRes.userId,
          channelCount: loginRes.channelCount || 16,
          deviceInfo: {
            deviceName: loginRes.deviceInfo?.deviceName || params.sn,
            serialNumber: loginRes.deviceInfo?.serialNumber || params.sn,
            model: loginRes.deviceInfo?.model || 'TVT P2P Device',
            version: '1.0.0',
            ...loginRes.deviceInfo
          }
        };
      }
      throw new Error("SN Login Failed at Native Layer");
    }

    console.log('[NvrSdk] Attempting IP/Domain login to:', params.host);
    const result = await withRetry(() => NvrSdkModule.login(params));

    if (result && result.userId >= 0) {
      console.log('[NvrSdk] Login Success:', result);
      return result;
    }
    return { userId: -1, channelCount: 0 };
  } catch (error) {
    console.warn('[NvrSdk] Login failed:', error);
    throw error;
  }
};

export const loginBySN = async (sn: string, user: string, pass: string, loginType: number = 2, isWifi: boolean = false): Promise<any> => {
  try {
    console.log(`[NvrSdk] loginBySN: ${sn} (type: ${loginType}, wifi: ${isWifi})`);
    const res = await DeviceSDK.loginBySN(sn, user, pass, loginType, isWifi);
    return res;
  } catch (e) {
    console.error('[NvrSdk] loginBySN error:', e);
    throw e;
  }
};

export const startPreview = async (channel: number, viewId: number | null): Promise<void> => {
  try {
    if (viewId === null) return;
    console.log(`[NvrSdk] startPreview channel ${channel} on view ${viewId}`);
    await DeviceSDK.startPreview(channel, viewId);
  } catch (e) {
    console.error('[NvrSdk] startPreview error:', e);
    throw e;
  }
};

export const logout = async (userId: number): Promise<void> => {
  try {
    await NvrSdkModule.logout(userId);
  } catch (error) {
    console.error('[NvrSdk] Logout Error:', error);
  }
};

export const enableAlarms = async (userId: number, channelId: number): Promise<boolean> => {
  try {
    console.log(`[NvrSdk] enableAlarms userId: ${userId}, CH: ${channelId}`);
    // Calling renamed native methods to avoid conflicts
    const r1 = TVTSdkModule && typeof TVTSdkModule.enableSmartSubscrib === 'function'
      ? await TVTSdkModule.enableSmartSubscrib(userId, channelId).catch(() => false)
      : false;

    // DeviceSDK version now expects a range (start, end)
    const start = channelId === -1 ? 0 : channelId;
    const end = channelId === -1 ? 16 : channelId + 1;
    const r2 = DeviceSDK && typeof DeviceSDK.enableDeviceAlarms === 'function'
      ? await DeviceSDK.enableDeviceAlarms(userId, start, end).catch(() => false)
      : false;

    return r1 || r2;
  } catch (e) {
    console.error('[NvrSdk] enableAlarms failed:', e);
    return false;
  }
};

export const getDeviceIPCInfo = async (userId: number): Promise<any[]> => {
  try {
    const list = await TVTSdkModule.getDeviceIPCInfo(userId);
    return list || [];
  } catch (error) {
    console.error('[NvrSdk] getDeviceIPCInfo Error:', error);
    return [];
  }
};

export const getDeviceInfo = async (userId: number): Promise<DeviceInfo> => {
  try {
    const info = await TVTSdkModule.getDeviceInfo(userId);
    return {
      deviceName: info.deviceName || 'TVT Device',
      serialNumber: info.serialNumber || '',
      model: info.model || 'TVT Model',
      version: info.version || info.softVersion || '1.0.0',
      channelCount: info.videoInputNum,
      deviceType: info.deviceType,
    };
  } catch (error) {
    console.error('[NvrSdk] GetDeviceInfo Error:', error);
    throw error;
  }
};

export const startLive = async (
  userId: number,
  channelId: number,
  streamType: 0 | 1,
): Promise<string> => {
  try {
    if (userId < 0) {
      console.warn('[NvrSdk] startLive called with invalid userId:', userId);
      return '-1';
    }
    console.log(`[NvrSdk] startLive userId: ${userId}, CH: ${channelId}`);
    const handle = await NvrSdkModule.startLive({
      userId,
      channelId,
      streamType,
    });
    return handle;
  } catch (e) {
    console.warn('[NvrSdk] startLive failed (will retry):', e);
    return '-1';
  }
};

export const stopLive = async (handle: string): Promise<void> => {
  try {
    console.log(`[NvrSdk] stopLive handle: ${handle}`);
    await NvrSdkModule.stopLive({ handle });
  } catch (e) {
    console.error('[NvrSdk] stopLive failed:', e);
  }
};

export const init = async (): Promise<void> => {
  await TVTSdkModule.initSDK();
};

export const cleanup = async (): Promise<void> => {
  await TVTSdkModule.cleanup();
};

export const getLocalIpAddress = async (): Promise<string> => {
  try {
    return await NvrSdkModule.getLocalIpAddress();
  } catch (e) {
    return '';
  }
};

export const checkConnect = async (
  host: string,
  port: number,
  timeout: number,
): Promise<boolean> => {
  try {
    console.log(`[NvrSdk] checkConnect to ${host}:${port}...`);
    return await NvrSdkModule.checkConnect(host, port, timeout);
  } catch (e) {
    return false;
  }
};

export const checkConnectEx = async (params: {
  host: string;
  port: number;
  timeout?: number;
}): Promise<boolean> => {
  try {
    return await NvrSdkModule.checkConnectEx(params);
  } catch (e) {
    return false;
  }
};

export const startLanSearch = async (params: {
  deviceType: number;
}): Promise<void> => {
  try {
    console.log('[NvrSdk] Starting LAN Search via NvrSdkModule');
    await NvrSdkModule.startLanSearch(params);
  } catch (e) {
    console.error('[NvrSdk] startLanSearch failed:', e);
  }
};

export const stopLanSearch = async (): Promise<void> => {
  try {
    console.log('[NvrSdk] Stopping LAN Search via NvrSdkModule');
    await NvrSdkModule.stopLanSearch();
  } catch (e) {
    console.error('[NvrSdk] stopLanSearch failed:', e);
  }
};

export const getDiscoveredDevices = async (): Promise<any[]> => {
  try {
    return await NvrSdkModule.getDiscoveredDevices();
  } catch (e) {
    console.error('[NvrSdk] getDiscoveredDevices failed:', e);
    return [];
  }
};

export const clearDiscoveredDevices = async (): Promise<void> => {
  try {
    await NvrSdkModule.clearDiscoveredDevices();
  } catch (e) {
    console.error('[NvrSdk] clearDiscoveredDevices failed:', e);
  }
};

export const searchDevices = async (
  type: number,
  timeout: number,
): Promise<any[]> => {
  try {
    console.log('[NvrSdk] Searching devices with type:', type);
    const timeoutBlocks = Math.floor(timeout / 100) || 30;
    return await NvrSdkModule.searchDevices({ deviceType: type, timeout: timeoutBlocks });
  } catch (e) {
    console.error('[NvrSdk] searchDevices failed:', e);
    return [];
  }
};

export const setNativeLog = async (enabled: boolean): Promise<boolean> => {
  try {
    return await TVTSdkModule.setNativeLog(enabled);
  } catch (e) {
    console.error('[NvrSdk] setNativeLog failed:', e);
    return false;
  }
};

export const setNat2Addr = async (
  host: string,
  port: number,
): Promise<void> => {
  // This is now handled internally in login flow
};

export const getChannels = async (userId: number): Promise<any[]> => {
  try {
    console.log('[NvrSdk] getChannels() calling native for user:', userId);
    const channels = await NvrSdkModule.getChannels({ userId });
    console.log(
      `[NvrSdk] Received ${channels?.length || 0} channels from native`,
    );
    return channels || [];
  } catch (e: any) {
    console.warn('[NvrSdk] getChannels native call failed:', e.message);
    return [];
  }
};

export const startBackgroundSimulation = (
  deviceName: string,
  deviceId: string,
  channelNames: string[],
) => {
  // Hidden simulation logs to avoid confusing user
};

export const ptzControl = async (
  userId: number,
  channelId: number,  // Camera channel index (0-based), NOT stream handle
  action: number,     // PTZ_ACTION.UP/DOWN/LEFT/RIGHT/STOP/ZOOM_IN/ZOOM_OUT
  speed: number,      // 1–8
) => {
  try {
    console.log('[NvrSdk] ptzControl', { userId, channelId, action, speed });
    return await NvrSdkModule.ptzControl({ userId, channelId, action, speed });
  } catch (e) {
    console.error('[NvrSdk] ptzControl failed:', e);
  }
};

export const ptzPreset = async (
  userId: number,
  channelId: number,  // Camera channel index (0-based), NOT stream handle
  command: number,    // PRESET_CMD.SET / GO / DEL
  presetIndex: number,
) => {
  try {
    console.log('[NvrSdk] ptzPreset', { userId, channelId, command, presetIndex });
    return await NvrSdkModule.ptzPreset({ userId, channelId, command, presetIndex });
  } catch (e) {
    console.error('[NvrSdk] ptzPreset failed:', e);
  }
};

export const PTZ_ACTION = {
  STOP: 0,
  LEFT: 1,
  RIGHT: 2,
  UP: 3,
  DOWN: 4,
  LEFT_UP: 5,
  LEFT_DOWN: 6,
  RIGHT_UP: 7,
  RIGHT_DOWN: 8,
  FOCUS_IN: 9,  // NEAR
  FOCUS_OUT: 10, // FAR
  ZOOM_OUT: 11,
  ZOOM_IN: 12,
  IRIS_OPEN: 13,
  IRIS_CLOSE: 14,
  LAMP_ON: 37,
  LAMP_OFF: 38,
  AUX_ON: 33,
  AUX_OFF: 34,
};

// Preset command codes — used with ptzPreset(), NOT ptzControl()
export const PRESET_CMD = {
  SET: 15,   // PTZ_CMD_PRESET_SET
  GO: 16,    // PTZ_CMD_PRESET_GO
  DEL: 17,   // PTZ_CMD_PRESET_DEL
};

export const startLocalRecord = async (
  handle: string | number,
  path: string,
  isLive?: boolean,
  userId?: number,
) => {
  try {
    return await NvrSdkModule.startLocalRecord({
      handle: String(handle),
      path,
      isLive,
      userId,
    });
  } catch (e) {
    console.error('[NvrSdk] startLocalRecord failed:', e);
    return false; // DO NOT throw, app should not close
  }
};

export const makeKeyFrame = async (userId: number, handle: string | number) => {
  try {
    return await TVTSdkModule.makeKeyFrame(userId, String(handle));
  } catch (e) {
    console.error('[NvrSdk] makeKeyFrame failed:', e);
    return false;
  }
};

export const stopLocalRecord = async (handle: string | number, isLive?: boolean) => {
  try {
    return await NvrSdkModule.stopLocalRecord({ handle: String(handle), isLive });
  } catch (e) {
    console.error('[NvrSdk] stopLocalRecord failed:', e);
  }
};

export const startTwoWayTalk = async (userId: number, channelId: number): Promise<string> => {
  try {
    console.log('[NvrSdk] startTwoWayTalk:', userId, channelId);
    return await NativeModules.NvrTalkModule.startTwoWayTalk(userId, channelId);
  } catch (e: any) {
    console.error('[NvrSdk] startTwoWayTalk failed:', e);
    throw e;
  }
};

export const startMicSend = async (): Promise<boolean> => {
  try {
    console.log('[NvrSdk] startMicSend');
    return await NativeModules.NvrTalkModule.startMicSend();
  } catch (e: any) {
    console.error('[NvrSdk] startMicSend failed:', e);
    throw e;
  }
};

export const stopMicSend = async (): Promise<boolean> => {
  try {
    console.log('[NvrSdk] stopMicSend');
    return await NativeModules.NvrTalkModule.stopMicSend();
  } catch (e: any) {
    console.error('[NvrSdk] stopMicSend failed:', e);
    throw e;
  }
};

export const stopTwoWayTalk = async (): Promise<boolean> => {
  try {
    console.log('[NvrSdk] stopTwoWayTalk');
    return await NativeModules.NvrTalkModule.stopTwoWayTalk();
  } catch (e: any) {
    console.error('[NvrSdk] stopTwoWayTalk failed:', e);
    throw e;
  }
};

// Aliases for compatibility
export const startTalk = async (userId: number) => {
  return await startTwoWayTalk(userId, 0);
};

export const stopTalk = async (handle: string) => {
  await stopTwoWayTalk();
};

export const listLocalFiles = async (folder: string): Promise<string[]> => {
  try {
    return await NvrSdkModule.listLocalFiles({ folder });
  } catch (e) {
    return [];
  }
};

export const deleteLocalFile = async (path: string): Promise<boolean> => {
  try {
    return await NvrSdkModule.deleteLocalFile(path);
  } catch (e) {
    return false;
  }
};

export const renameLocalFile = async (oldPath: string, newPath: string): Promise<boolean> => {
  try {
    return await NvrSdkModule.renameLocalFile({ oldPath, newPath });
  } catch (e) {
    return false;
  }
};

export const getVideoThumbnail = async (path: string): Promise<string | null> => {
  try {
    return await NvrSdkModule.getVideoThumbnail(path);
  } catch (e) {
    return null;
  }
};

export const startAudio = async (
  userId: number,
  channelId: number,
): Promise<boolean> => {
  return true;
};

export const stopAudio = async (
  userId: number,
  channelId: number,
): Promise<boolean> => {
  return true;
};

export const setAudioMute = async (
  handle: string,
  mute: boolean,
): Promise<boolean> => {
  try {
    return await playbackControl(handle, mute ? PLAYBACK_CMD.STOPAUDIO : PLAYBACK_CMD.STARTAUDIO);
  } catch (e) {
    return false;
  }
};

export const setOrientation = (orientation: number) => {
  console.log('[NvrSdk] Set orientation:', orientation);
  NvrSdkModule.setOrientation(orientation);
};

export const captureSnapshot = async (
  userId: number,
  channelId: number,
  path: string,
) => {
  try {
    return await NvrSdkModule.captureSnapshot({ userId, channelId, path });
  } catch (e) {
    return false;
  }
};

export const captureSnapshotWithHandle = async (userId: number, channelId: number, path: string, handle: string | number) => {
  try {
    return await NvrSdkModule.capturePlaybackSnapshot({ userId, channelId, path, handle: String(handle) });
  } catch (e) {
    console.error('[NvrSdk] captureSnapshotWithHandle failed:', e);
    throw e;
  }
};

export const capturePlaybackSnapshot = async (params: {
  handle: string | number;
  path: string;
  userId: number;
  channelId: number;
}) => {
  return await captureSnapshotWithHandle(params.userId, params.channelId, params.path, params.handle);
};

export const saveMediaToPublic = async (path: string, type: 'snapshot' | 'recording' | 'image' | 'video'): Promise<string> => {
  try {
    const result = await NvrSdkModule.saveMediaToPublic({ path, type });
    return typeof result === 'string' ? result : path;
  } catch (e) {
    console.warn('[NvrSdk] saveMediaToPublic failed:', e);
    return path; // Fall back to original path so caller can still scanFile
  }
};

export const scanFile = async (path: string): Promise<void> => {
  try {
    await NvrSdkModule.scanFile(path);
  } catch (e) { }
};

export const scanQRFromImage = async (path: string): Promise<string | null> => {
  try {
    if (!NvrSdkModule || !NvrSdkModule.scanQRFromImage) return null;
    const result = await NvrSdkModule.scanQRFromImage(path);
    return typeof result === 'string' && result.trim() ? result.trim() : null;
  } catch (e) {
    console.warn('[NvrSdk] scanQRFromImage failed:', e);
    return null;
  }
};

export const checkFileExists = async (path: string): Promise<boolean> => {
  try {
    return await NvrSdkModule.checkFileExists(path);
  } catch (e) {
    return false;
  }
};

export const getFileSize = async (path: string): Promise<number> => {
  try {
    return await NvrSdkModule.getFileSize(path);
  } catch (e) {
    return -1;
  }
};

export const getVideoEffect = async (userId: number, handle: string) => {
  try {
    return await NvrSdkModule.getVideoEffect({ userId, handle });
  } catch (e) {
    console.warn('[NvrSdk] getVideoEffect failed:', e);
    return { brightness: 50, contrast: 50, saturation: 50, hue: 50 };
  }
};

export const setVideoEffect = async (params: {
  userId: number;
  handle: string;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
}) => {
  try {
    return await TVTSdkModule.setVideoEffect(
      params.userId,
      params.handle,
      params.brightness,
      params.contrast,
      params.saturation,
      params.hue,
    );
  } catch (e) {
    console.error('[NvrSdk] setVideoEffect failed:', e);
  }
};

export const saveVideoEffect = async (params: {
  userId: number;
  handle: string;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
}) => {
  try {
    return await TVTSdkModule.saveVideoEffect(
      params.userId,
      params.handle,
      params.brightness,
      params.contrast,
      params.saturation,
      params.hue,
    );
  } catch (e) {
    console.error('[NvrSdk] saveVideoEffect failed:', e);
  }
};

// --- Playback Functions ---

export const findFiles = async (userId: number, channelId: number, startTime: string, endTime: string): Promise<any[]> => {
  try {
    return await TVTSdkModule.findFiles(userId, channelId, startTime, endTime);
  } catch (e) {
    console.error('[NvrSdk] findFiles failed:', e);
    return [];
  }
};

export const findTime = findFiles;

export const searchRecordings = async (userId: number, channelId: number, startTime: string, endTime: string, recordTypes?: number[]): Promise<any[]> => {
  try {
    return await NvrSdkModule.searchRecordings({
      userId,
      channelId,
      fromISO: startTime,
      toISO: endTime,
      recordTypes
    });
  } catch (e) {
    console.warn('[NvrSdk] searchRecordings failed:', e);
    return [];
  }
};

export const queryRecordingDays = async (userId: number, channelId: number, year: number, month: number): Promise<number[]> => {
  try {
    return await NvrSdkModule.queryRecordingDays({ userId, channelId, year, month });
  } catch (e) {
    console.warn('[NvrSdk] queryRecordingDays failed:', e);
    return [];
  }
};

export const startPlayback = async (userId: number, channelId: number, startTime: string, endTime: string, streamType: number = 1): Promise<any> => {
  try {
    return await NvrSdkModule.startPlayback({ userId, channelId, fromISO: startTime, toISO: endTime, streamType });
  } catch (e) {
    console.warn('[NvrSdk] startPlayback failed:', e);
    throw e;
  }
};

export const stopPlayback = async (handle: string): Promise<void> => {
  try {
    await NvrSdkModule.stopPlayback({ handle });
  } catch (e) {
    console.warn('[NvrSdk] stopPlayback failed:', e);
  }
};

export const playbackControl = async (handle: string, controlType: number, param: number = 0): Promise<boolean> => {
  try {
    return await NvrSdkModule.playbackControl({ handle, command: controlType, value: param });
  } catch (e) {
    console.warn('[NvrSdk] playbackControl failed:', e);
    return false;
  }
};

export const getPlaybackOsdTime = async (handle: string | number): Promise<{
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} | null> => {
  try {
    return await NvrSdkModule.getPlaybackOsdTime({ handle: String(handle) });
  } catch (e) {
    console.warn('[NvrSdk] getPlaybackOsdTime failed:', e);
    return null;
  }
};

// --- Push / Alarm Capabilities ---

export const getPushCapabilities = async (userId: number): Promise<{
  alarmTypes: Array<{
    alarmType: string;
    supportedChannels: number[];
  }>;
}> => {
  try {
    console.log(`[NvrSdk] getPushCapabilities for userId: ${userId}`);
    const caps = await TVTSdkModule.getPushCapabilities(userId);
    return caps || { alarmTypes: [] };
  } catch (e) {
    console.warn('[NvrSdk] getPushCapabilities failed:', e);
    return { alarmTypes: [] };
  }
};

export const getChannelAiCapabilities = async (userId: number, channelId: number): Promise<any> => {
  try {
    console.log(`[NvrSdk] getChannelAiCapabilities for User: ${userId}, CH: ${channelId}`);
    return await TVTSdkModule.getChannelAiCapabilities(userId, channelId);
  } catch (e) {
    console.warn('[NvrSdk] getChannelAiCapabilities failed:', e);
    return { channelId, motion: true };
  }
};

export const startAlarmMonitor = async (userId: number): Promise<boolean> => {
  try {
    console.log(`[NvrSdk] startAlarmMonitor for userId: ${userId}`);
    let success = false;
    if (TVTSdkModule.startAlarmMonitor) {
      await TVTSdkModule.startAlarmMonitor(userId);
      success = true;
    }
    if (DeviceSDK.startAlarmMonitor) {
      await DeviceSDK.startAlarmMonitor(userId);
      success = true;
    }
    return success;
  } catch (e) {
    console.warn('[NvrSdk] startAlarmMonitor failed', e);
    return false;
  }
};

export const stopAlarmMonitor = async (userId: number): Promise<boolean> => {
  try {
    console.log(`[NvrSdk] stopAlarmMonitor for userId: ${userId}`);
    if (TVTSdkModule.stopAlarmMonitor) {
      await TVTSdkModule.stopAlarmMonitor(userId);
    }
    return true;
  } catch (e) {
    console.warn('[NvrSdk] stopAlarmMonitor failed or not implemented natively, mocked true.', e);
    return true;
  }
};

export const savePushConfig = async (userId: number, config: any): Promise<boolean> => {
  try {
    console.log(`[NvrSdk] savePushConfig for userId: ${userId}`);
    const configStr = typeof config === 'string' ? config : JSON.stringify(config);
    return await TVTSdkModule.savePushConfig(userId, configStr);
  } catch (e) {
    console.error('[NvrSdk] savePushConfig failed:', e);
    return false;
  }
};

export const setBackendConfig = async (url: string, token: string): Promise<void> => {
  try {
    await TVTSdkModule.setBackendConfig(url, token);
  } catch (e) {
    console.error('[NvrSdk] setBackendConfig failed:', e);
  }
};

/**
 * Fetches device configuration using the TVT transparent config protocol.
 * @param userId  - Logged-in userId from sdk.login()
 * @param url     - Config URL e.g. "GetDeviceInfo", "GetNetConfig", "GetPPPoEConfig", etc.
 * @param xml     - Optional XML body (empty string for GET)
 * @returns Raw XML string response from the device
 */
export const transparentConfig = async (
  userId: number,
  url: string,
  xml: string = '',
): Promise<string> => {
  try {
    const result = await NvrSdkModule.transparentConfig({ userId, url, xml });
    return result || '';
  } catch (e: any) {
    console.warn(`[NvrSdk] transparentConfig(${url}) failed:`, e?.message);
    return '';
  }
};

/**
 * Applies device configuration using the TVT transparent config protocol.
 * @param userId  - Logged-in userId
 * @param url     - SET config URL e.g. "SetNetConfig", "SetPPPoEConfig"
 * @param xml     - Full XML body with the new config values
 */
export const setDeviceConfig = async (
  userId: number,
  url: string,
  xml: string,
): Promise<string> => {
  try {
    const result = await NvrSdkModule.setDeviceConfig({ userId, url, xml });
    return result || '';
  } catch (e: any) {
    console.error(`[NvrSdk] setDeviceConfig(${url}) failed:`, e?.message);
    throw e;
  }
};

export const startBackgroundService = async (): Promise<void> => {
  try {
    await TVTSdkModule.startBackgroundService();
  } catch (e) {
    console.error('[NvrSdk] startBackgroundService failed:', e);
  }
};

export const PLAYBACK_CMD = {
  STOP: 4,
  PLAY: 6,
  PAUSE: 0,
  RESUME: 3,
  STEP_FORW: 5,
  STEP_BACK: 11,
  FF: 1,
  RW: 2,
  SLOW: 8,
  STARTAUDIO: 7,
  STOPAUDIO: 8,
  VOLUME: 9,
};

export default {
  login,
  loginBySN,
  startPreview,
  logout,
  enableAlarms,
  startLive,
  stopLive,
  getDeviceInfo,
  getDeviceIPCInfo,
  init,
  cleanup,
  checkConnect,
  checkConnectEx,
  getLocalIpAddress,
  getDiscoveredDevices,
  clearDiscoveredDevices,
  setNativeLog,
  setNat2Addr,
  getChannels,
  startBackgroundSimulation,
  ptzControl,
  ptzPreset,
  PTZ_ACTION,
  PRESET_CMD,
  startLocalRecord,
  makeKeyFrame,
  stopLocalRecord,
  startTwoWayTalk,
  startMicSend,
  stopMicSend,
  stopTwoWayTalk,
  startTalk,
  stopTalk,
  setOrientation,
  startLanSearch,
  stopLanSearch,
  searchDevices,
  startAudio,
  stopAudio,
  setAudioMute,
  captureSnapshot,
  capturePlaybackSnapshot,
  captureSnapshotWithHandle,
  saveMediaToPublic,
  scanFile,
  scanQRFromImage,
  checkFileExists,
  getFileSize,
  listLocalFiles,
  deleteLocalFile,
  renameLocalFile,
  getVideoThumbnail,
  findFiles,
  findTime,
  searchRecordings,
  queryRecordingDays,
  startPlayback,
  stopPlayback,
  playbackControl,
  getPlaybackOsdTime,
  getPushCapabilities,
  getChannelAiCapabilities,
  startAlarmMonitor,
  startAlarmListener: startAlarmMonitor,
  stopAlarmMonitor,
  savePushConfig,
  setBackendConfig,
  transparentConfig,
  setDeviceConfig,
  startBackgroundService,
  PLAYBACK_CMD,
  openHelpPdf,
  getPdfPageCount,
};

export const PdfView = requireNativeComponent('PdfView') as any;

export const openHelpPdf = async (): Promise<boolean> => {
  try {
    if (NvrSdkModule && typeof NvrSdkModule.openHelpPdf === 'function') {
      return await NvrSdkModule.openHelpPdf();
    }
    console.warn('[NvrSdk] openHelpPdf is not implemented on this platform');
    return false;
  } catch (e) {
    console.error('[NvrSdk] openHelpPdf failed:', e);
    return false;
  }
};

export const getPdfPageCount = async (fileName: string): Promise<number> => {
  try {
    if (NvrSdkModule && typeof NvrSdkModule.getPdfPageCount === 'function') {
      return await NvrSdkModule.getPdfPageCount(fileName);
    }
    console.warn('[NvrSdk] getPdfPageCount is not implemented on this platform');
    return 0;
  } catch (e) {
    console.error('[NvrSdk] getPdfPageCount failed:', e);
    return 0;
  }
};


