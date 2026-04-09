<script lang="ts">
	import { page } from '$app/state';
	import ThemeToggle from './ThemeToggle.svelte';
	import { siteConfig } from '$lib/config';

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
</script>

<header class="border-b border-border/50">
	<div class="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
		<a href="/" class="text-lg font-semibold tracking-tight text-foreground hover:text-primary transition-colors">
			{siteConfig.title}
		</a>
		<nav class="flex items-center gap-1">
			{#each navItems as { href, label }}
				<a
					{href}
					class="rounded-md px-3 py-1.5 text-sm transition-colors {isActive(href)
						? 'text-foreground font-medium'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					{label}
				</a>
			{/each}
			<div class="ml-2">
				<ThemeToggle />
			</div>
		</nav>
	</div>
</header>
