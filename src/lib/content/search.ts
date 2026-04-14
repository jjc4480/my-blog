import FlexSearch from 'flexsearch';
import type { Post } from './types';

export interface SearchPost {
	slug: string;
	title: string;
	description: string;
	tags: string[];
	category: string;
	date: string;
	body: string;
	code: string;
}

export interface SearchData {
	posts: SearchPost[];
}

function extractCode(md: string): string {
	const blocks: string[] = [];
	md.replace(/```[\w]*\n([\s\S]*?)```/g, (_, code) => { blocks.push(code); return ''; });
	md.replace(/`([^`]+)`/g, (_, code) => { blocks.push(code); return ''; });
	return blocks.join(' ');
}

function stripMarkdown(md: string): string {
	return md
		.replace(/^---[\s\S]*?^---/m, '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<[^>]+>/g, '')
		.replace(/```[\s\S]*?```/g, '')
		.replace(/`[^`]+`/g, '')
		.replace(/!\[.*?\]\(.*?\)/g, '')
		.replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
		.replace(/#{1,6}\s+/g, '')
		.replace(/[*_~]{1,3}/g, '')
		.replace(/>\s+/gm, '')
		.replace(/-{3,}/g, '')
		.replace(/\n{2,}/g, '\n')
		.trim();
}

export function buildSearchData(posts: Post[], rawContents: Record<string, string>): SearchData {
	return {
		posts: posts.map((p) => ({
			slug: p.slug,
			title: p.title,
			description: p.description,
			tags: p.tags,
			category: p.category,
			date: p.date,
			body: stripMarkdown(rawContents[p.slug] ?? ''),
			code: extractCode(rawContents[p.slug] ?? '')
		}))
	};
}

export class SearchEngine {
	private titleIndex: FlexSearch.Index;
	private descIndex: FlexSearch.Index;
	private bodyIndex: FlexSearch.Index;
	private codeIndex: FlexSearch.Index;
	private posts: SearchPost[] = [];

	constructor() {
		const opts = { tokenize: 'forward', resolution: 9 } as const;
		this.titleIndex = new FlexSearch.Index(opts);
		this.descIndex = new FlexSearch.Index(opts);
		this.bodyIndex = new FlexSearch.Index(opts);
		this.codeIndex = new FlexSearch.Index(opts);
	}

	load(data: SearchData) {
		this.posts = data.posts;
		for (let i = 0; i < data.posts.length; i++) {
			const p = data.posts[i];
			this.titleIndex.add(i, p.title);
			this.descIndex.add(i, `${p.description} ${p.tags.join(' ')} ${p.category}`);
			this.bodyIndex.add(i, p.body);
			this.codeIndex.add(i, p.code);
		}
	}

	search(query: string, limit = 50): SearchPost[] {
		if (!query.trim()) return [];

		const titleHits = new Set(this.titleIndex.search(query, { limit }) as number[]);
		const descHits = new Set(this.descIndex.search(query, { limit }) as number[]);
		const bodyHits = new Set(this.bodyIndex.search(query, { limit }) as number[]);
		const codeHits = new Set(this.codeIndex.search(query, { limit }) as number[]);

		const scores = new Map<number, number>();
		for (const i of titleHits) scores.set(i, (scores.get(i) ?? 0) + 100);
		for (const i of descHits) scores.set(i, (scores.get(i) ?? 0) + 5);
		for (const i of bodyHits) scores.set(i, (scores.get(i) ?? 0) + 1);
		for (const i of codeHits) scores.set(i, (scores.get(i) ?? 0) + 0.5);

		return [...scores.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([i]) => this.posts[i]);
	}
}
