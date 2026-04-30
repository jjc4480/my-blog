<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { draftFetch } from '$lib/draft/api';

	let { data } = $props();
	let drafts = $state<typeof data.drafts>([]);

	$effect(() => {
		drafts = data.drafts;
	});

	// 어드민 페이지가 열려 있는 동안 4초 간격으로 /api/drafts 를 다시 fetch.
	// 수동 dispatch (게시·저장) 직후 별도 새로고침 없이 목록이 갱신되도록.
	// 탭이 숨겨지면(visibilityState !== 'visible') 폴링을 건너뛴다.
	$effect(() => {
		if (!browser) return;
		const POLL_MS = 4000;
		let stopped = false;
		let inFlight = false;

		async function refresh() {
			if (stopped || inFlight) return;
			if (document.visibilityState !== 'visible') return;
			inFlight = true;
			try {
				const res = await draftFetch('/api/drafts');
				if (!res.ok) return;
				const next = await res.json();
				if (!stopped) drafts = next;
			} catch {
				/* transient — 다음 tick 에서 재시도 */
			} finally {
				inFlight = false;
			}
		}

		const iv = setInterval(refresh, POLL_MS);
		const onVisibility = () => {
			if (document.visibilityState === 'visible') refresh();
		};
		document.addEventListener('visibilitychange', onVisibility);

		return () => {
			stopped = true;
			clearInterval(iv);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	});

	async function deleteDraft(slug: string, sha: string) {
		if (!confirm(`"${slug}" 초안을 삭제하시겠습니까?`)) return;
		const res = await draftFetch(`/api/drafts/${slug}`, {
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
					<a href="/drafts/{draft.slug}" class="text-sm font-medium truncate hover:underline">{draft.title || draft.slug}</a>
					<div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
						<span>{draft.date}</span>
						{#if draft.category}
							<span>·</span>
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
