import { getPosts } from '$lib/content/posts';
import { buildSearchData } from '$lib/content/search';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = async () => {
	const posts = await getPosts();

	// Load raw markdown for body text indexing
	const rawModules = import.meta.glob('/content/posts/*.md', { query: '?raw', eager: true, import: 'default' });
	const rawContents: Record<string, string> = {};
	for (const [path, content] of Object.entries(rawModules)) {
		const slug = path.split('/').pop()?.replace('.md', '') ?? '';
		rawContents[slug] = content as string;
	}

	const data = buildSearchData(posts, rawContents);

	return new Response(JSON.stringify(data), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
