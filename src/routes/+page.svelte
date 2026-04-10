<script lang="ts">
	import PostList from '$lib/components/post/PostList.svelte';
	import Pagination from '$lib/components/common/Pagination.svelte';
	import SEO from '$lib/components/common/SEO.svelte';
	import JsonLD from '$lib/components/common/JsonLD.svelte';
	import { siteConfig } from '$lib/config';
	import { buildWebSiteSchema } from '$lib/seo';

	let { data } = $props();

	const schema = buildWebSiteSchema();
</script>

<SEO description={siteConfig.description} />
<JsonLD {schema} />

<!-- Hero -->
<section class="mb-12">
	<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">{siteConfig.title}</h1>
	<p class="mt-3 text-base text-muted-foreground leading-relaxed">{siteConfig.author.bio}</p>
	<p class="mt-1 text-sm text-muted-foreground/70">{siteConfig.description}</p>
</section>

<!-- Filter -->
<section class="mb-8">
	<div class="flex flex-wrap items-center gap-2">
		<span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">카테고리</span>
		<a
			href="/"
			class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors {!data.activeCategory && !data.activeTag
				? 'bg-primary text-primary-foreground'
				: 'bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground'}"
		>전체</a>
		{#each data.categories as cat}
			<a
				href="/?category={cat}"
				class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors {data.activeCategory === cat
					? 'bg-primary text-primary-foreground'
					: 'bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground'}"
			>{cat}</a>
		{/each}
	</div>
	<div class="mt-3 flex flex-wrap items-center gap-2">
		<span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">태그</span>
		{#each data.tags as tag}
			<a
				href="/?tag={tag}"
				class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors {data.activeTag === tag
					? 'bg-primary text-primary-foreground'
					: 'bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground'}"
			>{tag}</a>
		{/each}
	</div>
</section>

<!-- Posts -->
<section>
	{#if data.activeCategory || data.activeTag}
		<div class="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
			<span>필터:</span>
			{#if data.activeCategory}<span class="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{data.activeCategory}</span>{/if}
			{#if data.activeTag}<span class="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">#{data.activeTag}</span>{/if}
			<a href="/" class="text-xs text-primary hover:underline">초기화</a>
		</div>
	{/if}
	<PostList posts={data.posts} />
	<Pagination currentPage={data.currentPage} totalPages={data.totalPages} />
</section>
