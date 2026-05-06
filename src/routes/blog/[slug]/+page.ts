import { error } from '@sveltejs/kit';
import { getPosts } from '$lib/content/posts';
import type { PageLoad } from './$types';

export const prerender = true;

export async function entries() {
	const posts = await getPosts();
	return posts.map((p) => ({ slug: p.slug }));
}

export const load: PageLoad = async ({ params }) => {
	const modules = import.meta.glob('/content/posts/*.md', { eager: true });
	const path = `/content/posts/${params.slug}.md`;
	const module = modules[path] as { metadata: Record<string, unknown>; default: ConstructorOfATypedSvelteComponent } | undefined;

	if (!module) {
		error(404, 'Post not found');
	}

	const { metadata } = module;

	// Reuse getPosts() for validated metadata + precomputed readingTime.
	// includeSecret keeps admin-visible posts in currentPost; publicPosts
	// drives navigation/related so regular readers never see secret slugs.
	const allPosts = await getPosts({ includeSecret: true });
	const currentPost = allPosts.find((p) => p.slug === params.slug);
	const publicPosts = allPosts.filter((p) => !p.secret);
	const readingTime = currentPost?.readingTime ?? 0;

	// prev/next glob (date-sorted, newest first): prev = newer, next = older.
	const currentIndex = publicPosts.findIndex((p) => p.slug === params.slug);
	const prevPost = currentIndex > 0
		? { slug: publicPosts[currentIndex - 1].slug, title: publicPosts[currentIndex - 1].title, date: publicPosts[currentIndex - 1].date }
		: null;
	const nextPost = currentIndex >= 0 && currentIndex < publicPosts.length - 1
		? { slug: publicPosts[currentIndex + 1].slug, title: publicPosts[currentIndex + 1].title, date: publicPosts[currentIndex + 1].date }
		: null;

	// Series navigation — filter by current series, sort by seriesOrder.
	const currentSeries = metadata.series as string | undefined;
	let seriesPosts: Array<{ slug: string; title: string; order: number }> = [];
	let prevSeriesPost: { slug: string; title: string } | null = null;
	let nextSeriesPost: { slug: string; title: string } | null = null;

	if (currentSeries) {
		seriesPosts = publicPosts
			.filter((p) => p.series === currentSeries)
			.map((p) => ({ slug: p.slug, title: p.title, order: p.seriesOrder ?? 0 }))
			.sort((a, b) => a.order - b.order);

		const seriesIdx = seriesPosts.findIndex((p) => p.slug === params.slug);
		if (seriesIdx > 0) prevSeriesPost = seriesPosts[seriesIdx - 1];
		if (seriesIdx >= 0 && seriesIdx < seriesPosts.length - 1) nextSeriesPost = seriesPosts[seriesIdx + 1];
	}

	// Related posts — share 1+ tag, sorted by shared count desc then date desc.
	const currentTags = ((metadata.tags as string[] | undefined) ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
	const relatedPosts = publicPosts
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
		tags: (((metadata.tags as string[] | undefined) ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean)),
		category: ((metadata.category as string | undefined) ?? '').trim().toLowerCase(),
		secret: ((metadata.secret as boolean | undefined) ?? false),
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
