<script lang="ts">
	import { browser } from '$app/environment';

	let { title, url }: { title: string; url: string } = $props();

	type CopyState = 'idle' | 'success' | 'failed';
	let copyState: CopyState = $state('idle');
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	const canWebShare = $derived(
		browser && typeof navigator !== 'undefined' && typeof navigator.share === 'function'
	);
	const encodedUrl = $derived(encodeURIComponent(url));
	const encodedTitle = $derived(encodeURIComponent(title));
	const twitterHref = $derived(
		`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`
	);
	const linkedInHref = $derived(
		`https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}`
	);

	async function webShare() {
		try {
			await navigator.share({ title, url });
		} catch (err) {
			// AbortError: 사용자가 시트를 닫은 것 — 조용히 무시
			if ((err as DOMException)?.name !== 'AbortError') {
				console.error('[share]', err);
			}
		}
	}

	async function copyLink() {
		clearTimeout(copyTimer);
		try {
			await navigator.clipboard.writeText(url);
			copyState = 'success';
		} catch {
			copyState = 'failed';
		}
		copyTimer = setTimeout(() => {
			copyState = 'idle';
		}, 2000);
	}

	const btnBase =
		'inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary';
</script>

<div class="mt-12 flex flex-wrap items-center gap-2 border-t border-border/50 pt-6" aria-label="이 글 공유">
	<span class="mr-1 text-xs font-medium text-muted-foreground">공유하기</span>

	{#if canWebShare}
		<button type="button" onclick={webShare} class={btnBase} aria-label="공유 시트 열기">
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
			공유
		</button>
	{:else}
		<a href={twitterHref} target="_blank" rel="noopener noreferrer" class={btnBase} aria-label="X(Twitter)에 공유">
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
			X
		</a>
		<a href={linkedInHref} target="_blank" rel="noopener noreferrer" class={btnBase} aria-label="LinkedIn에 공유">
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
			LinkedIn
		</a>
	{/if}

	<button
		type="button"
		onclick={copyLink}
		class="{btnBase} {copyState === 'success' ? '!text-green-600 dark:!text-green-400' : ''} {copyState === 'failed' ? '!text-red-600 dark:!text-red-400 !border-red-500/40' : ''}"
		aria-label={copyState === 'success' ? '링크 복사 완료' : copyState === 'failed' ? '링크 복사 실패' : '링크 복사'}
		aria-live="polite"
	>
		{#if copyState === 'success'}
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
			복사됨
		{:else if copyState === 'failed'}
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			실패
		{:else}
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
			링크 복사
		{/if}
	</button>
</div>
