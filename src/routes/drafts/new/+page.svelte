<script lang="ts">
	import { goto } from '$app/navigation';
	import { draftFetch } from '$lib/draft/api';
	import TiptapEditor from '$lib/components/editor/TiptapEditor.svelte';
	import { htmlToMarkdown } from '$lib/draft/html-to-markdown';

	let slug = $state('');
	let title = $state('');
	let description = $state('');
	let category = $state('');
	let tagsInput = $state('');
	let saving = $state(false);
	let errorMsg = $state('');
	let editorHtml = $state('');

	function handleEditorUpdate(html: string) {
		editorHtml = html;
	}

	function buildFrontmatter(): string {
		const date = new Date().toISOString().split('T')[0];
		const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
		const tagsStr = tags.length > 0 ? `[${tags.join(', ')}]` : '[]';
		return `---\ntitle: "${title.trim()}"\ndate: ${date}\ndescription: "${description.trim()}"\ntags: ${tagsStr}\ncategory: ${category.trim()}\npublished: false\n---`;
	}

	async function saveDraft() {
		if (!slug.trim() || !title.trim()) return;
		saving = true;
		errorMsg = '';
		try {
			const md = htmlToMarkdown(editorHtml);
			const content = buildFrontmatter() + '\n' + md;
			const res = await draftFetch('/api/drafts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: title.trim(),
					slug: slug.trim(),
					category: category.trim(),
					tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
					description: description.trim(),
					content
				})
			});
			if (!res.ok) {
				const data = await res.json();
				errorMsg = data.error || '생성 실패';
				return;
			}
			goto(`/drafts/${slug.trim()}`);
		} catch {
			errorMsg = '네트워크 오류';
		} finally {
			saving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.code === 'KeyS') {
			e.preventDefault();
			saveDraft();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="mb-4 flex items-center justify-between">
	<div class="flex items-center gap-3">
		<a href="/drafts" class="text-sm text-muted-foreground hover:text-foreground transition-colors">← 목록</a>
		<span class="text-sm font-medium">새 글 작성</span>
	</div>
	<div class="flex items-center gap-2">
		{#if errorMsg}
			<span class="text-xs text-destructive">{errorMsg}</span>
		{/if}
		<button onclick={saveDraft} disabled={!slug.trim() || !title.trim() || saving} class="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
			{saving ? '저장 중...' : '초안 저장'}
			<kbd class="ml-1 text-[10px] text-primary-foreground/60">⌘S</kbd>
		</button>
	</div>
</div>

<!-- Meta fields -->
<div class="mb-4 grid gap-3 sm:grid-cols-2">
	<div>
		<label for="slug" class="mb-1 block text-xs text-muted-foreground">Slug (영문, URL 경로)</label>
		<input id="slug" type="text" bind:value={slug} required placeholder="my-post-title" class="w-full rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm font-mono outline-none focus:ring-2 focus:ring-ring" />
	</div>
	<div>
		<label for="title" class="mb-1 block text-xs text-muted-foreground">제목</label>
		<input id="title" type="text" bind:value={title} required placeholder="포스트 제목" class="w-full rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
	</div>
	<div>
		<label for="description" class="mb-1 block text-xs text-muted-foreground">설명</label>
		<input id="description" type="text" bind:value={description} placeholder="간단한 설명" class="w-full rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
	</div>
	<div class="grid grid-cols-2 gap-3">
		<div>
			<label for="category" class="mb-1 block text-xs text-muted-foreground">카테고리</label>
			<input id="category" type="text" bind:value={category} placeholder="engineering" class="w-full rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
		</div>
		<div>
			<label for="tags" class="mb-1 block text-xs text-muted-foreground">태그 (쉼표 구분)</label>
			<input id="tags" type="text" bind:value={tagsInput} placeholder="go, msa" class="w-full rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
		</div>
	</div>
</div>

<!-- Editor -->
<div class="h-[calc(100vh-16rem)]">
	<TiptapEditor content="" onUpdate={handleEditorUpdate} />
</div>
