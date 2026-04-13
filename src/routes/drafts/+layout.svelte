<script lang="ts">
	let { data, children } = $props();
</script>

<div class="min-h-screen bg-background text-foreground">
	<header class="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-sm">
		<div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
			<div class="flex items-center gap-4">
				<a href="/" class="text-sm text-muted-foreground hover:text-foreground transition-colors">← 블로그</a>
				<span class="text-sm font-medium">초안 관리</span>
			</div>
			<div class="flex items-center gap-3 text-sm">
				<span class="text-muted-foreground">{data.login}</span>
				<a href="/auth/logout" class="text-muted-foreground hover:text-foreground transition-colors">로그아웃</a>
			</div>
		</div>
	</header>
	<main class="mx-auto max-w-6xl px-4 py-8">
		{@render children()}
	</main>
</div>
