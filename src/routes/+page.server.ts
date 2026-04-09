import { getPosts } from '$lib/content/posts';
import { siteConfig } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const posts = await getPosts();
	const page = Number(url.searchParams.get('page') ?? '1');
	const perPage = siteConfig.postsPerPage;
	const totalPages = Math.ceil(posts.length / perPage);
	const paginatedPosts = posts.slice((page - 1) * perPage, page * perPage);

	return {
		posts: paginatedPosts,
		currentPage: page,
		totalPages
	};
};
