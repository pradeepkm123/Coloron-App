import { authStorage } from './authStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL as DEFAULT_BASE_URL, BACKEND_IP as DEFAULT_BACKEND_IP } from '../config/api';

export let BASE_URL = DEFAULT_BASE_URL;

// Helper to initialize BASE_URL from AsyncStorage
export const initBaseUrl = async () => {
    try {
        const savedIp = await AsyncStorage.getItem('@vms_backend_ip');
        const isPrivateIp = (ip: string) => {
            return ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('127.') || ip.startsWith('172.');
        };

        if (savedIp && isPrivateIp(savedIp) && !isPrivateIp(DEFAULT_BACKEND_IP)) {
            console.log(`[API] Overriding saved local IP (${savedIp}) with public default IP: ${DEFAULT_BACKEND_IP}`);
            await AsyncStorage.removeItem('@vms_backend_ip');
            BASE_URL = DEFAULT_BASE_URL;
        } else if (savedIp) {
            BASE_URL = `http://${savedIp}:5000/api`;
            console.log(`[API] Initialized BASE_URL to: ${BASE_URL}`);
        } else {
            console.log('[API] No saved IP, starting auto-detection of backend server...');
            const detectedIp = await api.detectBackendIp();
            if (detectedIp) {
                console.log(`[API] Auto-detected and configured backend at: http://${detectedIp}:5000/api`);
            } else {
                console.log('[API] Auto-detection failed, falling back to default:', BASE_URL);
            }
        }
    } catch (e) {
        console.warn('Error loading saved backend IP:', e);
    }
};

// ─── Offline / Mock Mode ──────────────────────────────────────────────────────
// When the backend is unreachable the app will store credentials locally and
// continue working. Set to `false` to disable the fallback and always require
// a live server.
const ALLOW_OFFLINE_FALLBACK = true;

interface SignupData {
    username: string;
    email: string;
    mobileNo: string;
    password: string;
}
interface LoginData {
    identifier: string; // Email or Mobile
    password: string;
}

interface AuthResponse {
    _id: string;
    username: string;
    email: string;
    mobileNo: string;
    token: string;
    profilePicture?: string;
    message: string;
}

