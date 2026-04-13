declare global {
	namespace App {
		interface Locals {
			user: { login: string; token: string } | null;
		}
		interface Platform {
			env?: {
				GITHUB_CLIENT_ID: string;
				GITHUB_CLIENT_SECRET: string;
				GITHUB_REPO: string;
				ALLOWED_GITHUB_USER: string;
				SESSION_SECRET: string;
			};
		}
	}
}

export {};
