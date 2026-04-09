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
		<div class="flex items-baseline justify-between gap-4">
			<h2 class="text-lg font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
				{post.title}
			</h2>
			<time class="shrink-0 text-sm text-muted-foreground tabular-nums" datetime={post.date}>
				{formatDate(post.date)}
			</time>
		</div>
		<p class="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">
			{post.description}
		</p>
	</a>
	<div class="mt-3 flex flex-wrap gap-1.5">
		{#each post.tags as tag}
			<TagChip {tag} href="/tags/{tag}" />
		{/each}
	</div>
</article>
