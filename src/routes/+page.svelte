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

<section>
	<h1 class="text-2xl font-bold tracking-tight">포스트</h1>
	<PostList posts={data.posts} />
	<Pagination currentPage={data.currentPage} totalPages={data.totalPages} />
</section>
