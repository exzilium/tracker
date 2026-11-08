import { StateStorage } from 'zustand/middleware';
import { createMMKV, deleteMMKV, existsMMKV, MMKV } from 'react-native-mmkv';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const STORAGE_ID = 'tracker-storage';
const LEGACY_KEY_VAULT_ID = 'tracker-key-vault';
const KEY_ALIAS = 'space_tether_mmkv_aes256_key_v1';

const memoryFallback = new Map<string, string>();

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function generateKey32Bytes(): string {
  const bytes = Crypto.getRandomBytes(32);
  return Array.from(bytes, (b) => CHARSET[b & 63]).join('');
}

function getOrCreateEncryptionKey(): { key: string; isNewlyCreated: boolean } {
  const options: SecureStore.SecureStoreOptions = {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  };

  const existing = SecureStore.getItem(KEY_ALIAS, options);
  if (existing && typeof existing === 'string' && existing.length === 32) {
    return { key: existing, isNewlyCreated: false };
  }

  // One-time migration: if a legacy plaintext MMKV key vault exists on disk,
  // move its key into hardware-backed SecureStore and wipe the plaintext vault.
  if (existsMMKV(LEGACY_KEY_VAULT_ID)) {
    const legacyVault = createMMKV({ id: LEGACY_KEY_VAULT_ID });
    const legacyKey = legacyVault.getString(KEY_ALIAS);
    legacyVault.clearAll();
    deleteMMKV(LEGACY_KEY_VAULT_ID);

    if (legacyKey && legacyKey.length === 32) {
      SecureStore.setItem(KEY_ALIAS, legacyKey, options);
      return { key: legacyKey, isNewlyCreated: false };
    }
  }

  const newKey = generateKey32Bytes();
  SecureStore.setItem(KEY_ALIAS, newKey, options);
  return { key: newKey, isNewlyCreated: true };
}

let mmkvStore: MMKV | null = null;
let initFailed = false;

function getStore(): MMKV | null {
  if (mmkvStore) return mmkvStore;
  if (initFailed) return null;

  try {
    const hadExistingStore = existsMMKV(STORAGE_ID);
    const { key, isNewlyCreated } = getOrCreateEncryptionKey();

    if (isNewlyCreated && hadExistingStore) {
      // Migrate any pre-existing unencrypted MMKV instance in-place before opening with AES-256
      const legacyStore = createMMKV({
        id: STORAGE_ID,
        recoveryStrategy: 'recover-on-error',
      });
      if (!legacyStore.isEncrypted && legacyStore.length > 0) {
        legacyStore.encrypt(key, 'AES-256');
        mmkvStore = legacyStore;
        return mmkvStore;
      }
    }

    mmkvStore = createMMKV({
      id: STORAGE_ID,
      encryptionKey: key,
      encryptionType: 'AES-256',
      compareBeforeSet: true,
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
