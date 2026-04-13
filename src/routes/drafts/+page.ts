import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = async ({ fetch }) => {
	const res = await fetch('/api/drafts');
	const drafts: { slug: string; title: string; date: string; category: string; tags: string[]; sha: string }[] = await res.json();
	return { drafts };
};
