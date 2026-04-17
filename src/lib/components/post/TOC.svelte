<script lang="ts">
	import { browser } from '$app/environment';

	interface TocItem {
		id: string;
		text: string;
		level: number;
	}

	let { headings }: { headings: TocItem[] } = $props();
	let activeId = $state('');
	let sheetOpen = $state(false);

	if (browser) {
		let visibleIds = new Set<string>();

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						visibleIds.add(entry.target.id);
					} else {
						visibleIds.delete(entry.target.id);
					}
				}
				if (headings.length > 0) {
					for (const h of headings) {
						if (visibleIds.has(h.id)) {
							activeId = h.id;
							return;
						}
					}
				}
			},
			{ rootMargin: '0px 0px -70% 0px', threshold: 0 }
		);

		$effect(() => {
			if (headings.length === 0) return;
			visibleIds.clear();
			const els = headings.map((h) => document.getElementById(h.id)).filter(Boolean) as HTMLElement[];
			els.forEach((el) => observer.observe(el));
			return () => {
				els.forEach((el) => observer.unobserve(el));
				visibleIds.clear();
			};
		});
	}

	function scrollTo(id: string) {
		sheetOpen = false;
		setTimeout(() => {
			document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
		}, 100);
	}
</script>

{#if headings.length > 0}
	<!-- Mobile: floating TOC button + bottom sheet -->
	<button
		onclick={() => sheetOpen = true}
		class="fixed bottom-20 left-4 z-30 flex h-10 items-center gap-1.5 rounded-full border border-border/50 bg-background/80 px-4 text-sm text-muted-foreground shadow-lg backdrop-blur-sm transition-all hover:text-foreground xl:hidden"
		aria-label="목차 열기"
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
		목차
	</button>

	{#if sheetOpen}
		<button
			class="fixed inset-0 z-[60] bg-background/30 backdrop-blur-sm xl:hidden"
			onclick={() => sheetOpen = false}
			aria-label="목차 닫기"
			tabindex="-1"
		></button>
		<div class="fixed bottom-0 left-0 right-0 z-[70] max-h-[60vh] overflow-y-auto rounded-t-2xl border-t border-border/50 bg-background/95 backdrop-blur-xl px-6 pb-8 pt-4 animate-sheet-up xl:hidden">
			<div class="mx-auto mb-3 h-1 w-10 rounded-full bg-border/50"></div>
			<p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">목차</p>
			<nav aria-label="목차">
				<ul class="space-y-1">
					{#each headings as heading}
						<li style="padding-left: {(heading.level - 2) * 0.75}rem">
							<button
								onclick={() => scrollTo(heading.id)}
								class="block w-full text-left py-2 text-sm leading-relaxed transition-colors {activeId === heading.id
									? 'text-primary font-medium'
									: 'text-muted-foreground hover:text-foreground'}"
							>
								{heading.text}
							</button>
						</li>
					{/each}
				</ul>
			</nav>
		</div>
	{/if}

	<!-- Desktop xl+: fixed right sidebar -->
	<aside class="fixed top-24 right-8 hidden w-48 max-h-[calc(100vh-8rem)] flex-col xl:flex" style="scrollbar-gutter: stable;">
		<p class="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">목차</p>
		<nav aria-label="목차" class="min-h-0 overflow-y-auto toc-scroll">
			<ul class="space-y-0.5 border-l border-border/50">
				{#each headings as heading}
					<li style="padding-left: {(heading.level - 2) * 0.75 + 0.75}rem">
						<a
							href="#{heading.id}"
							class="block -ml-px border-l-2 py-0.5 pl-3 text-[12.5px] leading-snug transition-colors {activeId === heading.id
								? 'border-primary text-primary font-medium'
								: 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}"
						>
							{heading.text}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	</aside>
{/if}

<style>
	.toc-scroll {
		scrollbar-width: thin;
		scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
	}
	:global(.dark) .toc-scroll {
		scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
	}
	.toc-scroll::-webkit-scrollbar {
		width: 4px;
	}
	.toc-scroll::-webkit-scrollbar-thumb {
		background: rgba(0, 0, 0, 0.15);
		border-radius: 2px;
	}
	:global(.dark) .toc-scroll::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.15);
	}
</style>
