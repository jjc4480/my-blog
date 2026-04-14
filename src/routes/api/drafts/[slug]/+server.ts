import { json } from '@sveltejs/kit';
import { getPostFile, putPostFile, deletePostFile } from '$lib/server/github';
import type { RequestHandler } from './$types';
import { getEnv } from '$lib/server/env';
import { dev } from '$app/environment';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

export const prerender = false;

export const GET: RequestHandler = async ({ params, locals, platform }) => {
	const user = locals.user;
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	if (dev && !user.token) {
		const filePath = join(process.cwd(), 'content', 'posts', `${params.slug}.md`);
		const content = await readFile(filePath, 'utf-8');
		return json({ content, sha: '' });
	}

	const repo = getEnv(platform).GITHUB_REPO;
	if (!repo) return json({ error: 'Unauthorized' }, { status: 401 });
	const { content, sha } = await getPostFile(user.token, repo, params.slug);
	return json({ content, sha });
};

export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
	const user = locals.user;
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { content, sha, publish } = await request.json();
	if (!content) return json({ error: 'content required' }, { status: 400 });

	if (dev && !user.token) {
		const filePath = join(process.cwd(), 'content', 'posts', `${params.slug}.md`);
		await writeFile(filePath, content, 'utf-8');
		return json({ sha: '' });
	}

	if (!sha) return json({ error: 'sha required' }, { status: 400 });
	const repo = getEnv(platform).GITHUB_REPO;
	if (!repo) return json({ error: 'Unauthorized' }, { status: 401 });
	const message = publish ? `publish: ${params.slug}` : `draft: update ${params.slug}`;
	const result = await putPostFile(user.token, repo, params.slug, content, message, sha);
	return json({ sha: result.sha });
};

export const DELETE: RequestHandler = async ({ params, request, locals, platform }) => {
	const user = locals.user;
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	if (dev && !user.token) {
		const filePath = join(process.cwd(), 'content', 'posts', `${params.slug}.md`);
		await unlink(filePath);
		return json({ ok: true });
	}

	const repo = getEnv(platform).GITHUB_REPO;
	if (!repo) return json({ error: 'Unauthorized' }, { status: 401 });
	const { sha } = await request.json();
	if (!sha) return json({ error: 'sha required' }, { status: 400 });
	await deletePostFile(user.token, repo, params.slug, sha, `draft: delete ${params.slug}`);
	return json({ ok: true });
};
