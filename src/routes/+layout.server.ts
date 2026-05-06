import type { LayoutServerLoad } from './$types';
import { getPosts, getTags } from '$lib/content/posts';

export const load: LayoutServerLoad = async ({ locals }) => {
	const isAdmin = !!locals.user;
	const allPosts = await getPosts({ includeSecret: isAdmin });
	return { allPosts, tags: getTags(allPosts), isAdmin };
};
