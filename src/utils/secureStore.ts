import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

const SECURE_STORE_KEY = '@vms_secure_passwords';

const safeBtoa = (str: string): string => {
  try {
    return Buffer.from(str, 'binary').toString('base64');
  } catch (e) {
    return str;
  }
};

const safeAtob = (str: string): string => {
  try {
    return Buffer.from(str, 'base64').toString('binary');
  } catch (e) {
    return str;
  }
};

// Basic obfuscation/encryption helper
const encode = (str: string): string => {
  try {
    let result = '';
    const key = 'VMS_SECURE_SALT_2026';
    for (let i = 0; i < str.length; i++) {
      result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return safeBtoa(result);
  } catch (e) {
    return str;
  }
};

const decode = (str: string): string => {
  try {
    const raw = safeAtob(str);
    let result = '';
    const key = 'VMS_SECURE_SALT_2026';
    for (let i = 0; i < raw.length; i++) {
      result += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch (e) {
    return str;
  }
};

export const secureStore = {
  savePassword: async (deviceId: string, password: string): Promise<void> => {
    try {
      const dataStr = await AsyncStorage.getItem(SECURE_STORE_KEY);
      const data = dataStr ? JSON.parse(dataStr) : {};
      data[deviceId] = encode(password);
      await AsyncStorage.setItem(SECURE_STORE_KEY, JSON.stringify(data));
      console.log(`[secureStore] Saved password securely for device ${deviceId}`);
    } catch (e) {
      console.error('[secureStore] Error saving password:', e);
    }
  },

  getPassword: async (deviceId: string): Promise<string | null> => {
    try {
      const dataStr = await AsyncStorage.getItem(SECURE_STORE_KEY);
      if (!dataStr) return null;
      const data = JSON.parse(dataStr);
      const obfuscated = data[deviceId];
      if (!obfuscated) return null;
      return decode(obfuscated);
    } catch (e) {
      console.error('[secureStore] Error getting password:', e);
      return null;
    }
  },

  deletePassword: async (deviceId: string): Promise<void> => {
    try {
      const dataStr = await AsyncStorage.getItem(SECURE_STORE_KEY);
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      delete data[deviceId];
      await AsyncStorage.setItem(SECURE_STORE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[secureStore] Error deleting password:', e);
    }
  }
};
