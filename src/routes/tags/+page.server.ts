import { getTags } from '$lib/content/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { allPosts } = await parent();
	const tags = getTags(allPosts);
	const tagCounts = tags.map((tag) => ({
		name: tag,
		count: allPosts.filter((p) => p.tags.includes(tag)).length
	}));

	return { tags: tagCounts };
};
