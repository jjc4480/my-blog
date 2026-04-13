import { json } from '@sveltejs/kit';
import { listPostFiles, getPostFile, putPostFile } from '$lib/server/github';
import type { RequestHandler } from './$types';
import { getEnv } from '$lib/server/env';

export const prerender = false;

interface FrontmatterData {
	title: string;
	date: string;
	category: string;
	tags: string[];
	description: string;
	published: boolean;
}

function parseFrontmatter(raw: string): { data: FrontmatterData; body: string } | null {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return null;

	const yaml = match[1];
	const body = match[2];

	const data: Record<string, unknown> = {};
	const lines = yaml.split('\n');
	let currentKey = '';
	let collectingArray = false;
	const arrayItems: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		if (collectingArray) {
			if (trimmed.startsWith('- ')) {
				arrayItems.push(trimmed.slice(2).trim().replace(/^['"]|['"]$/g, ''));
				continue;
			} else {
				data[currentKey] = [...arrayItems];
				arrayItems.length = 0;
				collectingArray = false;
			}
		}

		const kvMatch = trimmed.match(/^([a-zA-Z_]+)\s*:\s*(.*)$/);
		if (kvMatch) {
			currentKey = kvMatch[1];
			const val = kvMatch[2].trim();
			if (val === '') {
				collectingArray = true;
			} else if (val.startsWith('[') && val.endsWith(']')) {
				data[currentKey] = val.slice(1, -1).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
			} else if (val === 'true') {
				data[currentKey] = true;
			} else if (val === 'false') {
				data[currentKey] = false;
			} else {
				data[currentKey] = val.replace(/^['"]|['"]$/g, '');
			}
		}
	}

	if (collectingArray) {
		data[currentKey] = [...arrayItems];
	}

	return {
		data: {
			title: (data.title as string) ?? '',
			date: (data.date as string) ?? '',
			category: (data.category as string) ?? '',
			tags: (data.tags as string[]) ?? [],
			description: (data.description as string) ?? '',
			published: (data.published as boolean) ?? false
		},
		body
	};
}

function buildFrontmatter(meta: {
	title: string;
	date: string;
	category: string;
	tags: string[];
	description: string;
	published: boolean;
}): string {
	const tagsYaml = meta.tags.map((t) => `  - ${t}`).join('\n');
	return `---
title: "${meta.title}"
date: "${meta.date}"
category: "${meta.category}"
tags:
${tagsYaml}
description: "${meta.description}"
published: ${meta.published}
---
`;
}

export const GET: RequestHandler = async ({ locals, platform }) => {
	const user = locals.user;
	const repo = getEnv(platform).GITHUB_REPO;
	if (!user || !repo) return json({ error: 'Unauthorized' }, { status: 401 });

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
	const repo = getEnv(platform).GITHUB_REPO;
	if (!user || !repo) return json({ error: 'Unauthorized' }, { status: 401 });

	const { title, slug, category, tags, description } = await request.json();
	if (!title || !slug) return json({ error: 'title and slug required' }, { status: 400 });

	const date = new Date().toISOString().split('T')[0];
	const frontmatter = buildFrontmatter({
		title,
		date,
		category: category ?? '',
		tags: tags ?? [],
		description: description ?? '',
		published: false
	});

	const content = frontmatter + '\n';
	await putPostFile(user.token, repo, slug, content, `draft: create ${slug}`);

	return json({ slug }, { status: 201 });
};
