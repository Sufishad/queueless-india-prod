import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage adapter interface compatible with Zustand persist and direct app usage.
 */
export interface IAppStorage {
  getItem: (name: string) => Promise<string | null>;
  setItem: (name: string, value: string) => Promise<void>;
  removeItem: (name: string) => Promise<void>;
}

// In-memory cache for ultra-fast reads
const memoryCache = new Map<string, string>();

/**
 * Robust async storage engine backed by @react-native-async-storage/async-storage
 * with memory cache for instant performance.
 */
export const appStorage: IAppStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      if (memoryCache.has(name)) {
        return memoryCache.get(name) ?? null;
      }
      const val = await AsyncStorage.getItem(name);
      if (val !== null) {
        memoryCache.set(name, val);
      }
      return val;
    } catch {
      return memoryCache.get(name) ?? null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      memoryCache.set(name, value);
      await AsyncStorage.setItem(name, value);
    } catch {
      // Safe fallback
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      memoryCache.delete(name);
      await AsyncStorage.removeItem(name);
    } catch {
      // Safe fallback
    }
  },
};

/**
 * Zustand persist compatible storage object
 */
export const zustandStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return await appStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await appStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await appStorage.removeItem(name);
  },
};

