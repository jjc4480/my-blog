<script lang="ts">
	import PostList from '$lib/components/post/PostList.svelte';
	import SEO from '$lib/components/common/SEO.svelte';
	import JsonLD from '$lib/components/common/JsonLD.svelte';
	import Breadcrumb from '$lib/components/common/Breadcrumb.svelte';
	import { siteConfig } from '$lib/config';
	import { buildCollectionPageSchema, buildBreadcrumbSchema } from '$lib/seo';

	let { data } = $props();

	const schema = $derived(buildCollectionPageSchema({
		title: `#${data.tag}`,
		description: `${data.tag} 태그의 포스트`,
		url: `${siteConfig.url}/tags/${data.tag}`
	}));

	const breadcrumbSchema = $derived(buildBreadcrumbSchema([
		{ name: '홈', url: siteConfig.url },
		{ name: '태그', url: `${siteConfig.url}/` },
		{ name: `#${data.tag}`, url: `${siteConfig.url}/tags/${data.tag}` }
	]));
</script>

<SEO title="#{data.tag}" canonicalUrl="{siteConfig.url}/tags/{data.tag}" description="{data.tag} 태그의 포스트" />
<JsonLD {schema} />
<JsonLD schema={breadcrumbSchema} />

<section>
	<Breadcrumb items={[
		{ label: '홈', href: '/' },
		{ label: '태그' },
		{ label: `#${data.tag}` }
	]} />
	<h1 class="mt-2 text-2xl font-bold tracking-tight">
		<span class="text-primary">#</span>{data.tag}
	</h1>
	<p class="mt-1 text-sm text-muted-foreground">{data.posts.length}개의 포스트</p>
	<PostList posts={data.posts} />
</section>
