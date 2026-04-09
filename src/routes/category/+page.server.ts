import { getPosts, getCategories } from '$lib/content/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const posts = await getPosts();
	const categories = getCategories(posts);
	const categoryCounts = categories.map((cat) => ({
		name: cat,
		count: posts.filter((p) => p.category === cat).length
	}));

	return { categories: categoryCounts };
};
