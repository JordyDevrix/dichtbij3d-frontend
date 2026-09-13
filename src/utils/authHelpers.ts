import { api } from '../api';
import type { AuthResponse } from '../api/types';
import { createPasskey, getPasskey, passkeysSupported } from './passkey';

/** Full passwordless sign-in round trip. Throws a readable error when unsupported. */
export async function createPasskeyLogin(): Promise<AuthResponse> {
  if (!passkeysSupported()) throw new Error('Passkeys are only available in a modern browser.');
  const options = await api.passkeyLoginOptions();
  const credential = await getPasskey(options);
  return api.passkeyLoginFinish(credential);
}

/** Registers a new passkey for the signed-in user. */
export async function registerPasskey(label?: string): Promise<void> {
  if (!passkeysSupported()) throw new Error('Passkeys are only available in a modern browser.');
  const options = await api.passkeyRegisterOptions();
  const credential = await createPasskey(options);
  await api.passkeyRegisterFinish(credential, label);
}

export { passkeysSupported };
