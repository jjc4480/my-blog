<script lang="ts">
	interface Props {
		src: string;
		alt: string;
		width?: number;
		height?: number;
		sizes?: string;
		class?: string;
		eager?: boolean;
	}

	let { src, alt, width = 800, height = 450, sizes = '(max-width: 640px) 100vw, (max-width: 960px) 960px, 1280px', class: className = '', eager = false }: Props = $props();

	const ext = $derived(src.lastIndexOf('.'));
	const base = $derived(ext > 0 ? src.slice(0, ext) : src);
	const isOptimized = $derived(src.startsWith('/optimized/'));

	const srcset = $derived(isOptimized
		? [640, 960, 1280].map(w => `${base}-${w}w.webp ${w}w`).join(', ')
		: '');
</script>

{#if isOptimized && srcset}
	<picture>
		<source type="image/webp" {srcset} {sizes} />
		<img
			{src}
			{alt}
			{width}
			{height}
			loading={eager ? 'eager' : 'lazy'}
			decoding="async"
			class={className}
			style="max-width: 100%; height: auto;"
		/>
	</picture>
{:else}
	<img
		{src}
		{alt}
		{width}
		{height}
		loading={eager ? 'eager' : 'lazy'}
		decoding="async"
		class={className}
		style="max-width: 100%; height: auto;"
	/>
{/if}
