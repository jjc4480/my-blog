import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
	const modules = import.meta.glob('/content/posts/*.md', { eager: true });
	const tags = [...new Set(
		Object.values(modules)
			.filter((m: any) => m.metadata?.published !== false)
			.flatMap((m: any) => m.metadata?.tags ?? [])
	)].sort();

	return { tags };
};
