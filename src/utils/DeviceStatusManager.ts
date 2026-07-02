import { Device } from './deviceStorage';
import NetInfo from "@react-native-community/netinfo";
import NvrSdk from '../native/NvrSdk';

export type DeviceStatus = 'Online' | 'Offline' | 'Connecting';

export class DeviceStatusManager {
    private static intervals: Map<string, any> = new Map();
    private static statusCache: Map<string, DeviceStatus> = new Map();
    private static isConnectedToInternet: boolean = true;
    private static monitoredDevices: Map<string, Device> = new Map();

    /**
     * Initialize network monitoring
     */
    static init() {
        NetInfo.addEventListener(state => {
            const connected = !!state.isConnected;
            if (connected !== this.isConnectedToInternet) {
                this.isConnectedToInternet = connected;
            }
        });
    }

    static startMonitoring(
        device: Device,
        onStatusChange: (deviceId: string, status: DeviceStatus) => void
    ) {
        const deviceId = String(device.id);
        this.monitoredDevices.set(deviceId, device);

        // Initial check
        this.checkDeviceStatus(device).then(status => {
            this.updateStatus(deviceId, status, onStatusChange);
        });

        // If loop not running, start it
        if (!this.monitoringInterval) {
            this.startCentralLoop(onStatusChange);
        }
    }

    private static monitoringInterval: any = null;
    private static startCentralLoop(onStatusChange: (id: string, s: DeviceStatus) => void) {
        this.monitoringInterval = setInterval(async () => {
            if (!this.isConnectedToInternet) return;
            
            // Check all monitored devices sequentially or in small batches
            for (const [id, device] of this.monitoredDevices.entries()) {
                const status = await this.checkDeviceStatus(device);
                this.updateStatus(id, status, onStatusChange);
                // Tiny delay between devices to avoid network spike
                await new Promise<void>(resolve => setTimeout(() => resolve(), 100));
            }
        }, 60000); // Check all devices every 60s
    }

    private static updateStatus(deviceId: string, status: DeviceStatus, callback: (id: string, s: DeviceStatus) => void) {
        const prev = this.statusCache.get(deviceId);
        if (status !== prev) {
            this.statusCache.set(deviceId, status);
            callback(deviceId, status);
        }
    }

    static stopMonitoring(deviceId: string) {
        const interval = this.intervals.get(deviceId);
        if (interval) {
            clearInterval(interval);
            this.intervals.delete(deviceId);
        }
        this.statusCache.delete(deviceId);
        this.monitoredDevices.delete(deviceId);
    }

    static stopAll() {
        this.intervals.forEach((interval) => clearInterval(interval));
        this.intervals.clear();
        this.statusCache.clear();
        this.monitoredDevices.clear();
    }

    static getCachedStatus(deviceId: string): DeviceStatus | undefined {
        return this.statusCache.get(deviceId);
    }

    /**
     * Simple TCP reachability check without SDK.
     * Uses a fetch call to test if the device IP:Port is reachable.
     */
    private static async checkDeviceStatus(device: Device): Promise<DeviceStatus> {
        const isP2P = device.connectMode === 'P2P' || (!!device.sn && !device.ip);
        
        if (isP2P) {
            // P2P login/logout is too heavy for a 30s background ping and causes
            // tunnel thrashing or false negatives (e.g. 'already logged in' errors).
            // We assume P2P devices are 'Online'. LiveView will handle
            // actual connection failures when the user tries to stream.
            return 'Online';
        }

        const host = device.ip;
        const port = typeof device.port === 'string' ? parseInt(device.port) : Number(device.port);
        if (!host || !port) return 'Offline';

        try {
            // Use native TCP check instead of HTTP fetch for binary SDK ports
            const isOnline = await NvrSdk.checkConnect(host, port, 5000);
            return isOnline ? 'Online' : 'Offline';
        } catch (e) {
            console.warn(`[DeviceStatusManager] Check failed for ${host}:`, e);
            return 'Offline';
        }
    }

    static async checkOnce(device: Device): Promise<DeviceStatus> {
        return this.checkDeviceStatus(device);
    }
}

// Initialize NetInfo listener
DeviceStatusManager.init();
