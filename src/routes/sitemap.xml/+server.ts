import { getPosts } from '$lib/content/posts';
import { siteConfig } from '$lib/config';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = async () => {
	const posts = await getPosts();
	const pages = ['', '/tags', '/category', '/search'];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `<url><loc>${siteConfig.url}${p}</loc></url>`).join('\n')}
${posts.map((p) => `<url><loc>${siteConfig.url}/blog/${p.slug}</loc><lastmod>${p.date}</lastmod></url>`).join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml' }
	});
};
