<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { SearchEngine, type SearchPost } from '$lib/content/search';

	let { open = $bindable(false) }: { open?: boolean } = $props();
	let query = $state('');
	let results: SearchPost[] = $state([]);
	let ready = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;
	let inputEl: HTMLInputElement;

	const engine = new SearchEngine();

	if (browser) {
		fetch('/api/search')
			.then((r) => r.json())
			.then((data) => {
				engine.load(data);
				ready = true;
			});
	}

	function doSearch() {
		results = engine.search(query);
	}

	function onInput() {
		clearTimeout(debounceTimer);
		if (!query.trim()) { results = []; return; }
		debounceTimer = setTimeout(doSearch, 150);
	}

	function close() {
		open = false;
		query = '';
		results = [];
	}

	function navigate(slug: string) {
		close();
		goto(`/blog/${slug}`);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	function formatDate(dateStr: string): string {
		const d = new Date(dateStr);
		return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	$effect(() => {
		if (open && inputEl) {
			setTimeout(() => inputEl?.focus(), 50);
		}
	});
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-[100] bg-background/60 backdrop-blur-sm"
		onclick={close}
		onkeydown={handleKeydown}
		role="button"
		tabindex="-1"
	></div>

	<!-- Modal -->
	<div class="fixed inset-x-4 top-[15vh] z-[101] mx-auto max-w-lg rounded-xl border border-border bg-card shadow-2xl sm:inset-x-auto" onkeydown={handleKeydown} role="dialog" aria-modal="true" aria-label="검색">
		<div class="flex items-center gap-3 border-b border-border/50 px-4 py-3">
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
			<input
				bind:this={inputEl}
				type="text"
				bind:value={query}
				oninput={onInput}
				placeholder="검색..."
				class="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
			/>
			<kbd class="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">ESC</kbd>
		</div>

		<div class="max-h-[50vh] overflow-y-auto">
			{#if !ready}
				<p class="px-4 py-6 text-center text-sm text-muted-foreground">로딩 중...</p>
			{:else if query.trim() && results.length === 0}
				<p class="px-4 py-6 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>
			{:else}
				{#each results as post (post.slug)}
					<button
						onclick={() => navigate(post.slug)}
						class="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
					>
						<span class="text-sm font-medium text-foreground">{post.title}</span>
						<span class="text-xs text-muted-foreground">{formatDate(post.date)} · {post.category}</span>
					</button>
				{/each}
			{/if}
		</div>
	</div>
{/if}
