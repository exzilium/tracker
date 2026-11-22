import { requireOptionalNativeModule } from 'expo-modules-core';

export type LockScreenTimerMode = 'session' | 'alcohol' | 'thc' | 'both';

export interface LockScreenTimerPayload {
  mode: LockScreenTimerMode;
  primaryEpochMs: number;
  secondaryEpochMs?: number;
}

interface NativeLockScreenTimerModule {
  updateTimer(
    mode: LockScreenTimerMode,
    primaryEpochMs: number,
    secondaryEpochMs?: number | null
  ): Promise<void>;
  stopTimer(): Promise<void>;
}

const NativeModule =
  requireOptionalNativeModule<NativeLockScreenTimerModule>('LockScreenTimer');

export async function updateTimer(payload: LockScreenTimerPayload): Promise<void> {
  if (!NativeModule) return;
  await NativeModule.updateTimer(
    payload.mode,
    payload.primaryEpochMs,
    payload.secondaryEpochMs ?? null
  );
}

export async function stopTimer(): Promise<void> {
  if (!NativeModule) return;
  await NativeModule.stopTimer();
}
