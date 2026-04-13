import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = async ({ params, fetch }) => {
	const res = await fetch(`/api/drafts/${params.slug}`);
	if (!res.ok) throw new Error('Failed to load draft');
	const { content, sha } = await res.json();
	return { slug: params.slug, content, sha };
};
