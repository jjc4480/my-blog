import { getCategories } from '$lib/content/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { allPosts } = await parent();
	const categories = getCategories(allPosts);
	const categoryCounts = categories.map((cat) => ({
		name: cat,
		count: allPosts.filter((p) => p.category === cat).length
	}));

	return { categories: categoryCounts };
};
