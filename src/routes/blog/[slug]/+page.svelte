<script lang="ts">
	import TagChip from '$lib/components/common/TagChip.svelte';
	import SEO from '$lib/components/common/SEO.svelte';
	import JsonLD from '$lib/components/common/JsonLD.svelte';
	import { siteConfig } from '$lib/config';
	import { buildArticleSchema } from '$lib/seo';

	let { data } = $props();

	function formatDate(dateStr: string): string {
		const d = new Date(dateStr);
		return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
	}

	const articleSchema = $derived(buildArticleSchema({
		title: data.title,
		description: data.description,
		url: `${siteConfig.url}/blog/${data.slug}`,
		publishedTime: data.date,
		ogImage: `/og/${data.slug}.png`,
		tags: data.tags
	}));

	const Content = data.Content;
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

<article>
	<header class="mb-10">
		<div class="mb-3 flex items-center gap-3 text-sm text-muted-foreground">
			<time datetime={data.date}>{formatDate(data.date)}</time>
			<span>·</span>
			<a href="/category/{data.category}" class="hover:text-foreground transition-colors">{data.category}</a>
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
</article>
