import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@vms_auth_token';
const USER_KEY = '@vms_user_data';
const PUSH_TOKEN_KEY = '@vms_push_token';

export const authStorage = {
    // Store push notification token
    storePushToken: async (token: string): Promise<void> => {
        try {
            await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
        } catch (error) {
            console.error('Error storing push token:', error);
        }
    },

    // Get push notification token
    getPushToken: async (): Promise<string | null> => {
        try {
            return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
        } catch (error) {
            console.error('Error getting push token:', error);
            return null;
        }
    },

    // Store authentication token
    storeToken: async (token: string): Promise<void> => {
        try {
            await AsyncStorage.setItem(TOKEN_KEY, token);
        } catch (error) {
            console.error('Error storing auth token:', error);
            throw error;
        }
    },

    // Get authentication token
    getToken: async (): Promise<string | null> => {
        try {
            return await AsyncStorage.getItem(TOKEN_KEY);
        } catch (error) {
            console.error('Error getting auth token:', error);
            return null;
        }
    },

    // Store user data
    storeUser: async (user: any): Promise<void> => {
        try {
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
        } catch (error) {
            console.error('Error storing user data:', error);
            throw error;
        }
    },

    // Get user data
    getUser: async (): Promise<any | null> => {
        try {
            const userData = await AsyncStorage.getItem(USER_KEY);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    },

    // Get a robust unique identifier for the current user
    getUserIdentifier: async (): Promise<string> => {
        try {
            const user = await authStorage.getUser();
            return user?.email || user?.mobileNo || user?._id || 'guest';
        } catch (error) {
            return 'guest';
        }
    },

    // Get dynamic user-specific alarm storage key
    getAlarmStorageKey: async (): Promise<string> => {
        try {
            const user = await authStorage.getUser();
            const identifier = user?.email || user?.mobileNo || user?._id || 'guest';
            return `VMS_ALARMS_${identifier}`;
        } catch (error) {
            return 'VMS_ALARMS_guest';
        }
    },

    // Remove authentication data (logout)
    clearAuth: async (): Promise<void> => {
        try {
            await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
        } catch (error) {
            console.error('Error clearing auth data:', error);
            throw error;
        }
    },

    // Check if user is authenticated
    isAuthenticated: async (): Promise<boolean> => {
        try {
            const token = await AsyncStorage.getItem(TOKEN_KEY);
            return token !== null;
        } catch (error) {
            console.error('Error checking authentication:', error);
            return false;
        }
    },
};
