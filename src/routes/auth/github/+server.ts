import { redirect } from '@sveltejs/kit';
import { getGitHubAuthUrl, generateOAuthState } from '$lib/server/auth';
import { getEnv } from '$lib/server/env';
import type { RequestHandler } from './$types';

export const prerender = false;

export const GET: RequestHandler = async ({ platform, url, cookies }) => {
	const env = getEnv(platform);
	if (!env.GITHUB_CLIENT_ID) {
		return new Response('OAuth not configured', { status: 500 });
	}

	const state = generateOAuthState();
	cookies.set('oauth_state', state, {
		path: '/auth/github/callback',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 600
	});
	const redirectUri = `${url.origin}/auth/github/callback`;
	const authUrl = getGitHubAuthUrl(env.GITHUB_CLIENT_ID, redirectUri, state);
	redirect(302, authUrl);
};
