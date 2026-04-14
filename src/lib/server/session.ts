import type { Cookies } from '@sveltejs/kit';

const COOKIE_NAME = 'session';
const MAX_AGE = 60 * 60 * 24 * 7;

interface SessionPayload {
	login: string;
	token: string;
	exp: number;
	nonce: string;
}

function toBase64Url(buf: ArrayBuffer | Uint8Array): string {
	const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
	const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (s.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function deriveKeys(secret: string): Promise<{ hmacKey: CryptoKey; aesKey: CryptoKey }> {
	const enc = new TextEncoder();
	const baseKey = await crypto.subtle.importKey('raw', enc.encode(secret), 'HKDF', false, ['deriveKey']);
	const hmacKey = await crypto.subtle.deriveKey(
		{ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('session-hmac'), info: enc.encode('hmac') },
		baseKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
	);
	const aesKey = await crypto.subtle.deriveKey(
		{ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('session-aes'), info: enc.encode('aes') },
		baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
	);
	return { hmacKey, aesKey };
}

async function encrypt(plaintext: string, aesKey: CryptoKey): Promise<string> {
	const enc = new TextEncoder();
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, enc.encode(plaintext));
	return toBase64Url(iv) + '.' + toBase64Url(ciphertext);
}

async function decrypt(encrypted: string, aesKey: CryptoKey): Promise<string> {
	const parts = encrypted.split('.');
	if (parts.length !== 2) throw new Error('invalid');
	const iv = fromBase64Url(parts[0]);
	const ciphertext = fromBase64Url(parts[1]);
	const plaintext = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: iv as unknown as BufferSource },
		aesKey,
		ciphertext as unknown as BufferSource
	);
	return new TextDecoder().decode(plaintext);
}

export async function createSessionCookie(
	login: string,
	ghToken: string,
	secret: string
): Promise<{ name: string; value: string; options: Record<string, unknown> }> {
	const { hmacKey, aesKey } = await deriveKeys(secret);
	const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(16)));
	const payload: SessionPayload = {
		login,
		token: ghToken,
		exp: Math.floor(Date.now() / 1000) + MAX_AGE,
		nonce
	};
	const encrypted = await encrypt(JSON.stringify(payload), aesKey);
	const enc = new TextEncoder();
	const sig = await crypto.subtle.sign('HMAC', hmacKey, enc.encode(encrypted));
	const value = encrypted + '.' + toBase64Url(sig);
	return {
		name: COOKIE_NAME,
		value,
		options: {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax' as const,
			maxAge: MAX_AGE
		}
	};
}

export async function getSessionUser(
	cookies: Cookies,
	secret: string
): Promise<{ login: string; token: string } | null> {
	const raw = cookies.get(COOKIE_NAME);
	if (!raw) return null;

	const lastDot = raw.lastIndexOf('.');
	if (lastDot === -1) return null;

	const encrypted = raw.slice(0, lastDot);
	const sigStr = raw.slice(lastDot + 1);

	try {
		const { hmacKey, aesKey } = await deriveKeys(secret);
		const enc = new TextEncoder();
		const sigBytes = fromBase64Url(sigStr);
		const valid = await crypto.subtle.verify('HMAC', hmacKey, sigBytes as unknown as BufferSource, enc.encode(encrypted));
		if (!valid) return null;

		const json = await decrypt(encrypted, aesKey);
		const payload: SessionPayload = JSON.parse(json);
		if (payload.exp < Math.floor(Date.now() / 1000)) return null;
		return { login: payload.login, token: payload.token };
	} catch {
		return null;
	}
}

export function clearSessionCookie(): {
	name: string;
	value: string;
	options: Record<string, unknown>;
} {
	return {
		name: COOKIE_NAME,
		value: '',
		options: {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax' as const,
			maxAge: 0
		}
	};
}
