import type { Post } from './types';
import { getReadingTime } from './reading-time';
import { postSchema } from './frontmatter';

export async function getPosts(options?: { includeSecret?: boolean }): Promise<Post[]> {
	const modules = import.meta.glob('/content/posts/*.md', { eager: true });
	const rawModules = import.meta.glob('/content/posts/*.md', { query: '?raw', eager: true, import: 'default' });
	const posts: Post[] = [];

	for (const [path, module] of Object.entries(modules)) {
		const mod = module as { metadata: unknown; default: { render: () => { html: string } } };
		const slug = path.split('/').pop()?.replace('.md', '') ?? '';

		const result = postSchema.safeParse(mod.metadata);
		if (!result.success) {
			console.warn(`[posts] Invalid frontmatter in ${slug}:`, result.error.issues);
			continue;
		}
		const metadata = result.data as Omit<Post, 'slug'>;

		if (metadata.published === false) continue;
		if (metadata.secret && !options?.includeSecret) continue;

		const rawContent = (rawModules[path] as string) ?? '';

		posts.push({
			...metadata,
			slug,
			readingTime: getReadingTime(rawContent)
		});
	}

	return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getCategories(posts: Post[]): string[] {
	return [...new Set(posts.map((p) => p.category))].sort();
}

export function getTags(posts: Post[]): string[] {
	const freq = new Map<string, number>();
	for (const post of posts) {
		for (const tag of post.tags) {
			const key = tag.trim().toLowerCase();
			if (!key) continue;
			freq.set(key, (freq.get(key) ?? 0) + 1);
		}
	}
	return [...freq.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.map(([tag]) => tag);
}
