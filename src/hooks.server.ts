import { redirect, json } from '@sveltejs/kit';
import { getEnv } from '$lib/server/env';
import { getSessionUser } from '$lib/server/session';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const secret = getEnv(event.platform).SESSION_SECRET || '';
	if (secret) {
		event.locals.user = await getSessionUser(event.cookies, secret);
	} else {
		event.locals.user = null;
	}

	const { pathname } = event.url;
	const isProtected = pathname.startsWith('/drafts') || pathname.startsWith('/api/drafts');

	if (isProtected && !event.locals.user) {
		if (pathname.startsWith('/api/')) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		redirect(302, '/auth/github');
	}

	return resolve(event);
};
