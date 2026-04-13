<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import ThemeToggle from './ThemeToggle.svelte';
	import SearchModal from '$lib/components/common/SearchModal.svelte';
	import { siteConfig } from '$lib/config';
	import TagChip from '$lib/components/common/TagChip.svelte';

	let { tags = [] }: { tags?: string[] } = $props();

	let mobileOpen = $state(false);
	let searchOpen = $state(false);

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

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && mobileOpen) {
			closeMobile();
		}
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
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
				<div class="flex flex-wrap gap-1.5 px-3">
					{#each tags as tag}
						<TagChip {tag} href="/tags/{tag}" />
					{/each}
				</div>
			</div>
		{/if}
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
		class="fixed inset-0 z-[60] bg-background/50 backdrop-blur-md lg:hidden"
		onclick={closeMobile}
		aria-label="메뉴 닫기"
		tabindex="-1"
	></button>
	<!-- Menu panel on top of backdrop -->
	<nav
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
	</nav>
{/if}

<SearchModal bind:open={searchOpen} />
