import type { Post } from './types';

export interface SearchIndex {
	posts: Array<{
		slug: string;
		title: string;
		description: string;
		tags: string[];
		category: string;
		date: string;
	}>;
}

export function buildSearchIndex(posts: Post[]): SearchIndex {
	return {
		posts: posts.map((p) => ({
			slug: p.slug,
			title: p.title,
			description: p.description,
			tags: p.tags,
			category: p.category,
			date: p.date
		}))
	};
}

export function searchPosts(index: SearchIndex, query: string) {
	const q = query.toLowerCase().trim();
	if (!q) return [];

	return index.posts.filter((p) =>
		p.title.toLowerCase().includes(q) ||
		p.description.toLowerCase().includes(q) ||
		p.tags.some((t) => t.toLowerCase().includes(q)) ||
		p.category.toLowerCase().includes(q)
	);
}
