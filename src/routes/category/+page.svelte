<script lang="ts">
	import { siteConfig } from '$lib/config';

	let { data } = $props();
</script>

<svelte:head>
	<title>카테고리 — {siteConfig.title}</title>
</svelte:head>

<section>
	<h1 class="text-2xl font-bold tracking-tight">카테고리</h1>
	<div class="mt-6 space-y-2">
		{#each data.categories as { name, count }}
			<a
				href="/category/{name}"
				class="flex items-center justify-between rounded-md px-4 py-3 transition-colors hover:bg-secondary"
			>
				<span class="font-medium">{name}</span>
				<span class="text-sm text-muted-foreground">{count}</span>
			</a>
		{/each}
	</div>
</section>
