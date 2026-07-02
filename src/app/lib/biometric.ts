import { supabase } from './supabase';

// Login por biometria via WebAuthn (Touch ID / Face ID / digital do Android).
// Padrão "app lock": a biometria do dispositivo desbloqueia o acesso à sessão
// do Supabase salva localmente. Só funciona em HTTPS (Netlify já é HTTPS).

const CRED_KEY = 'truefocus_bio_credential';
const TOKENS_KEY = 'truefocus_bio_tokens';
const EMAIL_KEY = 'truefocus_bio_email';

// ---- helpers base64url <-> ArrayBuffer ----
function bufToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuf(str: string): ArrayBuffer {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

export function isBiometricSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.credentials
  );
}

// Verifica se o aparelho tem autenticador de plataforma (digital/face)
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  try {
    if (!isBiometricSupported()) return false;
    return await (window.PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isBiometricEnabled(): boolean {
  try {
    return !!localStorage.getItem(CRED_KEY) && !!localStorage.getItem(TOKENS_KEY);
  } catch {
    return false;
  }
}

export function getBiometricEmail(): string | null {
  try {
    return localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

// Registra a biometria (chamar logo após um login por senha bem-sucedido)
export async function registerBiometric(email: string): Promise<boolean> {
  if (!isBiometricSupported()) {
    throw new Error('Biometria não suportada neste dispositivo');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Sessão não encontrada — faça login primeiro');
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'TrueFocus' },
      user: {
        id: userId,
        name: email,
        displayName: email,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;

  if (!cred) return false;

  try {
    localStorage.setItem(CRED_KEY, bufToBase64url(cred.rawId));
    localStorage.setItem(EMAIL_KEY, email);
    localStorage.setItem(
      TOKENS_KEY,
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
    );
  } catch (e) {
    console.error('Falha ao salvar credencial biométrica', e);
    return false;
  }
  return true;
}

// Autentica com biometria e restaura a sessão do Supabase
export async function authenticateWithBiometric(): Promise<boolean> {
  const credId = localStorage.getItem(CRED_KEY);
  const tokensRaw = localStorage.getItem(TOKENS_KEY);
  if (!credId || !tokensRaw) return false;

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        {
          type: 'public-key',
          id: base64urlToBuf(credId),
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    },
  });

  if (!assertion) return false;

  // Biometria confirmada — restaura a sessão salva
  const tokens = JSON.parse(tokensRaw);
  const { error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  if (error) {
    console.error('Erro ao restaurar sessão após biometria:', error);
    // Tokens podem ter expirado — desabilita para forçar login por senha
    return false;
  }

  // Atualiza os tokens salvos (o setSession pode ter renovado)
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      localStorage.setItem(
        TOKENS_KEY,
        JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        })
      );
    }
  } catch {
    /* noop */
  }

  return true;
}

export function disableBiometric(): void {
  try {
    localStorage.removeItem(CRED_KEY);
    localStorage.removeItem(TOKENS_KEY);
    localStorage.removeItem(EMAIL_KEY);
  } catch {
    /* noop */
  }
}
