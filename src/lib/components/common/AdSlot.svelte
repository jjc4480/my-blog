<script lang="ts">
	interface Props {
		slot?: 'in-article' | 'sidebar' | 'footer';
		className?: string;
	}

	let { slot = 'in-article', className = '' }: Props = $props();
</script>

<!--
  AdSlot 컴포넌트
  실제 운영 시: Google Ads / Kakao AdFit 스크립트를 여기에 삽입
  현재는 placeholder 레이아웃만 유지 (빌드 시 렌더링되지 않음)
-->
{#if false}
	<div class="ad-slot ad-slot--{slot} {className}" aria-label="광고" role="complementary">
		<!-- AD_PLACEHOLDER -->
	</div>
{/if}

<style>
	.ad-slot {
		width: 100%;
		overflow: hidden;
	}

	.ad-slot--in-article {
		margin: 2rem 0;
		min-height: 90px;
	}

	.ad-slot--sidebar {
		min-height: 250px;
	}

	.ad-slot--footer {
		margin-top: 2rem;
		min-height: 90px;
	}
</style>
