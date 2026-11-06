import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { EventEmitter } from 'events';

class NetworkService extends EventEmitter {
  private isConnected: boolean = true;
  private connectionType: string = 'unknown';
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super();
  }

  public init() {
    if (this.unsubscribe) return;

    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const prevConnected = this.isConnected;
      const prevType = this.connectionType;

      this.isConnected = !!state.isConnected && !!state.isInternetReachable;
      this.connectionType = state.type;

      console.log(`[NetworkService] State Changed: Connected=${this.isConnected}, Type=${this.connectionType}`);

      // Emit status change event
      this.emit('networkChange', {
        isConnected: this.isConnected,
        type: this.connectionType,
        wasReconnected: !prevConnected && this.isConnected,
        isTypeSwitched: prevType !== 'unknown' && prevType !== this.connectionType && this.isConnected,
      });
    });
  }

  public destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public getConnectionType(): string {
    return this.connectionType;
  }
}

export const networkService = new NetworkService();
export default networkService;
