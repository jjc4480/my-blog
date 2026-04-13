import { redirect } from '@sveltejs/kit';
import { getGitHubAuthUrl } from '$lib/server/auth';
import { getEnv } from '$lib/server/env';
import type { RequestHandler } from './$types';

export const prerender = false;

export const GET: RequestHandler = async ({ platform, url }) => {
	const env = getEnv(platform);
	if (!env.GITHUB_CLIENT_ID) {
		return new Response('OAuth not configured', { status: 500 });
	}

	const redirectUri = `${url.origin}/auth/github/callback`;
	const authUrl = getGitHubAuthUrl(env.GITHUB_CLIENT_ID, redirectUri);
	redirect(302, authUrl);
};
