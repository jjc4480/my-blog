<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import TagChip from '$lib/components/common/TagChip.svelte';
	import SEO from '$lib/components/common/SEO.svelte';
	import JsonLD from '$lib/components/common/JsonLD.svelte';
	import TOC from '$lib/components/post/TOC.svelte';
	import ReadingProgress from '$lib/components/post/ReadingProgress.svelte';
	import { siteConfig } from '$lib/config';
	import { buildArticleSchema, buildBreadcrumbSchema } from '$lib/seo';
	import { formatDate } from '$lib/utils';

	let { data } = $props();
	let isAdmin = $state(false);
	let authChecked = $state(false);
	let seriesOpen = $state(true);
	const seriesIndex = $derived(
		data.series && data.seriesPosts?.length
			? data.seriesPosts.findIndex((p: { slug: string }) => p.slug === data.slug) + 1
			: 0
	);

	$effect(() => {
		fetch('/api/me').then(r => r.json()).then(u => {
			if (u?.login) isAdmin = true;
			authChecked = true;
		}).catch(() => { authChecked = true; });
	});

	interface TocItem { id: string; text: string; level: number; }
	let headings: TocItem[] = $state([]);

	const breadcrumbSchema = $derived(buildBreadcrumbSchema([
		{ name: '홈', url: siteConfig.url },
		{ name: data.category, url: `${siteConfig.url}/category/${data.category}` },
		{ name: data.title, url: `${siteConfig.url}/blog/${data.slug}` }
	]));

	const articleSchema = $derived(buildArticleSchema({
		title: data.title,
		description: data.description,
		url: `${siteConfig.url}/blog/${data.slug}`,
		publishedTime: data.date,
		ogImage: `/og/${data.slug}.png`,
		tags: data.tags
	}));

	const Content = $derived(data.Content);


	function handlePostKeydown(e: KeyboardEvent) {
		const tag = (e.target as HTMLElement)?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

		// j/k or ←/→: prev/next post
		if ((e.key === 'ArrowLeft' || e.code === 'KeyJ') && data.prevPost) {
			goto("/blog/" + data.prevPost.slug);
		}
		if ((e.key === 'ArrowRight' || e.code === 'KeyK') && data.nextPost) {
			goto("/blog/" + data.nextPost.slug);
		}
		// h: go home
		if (e.code === 'KeyH' && !e.metaKey && !e.ctrlKey) {
			goto('/');
		}

	}

	$effect(() => {
		if (!browser) return;
		void data.slug;
		void Content;
		requestAnimationFrame(() => {
			const article = document.querySelector('article .prose');
			if (!article) return;

			const els = article.querySelectorAll('h2, h3');
			const items: TocItem[] = [];
			els.forEach((el) => {
				if (!el.id) {
					el.id = el.textContent?.trim().toLowerCase().replace(/[^a-z0-9\uac00-\ud7a3]+/g, '-').replace(/^-|-$/g, '') ?? '';
				}
				items.push({ id: el.id, text: el.textContent?.trim() ?? '', level: parseInt(el.tagName[1]) });

				if (!el.querySelector('.heading-anchor')) {
					el.classList.add('heading-with-anchor');
					const anchor = document.createElement('a');
					anchor.href = `#${el.id}`;
					anchor.className = 'heading-anchor';
					anchor.setAttribute('aria-label', `${el.textContent?.trim() ?? ''} \uc139\uc158 \ub9c1\ud06c`);
					anchor.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
					el.insertBefore(anchor, el.firstChild);
				}
			});
			headings = items;

			// Mermaid diagrams
			const mermaidBlocks = article.querySelectorAll('pre.mermaid');
			if (mermaidBlocks.length > 0) {
				import('mermaid').then(({ default: mermaid }) => {
					const isDark = document.documentElement.classList.contains('dark');
					mermaid.initialize({
						startOnLoad: false,
						theme: isDark ? 'dark' : 'default',
						fontFamily: 'inherit'
					});
					mermaid.run({ nodes: mermaidBlocks });
				});
			}

			article.querySelectorAll('pre:not(.mermaid)').forEach((pre) => {
				if (pre.querySelector('.copy-btn')) return;
				const wrapper = document.createElement('div');
				wrapper.className = 'code-block-wrapper relative group';
				pre.parentNode?.insertBefore(wrapper, pre);
				wrapper.appendChild(pre);

				const btn = document.createElement('button');
				btn.className = 'copy-btn';
				btn.setAttribute('aria-label', '코드 복사');
				btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
				btn.addEventListener('click', async () => {
					const code = pre.querySelector('code');
					const text = code?.textContent ?? pre.textContent ?? '';
					try {
						await navigator.clipboard.writeText(text);
						btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
						btn.classList.add('copied');
						setTimeout(() => {
							btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
							btn.classList.remove('copied');
						}, 2000);
					} catch {
						btn.textContent = '!';
						setTimeout(() => {
							btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
						}, 2000);
					}
				});
				wrapper.appendChild(btn);
			});
		});
	});

