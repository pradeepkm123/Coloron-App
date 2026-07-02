import AsyncStorage from '@react-native-async-storage/async-storage';
import { authStorage } from './authStorage';

export interface PersonEntry {
    id: string;
    name: string;
    role: 'Staff' | 'VIP' | 'Blacklist' | 'Visitor' | 'Manager';
    department: string;
    notes?: string;
    imageUri: string;
    createdAt: number;
    faceLibraryId?: string;
    deviceSn?: string;
}

const getFaceRegistryKey = async (): Promise<string> => {
    try {
        const user = await authStorage.getUser();
        const identifier = user?.email || user?.mobileNo || user?._id || 'guest';
        return `@vms_face_registry_${identifier}`;
    } catch (error) {
        return '@vms_face_registry_guest';
    }
};

export const personStorage = {
    /**
     * Save a new person to the registry
     */
    savePerson: async (entry: Omit<PersonEntry, 'id' | 'createdAt'>): Promise<boolean> => {
        try {
            const key = await getFaceRegistryKey();
            const existingJson = await AsyncStorage.getItem(key);
            const registry: PersonEntry[] = existingJson ? JSON.parse(existingJson) : [];

            const newEntry: PersonEntry = {
                ...entry,
                id: Date.now().toString(),
                createdAt: Date.now()
            };

            registry.push(newEntry);
            await AsyncStorage.setItem(key, JSON.stringify(registry));
            return true;
        } catch (error) {
            console.error('[personStorage] Error saving person:', error);
            throw error;
        }
    },

    /**
     * Get all registered persons
     */
    getPersons: async (): Promise<PersonEntry[]> => {
        try {
            const key = await getFaceRegistryKey();
            const json = await AsyncStorage.getItem(key);
            return json ? JSON.parse(json) : [];
        } catch (error) {
            console.error('[personStorage] Error getting persons:', error);
            return [];
        }
    },

    /**
     * Delete a person from registry
     */
    deletePerson: async (id: string): Promise<void> => {
        try {
            const key = await getFaceRegistryKey();
            const json = await AsyncStorage.getItem(key);
            if (json) {
                const registry: PersonEntry[] = JSON.parse(json);
                const filtered = registry.filter(p => p.id !== id);
                await AsyncStorage.setItem(key, JSON.stringify(filtered));
            }
        } catch (error) {
            console.error('[personStorage] Error deleting person:', error);
        }
    }
};
