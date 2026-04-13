<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();
	let drafts = $state(data.drafts);

	async function deleteDraft(slug: string, sha: string) {
		if (!confirm(`"\${slug}" 초안을 삭제하시겠습니까?`)) return;
		const res = await fetch(`/api/drafts/\${slug}`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ sha })
		});
		if (res.ok) {
			drafts = drafts.filter((d) => d.slug !== slug);
		}
	}
</script>

<div class="flex items-center justify-between mb-8">
	<h1 class="text-xl font-bold">초안 목록</h1>
	<a href="/drafts/new" class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
		새 글 작성
	</a>
</div>

{#if drafts.length === 0}
	<div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-16 text-muted-foreground">
		<p>아직 초안이 없습니다</p>
	</div>
{:else}
	<div class="grid gap-3">
		{#each drafts as draft (draft.slug)}
			<div class="flex items-center justify-between rounded-lg border border-border/50 p-4 transition-colors hover:bg-secondary/30">
				<div class="min-w-0 flex-1">
					<h2 class="text-sm font-medium truncate">{draft.title || draft.slug}</h2>
					<div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
						<span>{draft.date}</span>
						{#if draft.category}
							<span>\u00b7</span>
							<span>{draft.category}</span>
						{/if}
					</div>
				</div>
				<div class="flex items-center gap-2 ml-4">
					<a href="/drafts/{draft.slug}" class="rounded-md border border-border/50 px-3 py-1.5 text-xs transition-colors hover:bg-secondary">편집</a>
					<button onclick={() => deleteDraft(draft.slug, draft.sha)} class="rounded-md border border-destructive/30 px-3 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10">삭제</button>
				</div>
			</div>
		{/each}
	</div>
{/if}
