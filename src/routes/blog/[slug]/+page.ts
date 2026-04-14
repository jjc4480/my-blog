import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { getReadingTime } from '$lib/content/reading-time';

export const load: PageLoad = async ({ params }) => {
	const modules = import.meta.glob('/content/posts/*.md', { eager: true });
	const rawModules = import.meta.glob('/content/posts/*.md', { query: '?raw', eager: true, import: 'default' });
	const path = `/content/posts/${params.slug}.md`;
	const module = modules[path] as { metadata: Record<string, unknown>; default: ConstructorOfATypedSvelteComponent } | undefined;

	if (!module) {
		error(404, 'Post not found');
	}

	const { metadata } = module;
	const rawContent = (rawModules[path] as string) ?? '';
	const readingTime = getReadingTime(rawContent);

	const allPosts = Object.entries(modules)
		.map(([p, m]) => {
			const mod = m as { metadata: Record<string, unknown> };
			if (!mod.metadata || mod.metadata.published === false) return null;
			if (mod.metadata.secret) return null;
			return {
				slug: p.split('/').pop()?.replace('.md', '') ?? '',
				title: mod.metadata.title as string,
				date: mod.metadata.date as string
			};
		})
		.filter(Boolean)
		.sort((a, b) => new Date(b!.date).getTime() - new Date(a!.date).getTime()) as Array<{ slug: string; title: string; date: string }>;

	const currentIndex = allPosts.findIndex((p) => p.slug === params.slug);
	const prevPost = currentIndex >= 0 && currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
	const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;

	const currentTags = (metadata.tags as string[]) ?? [];
	const relatedPosts = Object.entries(modules)
		.map(([p, m]) => {
			const mod = m as { metadata: Record<string, unknown> };
			if (!mod.metadata || mod.metadata.published === false || mod.metadata.secret) return null;
			const s = p.split('/').pop()?.replace('.md', '') ?? '';
			if (s === params.slug) return null;
			const tags = (mod.metadata.tags as string[]) ?? [];
			const shared = tags.filter(t => currentTags.includes(t)).length;
			if (shared < 1) return null;
			return { slug: s, title: mod.metadata.title as string, date: mod.metadata.date as string, shared };
		})
		.filter(Boolean)
		.sort((a, b) => b!.shared - a!.shared || new Date(b!.date).getTime() - new Date(a!.date).getTime())
		.slice(0, 3) as Array<{ slug: string; title: string; date: string }>;

	return {
		title: metadata.title as string,
		date: metadata.date as string,
		description: metadata.description as string,
		tags: metadata.tags as string[],
		category: metadata.category as string,
		secret: (metadata.secret as boolean) ?? false,
		slug: params.slug,
		readingTime,
		prevPost,
		nextPost,
		Content: module.default,
		relatedPosts
	};
};
