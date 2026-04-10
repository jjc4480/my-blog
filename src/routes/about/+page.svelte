<script lang="ts">
	import SEO from '$lib/components/common/SEO.svelte';
	import { siteConfig } from '$lib/config';
</script>

<SEO title="소개" description="{siteConfig.author.name} 소개" />

<section class="max-w-xl">
	<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">소개</h1>

	<div class="mt-8 space-y-4 text-[15px] leading-relaxed text-foreground">
		<p>
			안녕하세요, <strong>{siteConfig.author.name}</strong>입니다.
		</p>
		<p class="text-muted-foreground">
			{siteConfig.author.bio}
		</p>
		<p class="text-muted-foreground">
			이 블로그에서는 개발 과정에서 배운 것들과 기술적 고민을 기록합니다.
		</p>
	</div>

	<div class="mt-10 flex items-center gap-4">
		{#if siteConfig.social.github}
			<a
				href={siteConfig.social.github}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
				GitHub
			</a>
		{/if}
		{#if siteConfig.social.twitter}
			<a
				href={siteConfig.social.twitter}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
				Twitter
			</a>
		{/if}
		<a
			href="/rss.xml"
			class="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
			RSS
		</a>
	</div>
</section>
