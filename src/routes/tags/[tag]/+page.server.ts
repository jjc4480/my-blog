import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { allPosts } = await parent();
	const filtered = allPosts.filter((p) => p.tags.includes(params.tag));

	const freq = new Map<string, number>();
	for (const post of filtered) {
		for (const t of post.tags) {
			if (t === params.tag) continue;
			freq.set(t, (freq.get(t) ?? 0) + 1);
		}
	}
	const relatedTags = [...freq.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.slice(0, 8)
		.map(([name, count]) => ({ name, count }));

	return {
		tag: params.tag,
		posts: filtered,
		relatedTags
	};
};
