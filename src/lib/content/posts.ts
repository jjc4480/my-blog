import type { Post } from './types';

export async function getPosts(): Promise<Post[]> {
	const modules = import.meta.glob('/content/posts/*.md', { eager: true });
	const posts: Post[] = [];

	for (const [path, module] of Object.entries(modules)) {
		const mod = module as { metadata: Omit<Post, 'slug' | 'content'>; default: { render: () => { html: string } } };
		const slug = path.split('/').pop()?.replace('.md', '') ?? '';
		const metadata = mod.metadata;

		if (metadata.published === false) continue;

		posts.push({
			...metadata,
			slug,
			content: ''
		});
	}

	return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getCategories(posts: Post[]): string[] {
	return [...new Set(posts.map((p) => p.category))].sort();
}

export function getTags(posts: Post[]): string[] {
	return [...new Set(posts.flatMap((p) => p.tags))].sort();
}
