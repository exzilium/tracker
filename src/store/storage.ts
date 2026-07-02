import { StateStorage } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';

const mmkvStore = createMMKV({
  id: 'tracker-storage',
});

export const zustandStorage: StateStorage = {
  getItem: (name) => {
    const value = mmkvStore.getString(name);
    return value ?? null;
  },
  setItem: (name, value) => {
    mmkvStore.set(name, value);
  },
  removeItem: (name) => {
    mmkvStore.remove(name);
  },
};
