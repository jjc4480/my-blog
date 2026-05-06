<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock-upgrade';
	import ThemeToggle from './ThemeToggle.svelte';
	import SearchModal from '$lib/components/common/SearchModal.svelte';
	import { siteConfig } from '$lib/config';
	import TagChip from '$lib/components/common/TagChip.svelte';

	let { tags = [] }: { tags?: string[] } = $props();

	let mobileOpen = $state(false);
	let searchOpen = $state(false);
	let mobileNavEl: HTMLElement | undefined = $state();
	let tagsExpanded = $state(false);

	const TAG_PREVIEW_COUNT = 10;
	const visibleTags = $derived(tagsExpanded ? tags : tags.slice(0, TAG_PREVIEW_COUNT));
	const hiddenTagCount = $derived(Math.max(0, tags.length - TAG_PREVIEW_COUNT));

	const navItems = [
		{ href: '/', label: '홈' },
		{ href: '/tags', label: '태그' },
		{ href: '/category', label: '카테고리' }
	];

	function isActive(href: string): boolean {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}

	function closeMobile() {
		mobileOpen = false;
	}

	$effect(() => {
		if (!browser) return;
		const el = mobileNavEl;
		if (mobileOpen && el) {
			disableBodyScroll(el, { reserveScrollBarGap: true });
		} else if (el) {
			enableBodyScroll(el);
		}
		return () => {
			if (el) enableBodyScroll(el);
		};
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && mobileOpen) {
			closeMobile();
		}
		if ((e.metaKey || e.ctrlKey) && e.code === 'KeyK') {
			e.preventDefault();
			searchOpen = !searchOpen;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Desktop sidebar — glassmorphism -->
<aside class="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-56 lg:flex-col lg:border-r lg:border-border/50 lg:bg-background/80 lg:backdrop-blur-xl">
	<div class="flex flex-1 flex-col gap-6 px-5 py-8">
		<a href="/" class="text-lg font-semibold tracking-tight text-foreground hover:text-primary transition-colors">
			{siteConfig.title}
		</a>

		<button
			onclick={() => searchOpen = true}
			class="flex items-center gap-2 rounded-md border border-border/50 bg-background/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:border-border hover:bg-background/80"
			aria-label="검색"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
			<span class="flex-1 text-left">검색</span>
			<kbd class="rounded border border-border/50 px-1 py-0.5 text-[10px]"><span class="mac-key">⌘K</span><span class="other-key">Ctrl K</span></kbd>
		</button>

		<nav class="flex flex-col gap-0.5" aria-label="메인 네비게이션">
			{#each navItems as { href, label }}
				<a
					{href}
					class="rounded-md px-3 py-2 text-sm transition-colors {isActive(href)
						? 'text-foreground font-medium bg-secondary/60'
						: 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'}"
				>
					{label}
				</a>
			{/each}
		</nav>

		{#if tags.length > 0}
			<div class="border-t border-border/50 pt-4">
				<p class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">태그</p>
				<div class="flex flex-wrap gap-1.5 px-3 {tagsExpanded ? 'max-h-64 overflow-y-auto sidebar-tag-scroll pb-1' : ''}">
					{#each visibleTags as tag}
						<TagChip {tag} href="/tags/{tag}" />
					{/each}
				</div>
				{#if hiddenTagCount > 0}
					<button
						type="button"
						onclick={() => (tagsExpanded = !tagsExpanded)}
						class="mt-4 ml-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
					>
						<span>{tagsExpanded ? '접기' : `더보기 (+${hiddenTagCount})`}</span>
						<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-transform {tagsExpanded ? 'rotate-180' : ''}">
							<polyline points="6 9 12 15 18 9"></polyline>
						</svg>
					</button>
				{/if}
			</div>
		{/if}
		<div class="mt-auto pt-4 border-t border-border/50">
			<a
				href="/rss.xml"
				class="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/40"
				aria-label="RSS 피드 구독"
				title="RSS 피드 구독"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
				<span>RSS 구독</span>
			</a>
		</div>
	</div>
</aside>

<!-- Mobile top bar — glassmorphism -->
<header class="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl lg:hidden">
	<div class="flex h-14 items-center justify-between px-4 sm:px-6">
		<a href="/" class="text-lg font-semibold tracking-tight text-foreground hover:text-primary transition-colors">
			{siteConfig.title}
		</a>
		<div class="flex items-center gap-1">
			<button
				onclick={() => searchOpen = true}
				class="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
				aria-label="검색"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
			</button>
			<a
				href="/rss.xml"
				class="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
				aria-label="RSS 피드 구독"
				title="RSS 피드 구독"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
			</a>
			<ThemeToggle />
			<button
				onclick={() => mobileOpen = !mobileOpen}
				class="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
				aria-label={mobileOpen ? '메뉴 닫기' : '메뉴 열기'}
				aria-expanded={mobileOpen}
				aria-controls="mobile-nav"
			>
				{#if mobileOpen}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
				{/if}
			</button>
		</div>
	</div>

</header>

{#if mobileOpen}
	<!-- Fullscreen backdrop with blur — covers everything -->
	<button
		class="fixed inset-0 z-[60] bg-background/30 backdrop-blur-sm lg:hidden"
		onclick={closeMobile}
		aria-label="메뉴 닫기"
		tabindex="-1"
	></button>
	<!-- Menu panel on top of backdrop -->
	<nav
		bind:this={mobileNavEl}
		id="mobile-nav"
		class="fixed left-0 right-0 top-0 z-[70] border-b border-border/50 bg-background/90 backdrop-blur-xl px-4 pb-6 pt-4 sm:px-6 animate-slide-down lg:hidden"
		aria-label="모바일 네비게이션"
	>
		<div class="flex items-center justify-between mb-4">
			<span class="text-lg font-semibold tracking-tight text-foreground">{siteConfig.title}</span>
			<button
				onclick={closeMobile}
				class="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
				aria-label="메뉴 닫기"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
			</button>
		</div>
		{#each navItems as { href, label }}
			<a
				{href}
				onclick={closeMobile}
				class="block rounded-md px-3 py-2.5 text-sm transition-colors {isActive(href)
					? 'text-foreground font-medium bg-secondary/60'
					: 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'}"
			>
				{label}
			</a>
		{/each}
		{#if tags.length > 0}
			<div class="border-t border-border/50 mt-3 pt-3">
				<p class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">태그</p>
				<div class="flex flex-wrap gap-1.5 px-3">
					{#each tags as tag}
						<a href="/tags/{tag}" onclick={closeMobile}>
							<TagChip {tag} />
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</nav>
{/if}

<SearchModal bind:open={searchOpen} />

<style>
	.sidebar-tag-scroll {
		scrollbar-width: thin;
		scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
	}
	:global(.dark) .sidebar-tag-scroll {
		scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
	}
	.sidebar-tag-scroll::-webkit-scrollbar {
		width: 4px;
	}
	.sidebar-tag-scroll::-webkit-scrollbar-thumb {
		background: rgba(0, 0, 0, 0.15);
		border-radius: 2px;
	}
	:global(.dark) .sidebar-tag-scroll::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.15);
	}
</style>
