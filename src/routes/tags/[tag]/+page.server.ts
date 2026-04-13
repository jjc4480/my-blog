import { getPosts } from '$lib/content/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const isAdmin = !!locals.user;
	const posts = await getPosts({ includeSecret: isAdmin });
	const filtered = posts.filter((p) => p.tags.includes(params.tag));

	return {
		tag: params.tag,
		posts: filtered
	};
};
