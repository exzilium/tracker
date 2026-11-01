import { StateStorage } from 'zustand/middleware';

const memoryFallback = new Map<string, string>();

export const zustandStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return memoryFallback.get(name) ?? null;
    }
    try {
      return window.localStorage.getItem(name);
    } catch {
      return memoryFallback.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    memoryFallback.set(name, value);
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(name, value);
    } catch (e) {
      console.warn('localStorage.setItem failed:', e);
    }
  },
  removeItem: (name) => {
    memoryFallback.delete(name);
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};
