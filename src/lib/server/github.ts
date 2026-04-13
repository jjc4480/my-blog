const API_BASE = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const POSTS_DIR = 'content/posts';

interface GitHubFileEntry {
	name: string;
	path: string;
	sha: string;
	type: 'file' | 'dir';
}

interface GitHubFileContent {
	content: string;
	sha: string;
	encoding: string;
}

function headers(token: string): Record<string, string> {
	return {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': API_VERSION
	};
}

function utf8ToBase64(str: string): string {
	const bytes = new TextEncoder().encode(str);
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary);
}

function base64ToUtf8(b64: string): string {
	const cleaned = b64.replace(/\n/g, '');
	const binary = atob(cleaned);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return new TextDecoder().decode(bytes);
}

async function ghFetch(url: string, token: string, init?: RequestInit): Promise<Response> {
	const res = await fetch(url, {
		...init,
		headers: { ...headers(token), ...init?.headers }
	});
	if (!res.ok) {
		const body = await res.text();
		throw new Error(`GitHub API ${res.status}: ${body}`);
	}
	return res;
}

export async function listPostFiles(
	token: string,
	repo: string
): Promise<{ name: string; path: string; sha: string }[]> {
	const res = await ghFetch(`${API_BASE}/repos/${repo}/contents/${POSTS_DIR}`, token);
	const entries: GitHubFileEntry[] = await res.json();
	return entries
		.filter((e) => e.type === 'file' && e.name.endsWith('.md'))
		.map(({ name, path, sha }) => ({ name, path, sha }));
}

export async function getPostFile(
	token: string,
	repo: string,
	slug: string
): Promise<{ content: string; sha: string }> {
	const res = await ghFetch(
		`${API_BASE}/repos/${repo}/contents/${POSTS_DIR}/${slug}.md`,
		token
	);
	const data: GitHubFileContent = await res.json();
	return { content: base64ToUtf8(data.content), sha: data.sha };
}

export async function putPostFile(
	token: string,
	repo: string,
	slug: string,
	content: string,
	message: string,
	sha?: string
): Promise<{ sha: string }> {
	const body: Record<string, string> = {
		message,
		content: utf8ToBase64(content)
	};
	if (sha) body.sha = sha;

	const res = await ghFetch(
		`${API_BASE}/repos/${repo}/contents/${POSTS_DIR}/${slug}.md`,
		token,
		{
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}
	);
	const data = await res.json();
	return { sha: data.content.sha };
}

export async function deletePostFile(
	token: string,
	repo: string,
	slug: string,
	sha: string,
	message: string
): Promise<void> {
	await ghFetch(`${API_BASE}/repos/${repo}/contents/${POSTS_DIR}/${slug}.md`, token, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ message, sha })
	});
}
