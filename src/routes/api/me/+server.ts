import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const prerender = false;

export const GET: RequestHandler = async ({ locals }) => {
	if (locals.user) {
		return json({ login: locals.user.login });
	}
	return json(null);
};
