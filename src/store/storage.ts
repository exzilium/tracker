import { StateStorage } from 'zustand/middleware';
import { createMMKV, MMKV } from 'react-native-mmkv';
import * as Crypto from 'expo-crypto';

const STORAGE_ID = 'tracker-storage';
const KEY_VAULT_ID = 'tracker-key-vault';
const KEY_ALIAS = 'space_tether_mmkv_aes256_key_v1';

const memoryFallback = new Map<string, string>();

function generateHexKey32Bytes(): string {
  const bytes = Crypto.getRandomBytes(16); // 16 bytes -> 32 hex ASCII characters (32 bytes for AES-256)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function getOrCreateEncryptionKey(): { key: string; isNewlyCreated: boolean } {
  // 1. Prefer hardware-backed SecureStore when available in the native runtime
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SecureStore = require('expo-secure-store');
    const existing = SecureStore.getItem(KEY_ALIAS, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    if (existing && typeof existing === 'string' && existing.length === 32) {
      return { key: existing, isNewlyCreated: false };
    }
    const newKey = generateHexKey32Bytes();
    SecureStore.setItem(KEY_ALIAS, newKey, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    return { key: newKey, isNewlyCreated: true };
  } catch {
    // Fallback to isolated MMKV key vault when expo-secure-store is not linked
  }

  const vault = createMMKV({ id: KEY_VAULT_ID });
  const existingKey = vault.getString(KEY_ALIAS);
  if (existingKey && existingKey.length === 32) {
    return { key: existingKey, isNewlyCreated: false };
  }
  const newKey = generateHexKey32Bytes();
  vault.set(KEY_ALIAS, newKey);
  return { key: newKey, isNewlyCreated: true };
}

let mmkvStore: MMKV | null = null;
let initFailed = false;

function getStore(): MMKV | null {
  if (mmkvStore) return mmkvStore;
  if (initFailed) return null;

  try {
    const { key, isNewlyCreated } = getOrCreateEncryptionKey();

    if (isNewlyCreated) {
      // Migrate any pre-existing unencrypted MMKV instance in-place before opening with AES-256
      const legacyStore = createMMKV({
        id: STORAGE_ID,
        recoveryStrategy: 'recover-on-error',
      });
      if (!legacyStore.isEncrypted && legacyStore.length > 0) {
        legacyStore.encrypt(key, 'AES-256');
      }
    }

    mmkvStore = createMMKV({
      id: STORAGE_ID,
      encryptionKey: key,
      encryptionType: 'AES-256',
      recoveryStrategy: 'recover-on-error',
    });
    return mmkvStore;
  } catch (e) {
    initFailed = true;
    console.warn('MMKV initialization failed, falling back to in-memory storage:', e);
    return null;
  }
}

export const zustandStorage: StateStorage = {
  getItem: (name) => {
    const store = getStore();
    if (!store) return memoryFallback.get(name) ?? null;
    try {
      return store.getString(name) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    const store = getStore();
    if (!store) {
      memoryFallback.set(name, value);
      return;
    }
    try {
      store.set(name, value);
    } catch (e) {
      console.warn('Failed to write to MMKV storage:', e);
    }
  },
  removeItem: (name) => {
    const store = getStore();
    if (!store) {
      memoryFallback.delete(name);
      return;
    }
    try {
      store.remove(name);
    } catch {
      // ignore
    }
  },
};
