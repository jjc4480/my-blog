import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const modules = import.meta.glob('/content/posts/*.md', { eager: true });
	const path = `/content/posts/${params.slug}.md`;
	const module = modules[path] as { metadata: Record<string, unknown>; default: { render: () => { html: string } } } | undefined;

	if (!module) {
		error(404, 'Post not found');
	}

	const { metadata } = module;
	const { html } = module.default.render();

	return {
		title: metadata.title as string,
		date: metadata.date as string,
		description: metadata.description as string,
		tags: metadata.tags as string[],
		category: metadata.category as string,
		content: html,
		slug: params.slug
	};
};
