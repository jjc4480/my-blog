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

	function getPageNumbers(current: number, total: number): (number | '...')[] {
		if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
		const pages: (number | '...')[] = [];
		const showLeft = current - 2 > 2;
		const showRight = current + 2 < total - 1;

		pages.push(1);
		if (showLeft) pages.push('...');
		for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) {
			pages.push(i);
		}
		if (showRight) pages.push('...');
		pages.push(total);
		return pages;
	}

	const pageItems = $derived(getPageNumbers(currentPage, totalPages));
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

		{#each pageItems as item, i (i)}
			{#if item === '...'}
				<span
					class="px-2 py-1.5 text-sm text-muted-foreground select-none"
					aria-hidden="true"
				>…</span>
			{:else}
				<a
					href={pageHref(item)}
					class="rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {item === currentPage
						? 'bg-primary text-primary-foreground'
						: 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'}"
					aria-label="{item}페이지"
					aria-current={item === currentPage ? 'page' : undefined}
				>
					{item}
				</a>
			{/if}
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
