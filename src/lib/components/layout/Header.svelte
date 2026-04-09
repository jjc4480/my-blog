<script lang="ts">
	import { page } from '$app/state';
	import ThemeToggle from './ThemeToggle.svelte';
	import { siteConfig } from '$lib/config';

	let mobileOpen = $state(false);

	const navItems = [
		{ href: '/', label: '홈' },
		{ href: '/tags', label: '태그' },
		{ href: '/category', label: '카테고리' },
		{ href: '/search', label: '검색' }
	];

	function isActive(href: string): boolean {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}

	function closeMobile() {
		mobileOpen = false;
	}
</script>

<header class="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
	<div class="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
		<a href="/" class="text-lg font-semibold tracking-tight text-foreground hover:text-primary transition-colors">
			{siteConfig.title}
		</a>

		<!-- Desktop nav -->
		<nav class="hidden items-center gap-1 md:flex">
			{#each navItems as { href, label }}
				<a
					{href}
					class="rounded-md px-3 py-1.5 text-sm transition-colors {isActive(href)
						? 'text-foreground font-medium bg-secondary/60'
						: 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'}"
				>
					{label}
				</a>
			{/each}
			<div class="ml-2">
				<ThemeToggle />
			</div>
		</nav>

		<!-- Mobile: theme toggle + hamburger -->
		<div class="flex items-center gap-2 md:hidden">
			<ThemeToggle />
			<button
				onclick={() => mobileOpen = !mobileOpen}
				class="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
				aria-label="메뉴 열기"
				aria-expanded={mobileOpen}
			>
				{#if mobileOpen}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
				{/if}
			</button>
		</div>
	</div>

	<!-- Mobile menu -->
	{#if mobileOpen}
		<nav class="border-t border-border/50 bg-background px-6 pb-4 pt-2 md:hidden">
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
</header>
