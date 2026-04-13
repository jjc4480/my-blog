<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import TagChip from '$lib/components/common/TagChip.svelte';
	import SEO from '$lib/components/common/SEO.svelte';
	import JsonLD from '$lib/components/common/JsonLD.svelte';
	import TOC from '$lib/components/post/TOC.svelte';
	import { siteConfig } from '$lib/config';
	import { buildArticleSchema } from '$lib/seo';
	import { formatDate } from '$lib/utils';

	let { data } = $props();

	interface TocItem { id: string; text: string; level: number; }
	let headings: TocItem[] = $state([]);
	let readingProgress = $state(0);
	let showScrollTop = $state(false);

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
		if ((e.key === 'ArrowLeft' || e.key === 'j') && data.prevPost) {
			goto("/blog/" + data.prevPost.slug);
		}
		if ((e.key === 'ArrowRight' || e.key === 'k') && data.nextPost) {
			goto("/blog/" + data.nextPost.slug);
		}
		// h: go home
		if (e.key === 'h' && !e.metaKey && !e.ctrlKey) {
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
			});
			headings = items;

			article.querySelectorAll('pre').forEach((pre) => {
				if (pre.querySelector('.copy-btn')) return;
				const wrapper = document.createElement('div');
				wrapper.className = 'relative group';
				pre.parentNode?.insertBefore(wrapper, pre);
				wrapper.appendChild(pre);

				const btn = document.createElement('button');
				btn.className = 'copy-btn absolute top-2 right-2 rounded-md border border-border/50 bg-background/80 px-2 py-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground backdrop-blur-sm';
				btn.textContent = '복사';
				btn.addEventListener('click', async () => {
					const code = pre.querySelector('code');
					const text = code?.textContent ?? pre.textContent ?? '';
					try {
						await navigator.clipboard.writeText(text);
						btn.textContent = '복사됨';
						setTimeout(() => { btn.textContent = '복사'; }, 2000);
					} catch {
						btn.textContent = '실패';
						setTimeout(() => { btn.textContent = '복사'; }, 2000);
					}
				});
				wrapper.appendChild(btn);
			});
		});
	});

	$effect(() => {
		if (!browser) return;
		function onScroll() {
			const el = document.documentElement;
			const scrollTop = el.scrollTop;
			const scrollHeight = el.scrollHeight - el.clientHeight;
			readingProgress = scrollHeight > 0 ? Math.min((scrollTop / scrollHeight) * 100, 100) : 0;
			showScrollTop = scrollTop > 400;
		}
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
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

<div class="fixed top-0 left-0 z-50 h-0.5 bg-primary transition-all duration-150" style="width: {readingProgress}%"></div>

<TOC {headings} />

<article>
	<header class="mb-10">
		<div class="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
			<time datetime={data.date}>{formatDate(data.date)}</time>
			<span>·</span>
			<a href="/category/{data.category}" class="hover:text-foreground transition-colors">{data.category}</a>
			<span>·</span>
			<span>{data.readingTime}분 읽기</span>
		</div>
		<h1 class="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{data.title}</h1>
		<div class="mt-4 flex flex-wrap gap-1.5">
			{#each data.tags as tag}
				<TagChip {tag} href="/tags/{tag}" />
			{/each}
		</div>
	</header>

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
</article>

{#if showScrollTop}
	<button
		onclick={scrollToTop}
		class="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-background/90 text-muted-foreground shadow-lg backdrop-blur-sm transition-all hover:text-foreground hover:shadow-xl"
		aria-label="맨 위로 스크롤"
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
	</button>
{/if}
