import { redirect, error } from '@sveltejs/kit';
import { exchangeCodeForToken, getGitHubUser } from '$lib/server/auth';
import { createSessionCookie } from '$lib/server/session';
import { getEnv } from '$lib/server/env';
import type { RequestHandler } from './$types';

export const prerender = false;

export const GET: RequestHandler = async ({ url, platform, cookies }) => {
	const env = getEnv(platform);
	if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSION_SECRET) {
		return new Response(JSON.stringify({
			error: 'OAuth not configured',
			has_client_id: !!env.GITHUB_CLIENT_ID,
			has_client_secret: !!env.GITHUB_CLIENT_SECRET,
			has_session_secret: !!env.SESSION_SECRET
		}), { status: 500, headers: { 'Content-Type': 'application/json' } });
	}

	const code = url.searchParams.get('code');
	if (!code) {
		error(400, 'Missing authorization code');
	}

	const state = url.searchParams.get('state');
	const savedState = cookies.get('oauth_state');
	cookies.delete('oauth_state', { path: '/auth/github/callback' });
	if (!state || !savedState || state !== savedState) {
		error(403, 'Invalid OAuth state');
	}

	try {
		const accessToken = await exchangeCodeForToken(code, env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET);
		const { login } = await getGitHubUser(accessToken);

		if (env.ALLOWED_GITHUB_USER && login !== env.ALLOWED_GITHUB_USER) {
			error(403, `Unauthorized user: ${login}`);
		}

		const session = await createSessionCookie(login, accessToken, env.SESSION_SECRET);
		cookies.set(session.name, session.value, session.options as Parameters<typeof cookies.set>[2]);

		redirect(302, '/');
	} catch (e: any) {
		if (e?.status) throw e;
		return new Response(JSON.stringify({ error: e.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
