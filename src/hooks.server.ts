import { redirect, json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getSessionUser } from '$lib/server/session';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const isProtected = pathname.startsWith('/drafts') || pathname.startsWith('/api/drafts');
	const needsAuth = isProtected || pathname.startsWith('/auth/') || pathname === '/api/me';

	event.locals.user = null;

	if (needsAuth) {
		const { getEnv } = await import('$lib/server/env');
		const env = getEnv(event.platform);
		const secret = env.SESSION_SECRET;

		if (secret) {
			event.locals.user = await getSessionUser(event.cookies, secret);
		}

		if (!event.locals.user && dev) {
			event.locals.user = { login: env.ALLOWED_GITHUB_USER || 'dev', token: '' };
		}
	}

	if (isProtected && !event.locals.user) {
		if (pathname.startsWith('/api/')) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		redirect(302, '/auth/github');
	}

	if (isProtected && pathname.startsWith('/api/') && !event.locals.user?.token && !dev) {
		return json({ error: 'NoToken' }, { status: 401 });
	}

	return resolve(event);
};
