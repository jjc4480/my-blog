const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/access_token';
const GITHUB_API = 'https://api.github.com';

export function getGitHubAuthUrl(clientId: string, redirectUri: string): string {
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		scope: 'repo read:user'
	});
	return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeCodeForToken(
	code: string,
	clientId: string,
	clientSecret: string
): Promise<string> {
	const res = await fetch(GITHUB_AUTHORIZE, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			'User-Agent': 'jcjang-blog'
		},
		body: JSON.stringify({
			client_id: clientId,
			client_secret: clientSecret,
			code
		})
	});

	if (!res.ok) {
		throw new Error(`GitHub token exchange failed: ${res.status}`);
	}

	const data: { access_token?: string; error?: string } = await res.json();
	if (data.error || !data.access_token) {
		throw new Error(`GitHub OAuth error: ${data.error ?? 'no access_token'}`);
	}

	return data.access_token;
}

export async function getGitHubUser(token: string): Promise<{ login: string }> {
	const res = await fetch(`${GITHUB_API}/user`, {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'User-Agent': 'jcjang-blog',
			'X-GitHub-Api-Version': '2022-11-28'
		}
	});

	if (!res.ok) {
		const body = await res.text(); throw new Error(`GitHub user fetch failed: ${res.status} ${body}`);
	}

	const data: { login: string } = await res.json();
	return { login: data.login };
}
