<script lang="ts">
	let { value = $bindable(''), placeholder = '검색...', oninput }: { value?: string; placeholder?: string; oninput?: () => void } = $props();
</script>

<div class="relative">
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
	>
		<circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
	</svg>
	<input
		type="text"
		bind:value
		{placeholder}
		{oninput}
		class="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
	/>
</div>
