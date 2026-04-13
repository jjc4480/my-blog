import type { Cookies } from '@sveltejs/kit';

const COOKIE_NAME = 'session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

interface SessionPayload {
	login: string;
	token: string;
	exp: number;
}

async function getKey(secret: string): Promise<CryptoKey> {
	const enc = new TextEncoder();
	return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
		'sign',
		'verify'
	]);
}

function toBase64Url(buf: ArrayBuffer): string {
	const bytes = new Uint8Array(buf);
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

async function sign(payload: string, secret: string): Promise<string> {
	const key = await getKey(secret);
	const enc = new TextEncoder();
	const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
	return toBase64Url(sig);
}

async function verify(payload: string, signature: string, secret: string): Promise<boolean> {
	const key = await getKey(secret);
	const enc = new TextEncoder();
	const sigBytes = fromBase64Url(signature) as unknown as BufferSource;
	return crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payload));
}

export async function createSessionCookie(
	login: string,
	ghToken: string,
	secret: string
): Promise<{ name: string; value: string; options: Record<string, unknown> }> {
	const payload: SessionPayload = {
		login,
		token: ghToken,
		exp: Math.floor(Date.now() / 1000) + MAX_AGE
	};
	const payloadStr = btoa(JSON.stringify(payload));
	const signature = await sign(payloadStr, secret);
	return {
		name: COOKIE_NAME,
		value: `${payloadStr}.${signature}`,
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

	const dotIdx = raw.lastIndexOf('.');
	if (dotIdx === -1) return null;

	const payloadStr = raw.slice(0, dotIdx);
	const signature = raw.slice(dotIdx + 1);

	const valid = await verify(payloadStr, signature, secret);
	if (!valid) return null;

	try {
		const payload: SessionPayload = JSON.parse(atob(payloadStr));
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
