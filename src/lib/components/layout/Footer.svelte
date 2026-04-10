<script lang="ts">
	import { siteConfig } from '$lib/config';
</script>

<footer class="border-t border-border/50 py-8 mt-16">
	<div class="mx-auto max-w-3xl px-4 sm:px-6">
		<p class="text-sm text-muted-foreground">
			© {new Date().getFullYear()} {siteConfig.author.name}
		</p>
	</div>
</footer>
