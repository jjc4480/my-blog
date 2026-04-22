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
		...staticPages.map((p) => {
			const priority = p === '' ? '1.0' : '0.6';
			const changefreq = p === '' ? 'daily' : 'weekly';
			return `<url><loc>${siteConfig.url}${p}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
		}),
		...posts.map((p) => `<url><loc>${siteConfig.url}/blog/${p.slug}</loc><lastmod>${p.date.split('T')[0]}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`),
		...categories.map((c) => `<url><loc>${siteConfig.url}/category/${encodeURIComponent(c)}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`),
		...tags.map((t) => `<url><loc>${siteConfig.url}/tags/${encodeURIComponent(t)}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`)
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml' }
	});
};
