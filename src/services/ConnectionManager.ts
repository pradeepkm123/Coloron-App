import { EventEmitter } from 'events';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { deviceSessionManager } from './DeviceSessionManager';

export type ConnectionState = 'CONNECTED' | 'RECONNECTING' | 'OFFLINE';

export interface ConnectionEvent {
  state: ConnectionState;
  networkType: string;
  isInternetReachable: boolean;
  wasReconnected: boolean;
  isTypeSwitched: boolean;
}

export interface DeviceStatusEvent {
  deviceId: string;
  status: 'Online' | 'Offline' | 'Reconnecting';
  userId: number;
}

class ConnectionManager extends EventEmitter {
  private state: ConnectionState = 'CONNECTED';
  private currentNetworkType: string = 'unknown';
  private isInternetReachable: boolean = true;
  private isReconnecting: boolean = false;
  private reconnectTimer: any = null;
  private retryAttempt: number = 0;
  private maxRetries: number = 5;
  private retryDelays: number[] = [2000, 5000, 10000, 20000, 30000];
  
  private activeDevices: Set<string> = new Set();
  private netInfoUnsubscribe: (() => void) | null = null;

  constructor() {
    super();
    this.setMaxListeners(30);
  }

  public init() {
    if (this.netInfoUnsubscribe) return;

    console.log('[ConnectionManager] Initializing connection monitoring...');
    
    this.netInfoUnsubscribe = NetInfo.addEventListener((netState: NetInfoState) => {
      this.handleNetworkStateChange(netState);
    });

    // Fetch initial state
    NetInfo.fetch().then((netState) => {
      this.currentNetworkType = netState.type;
      this.isInternetReachable = netState.isConnected !== false && netState.isInternetReachable !== false;
      this.state = this.isInternetReachable ? 'CONNECTED' : 'OFFLINE';
      console.log(`[ConnectionManager] Initial state: State=${this.state}, Type=${this.currentNetworkType}`);
    });
  }

  private handleNetworkStateChange(netState: NetInfoState) {
    const prevType = this.currentNetworkType;
    const prevConnected = this.isInternetReachable;
    const prevState = this.state;

    const isConnected = !!netState.isConnected && netState.isInternetReachable !== false;
    const currentType = netState.type;

    this.currentNetworkType = currentType;
    this.isInternetReachable = isConnected;

    const isTypeSwitched = prevType !== 'unknown' && prevType !== currentType && isConnected;
    const isReconnected = !prevConnected && isConnected;

    console.log(`[ConnectionManager] Network Change Detected: Type=${prevType} -> ${currentType}, Connected=${isConnected}, TypeSwitched=${isTypeSwitched}`);

    if (!isConnected) {
      this.state = 'OFFLINE';
      this.isReconnecting = false;
      this.clearReconnectTimer();
      console.log('[ConnectionManager] Network Lost -> State: OFFLINE');
      this.emitConnectionChange(false, isTypeSwitched);
      return;
    }

    if (isTypeSwitched || isReconnected || prevState === 'OFFLINE') {
      console.log('[ConnectionManager] Network Restored/Switched -> Triggering recovery workflow...');
      this.startRecoveryWorkflow(isTypeSwitched || isReconnected);
    } else {
      this.state = 'CONNECTED';
      this.emitConnectionChange(false, false);
    }
  }

  public registerActiveDevice(deviceId: string) {
    if (!deviceId) return;
    this.activeDevices.add(deviceId);
    console.log(`[ConnectionManager] Registered active device for connection recovery: ${deviceId}`);
  }

