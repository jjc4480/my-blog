<script lang="ts">
	import { browser } from '$app/environment';

	let { open = $bindable(false) } = $props();

	let isMac = $state(false);
	if (browser) {
		isMac = navigator.platform.toUpperCase().includes('MAC');
	}

	const shortcuts = [
		{ label: '검색', keys: isMac ? ['⌘', 'K'] : ['Ctrl', 'K'] },
		{ label: '이전 글', keys: ['←', 'j'] },
		{ label: '다음 글', keys: ['→', 'k'] },
		{ label: '홈으로', keys: ['h'] },
		{ label: '단축키 도움말', keys: ['?'] },
	];
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
		onclick={() => open = false}
		role="dialog"
		aria-modal="true"
		aria-label="단축키 도움말"
		tabindex="-1"
	>
		<div class="mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl" onclick={(e) => e.stopPropagation()}>
			<h3 class="mb-4 text-sm font-semibold text-foreground">단축키</h3>
			<div class="space-y-2 text-sm">
				{#each shortcuts as { label, keys }}
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">{label}</span>
						<div class="flex gap-1">
							{#each keys as key}
								<kbd class="rounded border border-border/50 bg-secondary/40 px-1.5 py-0.5 text-xs font-mono">{key}</kbd>
							{/each}
						</div>
					</div>
				{/each}
			</div>
			<p class="mt-4 text-xs text-muted-foreground">ESC로 닫기</p>
		</div>
	</div>
{/if}
