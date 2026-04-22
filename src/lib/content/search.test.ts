import { describe, it, expect } from 'vitest';
import { buildSearchData } from './search';
import type { Post } from './types';

describe('buildSearchData', () => {
	const mockPost: Post = {
		title: 'Test Post',
		date: '2026-01-01',
		description: 'A test post about Go',
		tags: ['go', 'graphql'],
		category: 'engineering',
		slug: 'test-post'
	};

	it('strips markdown from body', () => {
		const raw = '# Heading\n\n**Bold** text and `inline code`\n\n```ts\nconst x = 1;\n```';
		const data = buildSearchData([mockPost], { 'test-post': raw });
		expect(data.posts[0].body).not.toContain('#');
		expect(data.posts[0].body).not.toContain('**');
		expect(data.posts[0].body).not.toContain('```');
		expect(data.posts[0].body).toContain('Bold');
		expect(data.posts[0].body).toContain('text');
	});

	it('extracts code blocks separately', () => {
		const raw = 'text\n```ts\nconst x = 1;\n```\nmore text';
		const data = buildSearchData([mockPost], { 'test-post': raw });
		expect(data.posts[0].code).toContain('const x = 1;');
	});

	it('extracts inline code', () => {
		const raw = 'use `getReadingTime()` function';
		const data = buildSearchData([mockPost], { 'test-post': raw });
		expect(data.posts[0].code).toContain('getReadingTime()');
	});

	it('handles empty raw content', () => {
		const data = buildSearchData([mockPost], {});
		expect(data.posts[0].body).toBe('');
		expect(data.posts[0].code).toBe('');
	});

	it('preserves post metadata', () => {
		const data = buildSearchData([mockPost], { 'test-post': '' });
		expect(data.posts[0].title).toBe('Test Post');
		expect(data.posts[0].tags).toEqual(['go', 'graphql']);
		expect(data.posts[0].category).toBe('engineering');
	});
});
