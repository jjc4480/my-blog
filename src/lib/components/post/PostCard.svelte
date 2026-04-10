<script lang="ts">
	import type { Post } from '$lib/content/types';
	import TagChip from '../common/TagChip.svelte';

	let { post }: { post: Post } = $props();

	function formatDate(dateStr: string): string {
		const d = new Date(dateStr);
		return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
	}
</script>

<article class="group py-6">
	<a href="/blog/{post.slug}" class="block">
		<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground tabular-nums sm:text-sm">
			<time datetime={post.date}>{formatDate(post.date)}</time>
			{#if post.readingTime}
				<span>·</span>
				<span>{post.readingTime}분 읽기</span>
			{/if}
		</div>
		<h2 class="mt-1 text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-snug sm:text-lg">
			{post.title}
		</h2>
		<p class="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-2">
			{post.description}
		</p>
	</a>
	<div class="mt-3 flex flex-wrap gap-1.5">
		{#each post.tags as tag}
			<TagChip {tag} href="/tags/{tag}" />
		{/each}
	</div>
</article>
