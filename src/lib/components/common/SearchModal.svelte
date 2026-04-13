<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { SearchEngine, type SearchPost } from '$lib/content/search';
	import { formatDateShort } from '$lib/utils';

	let { open = $bindable(false) }: { open?: boolean } = $props();
	let query = $state('');
	let results: SearchPost[] = $state([]);
	let ready = $state(false);
	let error = $state('');
	let debounceTimer: ReturnType<typeof setTimeout>;
	let inputEl: HTMLInputElement;
	let modalEl: HTMLDivElement;

	const engine = new SearchEngine();

	if (browser) {
		fetch('/api/search')
			.then((r) => {
				if (!r.ok) throw new Error('Failed to load search index');
				return r.json();
			})
			.then((data) => {
				engine.load(data);
				ready = true;
			})
			.catch((e) => {
				error = '검색 인덱스를 불러올 수 없습니다.';
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
		if (e.key === 'Escape') { close(); return; }
		// Focus trap
		if (e.key === 'Tab' && modalEl) {
			const focusable = modalEl.querySelectorAll<HTMLElement>('input, button, a, [tabindex]:not([tabindex="-1"])');
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
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
		role="presentation"
	></div>

	<!-- Modal -->
	<div
		bind:this={modalEl}
		class="fixed inset-x-4 top-[15vh] z-[101] mx-auto max-w-lg rounded-xl border border-border bg-card shadow-2xl sm:inset-x-auto"
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="search-input"
	>
		<div class="flex items-center gap-3 border-b border-border/50 px-4 py-3">
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
			<input
				id="search-input"
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
			{#if error}
				<p class="px-4 py-6 text-center text-sm text-destructive">{error}</p>
			{:else if !ready}
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
						<span class="text-xs text-muted-foreground">{formatDateShort(post.date)} · {post.category}</span>
					</button>
				{/each}
			{/if}
		</div>
	</div>
{/if}
