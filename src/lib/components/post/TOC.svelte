<script lang="ts">
	import { browser } from '$app/environment';

	interface TocItem {
		id: string;
		text: string;
		level: number;
	}

	let { headings }: { headings: TocItem[] } = $props();
	let activeId = $state('');
	let tocOpen = $state(false);

	if (browser && headings.length > 0) {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						activeId = entry.target.id;
					}
				}
			},
			{ rootMargin: '-80px 0px -60% 0px', threshold: 0 }
		);

		// Use $effect for cleanup
		$effect(() => {
			const els = headings.map((h) => document.getElementById(h.id)).filter(Boolean) as HTMLElement[];
			els.forEach((el) => observer.observe(el));
			return () => els.forEach((el) => observer.unobserve(el));
		});
	}
</script>

{#if headings.length > 0}
	<!-- Mobile: collapsible -->
	<div class="mb-8 rounded-lg border border-border/50 bg-card p-4 lg:hidden">
		<button
			onclick={() => tocOpen = !tocOpen}
			class="flex w-full items-center justify-between text-sm font-medium text-foreground"
			aria-expanded={tocOpen}
		>
			목차
			<svg
				xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
				fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
				class="transition-transform {tocOpen ? 'rotate-180' : ''}"
			><polyline points="6 9 12 15 18 9"/></svg>
		</button>
		{#if tocOpen}
			<nav class="mt-3 border-t border-border/50 pt-3" aria-label="목차">
				<ul class="space-y-1.5">
					{#each headings as heading}
						<li style="padding-left: {(heading.level - 2) * 0.75}rem">
							<a
								href="#{heading.id}"
								onclick={() => tocOpen = false}
								class="block text-sm leading-relaxed transition-colors {activeId === heading.id
									? 'text-primary font-medium'
									: 'text-muted-foreground hover:text-foreground'}"
							>
								{heading.text}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
		{/if}
	</div>

	<!-- Desktop: sticky sidebar -->
	<nav class="hidden lg:block sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto" aria-label="목차">
		<p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">목차</p>
		<ul class="space-y-1 border-l border-border/50">
			{#each headings as heading}
				<li style="padding-left: {(heading.level - 2) * 0.75 + 0.75}rem">
					<a
						href="#{heading.id}"
						class="block -ml-px border-l-2 py-1 pl-3 text-sm leading-relaxed transition-colors {activeId === heading.id
							? 'border-primary text-primary font-medium'
							: 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}"
					>
						{heading.text}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}
