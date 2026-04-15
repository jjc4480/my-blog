import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const SLUG_PATTERN = /^[a-z0-9\uac00-\ud7a3](?:[a-z0-9\uac00-\ud7a3-]*[a-z0-9\uac00-\ud7a3])?$/i;

export const GET: RequestHandler = async ({ params, platform }) => {
	const { slug } = params;
	if (!SLUG_PATTERN.test(slug)) return json({ views: 0 });

	const kv = platform?.env?.VIEWS_KV;
	if (!kv) return json({ views: 0 });

	const views = parseInt((await kv.get(`views:${slug}`)) ?? '0', 10);
	return json({ views });
};

export const POST: RequestHandler = async ({ params, platform, request }) => {
	const { slug } = params;
	if (!SLUG_PATTERN.test(slug)) return json({ views: 0 });

	const kv = platform?.env?.VIEWS_KV;
	if (!kv) return json({ views: 0 });

	const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
	const dedupeKey = `seen:${slug}:${ip}`;
	const already = await kv.get(dedupeKey);

	const currentViews = parseInt((await kv.get(`views:${slug}`)) ?? '0', 10);

	if (already) {
		return json({ views: currentViews });
	}

	const newViews = currentViews + 1;
	await kv.put(`views:${slug}`, String(newViews));
	await kv.put(dedupeKey, '1', { expirationTtl: 86400 });

	return json({ views: newViews });
};
