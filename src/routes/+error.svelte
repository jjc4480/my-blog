<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="flex flex-col items-center justify-center py-24 text-center">
	<p class="text-6xl font-bold text-muted-foreground/30">{page.status}</p>
	<h1 class="mt-4 text-xl font-semibold text-foreground">
		{#if page.status === 404}
			페이지를 찾을 수 없습니다
		{:else}
			문제가 발생했습니다
		{/if}
	</h1>
	<p class="mt-2 text-sm text-muted-foreground">
		{#if page.status === 404}
			요청하신 페이지가 존재하지 않거나 이동되었습니다.
		{:else}
			잠시 후 다시 시도해 주세요.
		{/if}
	</p>
	<a
		href="/"
		class="mt-8 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
	>
		홈으로 돌아가기
	</a>
</div>
