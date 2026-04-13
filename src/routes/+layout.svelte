<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/layout/Header.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import FloatingActions from '$lib/components/common/FloatingActions.svelte';

	let { children, data } = $props();
</script>

<Header tags={data.tags} />
<div class="flex min-h-screen flex-col lg:pl-56">
	<main class="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
		{@render children()}
	</main>
	<Footer />
</div>
<FloatingActions />
