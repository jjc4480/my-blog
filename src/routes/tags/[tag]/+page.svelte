<script lang="ts">
	import PostList from '$lib/components/post/PostList.svelte';
	import SEO from '$lib/components/common/SEO.svelte';
	import JsonLD from '$lib/components/common/JsonLD.svelte';
	import { siteConfig } from '$lib/config';
	import { buildCollectionPageSchema } from '$lib/seo';

	let { data } = $props();

	const schema = $derived(buildCollectionPageSchema({
		title: `#${data.tag}`,
		description: `${data.tag} 태그의 포스트`,
		url: `${siteConfig.url}/tags/${data.tag}`
	}));
</script>

<SEO title="#{data.tag}" canonicalUrl="{siteConfig.url}/tags/{data.tag}" description="{data.tag} 태그의 포스트" />
<JsonLD {schema} />

<section>
	<h1 class="text-2xl font-bold tracking-tight">
		<span class="text-primary">#</span>{data.tag}
	</h1>
	<p class="mt-1 text-sm text-muted-foreground">{data.posts.length}개의 포스트</p>
	<PostList posts={data.posts} />
</section>