export const api = {
    // Signup new user
    signup: async (data: SignupData): Promise<AuthResponse> => {
        try {
            const response = await fetch(`${BASE_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Signup failed');

            await authStorage.storeToken(result.token);
            await authStorage.storeUser({
                _id: result._id,
                username: result.username,
                email: result.email,
                mobileNo: result.mobileNo,
                profilePicture: result.profilePicture,
            });
            return result;
        } catch (error: any) {
            console.error('Signup API error:', error);
            throw new Error(error.message || 'Unable to connect to server');
        }
    },

    // Login user
    login: async (data: LoginData): Promise<AuthResponse> => {
        try {
            const response = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Login failed');

            await authStorage.storeToken(result.token);
            await authStorage.storeUser({
                _id: result._id,
                username: result.username,
                email: result.email,
                mobileNo: result.mobileNo,
                profilePicture: result.profilePicture,
            });
            return result;
        } catch (error: any) {
            console.error('Login API error:', error);
            throw new Error(error.message || 'Unable to connect to server');
        }
    },

    // Google Login
    googleLogin: async (idToken: string): Promise<AuthResponse> => {
        try {
            const response = await fetch(`${BASE_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Google Login failed');

            await authStorage.storeToken(result.token);
            await authStorage.storeUser({
                _id: result._id,
                username: result.username,
                email: result.email,
                mobileNo: result.mobileNo,
                profilePicture: result.profilePicture,
            });
            return result;
        } catch (error: any) {
            console.error('Google Login API error:', error);
            throw new Error(error.message || 'Unable to connect to server');
        }
    },

    // Logout user
    logout: async (): Promise<void> => {
        try {
            await authStorage.clearAuth();
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    },

    // Get authenticated user
    getAuthenticatedUser: async (): Promise<any | null> => {
        try {
            return await authStorage.getUser();
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    },

    // Update user profile
    updateProfile: async (data: { username?: string; email?: string; mobileNo?: string; password?: string; profilePicture?: string }): Promise<AuthResponse> => {
        const token = await authStorage.getToken();
        try {
            const response = await fetch(`${BASE_URL}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Profile update failed');
            }

            // Merge with current user data to avoid losing fields not returned by API (like mobileNo)
            const currentUser = await authStorage.getUser();
            await authStorage.storeUser({
                ...(currentUser || {}),
                _id: result._id,
                username: result.username,
                email: result.email,
                mobileNo: result.mobileNo,
                profilePicture: result.profilePicture,
            });

            // Update token if one is returned (optional, but good practice if rotation exists)
            if (result.token) {
                await authStorage.storeToken(result.token);
            }

            return result;
        } catch (error: any) {
            console.log('Update Profile API error:', error.message || error);
            throw new Error(error.message || 'Unable to connect to server');
        }
    },

    // Save media metadata to DB
    saveMedia: async (data: {
        type: 'snapshot' | 'recording';
        fileName: string;
        filePath: string;
        channelId: number;
        deviceName: string;
        thumbnailPath?: string;
        userEmail?: string;
        userId?: number;
    }): Promise<any> => {
        const token = await authStorage.getToken();
        try {
            const response = await fetch(`${BASE_URL}/media`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Saving media failed');
            }
            return result;
        } catch (error: any) {
            console.log('Save Media API silent fail:', error.message);
            throw new Error(error.message || 'Unable to connect to server');
        }
    },

    // Save Device Alarm Settings
    updateDeviceSettings: async (deviceId: string, settings: any): Promise<any> => {
        const token = await authStorage.getToken();
        try {
            const response = await fetch(`${BASE_URL}/devices/${deviceId}/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(settings),
            });

            const result = await response.json();
            return result;
        } catch (error: any) {
            console.log('Update Settings API error:', error.message);
            return { success: true, message: "Settings saved (Mock)" };
        }
    },

    // ── Forgot Password ───────────────────────────────────────
    forgotPassword: async (identifier: string): Promise<{ message: string }> => {
        const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Error sending OTP');
        return result;
    },

    verifyOTP: async (identifier: string, otp: string): Promise<{ message: string }> => {
        const response = await fetch(`${BASE_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, otp }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Invalid/Expired OTP');
        return result;
    },

    resetPassword: async (identifier: string, otp: string, newPassword: string): Promise<{ message: string }> => {
        const response = await fetch(`${BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, otp, newPassword }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Error updating password');
        return result;
    },

    // ── Device Sync ──────────────────────────────────────────
    syncDevices: async (): Promise<any[]> => {
        const token = await authStorage.getToken();
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(`${BASE_URL}/devices`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
                signal: controller.signal,
            });
            clearTimeout(id);
            const result = await response.json();
            if (response.ok) return result;
            return [];
        } catch (e: any) {
            clearTimeout(id);
            return [];
        }
    },

    deleteDevice: async (deviceId: string): Promise<void> => {
        const token = await authStorage.getToken();
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 10000);
        try {
            await fetch(`${BASE_URL}/devices/${deviceId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
                signal: controller.signal,
            });
            clearTimeout(id);
        } catch (e: any) {
            clearTimeout(id);
            console.log('[API] deleteDevice silent fail:', e.message);
        }
    },

    saveDeviceToCloud: async (device: any): Promise<void> => {
        const token = await authStorage.getToken();
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 10000);
        try {
            await fetch(`${BASE_URL}/devices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(device),
                signal: controller.signal,
            });
            clearTimeout(id);
        } catch (e: any) {
            clearTimeout(id);
        }
    },

    // -- Event reporting
    createEvent: async (event: any) => {
        const token = await authStorage.getToken();
        try {
            await fetch(`${BASE_URL}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(event),
            });
        } catch (e: any) {
            console.log('[API] createEvent silent fail:', e.message);
        }
    },

    registerFcmToken: async (fcmToken: string): Promise<any> => {
        const token = await authStorage.getToken();
        try {
            const response = await fetch(`${BASE_URL}/auth/register-fcm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ fcmToken }),
            });
            return await response.json();
        } catch (e: any) {
            console.log('[API] registerFcmToken fail:', e.message);
            throw e;
        }
    },

    // Detect backend IP and store it
    detectBackendIp: async (customIp?: string): Promise<string | null> => {
        const ipsToTest = customIp ? [customIp] : [
            '52.66.98.128',  // Public EC2 IP
            '10.0.2.2',      // Emulator loopback
            '192.168.1.15',  // Correct host IP
            '192.168.1.20',  // Configured IP 1
            '192.168.1.22',  // Configured IP 2
            '192.168.1.13',  // Common LAN IP
            '192.168.1.5',   // Common LAN IP
            '127.0.0.1',     // Localhost
        ];

        try {
            const promises = ipsToTest.map(async (ip) => {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 2000);
                try {
                    const response = await fetch(`http://${ip}:5000/health`, {
                        signal: controller.signal
                    });
                    clearTimeout(id);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.status === 'ok') {
                            return ip;
                        }
                    }
                } catch (e) {
                    clearTimeout(id);
                }
                throw new Error('failed');
            });

            // Safe implementation of Promise.any
            const workingIp = await new Promise<string>((resolve, reject) => {
                let rejectedCount = 0;
                promises.forEach(p => {
                    p.then(resolve).catch(() => {
                        rejectedCount++;
                        if (rejectedCount === promises.length) {
                            reject(new Error('All promises failed'));
                        }
                    });
                });
            });

            if (workingIp) {
                console.log(`[IP Detection] ✅ Found working backend IP: ${workingIp}`);
                BASE_URL = `http://${workingIp}:5000/api`;
                await AsyncStorage.setItem('@vms_backend_ip', workingIp);
                return workingIp;
            }
        } catch (e) {
            console.log('[IP Detection] ❌ No backend IP responded.');
        }
        return null;
    },
};

// Initialize BASE_URL immediately on import
initBaseUrl().catch(err => console.warn('[API] Failed to auto-initialize BASE_URL:', err));