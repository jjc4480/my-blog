import { getPosts } from '$lib/content/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const posts = await getPosts();
	const filtered = posts.filter((p) => p.tags.includes(params.tag));

	return {
		tag: params.tag,
		posts: filtered
	};
};
