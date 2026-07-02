import { StateStorage } from 'zustand/middleware';

export const zustandStorage: StateStorage = {
  getItem: (name) => {
    return window.localStorage.getItem(name);
  },
  setItem: (name, value) => {
    window.localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    window.localStorage.removeItem(name);
  },
};
