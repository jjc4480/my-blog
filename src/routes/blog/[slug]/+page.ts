import { error } from '@sveltejs/kit';
import { getPosts } from '$lib/content/posts';
import type { PageLoad } from './$types';
import { getReadingTime } from '$lib/content/reading-time';

export const prerender = true;

export async function entries() {
	const posts = await getPosts();
	return posts.map((p) => ({ slug: p.slug }));
}

type PostEntry = {
	slug: string;
	title: string;
	date: string;
	tags: string[];
	series?: string;
	seriesOrder?: number;
};

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

	// Single pass over all post modules — build unified PostEntry[] with all fields
	// needed for prev/next, series, and related derivations.
	const allPostsData: PostEntry[] = Object.entries(modules)
		.map(([p, m]) => {
			const mod = m as { metadata: Record<string, unknown> };
			if (!mod.metadata || mod.metadata.published === false) return null;
			if (mod.metadata.secret) return null;
			return {
				slug: p.split('/').pop()?.replace('.md', '') ?? '',
				title: mod.metadata.title as string,
				date: mod.metadata.date as string,
				tags: (mod.metadata.tags as string[]) ?? [],
				series: mod.metadata.series as string | undefined,
				seriesOrder: mod.metadata.seriesOrder as number | undefined
			} satisfies PostEntry;
		})
		.filter((p): p is PostEntry => p !== null)
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	// prev/next glob (date-sorted, newest first): prev = newer, next = older.
	const currentIndex = allPostsData.findIndex((p) => p.slug === params.slug);
	const prevPost = currentIndex > 0
		? { slug: allPostsData[currentIndex - 1].slug, title: allPostsData[currentIndex - 1].title, date: allPostsData[currentIndex - 1].date }
		: null;
	const nextPost = currentIndex >= 0 && currentIndex < allPostsData.length - 1
		? { slug: allPostsData[currentIndex + 1].slug, title: allPostsData[currentIndex + 1].title, date: allPostsData[currentIndex + 1].date }
		: null;

	// Series navigation — filter by current series, sort by seriesOrder.
	const currentSeries = metadata.series as string | undefined;
	let seriesPosts: Array<{ slug: string; title: string; order: number }> = [];
	let prevSeriesPost: { slug: string; title: string } | null = null;
	let nextSeriesPost: { slug: string; title: string } | null = null;

	if (currentSeries) {
		seriesPosts = allPostsData
			.filter((p) => p.series === currentSeries)
			.map((p) => ({ slug: p.slug, title: p.title, order: p.seriesOrder ?? 0 }))
			.sort((a, b) => a.order - b.order);

		const seriesIdx = seriesPosts.findIndex((p) => p.slug === params.slug);
		if (seriesIdx > 0) prevSeriesPost = seriesPosts[seriesIdx - 1];
		if (seriesIdx >= 0 && seriesIdx < seriesPosts.length - 1) nextSeriesPost = seriesPosts[seriesIdx + 1];
	}

	// Related posts — share 1+ tag, sorted by shared count desc then date desc.
	const currentTags = (metadata.tags as string[]) ?? [];
	const relatedPosts = allPostsData
		.filter((p) => p.slug !== params.slug)
		.map((p) => ({
			slug: p.slug,
			title: p.title,
			date: p.date,
			shared: p.tags.filter((t) => currentTags.includes(t)).length
		}))
		.filter((p) => p.shared >= 1)
		.sort((a, b) => b.shared - a.shared || new Date(b.date).getTime() - new Date(a.date).getTime())
		.slice(0, 3);

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
		series: currentSeries ?? null,
		seriesOrder: (metadata.seriesOrder as number) ?? null,
		seriesPosts,
		prevSeriesPost,
		nextSeriesPost,
		relatedPosts
	};
};
