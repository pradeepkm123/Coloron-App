import AsyncStorage from '@react-native-async-storage/async-storage';
import { authStorage } from './authStorage';

export interface LicensePlateEntry {
    id: string;
    plateNumber: string;
    carModel: string;
    ownerName: string;
    phoneNumber: string;
    group: 'Staff' | 'Visitor' | 'VIP' | 'Blacklist' | 'Resident';
    createdAt: number;
    anprRecordId?: string;
    deviceSn?: string;
}

const getAnprPlatesKey = async (): Promise<string> => {
    try {
        const user = await authStorage.getUser();
        const identifier = user?.email || user?.mobileNo || user?._id || 'guest';
        return `@vms_anpr_plates_${identifier}`;
    } catch (error) {
        return '@vms_anpr_plates_guest';
    }
};

export const anprStorage = {
    /**
     * Save a new license plate entry
     */
    savePlate: async (entry: Omit<LicensePlateEntry, 'id' | 'createdAt'>): Promise<boolean> => {
        try {
            const key = await getAnprPlatesKey();
            const existingPlatesJson = await AsyncStorage.getItem(key);
            const plates: LicensePlateEntry[] = existingPlatesJson ? JSON.parse(existingPlatesJson) : [];

            const newEntry: LicensePlateEntry = {
                ...entry,
                id: Date.now().toString(),
                createdAt: Date.now(),
                plateNumber: entry.plateNumber.toUpperCase().replace(/\s/g, '') // Normalize
            };

            // Check for duplicates
            if (plates.some(p => p.plateNumber === newEntry.plateNumber)) {
                throw new Error('This plate number is already registered.');
            }

            plates.push(newEntry);
            await AsyncStorage.setItem(key, JSON.stringify(plates));
            return true;
        } catch (error) {
            console.error('[anprStorage] Error saving plate:', error);
            throw error;
        }
    },

    /**
     * Get all registered plates
     */
    getPlates: async (): Promise<LicensePlateEntry[]> => {
        try {
            const key = await getAnprPlatesKey();
            const platesJson = await AsyncStorage.getItem(key);
            return platesJson ? JSON.parse(platesJson) : [];
        } catch (error) {
            console.error('[anprStorage] Error getting plates:', error);
            return [];
        }
    },

    /**
     * Delete a plate entry
     */
    deletePlate: async (id: string): Promise<void> => {
        try {
            const key = await getAnprPlatesKey();
            const platesJson = await AsyncStorage.getItem(key);
            if (platesJson) {
                const plates: LicensePlateEntry[] = JSON.parse(platesJson);
                const filteredPlates = plates.filter(p => p.id !== id);
                await AsyncStorage.setItem(key, JSON.stringify(filteredPlates));
            }
        } catch (error) {
            console.error('[anprStorage] Error deleting plate:', error);
        }
    }
};
