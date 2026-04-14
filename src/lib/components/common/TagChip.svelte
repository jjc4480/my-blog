<script lang="ts">
	let { tag, href, active = false }: { tag: string; href?: string; active?: boolean } = $props();
</script>

{#if href}
	<a
		{href}
		class="inline-block rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors {active
			? 'bg-primary text-primary-foreground'
			: 'bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground'}"
	>
		{tag}
	</a>
{:else}
	<span class="inline-block rounded-md bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
		{tag}
	</span>
{/if}
