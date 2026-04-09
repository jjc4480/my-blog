<script lang="ts">
	import SEO from '$lib/components/common/SEO.svelte';
	import JsonLD from '$lib/components/common/JsonLD.svelte';
	import { siteConfig } from '$lib/config';
	import { buildCollectionPageSchema } from '$lib/seo';

	let { data } = $props();

	const schema = buildCollectionPageSchema({
		title: '카테고리',
		description: '모든 카테고리 목록',
		url: `${siteConfig.url}/category`
	});
</script>

<SEO title="카테고리" description="모든 카테고리 목록" />
<JsonLD {schema} />

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
