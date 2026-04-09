<script lang="ts">
	import { siteConfig } from '$lib/config';

	let { data } = $props();
</script>

<svelte:head>
	<title>태그 — {siteConfig.title}</title>
</svelte:head>

<section>
	<h1 class="text-2xl font-bold tracking-tight">태그</h1>
	<div class="mt-6 flex flex-wrap gap-2">
		{#each data.tags as { name, count }}
			<a
				href="/tags/{name}"
				class="rounded-md bg-secondary px-3 py-1.5 text-sm text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
			>
				{name}
				<span class="ml-1 text-xs opacity-60">{count}</span>
			</a>
		{/each}
	</div>
</section>
