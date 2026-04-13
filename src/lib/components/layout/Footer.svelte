<script lang="ts">
	import { siteConfig } from '$lib/config';
</script>

<footer class="border-t border-border/50 py-8 mt-16">
	<div class="mx-auto max-w-3xl px-4 sm:px-6">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
				<a href="/" class="hover:text-foreground transition-colors">홈</a>
				<a href="/tags" class="hover:text-foreground transition-colors">태그</a>
				<a href="/rss.xml" class="hover:text-foreground transition-colors">RSS</a>
				<a href="/about" class="hover:text-foreground transition-colors">About</a>
				<a href="/privacy" class="hover:text-foreground transition-colors">개인정보처리방침</a>
			</div>
			<a href="mailto:{siteConfig.author.email}" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
				{siteConfig.author.email}
			</a>
		</div>
		<p class="mt-4 text-xs text-muted-foreground/60">
			© {new Date().getFullYear()} {siteConfig.author.name}
		</p>
	</div>
</footer>
