import { getPosts, getCategories, getTags } from '$lib/content/posts';
import { siteConfig } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const allPosts = await getPosts();
	const page = Number(url.searchParams.get('page') ?? '1');
	const category = url.searchParams.get('category') ?? '';
	const tag = url.searchParams.get('tag') ?? '';

	let filtered = allPosts;
	if (category) filtered = filtered.filter((p) => p.category === category);
	if (tag) filtered = filtered.filter((p) => p.tags.includes(tag));

	const perPage = siteConfig.postsPerPage;
	const totalPages = Math.ceil(filtered.length / perPage);
	const paginatedPosts = filtered.slice((page - 1) * perPage, page * perPage);

	return {
		posts: paginatedPosts,
		currentPage: page,
		totalPages,
		categories: getCategories(allPosts),
		tags: getTags(allPosts),
		activeCategory: category,
		activeTag: tag
	};
};
