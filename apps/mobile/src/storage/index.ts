import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage adapter interface compatible with Zustand persist and direct app usage.
 */
export interface IAppStorage {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
}

// In-memory cache for synchronous reads when MMKV is not available (e.g. Web)
const memoryCache = new Map<string, string>();

let mmkvInstance: any = null;
let isMMKVAvailable = false;

if (Platform.OS !== 'web') {
  try {
    const { MMKV } = require('react-native-mmkv');
    mmkvInstance = new MMKV({
      id: 'queueless-storage',
      encryptionKey: 'queueless-india-secret-key',
    });
    isMMKVAvailable = true;
  } catch (err) {
    // Graceful fallback for standard Expo Go / Dev Client without native JSI
    isMMKVAvailable = false;
  }
}

/**
 * Hybrid storage engine:
 * Uses high-speed native C++ MMKV on Android/iOS native runtime,
 * with automatic fallback to AsyncStorage + Memory Cache on Web / Expo Go.
 */
export const appStorage: IAppStorage = {
  getItem: (name: string): string | null | Promise<string | null> => {
    if (isMMKVAvailable && mmkvInstance) {
      return mmkvInstance.getString(name) ?? null;
    }
    if (memoryCache.has(name)) {
      return memoryCache.get(name) ?? null;
    }
    return AsyncStorage.getItem(name).then((val) => {
      if (val !== null) {
        memoryCache.set(name, val);
      }
      return val;
    });
  },

  setItem: (name: string, value: string): void | Promise<void> => {
    memoryCache.set(name, value);
    if (isMMKVAvailable && mmkvInstance) {
      mmkvInstance.set(name, value);
      return;
    }
    return AsyncStorage.setItem(name, value);
  },

  removeItem: (name: string): void | Promise<void> => {
    memoryCache.delete(name);
    if (isMMKVAvailable && mmkvInstance) {
      mmkvInstance.delete(name);
      return;
    }
    return AsyncStorage.removeItem(name);
  },
};

/**
 * Zustand persist compatible storage object
 */
export const zustandStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const res = appStorage.getItem(name);
    return res instanceof Promise ? await res : res;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const res = appStorage.setItem(name, value);
    if (res instanceof Promise) await res;
  },
  removeItem: async (name: string): Promise<void> => {
    const res = appStorage.removeItem(name);
    if (res instanceof Promise) await res;
  },
};
