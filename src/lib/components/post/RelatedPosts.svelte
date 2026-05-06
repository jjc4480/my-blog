<script lang="ts">
	import { formatDateShort } from '$lib/utils';

	type RelatedPost = {
		slug: string;
		title: string;
		date: string;
		shared: number;
	};

	let { posts }: { posts: RelatedPost[] } = $props();
</script>

{#if posts?.length > 0}
	<section class="mt-12 border-t border-border/50 pt-8" aria-label="관련 글">
		<h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">관련 글</h2>
		<div class="grid gap-3 sm:grid-cols-3">
			{#each posts as rp (rp.slug)}
				<a
					href="/blog/{rp.slug}"
					class="group flex flex-col gap-2 rounded-lg border border-border/50 p-4 transition-colors hover:bg-secondary/40"
				>
					<span class="text-sm font-medium text-foreground transition-colors group-hover:text-primary line-clamp-2">
						{rp.title}
					</span>
					<span class="mt-auto flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
						<time datetime={rp.date}>{formatDateShort(rp.date)}</time>
						<span aria-hidden="true">·</span>
						<span>태그 {rp.shared}개 공유</span>
					</span>
				</a>
			{/each}
		</div>
	</section>
{/if}
