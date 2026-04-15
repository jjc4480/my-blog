import { z } from 'zod/v4';
import yaml from 'js-yaml';

export const postSchema = z.object({
	title: z.string(),
	date: z.union([z.string(), z.date()]).transform((v) => (v instanceof Date ? v.toISOString().split('T')[0] : String(v))),
	description: z.string().default(''),
	tags: z.array(z.string()).default([]),
	category: z.string().default(''),
	published: z.boolean().default(false),
	secret: z.boolean().optional(),
	series: z.string().optional(),
	seriesOrder: z.number().optional(),
	slug: z.string().optional(),
	thumbnail: z.string().optional()
});

export type PostFrontmatter = z.infer<typeof postSchema>;

export function parseFrontmatter(raw: string): { data: PostFrontmatter; body: string } | null {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return null;

	let parsed: unknown;
	try { parsed = yaml.load(match[1]); } catch { return null; }
	if (!parsed || typeof parsed !== 'object') return null;

	const result = postSchema.safeParse(parsed);
	if (!result.success) return null;

	return { data: result.data, body: match[2] };
}
