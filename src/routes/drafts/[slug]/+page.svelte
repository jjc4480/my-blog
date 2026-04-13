<script lang="ts">
	import { goto } from '$app/navigation';
	import { renderMarkdown } from '$lib/draft/markdown';

	let { data } = $props();

	let content = $state(data.content);
	let sha = $state(data.sha);
	let preview = $state('');
	let saving = $state(false);
	let publishing = $state(false);
	let status = $state('');
	let debounceTimer: ReturnType<typeof setTimeout>;

	function isPublished(src: string): boolean {
		const match = src.match(/published:\s*(true|false)/);
		return match?.[1] === 'true';
	}

	function setPublished(src: string, val: boolean): string {
		return src.replace(/published:\s*(true|false)/, `published: ${val}`);
	}

	function getBody(src: string): string {
		const match = src.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
		return match?.[1] ?? src;
	}

	$effect(() => {
		clearTimeout(debounceTimer);
		const src = content;
		debounceTimer = setTimeout(async () => {
			preview = await renderMarkdown(getBody(src));
		}, 300);
	});

	async function save() {
		saving = true;
		status = '';
		const res = await fetch(`/api/drafts/${data.slug}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content, sha, publish: false })
		});
		if (res.ok) {
			const fresh = await fetch(`/api/drafts/${data.slug}`);
			const d = await fresh.json();
			sha = d.sha;
			status = '저장됨';
			setTimeout(() => { status = ''; }, 2000);
		} else {
			status = '저장 실패';
		}
		saving = false;
	}

	async function publish() {
		if (!confirm('게시하시겠습니까? 즉시 배포됩니다.')) return;
		publishing = true;
		content = setPublished(content, true);
		const res = await fetch(`/api/drafts/${data.slug}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content, sha, publish: true })
		});
		if (res.ok) {
			status = '게시 완료! 배포가 시작됩니다.';
			setTimeout(() => goto('/drafts'), 2000);
		} else {
			status = '게시 실패';
			content = setPublished(content, false);
		}
		publishing = false;
	}

	async function unpublish() {
		content = setPublished(content, false);
		await save();
	}

	async function deleteDraft() {
		if (!confirm('이 초안을 삭제하시겠습니까?')) return;
		await fetch(`/api/drafts/${data.slug}`, {
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
			{saving ? '저장 중...' : '저장'}
			<kbd class="ml-1 text-[10px] text-muted-foreground mac-key">⌘S</kbd>
			<kbd class="ml-1 text-[10px] text-muted-foreground other-key">Ctrl+S</kbd>
		</button>
		{#if isPublished(content)}
			<button onclick={unpublish} class="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
				게시 취소
			</button>
		{:else}
			<button onclick={publish} disabled={publishing} class="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
				{publishing ? '게시 중...' : '게시'}
			</button>
		{/if}
		<button onclick={deleteDraft} class="rounded-md border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors">
			삭제
		</button>
	</div>
</div>

<div class="grid h-[calc(100vh-10rem)] grid-cols-2 gap-4">
	<div class="flex flex-col rounded-lg border border-border/50 overflow-hidden">
		<div class="border-b border-border/50 bg-secondary/20 px-3 py-2 text-xs font-medium text-muted-foreground">마크다운</div>
		<textarea
			bind:value={content}
			class="flex-1 resize-none bg-background p-4 font-mono text-sm leading-relaxed text-foreground outline-none"
			spellcheck="false"
		></textarea>
	</div>

	<div class="flex flex-col rounded-lg border border-border/50 overflow-hidden">
		<div class="border-b border-border/50 bg-secondary/20 px-3 py-2 text-xs font-medium text-muted-foreground">미리보기</div>
		<div class="flex-1 overflow-y-auto p-4">
			<div class="prose prose-neutral dark:prose-invert max-w-none leading-[1.8]">
				{@html preview}
			</div>
		</div>
	</div>
</div>
