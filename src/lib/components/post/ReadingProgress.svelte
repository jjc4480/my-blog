<script lang="ts">
	import { browser } from '$app/environment';

	interface Props {
		/** CSS selector for the article element to track */
		target?: string;
	}
	let { target = 'article' }: Props = $props();

	let progress = $state(0);

	$effect(() => {
		if (!browser) return;
		const el = document.querySelector<HTMLElement>(target);
		if (!el) return;

		let rafId = 0;
		function compute() {
			rafId = 0;
			const rect = el!.getBoundingClientRect();
			const viewportH = window.innerHeight;
			const articleH = rect.height;
			const scrolled = -rect.top;
			const total = articleH - viewportH;
			if (total <= 0) {
				progress = rect.bottom <= viewportH ? 100 : 0;
				return;
			}
			const p = (scrolled / total) * 100;
			progress = Math.max(0, Math.min(100, p));
		}

		function onScroll() {
			if (rafId) return;
			rafId = requestAnimationFrame(compute);
		}

		compute();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll, { passive: true });
		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
			if (rafId) cancelAnimationFrame(rafId);
		};
	});
</script>

<div
	class="fixed left-0 top-0 z-50 h-0.5 w-full bg-transparent"
	role="progressbar"
	aria-label="읽기 진행률"
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuenow={Math.round(progress)}
>
	<div class="h-full bg-primary" style="width: {progress}%; transition: width 120ms linear;"></div>
</div>
