import { json } from '@sveltejs/kit';
import { getPostFile, putPostFile, deletePostFile } from '$lib/server/github';
import type { RequestHandler } from './$types';
import { getEnv } from '$lib/server/env';

export const prerender = false;

export const GET: RequestHandler = async ({ params, locals, platform }) => {
	const user = locals.user;
	const repo = getEnv(platform).GITHUB_REPO;
	if (!user || !repo) return json({ error: 'Unauthorized' }, { status: 401 });

	const { content, sha } = await getPostFile(user.token, repo, params.slug);
	return json({ content, sha });
};

export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
	const user = locals.user;
	const repo = getEnv(platform).GITHUB_REPO;
	if (!user || !repo) return json({ error: 'Unauthorized' }, { status: 401 });

	const { content, sha, publish } = await request.json();
	if (!content || !sha) return json({ error: 'content and sha required' }, { status: 400 });

	const message = publish ? `publish: ${params.slug}` : `draft: update ${params.slug}`;
	const result = await putPostFile(user.token, repo, params.slug, content, message, sha);
	return json({ sha: result.sha });
};

export const DELETE: RequestHandler = async ({ params, request, locals, platform }) => {
	const user = locals.user;
	const repo = getEnv(platform).GITHUB_REPO;
	if (!user || !repo) return json({ error: 'Unauthorized' }, { status: 401 });

	const { sha } = await request.json();
	if (!sha) return json({ error: 'sha required' }, { status: 400 });

	await deletePostFile(user.token, repo, params.slug, sha, `draft: delete ${params.slug}`);
	return json({ ok: true });
};
