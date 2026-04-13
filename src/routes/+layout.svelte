<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/layout/Header.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import FloatingActions from '$lib/components/common/FloatingActions.svelte';

	let { children, data } = $props();
</script>

<Header tags={data.tags} />
<div class="flex min-h-screen flex-col lg:pl-56">
	<main class="w-full max-w-3xl flex-1 px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
		{@render children()}
	</main>
	<Footer />
</div>
<FloatingActions />
