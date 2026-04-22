import type { LayoutServerLoad } from './$types';
import { getPosts, getTags } from '$lib/content/posts';

export const load: LayoutServerLoad = async ({ locals }) => {
	const isAdmin = !!locals.user;
	const posts = await getPosts({ includeSecret: isAdmin });
	return { tags: getTags(posts), isAdmin };
};
