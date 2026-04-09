<script lang="ts">
	import type { Post } from '$lib/content/types';
	import SearchInput from '$lib/components/common/SearchInput.svelte';
	import PostList from '$lib/components/post/PostList.svelte';
	import { siteConfig } from '$lib/config';

	let { data } = $props();
	let query = $state('');

	let filtered = $derived.by(() => {
		if (!query.trim()) return [];
		const q = query.toLowerCase();
		return data.posts.filter(
			(p: Post) =>
				p.title.toLowerCase().includes(q) ||
				p.description.toLowerCase().includes(q) ||
				p.tags.some((t: string) => t.toLowerCase().includes(q)) ||
				p.category.toLowerCase().includes(q)
		);
	});
</script>

<svelte:head>
	<title>검색 — {siteConfig.title}</title>
</svelte:head>

<section>
	<h1 class="text-2xl font-bold tracking-tight">검색</h1>
	<div class="mt-4">
		<SearchInput bind:value={query} placeholder="제목, 설명, 태그로 검색..." />
	</div>

	{#if query.trim()}
		<p class="mt-6 text-sm text-muted-foreground">{filtered.length}개의 결과</p>
		<PostList posts={filtered} />
	{/if}
</section>
