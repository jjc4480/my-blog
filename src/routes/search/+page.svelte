<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SearchEngine, type SearchData, type SearchPost } from '$lib/content/search';
	import SearchInput from '$lib/components/common/SearchInput.svelte';
	import SEO from '$lib/components/common/SEO.svelte';
	import { formatDate } from '$lib/utils';

	let query = $state(page.url.searchParams.get('q') ?? '');
	let results: SearchPost[] = $state([]);
	let ready = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let urlTimer: ReturnType<typeof setTimeout> | undefined;

	const engine = new SearchEngine();

	function doSearch() {
		const trimmed = query.trim();
		results = ready && trimmed ? engine.search(trimmed) : [];
	}

	function syncUrl() {
		if (!browser) return;
		const trimmed = query.trim();
		const target = trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search';
		const current = `${page.url.pathname}${page.url.search}`;
		if (current === target) return;

		void goto(target, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	function scheduleSearch() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(doSearch, 150);
	}

	function scheduleUrlSync() {
		if (urlTimer) clearTimeout(urlTimer);
		urlTimer = setTimeout(syncUrl, 150);
	}

	function onInput() {
		scheduleUrlSync();
		scheduleSearch();
	}

	$effect(() => {
		const urlQuery = page.url.searchParams.get('q') ?? '';
		if (urlQuery !== query) {
			query = urlQuery;
			doSearch();
		}
	});

	$effect(() => {
		if (!browser) return;

		let cancelled = false;
		fetch('/api/search')
			.then((r) => r.json())
			.then((data: SearchData) => {
				if (cancelled) return;
				engine.load(data);
				ready = true;
				doSearch();
			});

		return () => {
			cancelled = true;
			if (debounceTimer) clearTimeout(debounceTimer);
			if (urlTimer) clearTimeout(urlTimer);
		};
	});
</script>

<SEO title="검색" description="포스트 검색" noindex={true} />

<section>
	<h1 class="text-2xl font-bold tracking-tight">검색</h1>
	<div class="mt-4">
		<SearchInput bind:value={query} placeholder="제목, 설명, 태그, 본문으로 검색..." oninput={onInput} />
	</div>

	{#if query.trim()}
		{#if !ready}
			<p class="mt-6 text-sm text-muted-foreground">검색 인덱스 로딩 중...</p>
		{:else}
			<p class="mt-6 text-sm text-muted-foreground">{results.length}개의 결과</p>
			<div class="divide-y divide-border/50">
				{#each results as post (post.slug)}
					<article class="group py-6">
						<a href="/blog/{post.slug}" class="block">
							<time class="text-xs text-muted-foreground tabular-nums sm:text-sm" datetime={post.date}>
								{formatDate(post.date)}
							</time>
							<h2 class="mt-1 text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-snug sm:text-lg">
								{post.title}
							</h2>
							<p class="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-2">
								{post.description}
							</p>
						</a>
						<div class="mt-3 flex flex-wrap gap-1.5">
							{#each post.tags as tag}
								<span class="inline-block rounded-md bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
									{tag}
								</span>
							{/each}
						</div>
					</article>
				{/each}
			</div>
		{/if}
	{/if}
</section>
