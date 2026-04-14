<script lang="ts">
	import { browser } from '$app/environment';
	import { isDark, toggleTheme as toggle, onThemeChange } from '$lib/stores/theme';
	import ShortcutsModal from './ShortcutsModal.svelte';

	let showScrollTop = $state(false);
	let showToast = $state(false);
	let shortcutsOpen = $state(false);
	let dark = $state(isDark());

	$effect(() => {
		return onThemeChange(() => { dark = isDark(); });
	});

	$effect(() => {
		if (!browser) return;
		if (!sessionStorage.getItem('shortcuts-hint-seen')) {
			showToast = true;
			sessionStorage.setItem('shortcuts-hint-seen', '1');
			const timer = setTimeout(() => { showToast = false; }, 5000);
			return () => clearTimeout(timer);
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && shortcutsOpen) {
			e.stopPropagation();
			shortcutsOpen = false;
			return;
		}
		if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !(e.target as HTMLElement)?.isContentEditable) {
				shortcutsOpen = !shortcutsOpen;
			}
		}
	}

	function toggleTheme() { toggle(); dark = isDark(); }

	$effect(() => {
		if (!browser) return;
		function onScroll() {
			showScrollTop = window.scrollY > 400;
		}
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="fixed bottom-6 right-6 z-30 flex flex-col items-center gap-2">
	{#if showScrollTop}
		<button
			onclick={scrollToTop}
			class="flex h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-background/90 text-muted-foreground shadow-lg backdrop-blur-sm transition-all hover:text-foreground hover:shadow-xl"
			aria-label="맨 위로 스크롤"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
		</button>
	{/if}
	<button
		onclick={toggleTheme}
		class="hidden h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-background/90 text-muted-foreground shadow-lg backdrop-blur-sm transition-all hover:text-foreground hover:shadow-xl lg:flex"
		aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
	>
		{#if dark}
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
		{:else}
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
		{/if}
	</button>
	<button
		onclick={() => shortcutsOpen = true}
		class="hidden h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-background/90 text-muted-foreground shadow-lg backdrop-blur-sm transition-all hover:text-foreground hover:shadow-xl lg:flex"
		aria-label="단축키 도움말"
	>
		<span class="text-sm font-mono font-medium">?</span>
	</button>
</div>

{#if showToast}
	<div class="fixed top-4 left-1/2 z-50 -translate-x-1/2 animate-fade-in hidden lg:block rounded-lg border border-border/50 bg-card px-4 py-2.5 text-sm text-muted-foreground shadow-lg backdrop-blur-sm">
		<kbd class="rounded border border-border/50 bg-secondary/40 px-1.5 py-0.5 text-xs font-mono">?</kbd> 키로 단축키를 확인할 수 있습니다
	</div>
{/if}

<ShortcutsModal bind:open={shortcutsOpen} />
