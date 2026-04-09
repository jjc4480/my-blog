<script lang="ts">
	import PostList from '$lib/components/post/PostList.svelte';
	import { siteConfig } from '$lib/config';

	let { data } = $props();
</script>

<svelte:head>
	<title>#{data.tag} — {siteConfig.title}</title>
</svelte:head>

<section>
	<h1 class="text-2xl font-bold tracking-tight">
		<span class="text-primary">#</span>{data.tag}
	</h1>
	<p class="mt-1 text-sm text-muted-foreground">{data.posts.length}개의 포스트</p>
	<PostList posts={data.posts} />
</section>
