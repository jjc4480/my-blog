import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { siteConfig } from '$lib/config';
import { getPosts } from '$lib/content/posts';
import type { RequestHandler } from './$types';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const prerender = true;

export async function entries() {
	const posts = await getPosts();
	return posts.map((p) => ({ slug: p.slug }));
}

const fontData = readFileSync(join(process.cwd(), 'static/fonts/NotoSansKR-Bold.ttf'));

export const GET: RequestHandler = async ({ params }) => {
	const posts = await getPosts();
	const post = posts.find((p) => p.slug === params.slug);
	const title = post?.title ?? 'Not Found';

	const svg = await satori(
		{
			type: 'div',
			props: {
				style: {
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'flex-end',
					width: '100%',
					height: '100%',
					padding: '60px',
					backgroundColor: '#1a1a1a',
					color: '#fafafa'
				},
				children: [
					{
						type: 'div',
						props: {
							style: { fontSize: 48, fontWeight: 700, lineHeight: 1.3 },
							children: title
						}
					},
					{
						type: 'div',
						props: {
							style: { fontSize: 24, color: '#888', marginTop: 20 },
							children: siteConfig.title
						}
					}
				]
			}
		},
		{
			width: 1200,
			height: 630,
			fonts: [
				{
					name: 'Noto Sans KR',
					data: fontData,
					weight: 700,
					style: 'normal'
				}
			]
		}
	);

	const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
	const png = resvg.render().asPng();
	const body = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;

	return new Response(body, {
		headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=604800' }
	});
};