</script>

<svelte:window onkeydown={handlePostKeydown} />


<SEO
	title={data.title}
	description={data.description}
	type="article"
	publishedTime={data.date}
	tags={data.tags}
	ogImage="/og/{data.slug}.png"
	canonicalUrl="{siteConfig.url}/blog/{data.slug}"
/>
<JsonLD schema={articleSchema} />
<JsonLD schema={breadcrumbSchema} />

<ReadingProgress target="article" />

<TOC {headings} />

<article class="pb-24 sm:pb-0">
	<header class="mb-10">
		<div class="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
			<time datetime={data.date}>{formatDate(data.date)}</time>
			<span>·</span>
			<a href="/category/{data.category}" class="hover:text-foreground transition-colors">{data.category}</a>
			<span>·</span>
			<span>{data.readingTime}분 읽기</span>
			{#if data.secret && isAdmin}
				<span>·</span>
				<span class="inline-flex items-center gap-1 text-amber-500 text-xs font-medium">
					<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
					비밀글
				</span>
			{/if}
			{#if isAdmin}
				<span>·</span>
				<a href="/drafts/{data.slug}" class="hover:text-foreground transition-colors">편집</a>
			{/if}
		</div>
		<h1 class="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{data.title}</h1>
		<div class="mt-4 flex flex-wrap gap-1.5">
			{#each data.tags as tag}
				<TagChip {tag} href="/tags/{tag}" />
			{/each}
		</div>
	</header>

	{#if data.secret && authChecked && !isAdmin}
	<div class="flex flex-col items-center justify-center py-20 text-center">
		<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground/50 mb-4"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
		<p class="text-lg font-medium text-muted-foreground">비밀글입니다</p>
		<p class="mt-2 text-sm text-muted-foreground/70">이 글은 관리자만 열람할 수 있습니다.</p>
	</div>
{:else}
	{#if data.series && data.seriesPosts.length > 1}
		<div class="mb-8 rounded-lg border border-border/50 bg-secondary/30">
			<button
				onclick={() => seriesOpen = !seriesOpen}
				class="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors rounded-lg"
			>
				<span class="flex items-center gap-2">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/></svg>
					시리즈: {data.series}
					<span class="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary tabular-nums">{seriesIndex} / {data.seriesPosts.length}</span>
				</span>
				<svg
					xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
					class="transition-transform duration-200 {seriesOpen ? 'rotate-180' : ''}"
				><path d="m6 9 6 6 6-6"/></svg>
			</button>
			{#if seriesOpen}
				<div class="border-t border-border/30 px-4 py-2">
					<ol class="space-y-0.5">
						{#each data.seriesPosts as sp, i}
							{#if sp.slug === data.slug}
								<li class="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
									<span class="text-xs text-primary/60">{i + 1}.</span>
									{sp.title}
								</li>
							{:else}
								<li>
									<a href="/blog/{sp.slug}" class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
										<span class="text-xs text-muted-foreground/60">{i + 1}.</span>
										{sp.title}
									</a>
								</li>
							{/if}
						{/each}
					</ol>
				</div>
				{#if data.prevSeriesPost || data.nextSeriesPost}
					<div class="grid gap-2 border-t border-border/30 p-3 sm:grid-cols-2">
						{#if data.prevSeriesPost}
							<a href="/blog/{data.prevSeriesPost.slug}" class="group flex flex-col gap-0.5 rounded-md bg-background/60 px-3 py-2 transition-colors hover:bg-background">
								<span class="flex items-center gap-1 text-[11px] text-muted-foreground">
									<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
									이전 시리즈 글
								</span>
								<span class="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">{data.prevSeriesPost.title}</span>
							</a>
						{:else}
							<div></div>
						{/if}
						{#if data.nextSeriesPost}
							<a href="/blog/{data.nextSeriesPost.slug}" class="group flex flex-col items-end gap-0.5 rounded-md bg-background/60 px-3 py-2 text-right transition-colors hover:bg-background">
								<span class="flex items-center gap-1 text-[11px] text-muted-foreground">
									다음 시리즈 글
									<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
								</span>
								<span class="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">{data.nextSeriesPost.title}</span>
							</a>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	{/if}

	<div class="prose prose-neutral dark:prose-invert max-w-none leading-[1.8]">
		<Content />
	</div>

	<nav class="mt-16 grid gap-4 border-t border-border/50 pt-8 sm:grid-cols-2" aria-label="이전/다음 글">
		{#if data.prevPost}
			<a href="/blog/{data.prevPost.slug}" class="group flex flex-col rounded-lg border border-border/50 p-4 transition-colors hover:bg-secondary/40">
				<span class="text-xs text-muted-foreground">← 이전 글</span>
				<span class="mt-1 text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">{data.prevPost.title}</span>
			</a>
		{:else}
			<div></div>
		{/if}
		{#if data.nextPost}
			<a href="/blog/{data.nextPost.slug}" class="group flex flex-col items-end text-right rounded-lg border border-border/50 p-4 transition-colors hover:bg-secondary/40">
				<span class="text-xs text-muted-foreground">다음 글 →</span>
				<span class="mt-1 text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">{data.nextPost.title}</span>
			</a>
		{/if}
	</nav>

	{#if data.relatedPosts?.length > 0}
		<section class="mt-12 border-t border-border/50 pt-8">
			<h2 class="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">관련 글</h2>
			<div class="grid gap-3 sm:grid-cols-3">
				{#each data.relatedPosts as rp}
					<a href="/blog/{rp.slug}" class="group rounded-lg border border-border/50 p-4 transition-colors hover:bg-secondary/40">
						<span class="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">{rp.title}</span>
					</a>
				{/each}
			</div>
		</section>
	{/if}
{/if}
</article>

<!-- Mobile floating prev/next buttons -->
{#if data.prevPost || data.nextPost}
	<div class="fixed bottom-6 left-4 right-4 z-40 flex items-center justify-between lg:hidden" style="contain: layout;">
		{#if data.prevPost}
			<a
				href="/blog/{data.prevPost.slug}"
				class="flex h-10 items-center gap-1.5 rounded-full border border-border/50 bg-background/80 px-4 text-sm text-muted-foreground shadow-lg backdrop-blur-sm transition-all hover:text-foreground"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
				이전
			</a>
		{:else}
			<div></div>
		{/if}
		{#if data.nextPost}
			<a
				href="/blog/{data.nextPost.slug}"
				class="flex h-10 items-center gap-1.5 rounded-full border border-border/50 bg-background/80 px-4 text-sm text-muted-foreground shadow-lg backdrop-blur-sm transition-all hover:text-foreground"
			>
				다음
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
			</a>
		{/if}
	</div>
{/if}
