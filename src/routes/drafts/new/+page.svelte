<script lang="ts">
	import { goto } from '$app/navigation';

	let title = $state('');
	let description = $state('');
	let category = $state('');
	let tagsInput = $state('');
	let saving = $state(false);
	let errorMsg = $state('');

	const slug = $derived(
		title
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9\uac00-\ud7a3\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '')
	);

	async function createDraft() {
		if (!title.trim() || !slug) return;
		saving = true;
		errorMsg = '';
		try {
			const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
			const res = await fetch('/api/drafts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: title.trim(), slug, category: category.trim(), tags, description: description.trim() })
			});
			if (!res.ok) {
				const data = await res.json();
				errorMsg = data.error ||  + "생성 실패" + r;
				return;
			}
			const data = await res.json();
			goto(`/drafts/${data.slug}`);
		} catch {
			errorMsg =  + "네트워크 오류" + r;
		} finally {
			saving = false;
		}
	}
</script>

<div class="mx-auto max-w-lg">
	<h1 class="mb-8 text-xl font-bold">새 초안 작성</h1>

	<form onsubmit={(e) => { e.preventDefault(); createDraft(); }} class="space-y-5">
		<div>
			<label for="title" class="mb-1.5 block text-sm font-medium">제목</label>
			<input id="title" type="text" bind:value={title} required class="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
			{#if slug}
				<p class="mt-1 text-xs text-muted-foreground">slug: {slug}</p>
			{/if}
		</div>

		<div>
			<label for="description" class="mb-1.5 block text-sm font-medium">설명</label>
			<input id="description" type="text" bind:value={description} class="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
		</div>

		<div>
			<label for="category" class="mb-1.5 block text-sm font-medium">카테고리</label>
			<input id="category" type="text" bind:value={category} class="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
		</div>

		<div>
			<label for="tags" class="mb-1.5 block text-sm font-medium">태그 (쉼표 구분)</label>
			<input id="tags" type="text" bind:value={tagsInput} placeholder="svelte, typescript, blog" class="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
		</div>

		{#if errorMsg}
			<p class="text-sm text-destructive">{errorMsg}</p>
		{/if}

		<div class="flex gap-3">
			<button type="submit" disabled={!title.trim() || saving} class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
				{saving ?  + "생성 중..." + r :  + "초안 생성" + r}
			</button>
			<a href="/drafts" class="rounded-md border border-border/50 px-4 py-2 text-sm transition-colors hover:bg-secondary">취소</a>
		</div>
	</form>
</div>
