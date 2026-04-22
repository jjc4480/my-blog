import { json } from '@sveltejs/kit';
import { listPostFiles, getPostFile, putPostFile } from '$lib/server/github';
import type { RequestHandler } from './$types';
import { getEnv } from '$lib/server/env';
import { dev } from '$app/environment';
import { parseFrontmatter } from '$lib/content/frontmatter';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import yaml from 'js-yaml';


const SLUG_PATTERN = /^[a-z0-9가-힣](?:[a-z0-9가-힣-]*[a-z0-9가-힣])?$/i;

function validateSlug(slug: string): boolean {
	return SLUG_PATTERN.test(slug) && !slug.includes('..');
}

export const prerender = false;


function buildFrontmatter(meta: {
	title: string;
	date: string;
	category: string;
	tags: string[];
	description: string;
	published: boolean;
}): string {
	return `---\n${yaml.dump(meta, { lineWidth: -1 })}---\n`;
}

async function loadLocalDrafts() {
	const drafts: { slug: string; title: string; date: string; category: string; tags: string[]; sha: string }[] = [];
	const scan = async (dir: string, requireUnpublished: boolean) => {
		let entries: string[];
		try { entries = await readdir(dir); } catch { return; }
		for (const entry of entries) {
			if (!entry.endsWith('.md')) continue;
			const slug = entry.replace(/\.md$/, '');
			const raw = await readFile(join(dir, entry), 'utf-8');
			const parsed = parseFrontmatter(raw);
			if (!parsed) continue;
			if (requireUnpublished && parsed.data.published !== false) continue;
			drafts.push({ slug, title: parsed.data.title, date: parsed.data.date, category: parsed.data.category, tags: parsed.data.tags, sha: '' });
		}
	};
	await scan(join(process.cwd(), 'content', 'drafts'), false);
	await scan(join(process.cwd(), 'content', 'posts'), true);
	return drafts;
}

export const GET: RequestHandler = async ({ locals, platform }) => {
	const user = locals.user;
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	if (dev && !user.token) {
		const drafts = await loadLocalDrafts();
		return json(drafts);
	}

	const repo = getEnv(platform).GITHUB_REPO;
	if (!repo) return json({ error: 'Unauthorized' }, { status: 401 });

	const files = await listPostFiles(user.token, repo);
	const drafts: {
		slug: string;
		title: string;
		date: string;
		category: string;
		tags: string[];
		sha: string;
	}[] = [];

	for (const file of files) {
		const slug = file.name.replace(/\.md$/, '');
		try {
			const { content, sha } = await getPostFile(user.token, repo, slug);
			const parsed = parseFrontmatter(content);
			if (!parsed || parsed.data.published !== false) continue;
			drafts.push({
				slug,
				title: parsed.data.title,
				date: parsed.data.date,
				category: parsed.data.category,
				tags: parsed.data.tags,
				sha
			});
		} catch {
			continue;
		}
	}

	return json(drafts);
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const user = locals.user;
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const { title, slug, content: rawContent } = body;
	if (!title || !slug) return json({ error: 'title and slug required' }, { status: 400 });
	if (!validateSlug(slug)) return json({ error: 'Invalid slug' }, { status: 400 });

	let content: string;
	if (rawContent) {
		content = rawContent;
	} else {
		const date = new Date().toISOString().split('T')[0];
		const frontmatter = buildFrontmatter({
			title,
			date,
			category: body.category ?? '',
			tags: body.tags ?? [],
			description: body.description ?? '',
			published: false
		});
		content = frontmatter + '\n';
	}

	if (dev && !user.token) {
		const filePath = join(process.cwd(), 'content', 'posts', `${slug}.md`);
		await writeFile(filePath, content, 'utf-8');
		return json({ slug }, { status: 201 });
	}

	const repo = getEnv(platform).GITHUB_REPO;
	if (!repo) return json({ error: 'Unauthorized' }, { status: 401 });
	await putPostFile(user.token, repo, slug, content, `draft: create ${slug}`);
	return json({ slug }, { status: 201 });
};
