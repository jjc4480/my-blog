<script lang="ts">
	import SEO from '$lib/components/common/SEO.svelte';
	import JsonLD from '$lib/components/common/JsonLD.svelte';
	import { buildWebSiteSchema } from '$lib/seo';
	import { SITE_CONFIG } from '$lib/config';
</script>

<SEO />
<JsonLD schema={buildWebSiteSchema()} />

<h1 class="text-3xl font-bold">{SITE_CONFIG.title}</h1>
<p class="mt-4 text-lg text-gray-600">{SITE_CONFIG.description}</p>
