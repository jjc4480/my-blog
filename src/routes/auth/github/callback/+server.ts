import { redirect, error } from '@sveltejs/kit';
import { exchangeCodeForToken, getGitHubUser } from '$lib/server/auth';
import { createSessionCookie } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const prerender = false;

export const GET: RequestHandler = async ({ url, platform, cookies }) => {
	const env = platform?.env;
	if (!env?.GITHUB_CLIENT_ID || !env?.GITHUB_CLIENT_SECRET || !env?.SESSION_SECRET) {
		return new Response('OAuth not configured', { status: 500 });
	}

	const code = url.searchParams.get('code');
	if (!code) {
		error(400, 'Missing authorization code');
	}

	const accessToken = await exchangeCodeForToken(code, env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET);
	const { login } = await getGitHubUser(accessToken);

	if (env.ALLOWED_GITHUB_USER && login !== env.ALLOWED_GITHUB_USER) {
		error(403, 'Unauthorized user');
	}

	const session = await createSessionCookie(login, accessToken, env.SESSION_SECRET);
	cookies.set(session.name, session.value, session.options as Parameters<typeof cookies.set>[2]);

	redirect(302, '/drafts');
};
