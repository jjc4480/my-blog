import { env as privateEnv } from '$env/dynamic/private';

interface EnvVars {
	GITHUB_CLIENT_ID: string;
	GITHUB_CLIENT_SECRET: string;
	GITHUB_REPO: string;
	ALLOWED_GITHUB_USER: string;
	SESSION_SECRET: string;
}

export function getEnv(platform: App.Platform | undefined): EnvVars {
	return {
		GITHUB_CLIENT_ID: platform?.env?.GITHUB_CLIENT_ID ?? privateEnv.GITHUB_CLIENT_ID ?? '',
		GITHUB_CLIENT_SECRET: platform?.env?.GITHUB_CLIENT_SECRET ?? privateEnv.GITHUB_CLIENT_SECRET ?? '',
		GITHUB_REPO: platform?.env?.GITHUB_REPO ?? privateEnv.GITHUB_REPO ?? '',
		ALLOWED_GITHUB_USER: platform?.env?.ALLOWED_GITHUB_USER ?? privateEnv.ALLOWED_GITHUB_USER ?? '',
		SESSION_SECRET: platform?.env?.SESSION_SECRET ?? privateEnv.SESSION_SECRET ?? '',
	};
}
