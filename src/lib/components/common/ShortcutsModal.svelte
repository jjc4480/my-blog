<script lang="ts">
	let { open = $bindable(false) } = $props();

	const shortcuts = [
		{ label: '검색', macKeys: ['⌘', 'K'], otherKeys: ['Ctrl', 'K'] },
		{ label: '이전 글', macKeys: ['←', 'j'], otherKeys: ['←', 'j'] },
		{ label: '다음 글', macKeys: ['→', 'k'], otherKeys: ['→', 'k'] },
		{ label: '홈으로', macKeys: ['h'], otherKeys: ['h'] },
		{ label: '단축키 도움말', macKeys: ['?'], otherKeys: ['?'] },
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
				{#each shortcuts as { label, macKeys, otherKeys }}
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">{label}</span>
						<div class="flex gap-1">
							{#each macKeys as key}
								<kbd class="mac-key rounded border border-border/50 bg-secondary/40 px-1.5 py-0.5 text-xs font-mono">{key}</kbd>
							{/each}
							{#each otherKeys as key}
								<kbd class="other-key rounded border border-border/50 bg-secondary/40 px-1.5 py-0.5 text-xs font-mono">{key}</kbd>
							{/each}
						</div>
					</div>
				{/each}
			</div>
			<p class="mt-4 text-xs text-muted-foreground">ESC로 닫기</p>
		</div>
	</div>
{/if}
