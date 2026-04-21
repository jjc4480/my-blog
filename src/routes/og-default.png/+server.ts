import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { siteConfig } from '$lib/config';
import type { RequestHandler } from './$types';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const prerender = true;

const fontData = readFileSync(join(process.cwd(), 'static/fonts/NotoSansKR-Bold.ttf'));

export const GET: RequestHandler = async () => {
	const svg = await satori(
		{
			type: 'div',
			props: {
				style: {
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					alignItems: 'center',
					width: '100%',
					height: '100%',
					backgroundColor: '#1a1a1a',
					color: '#fafafa'
				},
				children: [
					{
						type: 'div',
						props: {
							style: { fontSize: 56, fontWeight: 700 },
							children: siteConfig.title
						}
					},
					{
						type: 'div',
						props: {
							style: { fontSize: 28, color: '#888', marginTop: 20 },
							children: siteConfig.description
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
