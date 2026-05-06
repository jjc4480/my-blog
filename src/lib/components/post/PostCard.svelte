<script lang="ts">
	import type { Post } from '$lib/content/types';
	import TagChip from '../common/TagChip.svelte';
	import { formatDate } from '$lib/utils';

	const VISIBLE_TAGS = 3;
	let { post }: { post: Post } = $props();
	let tagsExpanded = $state(false);

	const hiddenCount = $derived(Math.max(0, post.tags.length - VISIBLE_TAGS));
	const visibleTags = $derived(tagsExpanded ? post.tags : post.tags.slice(0, VISIBLE_TAGS));
</script>

<article class="group py-6">
	<a href="/blog/{post.slug}" class="flex gap-4">
		{#if post.thumbnail}
			<div class="hidden h-24 w-36 shrink-0 overflow-hidden rounded-md sm:block" style="aspect-ratio: 3 / 2;">
				<img
					src={post.thumbnail}
					alt=""
					aria-hidden="true"
					loading="lazy"
					decoding="async"
					width="144"
					height="96"
					class="h-full w-full object-cover"
				/>
			</div>
		{/if}
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground tabular-nums sm:text-sm">
				<time datetime={post.date}>{formatDate(post.date)}</time>
				{#if post.readingTime}
					<span>·</span>
					<span>{post.readingTime}분 읽기</span>
				{/if}
				{#if post.secret}
					<span>·</span>
					<span class="inline-flex items-center gap-1 text-amber-500">
						<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
						비밀글
					</span>
				{/if}
			</div>
			<h2 class="mt-1 text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-snug sm:text-lg">
				{post.title}
			</h2>
			<p class="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-2">
				{post.description}
			</p>
		</div>
	</a>
	<div class="mt-3 flex flex-wrap items-center gap-1.5 {post.thumbnail ? 'sm:pl-40' : ''}">
		{#each visibleTags as tag}
			<TagChip {tag} href="/tags/{tag}" />
		{/each}
		{#if hiddenCount > 0 && !tagsExpanded}
			<button
				type="button"
				onclick={() => (tagsExpanded = true)}
				class="inline-block rounded-md bg-secondary/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
				aria-label="태그 {hiddenCount}개 더 보기"
				aria-expanded="false"
			>+{hiddenCount}</button>
		{/if}
	</div>
</article>
