<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/layout/Header.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<script>
		if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
			document.documentElement.classList.add('dark');
		}
	</script>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />
	<main class="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
		{@render children()}
	</main>
	<Footer />
</div>
