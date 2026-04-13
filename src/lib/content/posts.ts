import type { Post } from './types';
import { getReadingTime } from './reading-time';

export async function getPosts(options?: { includeSecret?: boolean }): Promise<Post[]> {
	const modules = import.meta.glob('/content/posts/*.md', { eager: true });
	const rawModules = import.meta.glob('/content/posts/*.md', { query: '?raw', eager: true, import: 'default' });
	const posts: Post[] = [];

	for (const [path, module] of Object.entries(modules)) {
		const mod = module as { metadata: Omit<Post, 'slug' | 'content'>; default: { render: () => { html: string } } };
		const slug = path.split('/').pop()?.replace('.md', '') ?? '';
		const metadata = mod.metadata;

		if (metadata.published === false) continue;
		if (metadata.secret && !options?.includeSecret) continue;

		const rawContent = (rawModules[path] as string) ?? '';

		posts.push({
			...metadata,
			slug,
			content: '',
			readingTime: getReadingTime(rawContent)
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
