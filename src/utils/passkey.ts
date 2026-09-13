import { Platform } from 'react-native';

/**
 * Minimal WebAuthn helper for the browser build. Native builds fall back to
 * password + TOTP, because Expo Go cannot talk to the platform authenticator.
 */

export function passkeysSupported(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof (window as any).PublicKeyCredential !== 'undefined' &&
    !!navigator.credentials
  );
}

function b64urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function bytesToB64url(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function createPasskey(options: Record<string, any>): Promise<Record<string, any>> {
  const publicKey: PublicKeyCredentialCreationOptions = {
    ...(options as any),
    challenge: b64urlToBytes(options.challenge),
    user: { ...options.user, id: b64urlToBytes(options.user.id) },
    excludeCredentials: (options.excludeCredentials ?? []).map((cred: any) => ({
      ...cred,
      id: b64urlToBytes(cred.id),
    })),
  };
  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
  if (!credential) throw new Error('Passkey creation cancelled');
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: bytesToB64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bytesToB64url(response.clientDataJSON),
      attestationObject: bytesToB64url(response.attestationObject),
    },
  };
}

export async function getPasskey(options: Record<string, any>): Promise<Record<string, any>> {
  const publicKey: PublicKeyCredentialRequestOptions = {
    ...(options as any),
    challenge: b64urlToBytes(options.challenge),
    allowCredentials: (options.allowCredentials ?? []).map((cred: any) => ({
      ...cred,
      id: b64urlToBytes(cred.id),
    })),
  };
  const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
  if (!credential) throw new Error('Passkey request cancelled');
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: bytesToB64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bytesToB64url(response.clientDataJSON),
      authenticatorData: bytesToB64url(response.authenticatorData),
      signature: bytesToB64url(response.signature),
      userHandle: bytesToB64url(response.userHandle),
    },
  };
}
