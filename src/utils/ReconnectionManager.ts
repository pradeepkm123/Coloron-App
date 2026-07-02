import { Device } from './deviceStorage';

export class ReconnectionManager {
    private static retryAttempts: Map<string, number> = new Map();
    private static maxRetries = 3;

    /**
     * Attempt to reconnect to a device by checking TCP reachability
     */
    static async attemptReconnect(
        device: Device,
        onProgress?: (attempt: number, maxAttempts: number) => void
    ): Promise<boolean> {
        const deviceId = String(device.id);
        const attempts = this.retryAttempts.get(deviceId) || 0;

        if (attempts >= this.maxRetries) {
            console.log(`Max retry attempts reached for device ${device.name}`);
            this.retryAttempts.delete(deviceId);
            return false;
        }

        try {
            if (onProgress) {
                onProgress(attempts + 1, this.maxRetries);
            }

            const host = device.ip;
            const port = typeof device.port === 'string' ? parseInt(device.port) : Number(device.port);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            await fetch(`http://${host}:${port}`, { signal: controller.signal });
            clearTimeout(timeoutId);

            this.retryAttempts.delete(deviceId);
            console.log(`Successfully reconnected to device ${device.name}`);
            return true;

        } catch (error) {
            console.log(`Reconnection attempt ${attempts + 1} failed for ${device.name}`);
            this.retryAttempts.set(deviceId, attempts + 1);

            const delayMs = Math.pow(2, attempts) * 1000;
            await new Promise<void>(resolve => setTimeout(() => resolve(), delayMs));

            return this.attemptReconnect(device, onProgress);
        }
    }

    static resetRetryCount(deviceId: string) {
        this.retryAttempts.delete(deviceId);
    }

    static getRetryCount(deviceId: string): number {
        return this.retryAttempts.get(deviceId) || 0;
    }

    static clearAll() {
        this.retryAttempts.clear();
    }
}
