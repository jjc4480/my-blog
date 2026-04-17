<script lang="ts">
	interface Item { label: string; href?: string }
	let { items }: { items: Item[] } = $props();
</script>

<nav class="flex items-center gap-1 text-xs text-muted-foreground" aria-label="경로">
	{#each items as item, i (item.label + i)}
		{#if i > 0}
			<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground/50"><path d="m9 18 6-6-6-6"/></svg>
		{/if}
		{#if item.href && i < items.length - 1}
			<a href={item.href} class="hover:text-foreground transition-colors">{item.label}</a>
		{:else}
			<span class="text-foreground" aria-current="page">{item.label}</span>
		{/if}
	{/each}
</nav>
