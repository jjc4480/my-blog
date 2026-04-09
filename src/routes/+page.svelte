<script lang="ts">
	import PostList from '$lib/components/post/PostList.svelte';
	import Pagination from '$lib/components/common/Pagination.svelte';
	import { siteConfig } from '$lib/config';

	let { data } = $props();
</script>

<svelte:head>
	<title>{siteConfig.title}</title>
	<meta name="description" content={siteConfig.description} />
</svelte:head>

<section>
	<h1 class="text-2xl font-bold tracking-tight">포스트</h1>
	<PostList posts={data.posts} />
	<Pagination currentPage={data.currentPage} totalPages={data.totalPages} />
</section>
