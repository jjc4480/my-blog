import { getPosts } from '$lib/content/posts';
import { siteConfig } from '$lib/config';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = async () => {
	const posts = await getPosts();
	const recent = posts.slice(0, 20);

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(siteConfig.title)}</title>
<description>${esc(siteConfig.description)}</description>
<link>${siteConfig.url}</link>
<atom:link href="${siteConfig.url}/rss.xml" rel="self" type="application/rss+xml"/>
${recent.map((p) => `<item>
<title>${esc(p.title)}</title>
<description>${esc(p.description)}</description>
<link>${siteConfig.url}/blog/${p.slug}</link>
<guid isPermaLink="true">${siteConfig.url}/blog/${p.slug}</guid>
<pubDate>${new Date(p.date).toUTCString()}</pubDate>
<author>${esc(siteConfig.author.email)} (${esc(siteConfig.author.name)})</author>
${[...new Set([p.category, ...p.tags])].map((c) => `<category>${esc(c)}</category>`).join('\n')}
</item>`).join('\n')}
</channel>
</rss>`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml' }
	});
};

function esc(s: string): string {
	return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
