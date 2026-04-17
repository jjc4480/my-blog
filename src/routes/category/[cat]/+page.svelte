<script lang="ts">
	import PostList from '$lib/components/post/PostList.svelte';
	import SEO from '$lib/components/common/SEO.svelte';
	import JsonLD from '$lib/components/common/JsonLD.svelte';
	import Breadcrumb from '$lib/components/common/Breadcrumb.svelte';
	import { siteConfig } from '$lib/config';
	import { buildCollectionPageSchema, buildBreadcrumbSchema } from '$lib/seo';

	let { data } = $props();

	const schema = $derived(buildCollectionPageSchema({
		title: data.category,
		description: `${data.category} 카테고리의 포스트`,
		url: `${siteConfig.url}/category/${data.category}`
	}));

	const breadcrumbSchema = $derived(buildBreadcrumbSchema([
		{ name: '홈', url: siteConfig.url },
		{ name: '카테고리', url: `${siteConfig.url}/` },
		{ name: data.category, url: `${siteConfig.url}/category/${data.category}` }
	]));
</script>

<SEO title={data.category} description="{data.category} 카테고리의 포스트" canonicalUrl="{siteConfig.url}/category/{data.category}" />
<JsonLD {schema} />
<JsonLD schema={breadcrumbSchema} />

<section>
	<Breadcrumb items={[
		{ label: '홈', href: '/' },
		{ label: '카테고리' },
		{ label: data.category }
	]} />
	<h1 class="mt-2 text-2xl font-bold tracking-tight">{data.category}</h1>
	<p class="mt-1 text-sm text-muted-foreground">{data.posts.length}개의 포스트</p>
	<PostList posts={data.posts} />
</section>
