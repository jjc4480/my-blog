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
}

export interface SearchData {
	posts: SearchPost[];
}

/** Strip markdown syntax for plain-text indexing */
function stripMarkdown(md: string): string {
	return md
		.replace(/```[\s\S]*?```/g, '')     // code blocks
		.replace(/`[^`]+`/g, '')             // inline code
		.replace(/!\[.*?\]\(.*?\)/g, '')     // images
		.replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // links → text
		.replace(/#{1,6}\s+/g, '')           // headings
		.replace(/[*_~]{1,3}/g, '')          // bold/italic/strike
		.replace(/>\s+/gm, '')               // blockquotes
		.replace(/-{3,}/g, '')               // horizontal rules
		.replace(/\n{2,}/g, '\n')
		.trim();
}

/** Build search data from posts + raw markdown content */
export function buildSearchData(posts: Post[], rawContents: Record<string, string>): SearchData {
	return {
		posts: posts.map((p) => ({
			slug: p.slug,
			title: p.title,
			description: p.description,
			tags: p.tags,
			category: p.category,
			date: p.date,
			body: stripMarkdown(rawContents[p.slug] ?? '')
		}))
	};
}

/** Client-side search engine */
export class SearchEngine {
	private titleIndex: FlexSearch.Index;
	private descIndex: FlexSearch.Index;
	private bodyIndex: FlexSearch.Index;
	private posts: SearchPost[] = [];

	constructor() {
		const opts = { tokenize: 'forward', resolution: 9 } as const;
		this.titleIndex = new FlexSearch.Index(opts);
		this.descIndex = new FlexSearch.Index(opts);
		this.bodyIndex = new FlexSearch.Index(opts);
	}

	load(data: SearchData) {
		this.posts = data.posts;
		for (let i = 0; i < data.posts.length; i++) {
			const p = data.posts[i];
			this.titleIndex.add(i, p.title);
			this.descIndex.add(i, `${p.description} ${p.tags.join(' ')} ${p.category}`);
			this.bodyIndex.add(i, p.body);
		}
	}

	search(query: string): SearchPost[] {
		if (!query.trim()) return [];

		const titleHits = new Set(this.titleIndex.search(query, { limit: 20 }) as number[]);
		const descHits = new Set(this.descIndex.search(query, { limit: 20 }) as number[]);
		const bodyHits = new Set(this.bodyIndex.search(query, { limit: 20 }) as number[]);

		// Score: title match = 10, desc/tags match = 5, body match = 1
		const scores = new Map<number, number>();
		for (const i of titleHits) scores.set(i, (scores.get(i) ?? 0) + 10);
		for (const i of descHits) scores.set(i, (scores.get(i) ?? 0) + 5);
		for (const i of bodyHits) scores.set(i, (scores.get(i) ?? 0) + 1);

		return [...scores.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([i]) => this.posts[i]);
	}
}
