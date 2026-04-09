<script lang="ts">
	import type { Post } from '$lib/content/types';
	import PostCard from './PostCard.svelte';

	let { posts }: { posts: Post[] } = $props();
</script>

<div class="divide-y divide-border/50">
	{#each posts as post (post.slug)}
		<PostCard {post} />
	{/each}
</div>

{#if posts.length === 0}
	<p class="py-12 text-center text-muted-foreground">포스트가 없습니다.</p>
{/if}
