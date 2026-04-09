<script lang="ts">
	import SEO from '$lib/components/common/SEO.svelte';
	import JsonLD from '$lib/components/common/JsonLD.svelte';
	import { siteConfig } from '$lib/config';
	import { buildCollectionPageSchema } from '$lib/seo';

	let { data } = $props();

	const schema = buildCollectionPageSchema({
		title: '태그',
		description: '모든 태그 목록',
		url: `${siteConfig.url}/tags`
	});
</script>

<SEO title="태그" description="모든 태그 목록" />
<JsonLD {schema} />

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
