<script lang="ts">
	interface TocItem {
		id: string;
		text: string;
		level: number;
	}

	let { headings }: { headings: TocItem[] } = $props();
</script>

{#if headings.length > 0}
	<nav class="text-sm" aria-label="목차">
		<p class="mb-3 font-medium text-foreground">목차</p>
		<ul class="space-y-1.5">
			{#each headings as heading}
				<li style="padding-left: {(heading.level - 2) * 0.75}rem">
					<a
						href="#{heading.id}"
						class="text-muted-foreground transition-colors hover:text-foreground leading-relaxed"
					>
						{heading.text}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}
