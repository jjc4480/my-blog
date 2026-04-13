<script lang="ts">
	import { browser } from '$app/environment';
	import TagChip from '$lib/components/common/TagChip.svelte';
	import SEO from '$lib/components/common/SEO.svelte';
	import JsonLD from '$lib/components/common/JsonLD.svelte';
	import TOC from '$lib/components/post/TOC.svelte';
	import { siteConfig } from '$lib/config';
	import { buildArticleSchema } from '$lib/seo';
	import { formatDate } from '$lib/utils';

	let { data } = $props();

	interface TocItem { id: string; text: string; level: number; }
	let headings: TocItem[] = $state([]);

	const articleSchema = $derived(buildArticleSchema({
		title: data.title,
		description: data.description,
		url: `${siteConfig.url}/blog/${data.slug}`,
		publishedTime: data.date,
		ogImage: `/og/${data.slug}.png`,
		tags: data.tags
	}));

	const Content = $derived(data.Content);

	$effect(() => {
		if (!browser) return;
		void data.slug;
		void Content;
		requestAnimationFrame(() => {
			const article = document.querySelector('article .prose');
			if (!article) return;
			const els = article.querySelectorAll('h2, h3');
			const items: TocItem[] = [];
			els.forEach((el) => {
				if (!el.id) {
					el.id = el.textContent?.trim().toLowerCase().replace(/[^a-z0-9\uac00-\ud7a3]+/g, '-').replace(/^-|-$/g, '') ?? '';
				}
				items.push({ id: el.id, text: el.textContent?.trim() ?? '', level: parseInt(el.tagName[1]) });
			});
			headings = items;
		});
	});
</script>

<SEO
	title={data.title}
	description={data.description}
	type="article"
	publishedTime={data.date}
	tags={data.tags}
	ogImage="/og/{data.slug}.png"
	canonicalUrl="{siteConfig.url}/blog/{data.slug}"
/>
<JsonLD schema={articleSchema} />

<TOC {headings} />

<article>
	<header class="mb-10">
		<div class="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
			<time datetime={data.date}>{formatDate(data.date)}</time>
			<span>\u00b7</span>
			<a href="/category/{data.category}" class="hover:text-foreground transition-colors">{data.category}</a>
			<span>\u00b7</span>
			<span>{data.readingTime}\ubd84 \uc77d\uae30</span>
		</div>
		<h1 class="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{data.title}</h1>
		<div class="mt-4 flex flex-wrap gap-1.5">
			{#each data.tags as tag}
				<TagChip {tag} href="/tags/{tag}" />
			{/each}
		</div>
	</header>

	<div class="prose prose-neutral dark:prose-invert max-w-none leading-[1.8]">
		<Content />
	</div>

	<nav class="mt-16 grid gap-4 border-t border-border/50 pt-8 sm:grid-cols-2" aria-label="\uc774\uc804/\ub2e4\uc74c \uae00">
		{#if data.prevPost}
			<a href="/blog/{data.prevPost.slug}" class="group flex flex-col rounded-lg border border-border/50 p-4 transition-colors hover:bg-secondary/40">
				<span class="text-xs text-muted-foreground">\u2190 \uc774\uc804 \uae00</span>
				<span class="mt-1 text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">{data.prevPost.title}</span>
			</a>
		{:else}
			<div></div>
		{/if}
		{#if data.nextPost}
			<a href="/blog/{data.nextPost.slug}" class="group flex flex-col items-end text-right rounded-lg border border-border/50 p-4 transition-colors hover:bg-secondary/40">
				<span class="text-xs text-muted-foreground">\ub2e4\uc74c \uae00 \u2192</span>
				<span class="mt-1 text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">{data.nextPost.title}</span>
			</a>
		{/if}
	</nav>
</article>
