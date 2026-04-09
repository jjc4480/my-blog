<script lang="ts">
	let { tag, href }: { tag: string; href?: string } = $props();
</script>

{#if href}
	<a
		{href}
		class="inline-block rounded-md bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
	>
		{tag}
	</a>
{:else}
	<span class="inline-block rounded-md bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
		{tag}
	</span>
{/if}
