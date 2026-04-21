import { redirect } from '@sveltejs/kit';
import { clearSessionCookie } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const prerender = false;

export const GET: RequestHandler = async ({ cookies }) => {
	const cleared = clearSessionCookie();
	cookies.set(cleared.name, cleared.value, cleared.options);
	redirect(302, '/');
};
