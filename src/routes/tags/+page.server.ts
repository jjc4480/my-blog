import { getPosts, getTags } from '$lib/content/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const posts = await getPosts();
	const tags = getTags(posts);
	const tagCounts = tags.map((tag) => ({
		name: tag,
		count: posts.filter((p) => p.tags.includes(tag)).length
	}));

	return { tags: tagCounts };
};
