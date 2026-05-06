<script lang="ts">
	import { browser, version } from '$app/environment';
	import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock-upgrade';
	import { goto } from '$app/navigation';
	import { SearchEngine, type SearchData, type SearchPost } from '$lib/content/search';
	import { formatDateShort } from '$lib/utils';

	let { open = $bindable(false) }: { open?: boolean } = $props();
	let query = $state('');
	let results: SearchPost[] = $state([]);
	let ready = $state(false);
	let error = $state('');
	let focusedIndex = $state(-1);
	let hasFetchedOnce = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;
	let inputEl: HTMLInputElement | undefined = $state();
	let modalEl: HTMLDivElement | undefined = $state();

	const engine = new SearchEngine();

	const CACHE_VERSION = version;
	const MIN_QUERY_LENGTH = 2;
	const CACHE_KEY = `search-index-${CACHE_VERSION}`;
	const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

	function isSearchData(data: unknown): data is SearchData {
		return (
			!!data &&
			typeof data === 'object' &&
			Array.isArray((data as { posts?: unknown }).posts)
		);
	}

	function loadFromCache(): SearchData | null {
		if (!browser) return null;
		try {
			const raw = localStorage.getItem(CACHE_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!parsed || typeof parsed !== 'object' || typeof parsed.ts !== 'number') return null;
			if (Date.now() - parsed.ts > CACHE_TTL) return null;
			return isSearchData(parsed.data) ? parsed.data : null;
		} catch {
			return null;
		}
	}

	function saveToCache(data: SearchData) {
		if (!browser) return;
		try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
	}

	function fetchAndRefresh() {
		fetch('/api/search')
			.then((r) => {
				if (!r.ok) throw new Error('Failed');
				return r.json();
			})
			.then((data: SearchData) => {
				engine.load(data);
				ready = true;
				saveToCache(data);
			})
			.catch(() => {
				if (!ready) error = '검색 인덱스를 불러올 수 없습니다.';
			});
	}

	if (browser) {
		const cached = loadFromCache();
		if (cached) {
			try {
				engine.load(cached);
				ready = true;
			} catch {
				localStorage.removeItem(CACHE_KEY);
			}
		}
	}

	// stale-while-revalidate: defer network fetch until the modal actually opens.
	$effect(() => {
		if (open && !hasFetchedOnce) {
			hasFetchedOnce = true;
			fetchAndRefresh();
		}
	});

	function doSearch() {
		results = engine.search(query);
		focusedIndex = results.length > 0 ? 0 : -1;
	}

	function onInput() {
		clearTimeout(debounceTimer);
		const trimmed = query.trim();
		if (trimmed.length < MIN_QUERY_LENGTH) {
			results = [];
			focusedIndex = -1;
			return;
		}
		debounceTimer = setTimeout(doSearch, 150);
	}

	function getSnippet(body: string, q: string, contextLen = 60): string {
		if (!body || !q.trim()) return '';
		const lower = body.toLowerCase();
		const idx = lower.indexOf(q.toLowerCase());
		if (idx === -1) return body.slice(0, contextLen * 2) + (body.length > contextLen * 2 ? '...' : '');
		const start = Math.max(0, idx - contextLen);
		const end = Math.min(body.length, idx + q.length + contextLen);
		let snippet = body.slice(start, end);
		if (start > 0) snippet = '...' + snippet;
		if (end < body.length) snippet = snippet + '...';
		return snippet;
	}

	function splitHighlight(text: string, q: string): { text: string; match: boolean }[] {
		if (!q.trim() || !text) return [{ text, match: false }];
		const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const regex = new RegExp(`(${escaped})`, 'gi');
		const parts = text.split(regex);
		return parts.filter(Boolean).map((part) => ({
			text: part,
			match: part.toLowerCase() === q.toLowerCase()
		}));
	}

	function close() {
		open = false;
		query = '';
		results = [];
		focusedIndex = -1;
	}

	function navigate(slug: string) {
		close();
		goto(`/blog/${slug}`);
	}

	function scrollFocusedIntoView() {
		if (!modalEl || focusedIndex < 0) return;
		const items = modalEl.querySelectorAll<HTMLElement>('[data-search-result]');
		items[focusedIndex]?.scrollIntoView({ block: 'nearest' });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') { close(); return; }

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (results.length === 0) return;
			focusedIndex = (focusedIndex + 1) % results.length;
			queueMicrotask(scrollFocusedIntoView);
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (results.length === 0) return;
			focusedIndex = focusedIndex <= 0 ? results.length - 1 : focusedIndex - 1;
			queueMicrotask(scrollFocusedIntoView);
			return;
		}
		if (e.key === 'Enter' && focusedIndex >= 0 && results[focusedIndex]) {
			e.preventDefault();
			navigate(results[focusedIndex].slug);
			return;
		}

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
		if (!browser) return;
		const el = modalEl;
		if (open && el) {
			disableBodyScroll(el, { reserveScrollBarGap: true });
		} else if (el) {
			enableBodyScroll(el);
		}
		return () => {
			if (el) enableBodyScroll(el);
		};
	});

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
		class="fixed left-1/2 top-1/2 z-[101] mx-4 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card shadow-2xl"
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-label="검색"
		tabindex="-1"
	>
		<div class="flex items-center gap-3 border-b border-border/50 px-4 py-3">
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
			<label for="search-input" class="sr-only">검색어 입력</label>
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
			{:else if query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH}
				<p class="px-4 py-6 text-center text-sm text-muted-foreground">{MIN_QUERY_LENGTH}글자 이상 입력해주세요.</p>
			{:else if query.trim() && results.length === 0}
				<p class="px-4 py-6 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>
			{:else}
				{#each results as post, i (post.slug)}
					<button
						data-search-result
						onclick={() => navigate(post.slug)}
						onmouseenter={() => focusedIndex = i}
						class="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors {i === focusedIndex ? 'bg-accent/10' : 'hover:bg-secondary/40'}"
					>
						<span class="text-sm font-medium text-foreground">{#each splitHighlight(post.title, query) as seg}{#if seg.match}<mark class="bg-primary/20 text-foreground rounded-sm px-0.5">{seg.text}</mark>{:else}{seg.text}{/if}{/each}</span>
						<span class="text-xs text-muted-foreground">{formatDateShort(post.date)} · {post.category}</span>
						{#if post.body}
							{@const snippet = getSnippet(post.body, query)}
							{#if snippet}
								<span class="text-xs text-muted-foreground/80 line-clamp-2">{#each splitHighlight(snippet, query) as seg}{#if seg.match}<mark class="bg-primary/20 text-foreground rounded-sm px-0.5">{seg.text}</mark>{:else}{seg.text}{/if}{/each}</span>
							{/if}
						{/if}
					</button>
				{/each}
			{/if}
		</div>
	</div>
{/if}
