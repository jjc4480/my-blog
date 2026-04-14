<script lang="ts">
	import { page } from '$app/state';

	let { currentPage, totalPages }: { currentPage: number; totalPages: number } = $props();

	function pageHref(p: number): string {
		const params = new URLSearchParams(page.url.searchParams);
		if (p <= 1) params.delete('page');
		else params.set('page', String(p));
		const qs = params.toString();
		return qs ? `?${qs}` : page.url.pathname;
	}
</script>

{#if totalPages > 1}
	<nav class="mt-12 flex items-center justify-center gap-2" role="navigation" aria-label="페이지 네비게이션">
		{#if currentPage > 1}
			<a
				href={pageHref(currentPage - 1)}
				class="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				aria-label="이전 페이지"
			>
				이전
			</a>
		{/if}

		{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
			<a
				href={pageHref(p)}
				class="rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {p === currentPage
					? 'bg-primary text-primary-foreground'
					: 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'}"
				aria-label="{p}페이지"
				aria-current={p === currentPage ? 'page' : undefined}
			>
				{p}
			</a>
		{/each}

		{#if currentPage < totalPages}
			<a
				href={pageHref(currentPage + 1)}
				class="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				aria-label="다음 페이지"
			>
				다음
			</a>
		{/if}
	</nav>
{/if}
