import { getCategories, getTags } from '$lib/content/posts';
import { siteConfig } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, parent }) => {
	const { allPosts } = await parent();
	const rawPage = Number(url.searchParams.get('page') ?? '1');
	const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
	const category = url.searchParams.get('category') ?? '';
	const tag = url.searchParams.get('tag') ?? '';

	let filtered = allPosts;
	if (category) filtered = filtered.filter((p) => p.category === category);
	if (tag) filtered = filtered.filter((p) => p.tags.includes(tag));

	const perPage = siteConfig.postsPerPage;
	const totalPages = Math.ceil(filtered.length / perPage);
	const safePage = page > totalPages ? 1 : page;
	const paginatedPosts = filtered.slice((safePage - 1) * perPage, safePage * perPage);

	return {
		posts: paginatedPosts,
		currentPage: safePage,
		totalPages,
		totalCount: allPosts.length,
		categories: getCategories(allPosts),
		tags: getTags(allPosts),
		activeCategory: category,
		activeTag: tag
	};
};
