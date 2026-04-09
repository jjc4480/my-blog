<script lang="ts">
	import type { SEOProps } from '$lib/seo';
	import { buildSEO } from '$lib/seo';

	let { ...props }: SEOProps = $props();

	const seo = $derived(buildSEO(props));
</script>

<svelte:head>
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	{#if seo.noindex}
		<meta name="robots" content="noindex, nofollow" />
	{/if}
	{#if seo.canonicalUrl}
		<link rel="canonical" href={seo.canonicalUrl} />
	{/if}

	<!-- Open Graph -->
	<meta property="og:title" content={seo.title} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:type" content={seo.type} />
	<meta property="og:image" content={seo.ogImage} />
	<meta property="og:site_name" content={seo.siteName} />
	<meta property="og:locale" content={seo.locale} />
	{#if seo.canonicalUrl}
		<meta property="og:url" content={seo.canonicalUrl} />
	{/if}
	{#if seo.type === 'article' && seo.publishedTime}
		<meta property="article:published_time" content={seo.publishedTime} />
		{#if seo.modifiedTime}
			<meta property="article:modified_time" content={seo.modifiedTime} />
		{/if}
		{#each seo.tags as tag}
			<meta property="article:tag" content={tag} />
		{/each}
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seo.title} />
	<meta name="twitter:description" content={seo.description} />
	<meta name="twitter:image" content={seo.ogImage} />
	{#if seo.twitterSite}
		<meta name="twitter:site" content={seo.twitterSite} />
	{/if}
</svelte:head>
