<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/layout/Header.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import FloatingActions from '$lib/components/common/FloatingActions.svelte';

	let { children, data } = $props();
</script>

<a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground">본문으로 건너뛰기</a>
<Header tags={data.tags} />
<div class="flex min-h-screen flex-col lg:pl-56">
	<main id="main-content" class="w-full max-w-3xl flex-1 px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
		{@render children()}
	</main>
	<Footer />
</div>
<FloatingActions />
