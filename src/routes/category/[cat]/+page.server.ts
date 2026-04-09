import { getPosts } from '$lib/content/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const posts = await getPosts();
	const filtered = posts.filter((p) => p.category === params.cat);

	return {
		category: params.cat,
		posts: filtered
	};
};
