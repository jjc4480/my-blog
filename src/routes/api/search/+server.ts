import { getPosts } from '$lib/content/posts';
import { buildSearchIndex } from '$lib/content/search';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = async () => {
	const posts = await getPosts();
	const index = buildSearchIndex(posts);

	return new Response(JSON.stringify(index), {
		headers: { 'Content-Type': 'application/json' }
	});
};
