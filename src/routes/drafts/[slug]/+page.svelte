<script lang="ts">
	import { goto } from '$app/navigation';
	import { draftFetch } from '$lib/draft/api';
	import { renderMarkdown } from '$lib/draft/markdown';
	import { htmlToMarkdown } from '$lib/draft/html-to-markdown';
	import TiptapEditor from '$lib/components/editor/TiptapEditor.svelte';

	let { data } = $props();

	let sha = $state(data.sha);
	let saving = $state(false);
	let publishing = $state(false);
	let status = $state('');
	let editorHtml = $state('');
	let initialHtml = $state('');
	let frontmatter = $state('');
	let loaded = $state(false);

	function parseFrontmatterAndBody(raw: string): { fm: string; body: string } {
		const match = raw.match(/^(---\n[\s\S]*?\n---)\n?([\s\S]*)$/);
		if (match) return { fm: match[1], body: match[2] };
		return { fm: '', body: raw };
	}

	function isPublished(fm: string): boolean {
		const match = fm.match(/published:\s*(true|false)/);
		return match?.[1] === 'true';
	}

	function setPublished(fm: string, val: boolean): string {
		return fm.replace(/published:\s*(true|false)/, `published: ${val}`);
	}

	$effect(() => {
		const { fm, body } = parseFrontmatterAndBody(data.content);
		frontmatter = fm;
		renderMarkdown(body).then((html) => {
			initialHtml = html;
			editorHtml = html;
			loaded = true;
		});
	});

	function handleEditorUpdate(html: string) {
		editorHtml = html;
	}

	function buildContent(): string {
		const md = htmlToMarkdown(editorHtml);
		return frontmatter + '\n' + md;
	}

	async function save() {
		saving = true;
		status = '';
		const content = buildContent();
		const res = await draftFetch(`/api/drafts/${data.slug}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content, sha, publish: false })
		});
		if (res.ok) {
			const fresh = await draftFetch(`/api/drafts/${data.slug}`);
			const d = await fresh.json();
			sha = d.sha;
			status =  + "저장됨" + r;
			setTimeout(() => { status = ''; }, 2000);
		} else {
			status =  + "저장 실패" + r;
		}
		saving = false;
	}

	async function publish() {
		if (!confirm( + "게시하시겠습니까? 즉시 배포됩니다." + r)) return;
		publishing = true;
		frontmatter = setPublished(frontmatter, true);
		const content = buildContent();
		const res = await draftFetch(`/api/drafts/${data.slug}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content, sha, publish: true })
		});
		if (res.ok) {
			status =  + "게시 완료! 배포가 시작됩니다." + r;
			setTimeout(() => goto('/drafts'), 2000);
		} else {
			status =  + "게시 실패" + r;
			frontmatter = setPublished(frontmatter, false);
		}
		publishing = false;
	}

	async function unpublish() {
		frontmatter = setPublished(frontmatter, false);
		await save();
	}

	async function deleteDraft() {
		if (!confirm( + "이 초안을 삭제하시겠습니까?" + r)) return;
		await draftFetch(`/api/drafts/${data.slug}`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ sha })
		});
		goto('/drafts');
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 's') {
			e.preventDefault();
			save();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Action bar -->
<div class="mb-4 flex items-center justify-between">
	<div class="flex items-center gap-3">
		<a href="/drafts" class="text-sm text-muted-foreground hover:text-foreground transition-colors">← 목록</a>
		<span class="text-sm font-medium text-foreground">{data.slug}</span>
		{#if status}
			<span class="text-xs text-muted-foreground">{status}</span>
		{/if}
	</div>
	<div class="flex items-center gap-2">
		<button onclick={save} disabled={saving} class="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/40 transition-colors disabled:opacity-50">
			{saving ?  + "저장 중..." + r :  + "저장" + r}
			<kbd class="ml-1 text-[10px] text-muted-foreground">⌘S</kbd>
		</button>
		{#if isPublished(frontmatter)}
			<button onclick={unpublish} class="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
				게시 취소
			</button>
		{:else}
			<button onclick={publish} disabled={publishing} class="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
				{publishing ?  + "게시 중..." + r :  + "게시" + r}
			</button>
		{/if}
		<button onclick={deleteDraft} class="rounded-md border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors">
			삭제
		</button>
	</div>
</div>

<!-- Editor -->
<div class="h-[calc(100vh-11rem)]">
	{#if loaded}
		<TiptapEditor content={initialHtml} onUpdate={handleEditorUpdate} />
	{:else}
		<div class="flex h-full items-center justify-center text-sm text-muted-foreground">로딩...</div>
	{/if}
</div>