  public unregisterActiveDevice(deviceId: string) {
    if (!deviceId) return;
    this.activeDevices.delete(deviceId);
    console.log(`[ConnectionManager] Unregistered device: ${deviceId}`);
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public getNetworkType(): string {
    return this.currentNetworkType;
  }

  public isConnected(): boolean {
    return this.isInternetReachable && this.state === 'CONNECTED';
  }

  /**
   * Start controlled reconnection workflow with exponential backoff
   */
  public async startRecoveryWorkflow(wasSwitchedOrReconnected: boolean = true) {
    if (this.isReconnecting) {
      console.log('[ConnectionManager] Recovery workflow already in progress. Skipping duplicate call.');
      return;
    }

    this.isReconnecting = true;
    this.state = 'RECONNECTING';
    this.emitConnectionChange(wasSwitchedOrReconnected, false);

    // Notify all active devices that reconnection is in progress
    for (const devId of this.activeDevices) {
      this.emit('deviceStatusChanged', {
        deviceId: devId,
        status: 'Reconnecting',
        userId: -1
      } as DeviceStatusEvent);
    }

    this.retryAttempt = 0;
    this.attemptReconnection(wasSwitchedOrReconnected);
  }

  private async attemptReconnection(wasSwitchedOrReconnected: boolean) {
    console.log(`[ConnectionManager] Reconnection attempt ${this.retryAttempt + 1}/${this.maxRetries}...`);

    try {
      const activeDevList = Array.from(this.activeDevices);
      
      if (activeDevList.length === 0) {
        console.log('[ConnectionManager] No active devices registered to reconnect.');
        this.state = 'CONNECTED';
        this.isReconnecting = false;
        this.emitConnectionChange(wasSwitchedOrReconnected, true);
        return;
      }

      let successCount = 0;
      for (const devId of activeDevList) {
        try {
          console.log(`[ConnectionManager] Re-authenticating session for device ${devId}...`);
          const userId = await deviceSessionManager.reconnectDevice(devId);
          if (userId >= 0) {
            successCount++;
            console.log(`[ConnectionManager] Device ${devId} successfully re-authenticated (userId: ${userId})`);
            this.emit('deviceStatusChanged', {
              deviceId: devId,
              status: 'Online',
              userId
            } as DeviceStatusEvent);
          } else {
            console.warn(`[ConnectionManager] Device ${devId} re-login returned invalid userId`);
            this.emit('deviceStatusChanged', {
              deviceId: devId,
              status: 'Offline',
              userId: -1
            } as DeviceStatusEvent);
          }
        } catch (e: any) {
          console.warn(`[ConnectionManager] Device ${devId} reconnect error:`, e?.message || e);
        }
      }

      if (successCount > 0 || activeDevList.length === 0) {
        console.log(`[ConnectionManager] Reconnection successful (${successCount}/${activeDevList.length} devices online)`);
        this.state = 'CONNECTED';
        this.isReconnecting = false;
        this.retryAttempt = 0;
        this.emitConnectionChange(wasSwitchedOrReconnected, true);
        this.emit('recoveryRequested', { deviceId: undefined });
        return;
      }
    } catch (err: any) {
      console.warn('[ConnectionManager] Reconnection attempt failed:', err?.message || err);
    }

    // Schedule next retry if max retries not reached
    this.retryAttempt++;
    if (this.retryAttempt < this.maxRetries) {
      const delay = this.retryDelays[Math.min(this.retryAttempt, this.retryDelays.length - 1)];
      console.log(`[ConnectionManager] Scheduling retry attempt ${this.retryAttempt + 1} in ${delay}ms...`);
      this.clearReconnectTimer();
      this.reconnectTimer = setTimeout(() => {
        this.attemptReconnection(wasSwitchedOrReconnected);
      }, delay);
    } else {
      console.error('[ConnectionManager] Max reconnection attempts reached. Marking OFFLINE.');
      this.state = 'OFFLINE';
      this.isReconnecting = false;
      this.emitConnectionChange(false, false);
    }
  }

  public manualRetry() {
    console.log('[ConnectionManager] Manual retry requested by user.');
    this.clearReconnectTimer();
    this.isReconnecting = false;
    this.startRecoveryWorkflow(true);
  }

  private emitConnectionChange(wasReconnected: boolean, isTypeSwitched: boolean) {
    this.emit('connectionStateChanged', {
      state: this.state,
      networkType: this.currentNetworkType,
      isInternetReachable: this.isInternetReachable,
      wasReconnected,
      isTypeSwitched,
    } as ConnectionEvent);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public destroy() {
    this.clearReconnectTimer();
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    this.removeAllListeners();
  }
}

export const connectionManager = new ConnectionManager();
export default connectionManager;
