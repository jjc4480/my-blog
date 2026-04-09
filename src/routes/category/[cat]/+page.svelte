<script lang="ts">
	import PostList from '$lib/components/post/PostList.svelte';
	import SEO from '$lib/components/common/SEO.svelte';
	import JsonLD from '$lib/components/common/JsonLD.svelte';
	import { siteConfig } from '$lib/config';
	import { buildCollectionPageSchema } from '$lib/seo';

	let { data } = $props();

	const schema = $derived(buildCollectionPageSchema({
		title: data.category,
		description: `${data.category} 카테고리의 포스트`,
		url: `${siteConfig.url}/category/${data.category}`
	}));
</script>

<SEO title={data.category} description="{data.category} 카테고리의 포스트" />
<JsonLD {schema} />

<section>
	<h1 class="text-2xl font-bold tracking-tight">{data.category}</h1>
	<p class="mt-1 text-sm text-muted-foreground">{data.posts.length}개의 포스트</p>
	<PostList posts={data.posts} />
</section>
