import { getPosts, getCategories, getTags } from '$lib/content/posts';
import { siteConfig } from '$lib/config';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = async () => {
	const posts = await getPosts();
	const categories = getCategories(posts);
	const tags = getTags(posts);
	const staticPages = ['', '/tags', '/category'];

	const urls = [
		...staticPages.map((p) => `<url><loc>${siteConfig.url}${p}</loc></url>`),
		...posts.map((p) => `<url><loc>${siteConfig.url}/blog/${p.slug}</loc><lastmod>${p.date}</lastmod></url>`),
		...categories.map((c) => `<url><loc>${siteConfig.url}/category/${encodeURIComponent(c)}</loc></url>`),
		...tags.map((t) => `<url><loc>${siteConfig.url}/tags/${encodeURIComponent(t)}</loc></url>`)
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml' }
	});
};
