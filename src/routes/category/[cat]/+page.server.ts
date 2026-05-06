import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { allPosts } = await parent();
	const filtered = allPosts.filter((p) => p.category === params.cat);

	return {
		category: params.cat,
		posts: filtered
	};
};
