import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from './frontmatter';

describe('parseFrontmatter', () => {
	it('parses valid frontmatter', () => {
		const raw = `---
title: Test Post
date: 2026-01-01
description: A test
tags: [go, graphql]
category: engineering
published: true
---
Hello world`;

		const result = parseFrontmatter(raw);
		expect(result).not.toBeNull();
		expect(result!.data.title).toBe('Test Post');
		expect(result!.data.tags).toEqual(['go', 'graphql']);
		expect(result!.data.published).toBe(true);
		expect(result!.body).toBe('Hello world');
	});

	it('handles YAML list-style tags', () => {
		const raw = `---
title: Test
date: 2026-01-01
tags:
  - go
  - graphql
category: engineering
published: false
---
body`;

		const result = parseFrontmatter(raw);
		expect(result).not.toBeNull();
		expect(result!.data.tags).toEqual(['go', 'graphql']);
	});

	it('returns null for missing frontmatter', () => {
		expect(parseFrontmatter('no frontmatter here')).toBeNull();
	});

	it('returns null for invalid YAML', () => {
		const raw = `---
: broken yaml [[[
---
body`;
		expect(parseFrontmatter(raw)).toBeNull();
	});

	it('applies defaults for missing optional fields', () => {
		const raw = `---
title: Minimal
date: 2026-01-01
---
body`;

		const result = parseFrontmatter(raw);
		expect(result).not.toBeNull();
		expect(result!.data.tags).toEqual([]);
		expect(result!.data.category).toBe('');
		expect(result!.data.published).toBe(false);
	});

	it('handles date as Date object from YAML', () => {
		const raw = `---
title: Date Test
date: 2026-04-15
published: true
---
body`;

		const result = parseFrontmatter(raw);
		expect(result).not.toBeNull();
		expect(result!.data.date).toMatch(/2026-04-15/);
	});
});
