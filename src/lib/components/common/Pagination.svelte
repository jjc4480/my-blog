<script lang="ts">
	let { currentPage, totalPages }: { currentPage: number; totalPages: number } = $props();
</script>

{#if totalPages > 1}
	<nav class="mt-12 flex items-center justify-center gap-2" aria-label="페이지네이션">
		{#if currentPage > 1}
			<a
				href="?page={currentPage - 1}"
				class="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
			>
				이전
			</a>
		{/if}

		{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
			<a
				href="?page={p}"
				class="rounded-md px-3 py-1.5 text-sm transition-colors {p === currentPage
					? 'bg-primary text-primary-foreground'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				{p}
			</a>
		{/each}

		{#if currentPage < totalPages}
			<a
				href="?page={currentPage + 1}"
				class="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
			>
				다음
			</a>
		{/if}
	</nav>
{/if}
